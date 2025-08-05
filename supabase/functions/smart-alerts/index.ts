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

    const { action = 'analyze_performance' } = await req.json().catch(() => ({}));

    if (action === 'analyze_performance') {
      // Buscar plantas ativas
      const { data: plants, error: plantsError } = await supabaseClient
        .from('plants')
        .select('id, name, capacity_kwp')
        .eq('status', 'active');

      if (plantsError) {
        throw new Error(`Error fetching plants: ${plantsError.message}`);
      }

      const alerts = [];
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      for (const plant of plants || []) {
        // Buscar leituras das últimas 24h para cada planta
        const { data: readings, error: readingsError } = await supabaseClient
          .from('readings')
          .select('power_w, energy_kwh, timestamp')
          .eq('plant_id', plant.id)
          .gte('timestamp', last24Hours.toISOString())
          .order('timestamp', { ascending: false });

        if (readingsError) {
          console.error(`Error fetching readings for plant ${plant.id}:`, readingsError);
          continue;
        }

        if (!readings || readings.length === 0) {
          // Alerta: Sem dados recentes
          alerts.push({
            alert_type: 'no_data',
            plant_id: plant.id,
            severity: 'high',
            message: `Planta ${plant.name} sem dados há mais de 24h`,
            conditions: { hours_without_data: 24 },
            triggered_at: new Date().toISOString()
          });
          continue;
        }

        const avgPower = readings.reduce((sum, r) => sum + r.power_w, 0) / readings.length;
        const expectedPower = plant.capacity_kwp * 1000 * 0.2; // 20% da capacidade como mínimo esperado
        
        // Alerta: Performance baixa
        if (avgPower < expectedPower) {
          const performance = (avgPower / expectedPower) * 100;
          alerts.push({
            alert_type: 'low_performance',
            plant_id: plant.id,
            severity: performance < 10 ? 'critical' : performance < 30 ? 'high' : 'medium',
            message: `Performance baixa na planta ${plant.name}: ${performance.toFixed(1)}% do esperado`,
            conditions: { 
              current_power: avgPower,
              expected_power: expectedPower,
              performance_percentage: performance
            },
            triggered_at: new Date().toISOString()
          });
        }

        // Alerta: Variação anormal
        const powerVariations = readings.slice(0, -1).map((reading, i) => 
          Math.abs(reading.power_w - readings[i + 1].power_w)
        );
        const avgVariation = powerVariations.reduce((sum, v) => sum + v, 0) / powerVariations.length;
        const maxVariation = Math.max(...powerVariations);
        
        if (maxVariation > avgPower * 0.8) { // Variação > 80% da média
          alerts.push({
            alert_type: 'abnormal_variation',
            plant_id: plant.id,
            severity: 'medium',
            message: `Variação anormal de potência na planta ${plant.name}`,
            conditions: {
              max_variation: maxVariation,
              avg_power: avgPower,
              variation_threshold: avgPower * 0.8
            },
            triggered_at: new Date().toISOString()
          });
        }
      }

      // Salvar alertas na tabela smart_alerts
      if (alerts.length > 0) {
        const { error: alertsError } = await supabaseClient
          .from('smart_alerts')
          .insert(alerts);

        if (alertsError) {
          console.error('Error saving smart alerts:', alertsError);
        }

        // Criar alertas no sistema principal para os mais críticos
        const criticalAlerts = alerts.filter(alert => 
          alert.severity === 'critical' || alert.severity === 'high'
        );

        for (const alert of criticalAlerts) {
          await supabaseClient
            .from('alerts')
            .insert({
              plant_id: alert.plant_id,
              type: alert.alert_type,
              severity: alert.severity,
              message: alert.message,
              status: 'open'
            });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        alerts_generated: alerts.length,
        critical_alerts: alerts.filter(a => a.severity === 'critical').length,
        message: 'Smart alerts analysis completed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in smart-alerts:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});