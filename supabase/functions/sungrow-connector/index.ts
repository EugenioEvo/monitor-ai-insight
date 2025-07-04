import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SungrowConfig {
  authMode: 'direct' | 'oauth2';
  username?: string;
  password?: string;
  appkey: string;
  accessKey?: string;
  plantId?: string;
  baseUrl?: string;
  // OAuth2 specific fields
  authorizationCode?: string;
  redirectUri?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  authorizedPlants?: string[];
}

interface SungrowOAuth2Response {
  req_serial_num: string;
  result_code: string;
  result_msg: string;
  result_data?: {
    access_token: string;
    token_type: string;
    refresh_token: string;
    expires_in: number;
    auth_ps_list: string[];
    auth_user: number;
  };
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
const createStandardHeaders = (accessKey: string, token?: string) => ({
  'Content-Type': 'application/json',
  'x-access-key': accessKey,
  'sys_code': '901',
  ...(token && { token }),
  'Accept': 'application/json',
  'User-Agent': 'Monitor.ai/1.0',
});

const validatePlantId = (config: SungrowConfig): string => {
  if (config.plantId) return config.plantId;
  throw new Error('Plant ID não configurado. Verifique as configurações da planta.');
};

const getPlantIdFromConfig = (config: SungrowConfig): string | null => {
  return config.plantId || null;
};

const validateAuthConfig = (config: SungrowConfig, requirePlantId: boolean = false): void => {
  const missingFields = [];
  
  if (!config.appkey) missingFields.push('appkey');
  
  if (config.authMode === 'oauth2') {
    if (!config.authorizationCode && !config.accessToken) {
      missingFields.push('authorizationCode ou accessToken');
    }
    if (config.authorizationCode && !config.redirectUri) {
      missingFields.push('redirectUri');
    }
  } else {
    // Modo direct (padrão)
    if (!config.username) missingFields.push('username');
    if (!config.password) missingFields.push('password');
    if (!config.accessKey) missingFields.push('accessKey');
  }
  
  if (requirePlantId && !config.plantId) missingFields.push('plantId');
  
  if (missingFields.length > 0) {
    throw new Error(`Configuração incompleta. Campos obrigatórios: ${missingFields.join(', ')}`);
  }
};

const validateCredentialsOnly = (config: SungrowConfig): void => {
  validateAuthConfig(config, false);
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

// Rate limiting melhorado e menos agressivo
const requestTimes = new Map<string, number>();
const MIN_REQUEST_INTERVAL = 100; // 100ms entre requests (menos agressivo)

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

// OAuth2 Authentication Functions
async function authenticateOAuth2(config: SungrowConfig, requestId: string): Promise<SungrowOAuth2Response> {
  logRequest(requestId, 'INFO', 'Iniciando autenticação OAuth2', {
    hasAuthCode: !!config.authorizationCode,
    hasAccessToken: !!config.accessToken,
    redirectUri: config.redirectUri,
    authMode: config.authMode
  });

  // Se já temos access token válido, usar ele
  if (config.accessToken && config.tokenExpiresAt && config.tokenExpiresAt > Date.now()) {
    logRequest(requestId, 'INFO', 'Usando access token existente');
    return {
      req_serial_num: `existing_${Date.now()}`,
      result_code: '1',
      result_msg: 'success',
      result_data: {
        access_token: config.accessToken,
        token_type: 'bearer',
        refresh_token: config.refreshToken || '',
        expires_in: Math.floor((config.tokenExpiresAt - Date.now()) / 1000),
        auth_ps_list: config.authorizedPlants || [],
        auth_user: 0
      }
    };
  }

  // Se temos refresh token, tentar renovar
  if (config.refreshToken && !config.authorizationCode) {
    try {
      return await refreshAccessToken(config, requestId);
    } catch (error) {
      logRequest(requestId, 'WARN', 'Falha ao renovar token, será necessário novo authorization code', error);
      throw new Error('Token expirado. É necessário obter um novo authorization code.');
    }
  }

  // Usar authorization code para obter novo token
  if (!config.authorizationCode || !config.redirectUri) {
    throw new Error('Authorization code e redirect URI são obrigatórios para OAuth2');
  }

  // Headers corretos para OAuth2 baseado na documentação
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Monitor.ai/1.0'
  };

  // Body exato da documentação
  const body = {
    grant_type: 'authorization_code',
    code: config.authorizationCode,
    redirect_uri: config.redirectUri,
    appkey: config.appkey
  };

  logRequest(requestId, 'INFO', 'OAuth2 token request', {
    url: `${config.baseUrl || DEFAULT_CONFIG.baseUrl}/openapi/token`,
    grant_type: body.grant_type,
    redirect_uri: config.redirectUri,
    appkey: config.appkey?.substring(0, 8) + '***',
    code_length: config.authorizationCode?.length
  });

  // Endpoint correto baseado na documentação: /openapi/token (não /openapi/apiManage/token)
  const response = await makeRequest(
    `${config.baseUrl || DEFAULT_CONFIG.baseUrl}/openapi/token`,
    body,
    headers,
    requestId,
    config
  );

  logRequest(requestId, 'INFO', 'OAuth2 token response', {
    result_code: response.result_code,
    result_msg: response.result_msg,
    has_data: !!response.result_data,
    auth_ps_list_count: response.result_data?.auth_ps_list?.length || 0
  });

  if (response.result_code !== '1') {
    handleSungrowError(response.result_code, response.result_msg);
  }

  return response as SungrowOAuth2Response;
}

async function refreshAccessToken(config: SungrowConfig, requestId: string): Promise<SungrowOAuth2Response> {
  if (!config.refreshToken) {
    throw new Error('Refresh token não disponível');
  }

  logRequest(requestId, 'INFO', 'Renovando access token via refresh token');

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Monitor.ai/1.0'
  };

