import { supabase } from '@/integrations/supabase/client';

export interface SungrowCredentialInput {
  username?: string;
  password?: string;
  appkey?: string;
  accessKey?: string;
  baseUrl?: string;
}

export async function upsertSungrowCredentials(plantId: string, input: SungrowCredentialInput) {
  const { data, error } = await supabase.functions.invoke('secure-credentials', {
    body: { ...input, plantId, action: 'upsert' },
    method: 'POST'
  });

  if (error) throw error;
  return data?.data;
}

export async function getSungrowCredentials(plantId: string) {
  const { data, error } = await supabase.functions.invoke('secure-credentials', {
    body: { plantId, action: 'get' },
    method: 'POST'
  });

  if (error) throw error;
  return data?.data;
}
