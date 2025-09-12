import { supabase } from '@/integrations/supabase/client';
import type { SungrowCredentialProfile } from './sungrowProfileService';

export class SungrowSecretsService {
  /**
   * Creates or updates secrets in Supabase for a Sungrow profile
   */
  static async upsertProfileSecrets(profile: SungrowCredentialProfile): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Usuário não autenticado');

    // Create a unique prefix for this user's credentials
    const secretPrefix = `SUNGROW_${user.user.id.replace(/-/g, '').substring(0, 8).toUpperCase()}`;

    try {
      // Use the secure-credentials edge function to store credentials
      const { data, error } = await supabase.functions.invoke('secure-credentials', {
        body: {
          action: 'upsert',
          plantId: `profile_${profile.id}`,
          username: profile.username,
          password: profile.password,
          appkey: profile.appkey,
          accessKey: profile.access_key,
          baseUrl: profile.base_url,
          authMode: profile.auth_mode,
          isDefault: profile.is_default,
          profileId: profile.id,
          profileName: profile.name
        }
      });

      if (error) {
        console.error('Erro ao salvar credenciais no Supabase:', error);
        throw new Error('Falha ao salvar credenciais de forma segura');
      }

      console.log('Credenciais do perfil salvas com sucesso:', {
        profileId: profile.id,
        profileName: profile.name,
        hasUsername: !!profile.username,
        hasPassword: !!profile.password,
        hasAppkey: !!profile.appkey,
        hasAccessKey: !!profile.access_key
      });

    } catch (error) {
      console.error('Erro ao processar secrets do perfil:', error);
      throw new Error('Falha ao configurar credenciais seguras para o perfil');
    }
  }

  /**
   * Retrieves secrets from Supabase for a Sungrow profile
   */
  static async getProfileSecrets(profileId: string): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('secure-credentials', {
        body: {
          action: 'get',
          plantId: `profile_${profileId}`
        }
      });

      if (error) {
        console.error('Erro ao recuperar credenciais do Supabase:', error);
        throw new Error('Falha ao recuperar credenciais seguras');
      }

      return data?.data;
    } catch (error) {
      console.error('Erro ao buscar secrets do perfil:', error);
      throw new Error('Falha ao acessar credenciais seguras do perfil');
    }
  }

  /**
   * Deletes secrets from Supabase for a Sungrow profile
   */
  static async deleteProfileSecrets(profileId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('secure-credentials', {
        body: {
          action: 'delete',
          plantId: `profile_${profileId}`
        }
      });

      if (error) {
        console.error('Erro ao deletar credenciais do Supabase:', error);
        // Não falhar silenciosamente, mas logar o erro
      }

      console.log('Credenciais do perfil removidas com sucesso:', profileId);
    } catch (error) {
      console.error('Erro ao remover secrets do perfil:', error);
      // Não falhar silenciosamente para não bloquear a exclusão do perfil
    }
  }

  /**
   * Gets the default profile credentials from secrets
   */
  static async getDefaultProfileSecrets(): Promise<any> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Usuário não autenticado');

    try {
      // Get the user's default profile first
      const { data: profiles, error: profileError } = await supabase
        .from('sungrow_credential_profiles')
        .select('id')
        .eq('user_id', user.user.id)
        .eq('is_default', true)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profiles) return null;

      return await this.getProfileSecrets(profiles.id);
    } catch (error) {
      console.error('Erro ao buscar credenciais do perfil padrão:', error);
      return null;
    }
  }
}