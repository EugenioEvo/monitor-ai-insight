
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SungrowConfig {
  username: string;
  password: string;
  appkey: string;
  accessKey: string;
  plantId?: string;
  baseUrl?: string;
}

// Configuração padrão para Sungrow
const DEFAULT_CONFIG = {
  baseUrl: 'https://gateway.isolarcloud.com.hk',
  endpoints: {
    login: '/openapi/login',
    deviceList: '/openapi/getDeviceList',
    stationRealKpi: '/openapi/getStationRealKpi',
    stationEnergy: '/openapi/getStationEnergy',
    deviceRealTimeData: '/openapi/getDeviceRealTimeData',
    stationList: '/openapi/getStationList'
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Starting request: ${req.method} ${req.url}`);

  try {
    const { action, config, plantId, period, deviceType } = await req.json();
    console.log(`[${requestId}] Action: ${action}`);
    
    if (plantId) {
      console.log(`[${requestId}] Plant ID: ${plantId}`);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (action) {
      case 'test_connection':
        return await testConnection(config, requestId);
      
      case 'discover_plants':
        return await discoverPlants(config, requestId);
      
      case 'get_station_real_kpi':
        return await getStationRealKpi(config, requestId);
      
      case 'get_station_energy':
        return await getStationEnergy(config, period || 'day', requestId);
      
      case 'get_device_list':
        return await getDeviceList(config, requestId);
      
      case 'get_device_real_time_data':
        return await getDeviceRealTimeData(config, deviceType || '1', requestId);
      
      case 'sync_data':
        return await syncPlantData(supabase, plantId, requestId);
      
      default:
        throw new Error(`Ação não suportada: ${action}`);
    }
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        requestId 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function makeRequest(url: string, body: any, headers: any, requestId: string, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`[${requestId}] Tentativa ${attempt}: ${url}`);
    console.log(`[${requestId}] Headers: ${JSON.stringify({
      ...headers,
      'x-access-key': headers['x-access-key']?.substring(0, 8) + '***'
    })}`);
    console.log(`[${requestId}] Payload: ${JSON.stringify({
      ...body,
      appkey: body.appkey?.substring(0, 8) + '***',
      user_password: body.user_password ? '***' : undefined
    })}`);

    try {
      console.log(`Making request to: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      console.log(`Response status: ${response.status}`);
      console.log(`[${requestId}] Response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[${requestId}] Response: ${JSON.stringify(data)}`);
      
      return data;
    } catch (error) {
      console.error(`[${requestId}] Tentativa ${attempt} falhou:`, error);
      if (attempt === retries) {
        throw error;
      }
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function authenticate(config: SungrowConfig, requestId: string) {
  console.log(`[${requestId}] Authenticating with Sungrow OpenAPI...`);
  
  const headers = {
    'Content-Type': 'application/json',
    'x-access-key': config.accessKey,
    'sys_code': '901',
    'Accept': 'application/json',
    'User-Agent': 'Monitor.ai/1.0',
  };

  const body = {
    appkey: config.appkey,
    user_account: config.username,
    user_password: config.password,
  };

  const response = await makeRequest(
    `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.login}`,
    body,
    headers,
    requestId
  );

  if (response.result_code === '1') {
    console.log(`[${requestId}] Autenticação bem-sucedida com: ${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.login}`);
    return response;
  } else {
    throw new Error(`Falha na autenticação: ${response.result_msg}`);
  }
}

async function testConnection(config: SungrowConfig, requestId: string) {
  console.log(`[${requestId}] Config validation: ${JSON.stringify({
    username: config.username ? config.username.substring(0, 3) + '***' : 'missing',
    password: config.password ? '***provided***' : 'missing',
    appkey: config.appkey ? config.appkey.substring(0, 8) + '***' : 'missing',
    accessKey: config.accessKey ? config.accessKey.substring(0, 8) + '***' : 'missing',
    plantId: config.plantId || 'missing',
    baseUrl: config.baseUrl || DEFAULT_CONFIG.baseUrl
  })}`);

  if (!config.username || !config.password || !config.appkey || !config.accessKey) {
    throw new Error('Configuração incompleta. Verifique username, password, appkey e accessKey.');
  }

  try {
    await authenticate(config, requestId);
    return new Response(
      JSON.stringify({ success: true, message: 'Conexão estabelecida com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[${requestId}] Test connection error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Falha na conexão: ${error.message}`,
        requestId 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function discoverPlants(config: SungrowConfig, requestId: string) {
  console.log(`[${requestId}] Discovering plants...`);
  
  try {
    // Primeiro, autenticar
    await authenticate(config, requestId);

    // Buscar lista de estações
    const headers = {
      'Content-Type': 'application/json',
      'x-access-key': config.accessKey,
      'sys_code': '901',
      'Accept': 'application/json',
      'User-Agent': 'Monitor.ai/1.0',
    };

    const body = {
      appkey: config.appkey,
      has_token: true,
    };

    const response = await makeRequest(
      `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.stationList}`,
      body,
      headers,
      requestId
    );

    if (response.result_code === '1' && response.result_data) {
      const plants = response.result_data.page_list.map((station: any) => ({
        id: station.ps_id,
        ps_id: station.ps_id, // Preservar ps_id
        name: station.ps_name,
        capacity: station.ps_capacity_kw,
        location: station.ps_location,
        status: station.ps_status_text,
        installationDate: station.create_date,
        latitude: station.ps_latitude,
        longitude: station.ps_longitude,
      }));

      console.log(`[${requestId}] Found ${plants.length} plants`);
      
      return new Response(
        JSON.stringify({ success: true, plants }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error(`Falha ao descobrir plantas: ${response.result_msg}`);
    }
  } catch (error) {
    console.error(`[${requestId}] Discover plants error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Falha ao descobrir plantas: ${error.message}`,
        requestId 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function getStationRealKpi(config: SungrowConfig, requestId: string) {
  console.log(`[${requestId}] Fetching station real KPI via OpenAPI`);
  console.log(`[${requestId}] Using Plant ID: ${config.plantId}`);
  
  try {
    // Primeiro, autenticar
    await authenticate(config, requestId);

    const headers = {
      'Content-Type': 'application/json',
      'x-access-key': config.accessKey,
      'sys_code': '901',
      'Accept': 'application/json',
      'User-Agent': 'Monitor.ai/1.0',
    };

    const body = {
      appkey: config.appkey,
      ps_id: config.plantId,
      has_token: true,
    };

    console.log(`[${requestId}] KPI payload: ${JSON.stringify({
      ...body,
      appkey: body.appkey?.substring(0, 8) + '***'
    })}`);

    const response = await makeRequest(
      `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.stationRealKpi}`,
      body,
      headers,
      requestId
    );

    console.log(`[${requestId}] KPI response: ${JSON.stringify(response)}`);

    if (response.result_code === '1') {
      return new Response(
        JSON.stringify({ success: true, data: response.result_data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error(`[${requestId}] KPI fetch error: ${response.result_msg}`);
      throw new Error(`API Error: ${response.result_msg} (Code: ${response.result_code})`);
    }
  } catch (error) {
    console.error(`[${requestId}] Error: ${error.message}, duration: ${Date.now() - parseInt(requestId.split('_')[1])}ms`);
    console.error(`[${requestId}] Stack trace:`, error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Failed to fetch station KPI: ${error.message}`,
        requestId 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function getStationEnergy(config: SungrowConfig, period: string, requestId: string) {
  console.log(`[${requestId}] Fetching station energy for period: ${period} via OpenAPI`);
  console.log(`[${requestId}] Using Plant ID: ${config.plantId}`);
  
  try {
    // Primeiro, autenticar
    await authenticate(config, requestId);

    // Definir parâmetros de data baseado no período
    const now = new Date();
    let startTime: string;
    let endTime: string;
    let dateType: number;

    switch (period) {
      case 'day':
        startTime = now.toISOString().slice(0, 10).replace(/-/g, '');
        endTime = startTime;
        dateType = 1; // Daily data
        break;
      case 'month':
        startTime = now.toISOString().slice(0, 7).replace(/-/g, '');
        endTime = startTime;
        dateType = 2; // Monthly data
        break;
      case 'year':
        startTime = now.getFullYear().toString();
        endTime = startTime;
        dateType = 3; // Yearly data
        break;
      default:
        throw new Error(`Período não suportado: ${period}`);
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-access-key': config.accessKey,
      'sys_code': '901',
      'Accept': 'application/json',
      'User-Agent': 'Monitor.ai/1.0',
    };

    const body = {
      appkey: config.appkey,
      ps_id: config.plantId,
      start_time: startTime,
      end_time: endTime,
      date_type: dateType,
      has_token: true,
    };

    console.log(`[${requestId}] Energy payload: ${JSON.stringify({
      ...body,
      appkey: body.appkey?.substring(0, 8) + '***'
    })}`);

    const response = await makeRequest(
      `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.stationEnergy}`,
      body,
      headers,
      requestId
    );

    console.log(`[${requestId}] Energy response: ${JSON.stringify(response)}`);

    if (response.result_code === '1') {
      return new Response(
        JSON.stringify({ success: true, data: response.result_data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error(`[${requestId}] Energy fetch error: ${response.result_msg}`);
      throw new Error(`API Error: ${response.result_msg} (Code: ${response.result_code})`);
    }
  } catch (error) {
    console.error(`[${requestId}] Error: ${error.message}, duration: ${Date.now() - parseInt(requestId.split('_')[1])}ms`);
    console.error(`[${requestId}] Stack trace:`, error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Failed to fetch station energy: ${error.message}`,
        requestId 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function getDeviceList(config: SungrowConfig, requestId: string) {
  console.log(`[${requestId}] Fetching device list via OpenAPI`);
  
  try {
    // Primeiro, autenticar
    await authenticate(config, requestId);

    const headers = {
      'Content-Type': 'application/json',
      'x-access-key': config.accessKey,
      'sys_code': '901',
      'Accept': 'application/json',
      'User-Agent': 'Monitor.ai/1.0',
    };

    const body = {
      appkey: config.appkey,
      ps_id: config.plantId,
      has_token: true,
    };

    const response = await makeRequest(
      `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.deviceList}`,
      body,
      headers,
      requestId
    );

    if (response.result_code === '1') {
      return new Response(
        JSON.stringify({ success: true, data: response.result_data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error(`API Error: ${response.result_msg} (Code: ${response.result_code})`);
    }
  } catch (error) {
    console.error(`[${requestId}] Error: ${error.message}, duration: ${Date.now() - parseInt(requestId.split('_')[1])}ms`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Failed to fetch device list: ${error.message}`,
        requestId 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function getDeviceRealTimeData(config: SungrowConfig, deviceType: string, requestId: string) {
  console.log(`[${requestId}] Fetching device real-time data via OpenAPI`);
  
  try {
    // Primeiro, autenticar
    await authenticate(config, requestId);

    const headers = {
      'Content-Type': 'application/json',
      'x-access-key': config.accessKey,
      'sys_code': '901',
      'Accept': 'application/json',
      'User-Agent': 'Monitor.ai/1.0',
    };

    const body = {
      appkey: config.appkey,
      ps_id: config.plantId,
      device_type: deviceType,
      has_token: true,
    };

    const response = await makeRequest(
      `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.deviceRealTimeData}`,
      body,
      headers,
      requestId
    );

    if (response.result_code === '1') {
      return new Response(
        JSON.stringify({ success: true, data: response.result_data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error(`API Error: ${response.result_msg} (Code: ${response.result_code})`);
    }
  } catch (error) {
    console.error(`[${requestId}] Error: ${error.message}, duration: ${Date.now() - parseInt(requestId.split('_')[1])}ms`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Failed to fetch device real-time data: ${error.message}`,
        requestId 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function syncPlantData(supabase: any, plantId: string, requestId: string) {
  console.log(`[${requestId}] Starting data sync for plant: ${plantId}`);
  const startTime = Date.now();
  let dataPointsSynced = 0;
  
  try {
    // Buscar dados da planta
    const { data: plant, error: plantError } = await supabase
      .from('plants')
      .select('*')
      .eq('id', plantId)
      .single();

    if (plantError || !plant) {
      throw new Error(`Planta não encontrada: ${plantError?.message}`);
    }

    console.log(`[${requestId}] Plant found: ${plant.name}`);

    if (plant.monitoring_system !== 'sungrow') {
      throw new Error('Planta não é do tipo Sungrow');
    }

    if (!plant.api_credentials) {
      throw new Error('Credenciais da API não configuradas');
    }

    let config = plant.api_credentials as SungrowConfig;
    
    // Garantir que plantId seja definido
    if (!config.plantId && plant.api_site_id) {
      config = { ...config, plantId: plant.api_site_id };
      console.log(`[${requestId}] Using api_site_id as plantId: ${plant.api_site_id}`);
    }

    if (!config.plantId) {
      throw new Error('Plant ID não configurado. Verifique as configurações da planta.');
    }

    console.log(`[${requestId}] Syncing data for plant: ${plant.name} (plantId: ${config.plantId})`);

    // Buscar dados em tempo real
    try {
      console.log(`[${requestId}] Fetching real-time KPI data...`);
      const kpiResponse = await getStationRealKpi(config, requestId);
      const kpiData = await kpiResponse.json();
      
      if (kpiData.success && kpiData.data) {
        console.log(`[${requestId}] KPI data received:`, kpiData.data);
        
        // Inserir leitura na tabela readings
        const currentPower = kpiData.data.p83022 || 0; // Potência atual (kW)
        const todayEnergy = kpiData.data.p83025 || 0; // Energia hoje (kWh)
        
        const { error: readingError } = await supabase
          .from('readings')
          .insert({
            plant_id: plantId,
            timestamp: new Date().toISOString(),
            power_w: Math.round(currentPower * 1000), // Converter kW para W
            energy_kwh: todayEnergy
          });

        if (readingError) {
          console.error(`[${requestId}] Error inserting reading:`, readingError);
        } else {
          dataPointsSynced++;
          console.log(`[${requestId}] Reading inserted successfully`);
        }
      }
    } catch (error) {
      console.error(`[${requestId}] Error fetching KPI data:`, error);
    }

    const syncDuration = Date.now() - startTime;
    console.log(`[${requestId}] Sync completed in ${syncDuration}ms. Data points: ${dataPointsSynced}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sincronização concluída: ${dataPointsSynced} pontos de dados`,
        dataPointsSynced,
        syncDuration,
        requestId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const syncDuration = Date.now() - startTime;
    console.error(`[${requestId}] Sync failed after ${syncDuration}ms:`, error);
    console.error(`[${requestId}] Stack trace:`, error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Falha na sincronização: ${error.message}`,
        dataPointsSynced,
        syncDuration,
        requestId 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
