import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { validateInput, rateLimit, logSecurityEvent, securityHeaders, SecurityError } from '../_shared/security.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    if (!rateLimit(clientIP, 30, 60000)) { // 30 requests per minute
      throw new SecurityError('Rate limit exceeded', 'RATE_LIMIT')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new SecurityError('Missing authorization header', 'AUTH_REQUIRED')
    }

    // Set auth context
    supabase.auth.session = { access_token: authHeader.replace('Bearer ', '') }

    // Get user from auth header
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new SecurityError('Invalid authentication', 'AUTH_INVALID')
    }

    const { action } = await req.json()

    // Validate input
    validateInput({ action }, {
      action: { type: 'string', required: true, enum: ['get_security_summary', 'get_recent_alerts', 'check_threats'] }
    })

    let result

    switch (action) {
      case 'get_security_summary':
        // Get security summary for the last 24 hours
        const { data: securitySummary, error: summaryError } = await supabase
          .rpc('get_recent_security_events', { p_hours: 24 })

        if (summaryError) throw summaryError

        // Aggregate security metrics
        const summary = {
          total_events: securitySummary?.length || 0,
          failed_logins: securitySummary?.filter((e: any) => e.action === 'login_failed').length || 0,
          successful_logins: securitySummary?.filter((e: any) => e.action === 'login_success').length || 0,
          suspicious_activities: securitySummary?.filter((e: any) => !e.success).length || 0,
          unique_users: new Set(securitySummary?.map((e: any) => e.user_id)).size,
          recent_events: securitySummary?.slice(0, 10) || []
        }

        result = { summary }
        break

      case 'get_recent_alerts':
        // Get recent security alerts
        const { data: alerts, error: alertsError } = await supabase
          .from('smart_alerts')
          .select('*')
          .eq('alert_type', 'security')
          .order('created_at', { ascending: false })
          .limit(20)

        if (alertsError) throw alertsError

        result = { alerts }
        break

      case 'check_threats':
        // Check for potential security threats
        const { data: suspiciousUsers, error: threatsError } = await supabase
          .from('security_audit_logs')
          .select('user_id, action, created_at')
          .eq('success', false)
          .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
          .order('created_at', { ascending: false })

        if (threatsError) throw threatsError

        // Group by user and count failed attempts
        const threatMap = new Map()
        suspiciousUsers?.forEach((log: any) => {
          const key = log.user_id || 'anonymous'
          if (!threatMap.has(key)) {
            threatMap.set(key, { user_id: key, failed_attempts: 0, latest_attempt: log.created_at })
          }
          threatMap.get(key).failed_attempts++
        })

        const threats = Array.from(threatMap.values())
          .filter((threat: any) => threat.failed_attempts >= 3)
          .sort((a: any, b: any) => b.failed_attempts - a.failed_attempts)

        result = { threats }
        break

      default:
        throw new SecurityError('Invalid action', 'INVALID_ACTION')
    }

    // Log security monitoring access
    await logSecurityEvent(supabase, user.id, `security_monitor_${action}`, result, req)

    console.log(`Security monitor action completed: ${action}`)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Security monitor error:', error)

    const errorMessage = error instanceof SecurityError ? error.message : 'Internal server error'
    const statusCode = error instanceof SecurityError ? 
      (error.code === 'RATE_LIMIT' ? 429 : 
       error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_INVALID' ? 401 : 400) : 500

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    )
  }
})