  const body = {
    grant_type: 'refresh_token',
    refresh_token: config.refreshToken,
    appkey: config.appkey
  };

  // Endpoint correto para refresh token
  const response = await makeRequest(
    `${config.baseUrl || DEFAULT_CONFIG.baseUrl}/openapi/token`,
    body,
    headers,
    requestId,
    config
  );

  if (response.result_code !== '1') {
    handleSungrowError(response.result_code, response.result_msg);
  }

  logRequest(requestId, 'INFO', 'Token renovado com sucesso');
  return response as SungrowOAuth2Response;
}

async function authenticate(config: SungrowConfig, requestId: string) {
  logRequest(requestId, 'INFO', 'Iniciando autenticação', {
    authMode: config.authMode,
    hasAccessToken: !!config.accessToken,
    hasRefreshToken: !!config.refreshToken,
    hasAuthCode: !!config.authorizationCode
  });

  // Decidir qual método de autenticação usar
  if (config.authMode === 'oauth2') {
    const oauthResponse = await authenticateOAuth2(config, requestId);
    
    if (oauthResponse.result_data) {
      logRequest(requestId, 'INFO', 'OAuth2 authentication successful', {
        token_type: oauthResponse.result_data.token_type,
        expires_in: oauthResponse.result_data.expires_in,
        auth_ps_list_count: oauthResponse.result_data.auth_ps_list?.length || 0
      });
      
      return {
        result_code: '1',
        token: oauthResponse.result_data.access_token,
        oauth_data: oauthResponse.result_data
      };
    } else {
      throw new Error('Falha na autenticação OAuth2: result_data não encontrado');
    }
  }

  // Método direto (original)
  const cacheKey = getUserCacheKey(config);
  
  // Verificar cache primeiro
  if (isTokenValid(config)) {
    const cache = authCaches.get(cacheKey);
    logRequest(requestId, 'INFO', 'Usando token em cache');
    return { result_code: '1', token: cache?.token };
  }
  
  logRequest(requestId, 'INFO', 'Autenticando com Sungrow OpenAPI (método direto)', {
    username: config.username?.substring(0, 3) + '***',
    appkey: config.appkey?.substring(0, 8) + '***',
    baseUrl: config.baseUrl || DEFAULT_CONFIG.baseUrl,
    hasAccessKey: !!config.accessKey
  });
  
  // Validar credenciais para método direto
  if (!config.accessKey) {
    throw new Error('Access Key é obrigatório para autenticação direta');
  }
  
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

  logRequest(requestId, 'INFO', 'Direct auth response', {
    result_code: response.result_code,
    result_msg: response.result_msg,
    has_token: !!response.token
  });

  if (response.result_code === '1' && response.token) {
    // Armazenar no cache por usuário (token válido por 55 minutos para margem)
    authCaches.set(cacheKey, {
      token: response.token,
      expiresAt: Date.now() + (55 * 60 * 1000), // 55 min para margem
      config: { ...config }
    });
    
    logRequest(requestId, 'INFO', 'Autenticação direta bem-sucedida');
    return response;
  } else {
    logRequest(requestId, 'ERROR', 'Falha na autenticação direta', {
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

    validateCredentialsOnly(config); // Validar apenas credenciais

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
      authMode: config.authMode,
      username: config.username?.substring(0, 3) + '***',
      hasCredentials: !!(config.appkey && (config.accessKey || config.accessToken))
    });
    
    // Validar apenas credenciais de autenticação, não plantId para descoberta
    validateCredentialsOnly(config);
    
    const authResult = await authenticate(config, requestId);
    
    // Para OAuth2, usar auth_ps_list se disponível
    if (config.authMode === 'oauth2' && authResult.oauth_data?.auth_ps_list) {
      logRequest(requestId, 'INFO', 'Usando auth_ps_list do OAuth2', {
        plant_count: authResult.oauth_data.auth_ps_list.length
      });
      
      // Retornar plantas autorizadas do OAuth2
      const plants = authResult.oauth_data.auth_ps_list.map((plantId: string, index: number) => ({
        id: plantId,
        ps_id: parseInt(plantId),
        name: `Planta ${plantId}`,
        capacity: 0, // Não temos esta informação no OAuth2
        location: 'OAuth2 Authorized Plant',
        status: 'Active',
        installationDate: '',
        latitude: 0,
        longitude: 0,
      }));

      return new Response(
        JSON.stringify({ success: true, plants }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Para método direto, usar getStationList
    const token = authResult.token;
    
    // Headers corretos para o método direto
    const headers = config.authMode === 'oauth2' 
      ? {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Monitor.ai/1.0'
        }
      : createStandardHeaders(config.accessKey, token);
    
    // Body correto baseado no modo de autenticação
    const body = config.authMode === 'oauth2'
      ? {
          appkey: config.appkey
        }
      : {
          appkey: config.appkey, 
          token, 
          has_token: true
        };

    logRequest(requestId, 'INFO', 'Fazendo request para getStationList', {
      authMode: config.authMode,
      url: `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.stationList}`,
      hasToken: !!token
    });

    const response = await makeRequest(
      `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.stationList}`,
      body,
      headers,
      requestId,
      config
    );

    logRequest(requestId, 'INFO', 'Response recebida do getStationList', {
      result_code: response.result_code,
      result_msg: response.result_msg,
      has_data: !!response.result_data,
      page_list_length: response.result_data?.page_list?.length || 0,
      response_keys: response.result_data ? Object.keys(response.result_data) : []
    });

    if (response.result_code === '1' && response.result_data) {
      // Verificar se temos page_list
      if (!response.result_data.page_list || !Array.isArray(response.result_data.page_list)) {
        logRequest(requestId, 'WARN', 'Formato de resposta inesperado', {
          result_data: response.result_data
        });
        throw new Error('Formato de resposta inválido: page_list não encontrado');
      }

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
      logRequest(requestId, 'ERROR', 'API retornou erro para getStationList', {
        result_code: response.result_code,
        result_msg: response.result_msg,
        full_response: response
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
    
    const { token } = await authenticate(config, requestId);
    const headers = createStandardHeaders(config.accessKey, token);
    const body = {
      appkey: config.appkey,
      ps_id: plantId,
      token,
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
    
    const { token } = await authenticate(config, requestId);

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

    const headers = createStandardHeaders(config.accessKey, token);
    const body = {
      appkey: config.appkey,
      ps_id: plantId,
      start_time: startTime,
      end_time: endTime,
      date_type: dateType,
      token,
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
    
    const { token } = await authenticate(config, requestId);
    const headers = createStandardHeaders(config.accessKey, token);
    const body = {
      appkey: config.appkey,
      ps_id: plantId,
      token,
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
    
    const { token } = await authenticate(config, requestId);
    const headers = createStandardHeaders(config.accessKey, token);
    const body = {
      appkey: config.appkey,
      ps_id: plantId,
      device_type: deviceType,
      token,
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
          .upsert({
            plant_id: plantId,
            timestamp: new Date().toISOString(),
            power_w: Math.round(currentPower * 1000),
            energy_kwh: todayEnergy
          }, {
            onConflict: 'plant_id,timestamp',
            ignoreDuplicates: false
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Check authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logRequest(requestId, 'ERROR', 'Authentication failed', { authError });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized access',
          requestId 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    logRequest(requestId, 'INFO', `Authenticated user: ${user.email}`);

    const { action, config, plantId, period, deviceType } = await req.json();
    logRequest(requestId, 'INFO', `Action: ${action}`);

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
      case 'oauth2_token':
        const oauthResult = await authenticateOAuth2(config, requestId);
        return new Response(
          JSON.stringify({ 
            success: oauthResult.result_code === '1', 
            data: oauthResult.result_data,
            message: oauthResult.result_msg
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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