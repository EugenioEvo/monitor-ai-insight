import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { envValidator } from '@/services/env-validator';

// Get validated environment configuration
const env = envValidator.getConfig();

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Enhanced client with better error handling and retry logic
export const supabase = createClient<Database>(
  env.SUPABASE_URL, 
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'monitor-ai-client',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);