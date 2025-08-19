import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { SungrowProfileService, type SungrowCredentialProfile } from '@/services/sungrowProfileService';

export const useSungrowProfiles = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<SungrowCredentialProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SungrowCredentialProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const profilesData = await SungrowProfileService.getProfiles();
      setProfiles(profilesData);
      
      // Auto-select default profile or first available
      const defaultProfile = profilesData.find(p => p.is_default) || profilesData[0];
      if (defaultProfile && !selectedProfile) {
        setSelectedProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
      toast({
        title: 'Erro ao carregar perfis',
        description: 'Não foi possível carregar os perfis de credenciais.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    setSelectedProfile(profile || null);
  };

  const getEffectiveConfig = () => {
    if (!selectedProfile) {
      throw new Error('Nenhum perfil selecionado');
    }
    return SungrowProfileService.profileToConfig(selectedProfile);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  return {
    profiles,
    selectedProfile,
    loading,
    loadProfiles,
    selectProfile,
    getEffectiveConfig,
    hasProfiles: profiles.length > 0
  };
};