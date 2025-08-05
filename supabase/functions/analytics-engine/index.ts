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

    const { action = 'calculate_trends' } = await req.json().catch(() => ({}));

    if (action === 'calculate_trends') {
      // Buscar dados de leituras dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: readings, error: readingsError } = await supabaseClient
        .from('readings')
        .select('plant_id, timestamp, power_w, energy_kwh')
        .gte('timestamp', thirtyDaysAgo.toISOString())
        .order('timestamp', { ascending: true });

      if (readingsError) {
        throw new Error(`Error fetching readings: ${readingsError.message}`);
      }

      // Agrupar por planta e calcular tendências
      const plantTrends = new Map();
      
      readings?.forEach(reading => {
        if (!plantTrends.has(reading.plant_id)) {
          plantTrends.set(reading.plant_id, {
            plant_id: reading.plant_id,
            daily_averages: [],
            power_values: [],
            energy_values: []
          });
        }
        
        const trend = plantTrends.get(reading.plant_id);
        trend.power_values.push(reading.power_w);
        trend.energy_values.push(reading.energy_kwh);
      });

      // Calcular métricas de tendência para cada planta
      const trends = [];
      for (const [plantId, data] of plantTrends) {
        const avgPower = data.power_values.reduce((a, b) => a + b, 0) / data.power_values.length;
        const avgEnergy = data.energy_values.reduce((a, b) => a + b, 0) / data.energy_values.length;
        
        // Calcular tendência (simples: comparar primeira vs última semana)
        const firstWeekPower = data.power_values.slice(0, Math.floor(data.power_values.length / 4));
        const lastWeekPower = data.power_values.slice(-Math.floor(data.power_values.length / 4));
        
        const firstWeekAvg = firstWeekPower.reduce((a, b) => a + b, 0) / firstWeekPower.length || 0;
        const lastWeekAvg = lastWeekPower.reduce((a, b) => a + b, 0) / lastWeekPower.length || 0;
        
        const trendDirection = lastWeekAvg > firstWeekAvg ? 'up' : lastWeekAvg < firstWeekAvg ? 'down' : 'stable';
        const trendPercentage = firstWeekAvg > 0 ? ((lastWeekAvg - firstWeekAvg) / firstWeekAvg) * 100 : 0;

        trends.push({
          plant_id: plantId,
          metric_type: 'power_trend',
          period: '30_days',
          trend_data: {
            direction: trendDirection,
            percentage: Math.abs(trendPercentage),
            avg_power: avgPower,
            avg_energy: avgEnergy,
            data_points: data.power_values.length
          },
          calculated_at: new Date().toISOString()
        });
      }

      // Salvar tendências na tabela analytics_trends
      if (trends.length > 0) {
        const { error: trendsError } = await supabaseClient
          .from('analytics_trends')
          .upsert(trends, { onConflict: 'plant_id,metric_type,period' });

        if (trendsError) {
          console.error('Error saving trends:', trendsError);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        trends_calculated: trends.length,
        message: 'Trends analysis completed successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analytics-engine:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});