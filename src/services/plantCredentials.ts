import { supabase } from '@/integrations/supabase/client';

export interface SungrowCredentialInput {
  username?: string;
  password?: string;
  appkey?: string;
  accessKey?: string;
  baseUrl?: string;
}

export async function upsertSungrowCredentials(plantId: string, input: SungrowCredentialInput) {
  const payload = {
    plant_id: plantId,
    provider: 'sungrow',
    username: input.username || null,
    password: input.password || null,
    appkey: input.appkey || null,
    access_key: input.accessKey || null,
    base_url: input.baseUrl || null,
  };

  const { data, error } = await supabase
    .from('plant_credentials')
    .upsert(payload, { onConflict: 'plant_id,provider' })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getSungrowCredentials(plantId: string) {
  const { data, error } = await supabase
    .from('plant_credentials')
    .select('username, password, appkey, access_key, base_url')
    .eq('plant_id', plantId)
    .eq('provider', 'sungrow')
    .maybeSingle();

  if (error) throw error;
  return data;
}
