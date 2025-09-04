
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logger';
import { tokenRefreshManager } from '@/services/tokenRefreshManager';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'super_admin' | 'admin' | 'user' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as Profile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener - NEVER use async here to prevent deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        logger.info('Auth state changed', { 
          component: 'useAuth', 
          event, 
          userId: session?.user?.id 
        });
        
        // Only synchronous state updates here
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch with timeout to prevent recursion
          setTimeout(async () => {
            if (!mounted) return;
            try {
              const userProfile = await fetchProfile(session.user.id);
              if (mounted) {
                setProfile(userProfile);
                setLoading(false);
              }
            } catch (error) {
              logger.error('Profile fetch failed', error as Error, { 
                component: 'useAuth',
                action: 'profile-fetch'
              });
              if (mounted) {
                setProfile(null);
                setLoading(false);
              }
            }
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session after setting up listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (session) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id)
          .then((userProfile) => {
            if (mounted) {
              setProfile(userProfile);
              setLoading(false);
            }
          })
          .catch((error) => {
            logger.error('Initial profile fetch failed', error as Error, { 
              component: 'useAuth',
              action: 'initial-profile-fetch'
            });
            if (mounted) {
              setProfile(null);
              setLoading(false);
            }
          });
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName || email,
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
