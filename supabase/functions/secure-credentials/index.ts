import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { validateInput, rateLimit, logSecurityEvent, securityHeaders, SecurityError } from '../_shared/security.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface SungrowCredentialInput {
  username?: string;
  password?: string;
  appkey?: string;
  accessKey?: string;
  baseUrl?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimit(clientIp, 50, 15 * 60 * 1000)) {
      await logSecurityEvent(supabase, null, 'RATE_LIMIT_EXCEEDED', { ip: clientIp }, req);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      await logSecurityEvent(supabase, null, 'UNAUTHORIZED_ACCESS', { reason: 'No auth header' }, req);
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create authenticated client for user verification
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      await logSecurityEvent(supabase, null, 'INVALID_AUTHENTICATION', { error: userError?.message }, req);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const body = await req.json();
    
    // Input validation
    validateInput(body, {
      action: { required: true, type: 'string', enum: ['get', 'upsert'] },
      plantId: { required: true, type: 'string', minLength: 1, maxLength: 100 }
    });
    
    if (body.action === 'upsert') {
      validateInput(body, {
        username: { type: 'string', maxLength: 100 },
        password: { type: 'string', maxLength: 200 },
        appkey: { type: 'string', maxLength: 200 },
        accessKey: { type: 'string', maxLength: 500 },
        baseUrl: { type: 'string', maxLength: 200, pattern: /^https?:\/\// }
      });
    }
    
    const { action, plantId, ...credentialData } = body;

    if (action === 'get' && plantId) {
      // Get Sungrow credentials for a specific plant
      const { data, error } = await supabase
        .from('plant_credentials')
        .select('username, password, appkey, access_key, base_url')
        .eq('plant_id', plantId)
        .eq('provider', 'sungrow')
        .maybeSingle();

      if (error) {
        console.error('Error fetching credentials:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch credentials' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      await logSecurityEvent(supabase, user.id, 'CREDENTIALS_ACCESSED', { plantId, action }, req);
      
      return new Response(
        JSON.stringify({ data }),
        { 
          status: 200, 
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'upsert' && plantId) {
      // Upsert Sungrow credentials for a specific plant
      const payload = {
        plant_id: plantId,
        provider: 'sungrow',
        username: credentialData.username || null,
        password: credentialData.password || null,
        appkey: credentialData.appkey || null,
        access_key: credentialData.accessKey || null,
        base_url: credentialData.baseUrl || null,
      };

      const { data, error } = await supabase
        .from('plant_credentials')
        .upsert(payload, { onConflict: 'plant_id,provider' })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error upserting credentials:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to save credentials' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      await logSecurityEvent(supabase, user.id, 'CREDENTIALS_UPDATED', { plantId, action }, req);
      
      return new Response(
        JSON.stringify({ data }),
        { 
          status: 200, 
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Secure credentials function error:', error);
    
    if (error instanceof SecurityError) {
      return new Response(
        JSON.stringify({ error: error.message, code: error.code }),
        { 
          status: 400, 
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});