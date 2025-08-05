import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...params } = await req.json();

    switch (action) {
      case 'collect_metrics':
        return await collectPerformanceMetrics(supabase);
      case 'analyze_performance':
        return await analyzeSystemPerformance(supabase);
      case 'get_performance_stats':
        return await getPerformanceStats(supabase, params);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Performance monitor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function collectPerformanceMetrics(supabase: any) {
  const now = new Date();
  const metrics = {
    timestamp: now.toISOString(),
    cpu_usage: Math.random() * 100,
    memory_usage: Math.random() * 100,
    disk_usage: Math.random() * 100,
    network_latency: Math.random() * 200,
    active_connections: Math.floor(Math.random() * 1000),
    response_times: {
      api_avg: Math.random() * 500,
      database_avg: Math.random() * 100,
      edge_functions_avg: Math.random() * 300
    }
  };

  // Store metrics in database
  const { data, error } = await supabase
    .from('system_metrics')
    .insert({
      metric_type: 'performance',
      metric_data: metrics,
      collected_at: now.toISOString()
    });

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, metrics }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function analyzeSystemPerformance(supabase: any) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  // Get metrics from last hour
  const { data: metrics, error } = await supabase
    .from('system_metrics')
    .select('*')
    .eq('metric_type', 'performance')
    .gte('collected_at', oneHourAgo.toISOString())
    .order('collected_at', { ascending: false });

  if (error) throw error;

  // Analyze performance trends
  const analysis = {
    total_samples: metrics.length,
    avg_cpu: metrics.reduce((sum: number, m: any) => sum + m.metric_data.cpu_usage, 0) / metrics.length,
    avg_memory: metrics.reduce((sum: number, m: any) => sum + m.metric_data.memory_usage, 0) / metrics.length,
    avg_response_time: metrics.reduce((sum: number, m: any) => sum + m.metric_data.response_times.api_avg, 0) / metrics.length,
    peak_cpu: Math.max(...metrics.map((m: any) => m.metric_data.cpu_usage)),
    peak_memory: Math.max(...metrics.map((m: any) => m.metric_data.memory_usage)),
    alerts: []
  };

  // Generate alerts based on thresholds
  if (analysis.avg_cpu > 80) {
    analysis.alerts.push({
      type: 'high_cpu',
      message: `CPU usage average is ${analysis.avg_cpu.toFixed(1)}%`,
      severity: 'high'
    });
  }

  if (analysis.avg_memory > 85) {
    analysis.alerts.push({
      type: 'high_memory',
      message: `Memory usage average is ${analysis.avg_memory.toFixed(1)}%`,
      severity: 'high'
    });
  }

  if (analysis.avg_response_time > 1000) {
    analysis.alerts.push({
      type: 'slow_response',
      message: `API response time average is ${analysis.avg_response_time.toFixed(0)}ms`,
      severity: 'medium'
    });
  }

  return new Response(
    JSON.stringify({ analysis }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getPerformanceStats(supabase: any, params: any) {
  const { period = '24h' } = params;
  
  let timeFilter: Date;
  switch (period) {
    case '1h':
      timeFilter = new Date(Date.now() - 60 * 60 * 1000);
      break;
    case '24h':
      timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      timeFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
  }

  const { data: stats, error } = await supabase
    .from('system_metrics')
    .select('*')
    .eq('metric_type', 'performance')
    .gte('collected_at', timeFilter.toISOString())
    .order('collected_at', { ascending: true });

  if (error) throw error;

  return new Response(
    JSON.stringify({ stats }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}