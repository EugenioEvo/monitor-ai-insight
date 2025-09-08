import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface SecurityAlert {
  type: 'RATE_LIMIT_EXCEEDED' | 'UNAUTHORIZED_ACCESS' | 'SUSPICIOUS_ACTIVITY' | 'DATA_BREACH_ATTEMPT';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  user_id?: string;
  ip_address?: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, timeRange = '24h' } = await req.json();

    switch (action) {
      case 'get_security_events':
        return await getSecurityEvents(timeRange);
      case 'get_security_summary':
        return await getSecuritySummary(timeRange);
      case 'create_alert':
        const alert = await req.json();
        return await createSecurityAlert(alert);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: corsHeaders }
        );
    }
  } catch (error) {
    console.error('Security monitor error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function getSecurityEvents(timeRange: string) {
  const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 1;
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const { data: events, error } = await supabase
    .from('security_audit_logs')
    .select('*')
    .gte('created_at', cutoffTime.toISOString())
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(`Failed to fetch security events: ${error.message}`);
  }

  // Analyze events for suspicious patterns
  const suspiciousPatterns = analyzeSuspiciousPatterns(events);

  return new Response(
    JSON.stringify({ 
      events,
      suspicious_patterns: suspiciousPatterns,
      total_events: events.length 
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function getSecuritySummary(timeRange: string) {
  const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 1;
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const { data: events, error } = await supabase
    .from('security_audit_logs')
    .select('action, success, created_at, ip_address')
    .gte('created_at', cutoffTime.toISOString());

  if (error) {
    throw new Error(`Failed to fetch security summary: ${error.message}`);
  }

  const summary = {
    total_events: events.length,
    failed_attempts: events.filter(e => !e.success).length,
    unique_ips: new Set(events.map(e => e.ip_address)).size,
    event_types: events.reduce((acc, e) => {
      acc[e.action] = (acc[e.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    hourly_distribution: getHourlyDistribution(events)
  };

  return new Response(
    JSON.stringify({ summary }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function createSecurityAlert(alert: SecurityAlert) {
  // Insert security alert
  const { error: alertError } = await supabase
    .from('smart_alerts')
    .insert({
      alert_type: 'security',
      severity: alert.severity,
      message: alert.message,
      conditions: {
        type: alert.type,
        user_id: alert.user_id,
        ip_address: alert.ip_address,
        metadata: alert.metadata
      }
    });

  if (alertError) {
    throw new Error(`Failed to create security alert: ${alertError.message}`);
  }

  // For critical alerts, also log to system health
  if (alert.severity === 'critical') {
    await supabase.from('system_health_logs').insert({
      component: 'security',
      status: 'alert',
      message: `Critical security alert: ${alert.message}`,
      metrics: {
        alert_type: alert.type,
        severity: alert.severity,
        user_id: alert.user_id,
        ip_address: alert.ip_address
      }
    });
  }

  return new Response(
    JSON.stringify({ success: true }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

function analyzeSuspiciousPatterns(events: any[]) {
  const patterns = [];

  // Check for rapid failed login attempts from same IP
  const failedByIp = events
    .filter(e => !e.success && e.action.includes('AUTH'))
    .reduce((acc, e) => {
      const key = e.ip_address;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  for (const [ip, count] of Object.entries(failedByIp)) {
    if (count >= 5) {
      patterns.push({
        type: 'BRUTE_FORCE_ATTEMPT',
        severity: count >= 10 ? 'critical' : 'high',
        description: `${count} failed authentication attempts from IP ${ip}`,
        ip_address: ip,
        count
      });
    }
  }

  // Check for unusual access patterns
  const accessByUser = events
    .filter(e => e.user_id && e.action.includes('CREDENTIALS'))
    .reduce((acc, e) => {
      acc[e.user_id] = (acc[e.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  for (const [userId, count] of Object.entries(accessByUser)) {
    if (count >= 20) {
      patterns.push({
        type: 'EXCESSIVE_CREDENTIAL_ACCESS',
        severity: 'medium',
        description: `User accessed credentials ${count} times`,
        user_id: userId,
        count
      });
    }
  }

  return patterns;
}

function getHourlyDistribution(events: any[]) {
  const distribution = Array(24).fill(0);
  
  events.forEach(event => {
    const hour = new Date(event.created_at).getHours();
    distribution[hour]++;
  });

  return distribution;
}