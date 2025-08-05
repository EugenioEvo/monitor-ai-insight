import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action = 'optimize_cache' } = await req.json().catch(() => ({}));

    if (action === 'optimize_cache') {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Limpar cache expirado
      const { error: cleanupError } = await supabaseClient
        .from('metrics_cache')
        .delete()
        .lt('expires_at', now.toISOString());

      if (cleanupError) {
        console.error('Error cleaning expired cache:', cleanupError);
      }

      // Calcular métricas populares e cachear
      const cacheEntries = [];

      // 1. Total de geração por planta (última hora)
      const { data: readings, error: readingsError } = await supabaseClient
        .from('readings')
        .select('plant_id, energy_kwh, power_w')
        .gte('timestamp', oneHourAgo.toISOString());

      if (!readingsError && readings) {
        const plantMetrics = new Map();
        
        readings.forEach(reading => {
          if (!plantMetrics.has(reading.plant_id)) {
            plantMetrics.set(reading.plant_id, {
              total_energy: 0,
              avg_power: 0,
              count: 0
            });
          }
          
          const metrics = plantMetrics.get(reading.plant_id);
          metrics.total_energy += reading.energy_kwh;
          metrics.avg_power += reading.power_w;
          metrics.count += 1;
        });

        for (const [plantId, metrics] of plantMetrics) {
          cacheEntries.push({
            cache_key: `plant_metrics_${plantId}_1h`,
            cache_data: {
              plant_id: plantId,
              total_energy: metrics.total_energy,
              avg_power: metrics.avg_power / metrics.count,
              period: '1h',
              cached_at: now.toISOString()
            },
            expires_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString() // 30 min
          });
        }
      }

      // 2. Métricas gerais do sistema
      const { data: totalReadings, error: totalError } = await supabaseClient
        .from('readings')
        .select('energy_kwh, power_w')
        .gte('timestamp', oneHourAgo.toISOString());

      if (!totalError && totalReadings) {
        const totalEnergy = totalReadings.reduce((sum, r) => sum + r.energy_kwh, 0);
        const avgPower = totalReadings.reduce((sum, r) => sum + r.power_w, 0) / totalReadings.length;

        cacheEntries.push({
          cache_key: 'system_metrics_1h',
          cache_data: {
            total_energy: totalEnergy,
            avg_power: avgPower,
            data_points: totalReadings.length,
            period: '1h',
            cached_at: now.toISOString()
          },
          expires_at: new Date(now.getTime() + 15 * 60 * 1000).toISOString() // 15 min
        });
      }

      // 3. Count de alertas ativos
      const { data: alertsCount, error: alertsError } = await supabaseClient
        .from('alerts')
        .select('severity', { count: 'exact' })
        .eq('status', 'open');

      if (!alertsError) {
        cacheEntries.push({
          cache_key: 'active_alerts_count',
          cache_data: {
            total_alerts: alertsCount || 0,
            cached_at: now.toISOString()
          },
          expires_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString() // 5 min
        });
      }

      // 4. Count de tickets abertos
      const { data: ticketsCount, error: ticketsError } = await supabaseClient
        .from('tickets')
        .select('priority', { count: 'exact' })
        .eq('status', 'open');

      if (!ticketsError) {
        cacheEntries.push({
          cache_key: 'open_tickets_count',
          cache_data: {
            total_tickets: ticketsCount || 0,
            cached_at: now.toISOString()
          },
          expires_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString() // 10 min
        });
      }

      // Salvar entradas de cache
      if (cacheEntries.length > 0) {
        const { error: cacheError } = await supabaseClient
          .from('metrics_cache')
          .upsert(cacheEntries, { onConflict: 'cache_key' });

        if (cacheError) {
          console.error('Error saving cache entries:', cacheError);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        cache_entries_created: cacheEntries.length,
        cleanup_completed: !cleanupError,
        message: 'Cache optimization completed successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_cached_metrics') {
      const { cache_key } = await req.json().catch(() => ({}));
      
      const { data: cached, error } = await supabaseClient
        .from('metrics_cache')
        .select('cache_data, expires_at')
        .eq('cache_key', cache_key)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !cached) {
        return new Response(JSON.stringify({ 
          cached: false,
          message: 'No valid cache entry found'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        cached: true,
        data: cached.cache_data,
        expires_at: cached.expires_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_cache_stats') {
      const { data: cacheStats, error } = await supabaseClient
        .from('metrics_cache')
        .select('cache_key, expires_at, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Error fetching cache stats: ${error.message}`);
      }

      const now = new Date();
      const validEntries = cacheStats?.filter(entry => new Date(entry.expires_at) > now) || [];
      const expiredEntries = cacheStats?.filter(entry => new Date(entry.expires_at) <= now) || [];

      return new Response(JSON.stringify({
        success: true,
        stats: {
          total_entries: cacheStats?.length || 0,
          valid_entries: validEntries.length,
          expired_entries: expiredEntries.length,
          cache_keys: [...new Set(cacheStats?.map(entry => entry.cache_key) || [])]
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cache-optimizer:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});