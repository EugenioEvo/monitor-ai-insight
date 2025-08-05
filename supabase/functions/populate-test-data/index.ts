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

    const { action = 'populate_all' } = await req.json().catch(() => ({}));

    if (action === 'populate_all') {
      console.log('Iniciando população de dados de teste...');

      // 1. Buscar plantas existentes
      const { data: plants, error: plantsError } = await supabaseClient
        .from('plants')
        .select('id, name, capacity_kwp')
        .eq('status', 'active');

      if (plantsError) {
        throw new Error(`Error fetching plants: ${plantsError.message}`);
      }

      if (!plants || plants.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Nenhuma planta encontrada para popular dados'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. Gerar leituras dos últimos 30 dias
      const now = new Date();
      const readings = [];
      
      for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        for (const plant of plants) {
          // Simular 4 leituras por dia (a cada 6 horas)
          for (let hour = 6; hour <= 18; hour += 6) {
            const timestamp = new Date(date);
            timestamp.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
            
            // Simular potência baseada na capacidade e hora do dia
            const capacityKW = plant.capacity_kwp;
            let powerFactor = 0.1; // Base mínima
            
            if (hour >= 8 && hour <= 16) {
              // Horário de pico solar
              powerFactor = 0.6 + Math.random() * 0.3; // 60-90% da capacidade
            } else {
              // Início/fim do dia
              powerFactor = 0.1 + Math.random() * 0.2; // 10-30% da capacidade
            }
            
            const powerW = Math.floor(capacityKW * 1000 * powerFactor);
            const energyKWh = powerW / 1000; // Simplificado para demonstração
            
            readings.push({
              plant_id: plant.id,
              timestamp: timestamp.toISOString(),
              power_w: powerW,
              energy_kwh: energyKWh
            });
          }
        }
      }

      console.log(`Inserindo ${readings.length} leituras...`);

      // Inserir leituras em lotes para evitar timeout
      const batchSize = 100;
      let insertedReadings = 0;
      
      for (let i = 0; i < readings.length; i += batchSize) {
        const batch = readings.slice(i, i + batchSize);
        const { error: readingsError } = await supabaseClient
          .from('readings')
          .insert(batch);

        if (readingsError) {
          console.error('Error inserting readings batch:', readingsError);
        } else {
          insertedReadings += batch.length;
        }
      }

      console.log(`${insertedReadings} leituras inseridas com sucesso`);

      // 3. Executar analytics engine para gerar tendências
      console.log('Executando analytics engine...');
      try {
        const analyticsResponse = await supabaseClient.functions.invoke('analytics-engine', {
          body: { action: 'calculate_trends' }
        });
        console.log('Analytics engine executado:', analyticsResponse);
      } catch (error) {
        console.error('Erro ao executar analytics engine:', error);
      }

      // 4. Executar smart alerts para gerar alertas
      console.log('Executando smart alerts...');
      try {
        const alertsResponse = await supabaseClient.functions.invoke('smart-alerts', {
          body: { action: 'analyze_performance' }
        });
        console.log('Smart alerts executado:', alertsResponse);
      } catch (error) {
        console.error('Erro ao executar smart alerts:', error);
      }

      // 5. Executar cache optimizer
      console.log('Executando cache optimizer...');
      try {
        const cacheResponse = await supabaseClient.functions.invoke('cache-optimizer', {
          body: { action: 'optimize_cache' }
        });
        console.log('Cache optimizer executado:', cacheResponse);
      } catch (error) {
        console.error('Erro ao executar cache optimizer:', error);
      }

      // 6. Gerar relatórios
      console.log('Gerando relatórios...');
      try {
        const reportsResponse = await supabaseClient.functions.invoke('report-generator', {
          body: { action: 'generate_monthly_report' }
        });
        console.log('Relatórios gerados:', reportsResponse);
      } catch (error) {
        console.error('Erro ao gerar relatórios:', error);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Dados de teste populados com sucesso',
        summary: {
          plants_processed: plants.length,
          readings_inserted: insertedReadings,
          days_covered: 31
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'clear_data') {
      console.log('Limpando dados de teste...');

      // Limpar dados de teste (manter plantas)
      const tables = [
        'readings',
        'analytics_trends', 
        'smart_alerts',
        'metrics_cache',
        'automated_reports',
        'alerts',
        'system_metrics'
      ];

      const results = [];
      for (const table of tables) {
        try {
          const { error } = await supabaseClient
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

          if (error) {
            console.error(`Error clearing ${table}:`, error);
            results.push({ table, success: false, error: error.message });
          } else {
            console.log(`${table} limpo com sucesso`);
            results.push({ table, success: true });
          }
        } catch (error) {
          console.error(`Error clearing ${table}:`, error);
          results.push({ table, success: false, error: error.message });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Dados de teste limpos',
        results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in populate-test-data:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});