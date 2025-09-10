import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role: 'user' | 'admin' | 'super_admin';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Security audit logging
  const logSecurityEvent = async (action: string, details: any, success: boolean = true) => {
    try {
      await supabase.functions.invoke('security-monitor', {
        body: {
          action: 'create_alert',
          alert: {
            alert_type: action,
            severity: success ? 'info' : 'warning',
            message: `Authentication event: ${action}`,
            conditions: details
          }
        }
      });
    } catch (error) {
      console.warn('Failed to log security event:', error);
    }
  };

  // Suspicious activity detection
  const detectSuspiciousActivity = async (userId: string): Promise<boolean> => {
    try {
      // Check for multiple failed login attempts in the last 15 minutes
      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('success', false)
        .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .limit(5);
        
      if (error) {
        console.warn('Failed to check suspicious activity:', error);
        return false;
      }
      
      return (data?.length || 0) >= 5;
    } catch (error) {
      console.warn('Failed to detect suspicious activity:', error);
      return false;
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      // Log profile access for security monitoring
      await logSecurityEvent('PROFILE_ACCESS', { userId });

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        await logSecurityEvent('PROFILE_ACCESS_FAILED', { userId, error: error.message }, false);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      await logSecurityEvent('PROFILE_ACCESS_ERROR', { userId, error: (error as Error).message }, false);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetching to avoid blocking auth flow
          setTimeout(async () => {
            const profileData = await fetchUserProfile(session.user.id);
        if (profileData) {
          setProfile(profileData as Profile);
        }
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          const profileData = await fetchUserProfile(session.user.id);
        if (profileData) {
          setProfile(profileData as Profile);
        }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Input validation
      if (!email?.trim() || !password) {
        throw new Error('Email and password are required');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        await logSecurityEvent('SIGN_IN_FAILED', { 
          email: email.trim(), 
          error: error.message 
        }, false);
        toast.error(getAuthErrorMessage(error));
        return { error };
      }

      if (data.user) {
        // Check for suspicious activity
        const isSuspicious = await detectSuspiciousActivity(data.user.id);
        if (isSuspicious) {
          await logSecurityEvent('SUSPICIOUS_LOGIN_ATTEMPT', { 
            userId: data.user.id, 
            email: email.trim() 
          }, false);
          await supabase.auth.signOut();
          toast.error('Account temporarily locked due to suspicious activity. Please contact support.');
          return { error: new Error('Account locked') };
        }

        await logSecurityEvent('SIGN_IN_SUCCESS', { 
          userId: data.user.id, 
          email: email.trim() 
        });
      }
      
      return { error };
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      await logSecurityEvent('SIGN_IN_ERROR', { 
        email: email.trim(), 
        error: (error as Error).message 
      }, false);
      toast.error('Unexpected error during sign in');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true);
      
      // Input validation and security checks
      if (!email?.trim() || !password) {
        throw new Error('Email and password are required');
      }
      
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName?.trim() || email.trim(),
          },
        },
      });
      
      if (error) {
        console.error('Sign up error:', error);
        await logSecurityEvent('SIGN_UP_FAILED', { 
          email: email.trim(), 
          error: error.message 
        }, false);
        toast.error(getAuthErrorMessage(error));
        return { error };
      }

      if (data.user) {
        await logSecurityEvent('SIGN_UP_SUCCESS', { 
          userId: data.user.id, 
          email: email.trim() 
        });
      }
      
      toast.success('Check your email for the confirmation link!');
      return { error };
    } catch (error) {
      console.error('Unexpected sign up error:', error);
      await logSecurityEvent('SIGN_UP_ERROR', { 
        email: email.trim(), 
        error: (error as Error).message 
      }, false);
      toast.error(getAuthErrorMessage(error));
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const currentUserId = user?.id;
      
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      
      if (currentUserId) {
        await logSecurityEvent('SIGN_OUT_SUCCESS', { userId: currentUserId });
      }
      
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      await logSecurityEvent('SIGN_OUT_ERROR', { 
        userId: user?.id, 
        error: (error as Error).message 
      }, false);
      toast.error('Error signing out');
    } finally {
      setLoading(false);
    }
  };

  const getAuthErrorMessage = (error: any): string => {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Invalid email or password';
      case 'Email not confirmed':
        return 'Please check your email and click the confirmation link';
      case 'User already registered':
        return 'An account with this email already exists';
      case 'Password should be at least 6 characters':
        return 'Password must be at least 6 characters long';
      default:
        return error.message || 'An error occurred during authentication';
    }
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const value: AuthContextType = {
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
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}