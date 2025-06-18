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

interface SungrowConfig {
  username: string;
  password: string;
  appkey: string;
  baseUrl?: string;
}

interface SungrowAuthResponse {
  result_code: number;
  result_msg: string;
  result_data: {
    token: string;
    token_timeout: number;
  };
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
      case 'get_plant_list':
        return await getPlantList(config);
      case 'discover_plants':
        return await discoverPlants(config);
      default:
        throw new Error('Ação não suportada');
    }
  } catch (error) {
    console.error('Erro no Sungrow connector:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function discoverPlants(config: SungrowConfig) {
  try {
    const token = await authenticate(config);
    const baseUrl = config.baseUrl || 'https://gateway.isolarcloud.com.hk';

    const response = await fetch(`${baseUrl}/v1/stationService/getStationList`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token
      },
      body: JSON.stringify({
        lang: 'en_us'
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result_code !== 1) {
      throw new Error(`Erro: ${data.result_msg}`);
    }

    const plants = data.result_data?.map((station: any) => ({
      id: station.ps_id.toString(),
      name: station.ps_name,
      capacity: station.nominal_power,
      location: `${station.ps_location_lat}, ${station.ps_location_lng}`,
      status: station.ps_status === 1 ? 'Active' : 'Inactive',
      installationDate: station.create_date
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

async function authenticate(config: SungrowConfig): Promise<string> {
  const baseUrl = config.baseUrl || 'https://gateway.isolarcloud.com.hk';
  
  const authPayload = {
    appkey: config.appkey,
    user_account: config.username,
    user_password: config.password,
    lang: 'en_us'
  };

  const response = await fetch(`${baseUrl}/v1/userService/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(authPayload)
  });

  if (!response.ok) {
    throw new Error(`Erro de autenticação: ${response.status}`);
  }

  const data: SungrowAuthResponse = await response.json();
  
  if (data.result_code !== 1) {
    throw new Error(`Falha na autenticação: ${data.result_msg}`);
  }

  return data.result_data.token;
}

async function testConnection(config: SungrowConfig) {
  try {
    const token = await authenticate(config);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conexão estabelecida com sucesso',
        token: token.substring(0, 10) + '...' // Mostrar apenas parte do token por segurança
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

    const config = plant.api_credentials as SungrowConfig & { plantId: string };
    if (!config?.username || !config?.password || !config?.appkey) {
      throw new Error('Configuração de API não encontrada');
    }

    const token = await authenticate(config);
    const baseUrl = config.baseUrl || 'https://gateway.isolarcloud.com.hk';

    // Buscar dados de energia do último dia
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    const energyPayload = {
      ps_id: config.plantId,
      date_id: yesterday.toISOString().split('T')[0].replace(/-/g, ''),
      date_type: 3, // Dados por hora
      lang: 'en_us'
    };

    const energyResponse = await fetch(`${baseUrl}/v1/reportService/queryMutiplePointDataList`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token
      },
      body: JSON.stringify(energyPayload)
    });

    if (!energyResponse.ok) {
      throw new Error(`Erro na API Sungrow: ${energyResponse.status}`);
    }

    const energyData = await energyResponse.json();
    
    if (energyData.result_code !== 1) {
      throw new Error(`Erro nos dados: ${energyData.result_msg}`);
    }

    // Buscar dados de potência em tempo real
    const powerPayload = {
      ps_id: config.plantId,
      lang: 'en_us'
    };

    const powerResponse = await fetch(`${baseUrl}/v1/reportService/queryPlantPowerGeneration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token
      },
      body: JSON.stringify(powerPayload)
    });

    let currentPower = 0;
    if (powerResponse.ok) {
      const powerData = await powerResponse.json();
      if (powerData.result_code === 1 && powerData.result_data) {
        currentPower = powerData.result_data.p83022 || 0; // Potência atual
      }
    }

    // Converter e inserir dados
    const readings = [];
    if (energyData.result_data && energyData.result_data.length > 0) {
      for (const dataPoint of energyData.result_data) {
        if (dataPoint.target_val && dataPoint.target_val > 0) {
          const timestamp = new Date(
            parseInt(dataPoint.data_time.substring(0, 4)),
            parseInt(dataPoint.data_time.substring(4, 6)) - 1,
            parseInt(dataPoint.data_time.substring(6, 8)),
            parseInt(dataPoint.data_time.substring(8, 10)),
            parseInt(dataPoint.data_time.substring(10, 12))
          ).toISOString();

          readings.push({
            plant_id: plantId,
            timestamp,
            energy_kwh: dataPoint.target_val, // Já em kWh
            power_w: Math.round(currentPower * 1000), // Converter kW para W
            created_at: new Date().toISOString()
          });
        }
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
        system_type: 'sungrow',
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
        system_type: 'sungrow',
        status: 'error',
        message: error.message,
        data_points_synced: dataPointsSynced,
        sync_duration_ms: Date.now() - startTime
      });

    throw error;
  }
}

async function getPlantList(config: SungrowConfig) {
  try {
    const token = await authenticate(config);
    const baseUrl = config.baseUrl || 'https://gateway.isolarcloud.com.hk';

    const response = await fetch(`${baseUrl}/v1/stationService/getStationList`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token
      },
      body: JSON.stringify({
        lang: 'en_us'
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result_code !== 1) {
      throw new Error(`Erro: ${data.result_msg}`);
    }

    return new Response(
      JSON.stringify(data.result_data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    throw new Error(`Erro ao buscar lista de plantas: ${error.message}`);
  }
}
