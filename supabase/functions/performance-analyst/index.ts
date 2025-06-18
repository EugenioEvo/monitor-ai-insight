
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Starting daily performance analysis...');

    // Get all active plants
    const { data: plants, error: plantsError } = await supabase
      .from('plants')
      .select('*')
      .eq('status', 'active');

    if (plantsError) {
      throw new Error(`Plants query error: ${plantsError.message}`);
    }

    const alerts = [];

    for (const plant of plants) {
      // Get recent readings (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: readings, error: readingsError } = await supabase
        .from('readings')
        .select('*')
        .eq('plant_id', plant.id)
        .gte('timestamp', yesterday.toISOString())
        .order('timestamp', { ascending: false });

      if (readingsError) {
        console.error(`Readings error for plant ${plant.id}:`, readingsError);
        continue;
      }

      if (!readings || readings.length === 0) {
        // No readings - critical alert
        alerts.push({
          plant_id: plant.id,
          severity: 'critical',
          type: 'performance',
          message: `Sem dados de leitura nas últimas 24h - ${plant.name}`
        });
        continue;
      }

      // Calculate performance metrics
      const totalEnergyGenerated = readings.reduce((sum, r) => sum + r.energy_kWh, 0);
      const avgPower = readings.reduce((sum, r) => sum + r.power_W, 0) / readings.length;
      
      // Expected performance (simplified calculation)
      const expectedDailyEnergy = plant.capacity_kWp * 5; // 5 hours equivalent sun
      const performanceRatio = (totalEnergyGenerated / expectedDailyEnergy) * 100;

      // Use AI to analyze performance and suggest alerts
      const aiAnalysis = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Você é um analista de performance de plantas solares. 
              Analise os dados e determine se um alerta deve ser criado.
              Responda apenas com JSON: {"create_alert": boolean, "severity": "low|medium|high|critical", "message": "string"}`
            },
            {
              role: 'user',
              content: `Planta: ${plant.name}
              Capacidade: ${plant.capacity_kWp} kWp
              Energia gerada (24h): ${totalEnergyGenerated} kWh
              Energia esperada: ${expectedDailyEnergy} kWh  
              Performance: ${performanceRatio.toFixed(1)}%
              Potência média: ${avgPower} W
              Número de leituras: ${readings.length}`
            }
          ],
          max_tokens: 200
        }),
      });

      const aiResult = await aiAnalysis.json();
      const analysis = JSON.parse(aiResult.choices[0].message.content);

      if (analysis.create_alert) {
        alerts.push({
          plant_id: plant.id,
          severity: analysis.severity,
          type: 'performance',
          message: analysis.message
        });
      }
    }

    // Insert alerts into database
    if (alerts.length > 0) {
      const { error: alertsError } = await supabase
        .from('alerts')
        .insert(alerts);

      if (alertsError) {
        throw new Error(`Alerts insert error: ${alertsError.message}`);
      }
    }

    console.log(`Performance analysis completed. Created ${alerts.length} alerts.`);

    return new Response(JSON.stringify({
      success: true,
      plants_analyzed: plants.length,
      alerts_created: alerts.length,
      alerts: alerts
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in performance-analyst:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
