import { supabase } from '@/integrations/supabase/client';
import type { SungrowConfig } from '@/types/sungrow';

export interface SungrowCredentialProfile {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  appkey: string;
  access_key: string;
  username?: string;
  password?: string;
  base_url: string;
  auth_mode: 'direct' | 'oauth';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSungrowProfileInput {
  name: string;
  description?: string;
  appkey: string;
  access_key: string;
  username?: string;
  password?: string;
  base_url?: string;
  auth_mode?: 'direct' | 'oauth';
  is_default?: boolean;
}

export class SungrowProfileService {
  static async getProfiles(): Promise<SungrowCredentialProfile[]> {
    const { data, error } = await supabase
      .from('sungrow_credential_profiles')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as SungrowCredentialProfile[];
  }

  static async getProfile(id: string): Promise<SungrowCredentialProfile | null> {
    const { data, error } = await supabase
      .from('sungrow_credential_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as SungrowCredentialProfile | null;
  }

  static async createProfile(input: CreateSungrowProfileInput): Promise<SungrowCredentialProfile> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Usuário não autenticado');

    // If this is set as default, unset other defaults first
    if (input.is_default) {
      await this.clearDefaultProfile();
    }

    const { data, error } = await supabase
      .from('sungrow_credential_profiles')
      .insert({
        user_id: user.user.id,
        name: input.name,
        description: input.description,
        appkey: input.appkey,
        access_key: input.access_key,
        username: input.username,
        password: input.password,
        base_url: input.base_url || 'https://gateway.isolarcloud.com.hk',
        auth_mode: input.auth_mode || 'direct',
        is_default: input.is_default || false
      })
      .select()
      .single();

    if (error) throw error;
    return data as SungrowCredentialProfile;
  }

  static async updateProfile(id: string, input: Partial<CreateSungrowProfileInput>): Promise<SungrowCredentialProfile> {
    // If this is being set as default, unset other defaults first
    if (input.is_default) {
      await this.clearDefaultProfile();
    }

    const { data, error } = await supabase
      .from('sungrow_credential_profiles')
      .update({
        name: input.name,
        description: input.description,
        appkey: input.appkey,
        access_key: input.access_key,
        username: input.username,
        password: input.password,
        base_url: input.base_url,
        auth_mode: input.auth_mode,
        is_default: input.is_default
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SungrowCredentialProfile;
  }

  static async deleteProfile(id: string): Promise<void> {
    const { error } = await supabase
      .from('sungrow_credential_profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async setDefaultProfile(id: string): Promise<void> {
    // Clear existing default
    await this.clearDefaultProfile();

    // Set new default
    const { error } = await supabase
      .from('sungrow_credential_profiles')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
  }

  static async clearDefaultProfile(): Promise<void> {
    const { error } = await supabase
      .from('sungrow_credential_profiles')
      .update({ is_default: false })
      .eq('is_default', true);

    if (error) throw error;
  }

  static async getDefaultProfile(): Promise<SungrowCredentialProfile | null> {
    const { data, error } = await supabase
      .from('sungrow_credential_profiles')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    if (error) throw error;
    return data as SungrowCredentialProfile | null;
  }

  // Convert profile to SungrowConfig format
  static profileToConfig(profile: SungrowCredentialProfile): SungrowConfig {
    return {
      username: profile.username || '',
      password: profile.password || '',
      appkey: profile.appkey,
      accessKey: profile.access_key,
      baseUrl: profile.base_url,
      authMode: profile.auth_mode === 'oauth' ? 'oauth2' : 'direct',
      plantId: ''
    };
  }
}