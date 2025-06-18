import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SolarEdgeConfig {
  apiKey: string;
  siteId: string;
}

interface SolarEdgeReading {
  timeUnit: string;
  unit: string;
  values: Array<{
    date: string;
    value: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, plantId, config } = await req.json();
    
    switch (action) {
      case 'test_connection':
        return await testConnection(config);
      case 'sync_data':
        return await syncData(plantId);
      case 'get_site_details':
        return await getSiteDetails(config);
      case 'discover_plants':
        return await discoverPlants(config);
      default:
        throw new Error('Ação não suportada');
    }
  } catch (error) {
    console.error('Erro no SolarEdge connector:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function discoverPlants(config: SolarEdgeConfig) {
  try {
    // Se um siteId específico foi fornecido, buscar apenas esse site
    if (config.siteId) {
      const response = await fetch(
        `https://monitoringapi.solaredge.com/site/${config.siteId}/details?api_key=${config.apiKey}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const site = data.details;
      
      return new Response(
        JSON.stringify({ 
          success: true,
          plants: [{
            id: site.id.toString(),
            name: site.name,
            capacity: site.peakPower,
            location: `${site.location.city}, ${site.location.country}`,
            status: site.status,
            installationDate: site.installationDate
          }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Caso contrário, buscar lista de sites da conta
    const response = await fetch(
      `https://monitoringapi.solaredge.com/sites/list?api_key=${config.apiKey}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const plants = data.sites?.site?.map((site: any) => ({
      id: site.id.toString(),
      name: site.name,
      capacity: site.peakPower,
      location: `${site.location.city}, ${site.location.country}`,
      status: site.status,
      installationDate: site.installationDate
    })) || [];
    
    return new Response(
      JSON.stringify({ 
        success: true,
        plants
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Erro ao descobrir plantas: ${error.message}` 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function testConnection(config: SolarEdgeConfig) {
  try {
    const response = await fetch(
      `https://monitoringapi.solaredge.com/site/${config.siteId}/details?api_key=${config.apiKey}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conexão estabelecida com sucesso',
        siteDetails: data.details 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Falha na conexão: ${error.message}` 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function syncData(plantId: string) {
  const startTime = Date.now();
  let dataPointsSynced = 0;

  try {
    // Buscar configuração da planta
    const { data: plant, error: plantError } = await supabase
      .from('plants')
      .select('*')
      .eq('id', plantId)
      .single();

    if (plantError || !plant) {
      throw new Error('Planta não encontrada');
    }

    const config = plant.api_credentials as SolarEdgeConfig;
    if (!config?.apiKey || !config?.siteId) {
      throw new Error('Configuração de API não encontrada');
    }

    // Buscar dados de energia do último dia
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const energyResponse = await fetch(
      `https://monitoringapi.solaredge.com/site/${config.siteId}/energy?timeUnit=QUARTER_OF_AN_HOUR&endDate=${endDate}&startDate=${startDate}&api_key=${config.apiKey}`
    );

    if (!energyResponse.ok) {
      throw new Error(`Erro na API SolarEdge: ${energyResponse.status}`);
    }

    const energyData: { energy: SolarEdgeReading } = await energyResponse.json();
    
    // Buscar dados de potência
    const powerResponse = await fetch(
      `https://monitoringapi.solaredge.com/site/${config.siteId}/power?startTime=${startDate} 00:00:00&endTime=${endDate} 23:59:59&api_key=${config.apiKey}`
    );

    let powerData: { power: SolarEdgeReading } | null = null;
    if (powerResponse.ok) {
      powerData = await powerResponse.json();
    }

    // Converter e inserir dados
    const readings = [];
    for (const energyPoint of energyData.energy.values) {
      if (energyPoint.value > 0) {
        const timestamp = new Date(energyPoint.date).toISOString();
        
        // Encontrar potência correspondente
        let powerValue = 0;
        if (powerData) {
          const powerPoint = powerData.power.values.find(p => 
            new Date(p.date).getTime() === new Date(energyPoint.date).getTime()
          );
          powerValue = powerPoint?.value || 0;
        }

        readings.push({
          plant_id: plantId,
          timestamp,
          energy_kwh: energyPoint.value / 1000, // Converter Wh para kWh
          power_w: Math.round(powerValue),
          created_at: new Date().toISOString()
        });
      }
    }

    if (readings.length > 0) {
      const { error: insertError } = await supabase
        .from('readings')
        .upsert(readings, { 
          onConflict: 'plant_id,timestamp',
          ignoreDuplicates: true 
        });

      if (insertError) {
        throw new Error(`Erro ao inserir dados: ${insertError.message}`);
      }

      dataPointsSynced = readings.length;
    }

    // Atualizar timestamp de sincronização
    await supabase
      .from('plants')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', plantId);

    // Log de sucesso
    await supabase
      .from('sync_logs')
      .insert({
        plant_id: plantId,
        system_type: 'solaredge',
        status: 'success',
        message: `Sincronizados ${dataPointsSynced} pontos de dados`,
        data_points_synced: dataPointsSynced,
        sync_duration_ms: Date.now() - startTime
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sincronizados ${dataPointsSynced} pontos de dados`,
        dataPointsSynced 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log de erro
    await supabase
      .from('sync_logs')
      .insert({
        plant_id: plantId,
        system_type: 'solaredge',
        status: 'error',
        message: error.message,
        data_points_synced: dataPointsSynced,
        sync_duration_ms: Date.now() - startTime
      });

    throw error;
  }
}

async function getSiteDetails(config: SolarEdgeConfig) {
  try {
    const response = await fetch(
      `https://monitoringapi.solaredge.com/site/${config.siteId}/details?api_key=${config.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify(data.details),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    throw new Error(`Erro ao buscar detalhes do site: ${error.message}`);
  }
}
