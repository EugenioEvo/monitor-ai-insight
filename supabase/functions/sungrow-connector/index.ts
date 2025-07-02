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

interface AuthCache {
  token?: string;
  expiresAt?: number;
  config?: SungrowConfig;
}

// Cache de autenticação por usuário/sessão
const authCaches = new Map<string, AuthCache>();

const getUserCacheKey = (config: SungrowConfig): string => {
  return `${config.username}_${config.appkey}`;
};

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

// Códigos de erro da Sungrow API
const SUNGROW_ERROR_CODES = {
  '1': 'Sucesso',
  '0': 'Falha geral',
  '401': 'Não autorizado - Token inválido',
  '403': 'Acesso negado',
  '500': 'Erro interno do servidor',
  '1001': 'Parâmetros inválidos',
  '1002': 'Token expirado'
};

// Utility functions
const createStandardHeaders = (accessKey: string) => ({
  'Content-Type': 'application/json',
  'x-access-key': accessKey,
  'sys_code': '901',
  'Accept': 'application/json',
  'User-Agent': 'Monitor.ai/1.0',
});

const validatePlantId = (config: SungrowConfig): string => {
  if (config.plantId) return config.plantId;
  throw new Error('Plant ID não configurado. Verifique as configurações da planta.');
};

const validateAuthConfig = (config: SungrowConfig, requirePlantId: boolean = false): void => {
  const missingFields = [];
  if (!config.username) missingFields.push('username');
  if (!config.password) missingFields.push('password');
  if (!config.appkey) missingFields.push('appkey');
  if (!config.accessKey) missingFields.push('accessKey');
  if (requirePlantId && !config.plantId) missingFields.push('plantId');
  
  if (missingFields.length > 0) {
    throw new Error(`Configuração incompleta. Campos obrigatórios: ${missingFields.join(', ')}`);
  }
};

const logRequest = (requestId: string, level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  if (level === 'ERROR') {
    console.error(`[${requestId}] ${timestamp} ${message}`, data);
  } else {
    console.log(`[${requestId}] ${timestamp} ${message}`, data);
  }
};

const handleSungrowError = (resultCode: string, resultMsg: string) => {
  const errorDescription = SUNGROW_ERROR_CODES[resultCode] || 'Erro desconhecido';
  throw new Error(`${errorDescription}: ${resultMsg} (Código: ${resultCode})`);
};

const isTokenValid = (config: SungrowConfig): boolean => {
  const cacheKey = getUserCacheKey(config);
  const cache = authCaches.get(cacheKey);
  
  if (!cache?.token || !cache?.expiresAt) return false;
  
  // Token válido por mais 5 minutos
  const notExpired = cache.expiresAt > Date.now() + (5 * 60 * 1000);
  
  return notExpired;
};

// Rate limiting melhorado
const requestTimes = new Map<string, number>();
const MIN_REQUEST_INTERVAL = 200; // 200ms entre requests (mais estável)

const enforceRateLimit = async (config: SungrowConfig) => {
  const userKey = getUserCacheKey(config);
  const now = Date.now();
  const lastRequestTime = requestTimes.get(userKey) || 0;
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  requestTimes.set(userKey, Date.now());
};

async function makeRequest(url: string, body: any, headers: any, requestId: string, config: SungrowConfig, retries = 3) {
  await enforceRateLimit(config);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logRequest(requestId, 'INFO', `Tentativa ${attempt}: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      logRequest(requestId, 'INFO', 'Response received', { status: response.status });
      
      return data;
    } catch (error) {
      logRequest(requestId, 'ERROR', `Tentativa ${attempt} falhou`, error);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Backoff exponencial
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}

async function authenticate(config: SungrowConfig, requestId: string) {
  const cacheKey = getUserCacheKey(config);
  
  // Verificar cache primeiro
  if (isTokenValid(config)) {
    const cache = authCaches.get(cacheKey);
    logRequest(requestId, 'INFO', 'Usando token em cache');
    return { result_code: '1', token: cache?.token };
  }
  
  logRequest(requestId, 'INFO', 'Autenticando com Sungrow OpenAPI', {
    username: config.username?.substring(0, 3) + '***',
    appkey: config.appkey?.substring(0, 8) + '***',
    baseUrl: config.baseUrl || DEFAULT_CONFIG.baseUrl
  });
  
  const headers = createStandardHeaders(config.accessKey);
  const body = {
    appkey: config.appkey,
    user_account: config.username,
    user_password: config.password,
  };

  const response = await makeRequest(
    `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.login}`,
    body,
    headers,
    requestId,
    config
  );

  if (response.result_code === '1') {
    // Armazenar no cache por usuário (token válido por 1 hora)
    authCaches.set(cacheKey, {
      token: response.token || 'authenticated',
      expiresAt: Date.now() + (60 * 60 * 1000), // 1 hora
      config: { ...config }
    });
    
    logRequest(requestId, 'INFO', 'Autenticação bem-sucedida');
    return response;
  } else {
    logRequest(requestId, 'ERROR', 'Falha na autenticação', {
      result_code: response.result_code,
      result_msg: response.result_msg
    });
    handleSungrowError(response.result_code, response.result_msg);
  }
}

async function testConnection(config: SungrowConfig, requestId: string) {
  try {
    logRequest(requestId, 'INFO', 'Testando conexão', {
      username: config.username?.substring(0, 3) + '***',
      hasCredentials: !!(config.appkey && config.accessKey)
    });

    validateAuthConfig(config, false); // Não requer plantId para teste de conexão

    await authenticate(config, requestId);
    
    logRequest(requestId, 'INFO', 'Conexão estabelecida com sucesso');
    
    return new Response(
      JSON.stringify({ success: true, message: 'Conexão estabelecida com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logRequest(requestId, 'ERROR', 'Falha no teste de conexão', {
      error: error.message,
      stack: error.stack
    });
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
  try {
    logRequest(requestId, 'INFO', 'Descobrindo plantas', {
      username: config.username?.substring(0, 3) + '***',
      hasCredentials: !!(config.appkey && config.accessKey)
    });
    
    // Validar apenas credenciais de autenticação, não plantId para descoberta
    validateAuthConfig(config, false);
    
    await authenticate(config, requestId);
    const headers = createStandardHeaders(config.accessKey);
    const body = { appkey: config.appkey, has_token: true };

    logRequest(requestId, 'INFO', 'Fazendo request para getStationList');

    const response = await makeRequest(
      `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.stationList}`,
      body,
      headers,
      requestId,
      config
    );

    logRequest(requestId, 'INFO', 'Response recebida do getStationList', {
      result_code: response.result_code,
      has_data: !!response.result_data,
      page_list_length: response.result_data?.page_list?.length || 0
    });

    if (response.result_code === '1' && response.result_data) {
      const plants = response.result_data.page_list.map((station: any) => ({
        id: station.ps_id.toString(), // Garantir que seja string
        ps_id: station.ps_id,
        name: station.ps_name,
        capacity: parseFloat(station.ps_capacity_kw) || 0,
        location: station.ps_location,
        status: station.ps_status_text || 'Unknown',
        installationDate: station.create_date,
        latitude: parseFloat(station.ps_latitude) || 0,
        longitude: parseFloat(station.ps_longitude) || 0,
      }));

      logRequest(requestId, 'INFO', `${plants.length} plantas encontradas e processadas`);
      
      return new Response(
        JSON.stringify({ success: true, plants }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      logRequest(requestId, 'ERROR', 'API retornou erro', {
        result_code: response.result_code,
        result_msg: response.result_msg
      });
      handleSungrowError(response.result_code, response.result_msg);
    }
  } catch (error) {
    logRequest(requestId, 'ERROR', 'Erro ao descobrir plantas', {
      error: error.message,
      stack: error.stack
    });
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
  try {
    const plantId = validatePlantId(config);
    logRequest(requestId, 'INFO', `Buscando KPI real da estação: ${plantId}`);
    
    await authenticate(config, requestId);
    const headers = createStandardHeaders(config.accessKey);
    const body = {
      appkey: config.appkey,
      ps_id: plantId,
      has_token: true,
    };

    const response = await makeRequest(
      `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.stationRealKpi}`,
      body,
      headers,
      requestId,
      config
    );

    if (response.result_code === '1') {
      // Validar dados essenciais
      const data = response.result_data;
      if (!data) {
        throw new Error('Dados KPI não encontrados na resposta');
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      handleSungrowError(response.result_code, response.result_msg);
    }
  } catch (error) {
    logRequest(requestId, 'ERROR', 'Erro ao buscar KPI', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Falha ao buscar KPI da estação: ${error.message}`,
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
  try {
    const plantId = validatePlantId(config);
    logRequest(requestId, 'INFO', `Buscando energia da estação: ${plantId}, período: ${period}`);
    
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
        dateType = 1;
        break;
      case 'month':
        startTime = now.toISOString().slice(0, 7).replace(/-/g, '');
        endTime = startTime;
        dateType = 2;
        break;
      case 'year':
        startTime = now.getFullYear().toString();
        endTime = startTime;
        dateType = 3;
        break;
      default:
        throw new Error(`Período não suportado: ${period}`);
    }

    const headers = createStandardHeaders(config.accessKey);
    const body = {
      appkey: config.appkey,
      ps_id: plantId,
      start_time: startTime,
      end_time: endTime,
      date_type: dateType,
      has_token: true,
    };

    const response = await makeRequest(
      `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.stationEnergy}`,
      body,
      headers,
      requestId,
      config
    );

    if (response.result_code === '1') {
      return new Response(
        JSON.stringify({ success: true, data: response.result_data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      handleSungrowError(response.result_code, response.result_msg);
    }
  } catch (error) {
    logRequest(requestId, 'ERROR', 'Erro ao buscar energia', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Falha ao buscar energia da estação: ${error.message}`,
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
  try {
    const plantId = validatePlantId(config);
    logRequest(requestId, 'INFO', `Buscando lista de dispositivos: ${plantId}`);
    
    await authenticate(config, requestId);
    const headers = createStandardHeaders(config.accessKey);
    const body = {
      appkey: config.appkey,
      ps_id: plantId,
      has_token: true,
    };

    const response = await makeRequest(
      `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.deviceList}`,
      body,
      headers,
      requestId,
      config
    );

    if (response.result_code === '1') {
      return new Response(
        JSON.stringify({ success: true, data: response.result_data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      handleSungrowError(response.result_code, response.result_msg);
    }
  } catch (error) {
    logRequest(requestId, 'ERROR', 'Erro ao buscar dispositivos', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Falha ao buscar lista de dispositivos: ${error.message}`,
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
  try {
    const plantId = validatePlantId(config);
    logRequest(requestId, 'INFO', `Buscando dados em tempo real: ${plantId}, tipo: ${deviceType}`);
    
    await authenticate(config, requestId);
    const headers = createStandardHeaders(config.accessKey);
    const body = {
      appkey: config.appkey,
      ps_id: plantId,
      device_type: deviceType,
      has_token: true,
    };

    const response = await makeRequest(
      `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.deviceRealTimeData}`,
      body,
      headers,
      requestId,
      config
    );

    if (response.result_code === '1') {
      return new Response(
        JSON.stringify({ success: true, data: response.result_data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      handleSungrowError(response.result_code, response.result_msg);
    }
  } catch (error) {
    logRequest(requestId, 'ERROR', 'Erro ao buscar dados em tempo real', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Falha ao buscar dados em tempo real: ${error.message}`,
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
  const startTime = Date.now();
  let dataPointsSynced = 0;
  
  try {
    logRequest(requestId, 'INFO', `Iniciando sincronização: ${plantId}`);

    // Buscar dados da planta
    const { data: plant, error: plantError } = await supabase
      .from('plants')
      .select('*')
      .eq('id', plantId)
      .single();

    if (plantError || !plant) {
      throw new Error(`Planta não encontrada: ${plantError?.message}`);
    }

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
    }

    const plantConfigId = validatePlantId(config);
    logRequest(requestId, 'INFO', `Sincronizando planta: ${plant.name} (${plantConfigId})`);

    // Buscar dados em tempo real
    try {
      const kpiResponse = await getStationRealKpi(config, requestId);
      const kpiData = await kpiResponse.json();
      
      if (kpiData.success && kpiData.data) {
        const currentPower = kpiData.data.p83022 || 0;
        const todayEnergy = kpiData.data.p83025 || 0;
        
        const { error: readingError } = await supabase
          .from('readings')
          .insert({
            plant_id: plantId,
            timestamp: new Date().toISOString(),
            power_w: Math.round(currentPower * 1000),
            energy_kwh: todayEnergy
          });

        if (readingError) {
          logRequest(requestId, 'ERROR', 'Erro ao inserir leitura', readingError);
        } else {
          dataPointsSynced++;
          logRequest(requestId, 'INFO', 'Leitura inserida com sucesso');
        }
      }
    } catch (error) {
      logRequest(requestId, 'ERROR', 'Erro ao buscar dados KPI', error);
    }

    const syncDuration = Date.now() - startTime;
    logRequest(requestId, 'INFO', `Sincronização concluída em ${syncDuration}ms. Pontos: ${dataPointsSynced}`);

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
    logRequest(requestId, 'ERROR', 'Falha na sincronização', error);
    
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  logRequest(requestId, 'INFO', `Request: ${req.method} ${req.url}`);

  try {
    const { action, config, plantId, period, deviceType } = await req.json();
    logRequest(requestId, 'INFO', `Action: ${action}`);

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
    logRequest(requestId, 'ERROR', 'Request failed', error);
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