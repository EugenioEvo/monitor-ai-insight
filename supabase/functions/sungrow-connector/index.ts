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

interface StoredToken {
  access_token: string;
  refresh_token?: string;
  expires_at: string;
  config_hash: string;
}

interface EnrichedPlant {
  id: string;
  ps_id: number;
  name: string;
  capacity: number;
  location: string;
  status: string;
  installationDate: string;
  latitude: number;
  longitude: number;
  // Enriched data
  currentPower?: number;
  dailyEnergy?: number;
  connectivity?: 'online' | 'offline' | 'testing';
  lastUpdate?: string;
  validationStatus?: 'validated' | 'pending' | 'failed';
}

// Cache de autenticação por usuário/sessão (mantido para compatibilidade)
const authCaches = new Map<string, AuthCache>();

// Configuração padrão para Sungrow
const DEFAULT_CONFIG = {
  baseUrl: 'https://gateway.isolarcloud.com.hk',
  endpoints: {
    login: '/openapi/login',
    deviceList: '/openapi/getDeviceList',
    stationRealKpi: '/openapi/getStationRealKpi',
    stationEnergy: '/openapi/getStationEnergy',
    deviceRealTimeData: '/openapi/getDeviceRealTimeData',
    stationList: '/openapi/getStationList',
    token: '/openapi/token'
  }
};

// Códigos de erro da Sungrow API com mapeamento para HTTP status
const SUNGROW_ERROR_CODES = {
  '1': { description: 'Sucesso', httpStatus: 200 },
  '0': { description: 'Falha geral', httpStatus: 400 },
  '401': { description: 'Não autorizado - Token inválido', httpStatus: 401 },
  '403': { description: 'Acesso negado', httpStatus: 403 },
  '500': { description: 'Erro interno do servidor', httpStatus: 500 },
  '1001': { description: 'Parâmetros inválidos', httpStatus: 422 },
  '1002': { description: 'Token expirado', httpStatus: 401 },
  '1003': { description: 'Usuário não encontrado', httpStatus: 404 },
  '1004': { description: 'Senha incorreta', httpStatus: 401 },
  '1005': { description: 'Conta bloqueada', httpStatus: 403 },
  '1006': { description: 'Limite de sessões excedido', httpStatus: 429 }
};

const createErrorResponse = (message: string, status: number, requestId: string, details?: any) => {
  const errorResponse = {
    success: false,
    error: message,
    requestId,
    ...(details && { details })
  };
  
  return new Response(
    JSON.stringify(errorResponse),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
};

const logger = {
  debug: (requestId: string, message: string, data?: any) => {
    console.log(JSON.stringify({ level: 'DEBUG', requestId, message, timestamp: new Date().toISOString(), ...data }));
  },
  info: (requestId: string, message: string, data?: any) => {
    console.log(JSON.stringify({ level: 'INFO', requestId, message, timestamp: new Date().toISOString(), ...data }));
  },
  warn: (requestId: string, message: string, data?: any) => {
    console.warn(JSON.stringify({ level: 'WARN', requestId, message, timestamp: new Date().toISOString(), ...data }));
  },
  error: (requestId: string, message: string, data?: any) => {
    const sanitizedData = data ? sanitizeSensitiveData(data) : undefined;
    console.error(JSON.stringify({ level: 'ERROR', requestId, message, timestamp: new Date().toISOString(), ...sanitizedData }));
  }
};

const sanitizeSensitiveData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveKeys = ['password', 'accessKey', 'access_token', 'refresh_token', 'authorizationCode'];
  const sanitized = { ...data };
  
  for (const key of sensitiveKeys) {
    if (sanitized[key]) {
      sanitized[key] = `${sanitized[key].substring(0, 4)}***`;
    }
  }
  
  return sanitized;
};

const createConfigHash = (config: SungrowConfig): string => {
  const hashData = {
    username: config.username,
    appkey: config.appkey,
    authMode: config.authMode,
    baseUrl: config.baseUrl
  };
  return btoa(JSON.stringify(hashData));
};

const getStoredToken = async (supabase: any, userId: string, config: SungrowConfig): Promise<StoredToken | null> => {
  try {
    const configHash = createConfigHash(config);
    const { data, error } = await supabase
      .from('sungrow_tokens')
      .select('access_token, refresh_token, expires_at, config_hash')
      .eq('user_id', userId)
      .eq('config_hash', configHash)
      .maybeSingle();

    if (error || !data) return null;

    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const marginMs = 5 * 60 * 1000;

    if (expiresAt.getTime() - now.getTime() < marginMs) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
};

const storeToken = async (
  supabase: any, 
  userId: string, 
  config: SungrowConfig, 
  tokenData: { 
    access_token: string; 
    refresh_token?: string; 
    expires_in: number; 
  }
): Promise<void> => {
  try {
    const configHash = createConfigHash(config);
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    await supabase
      .from('sungrow_tokens')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        expires_at: expiresAt.toISOString(),
        config_hash: configHash
      }, {
        onConflict: 'user_id'
      });
  } catch (error) {
    console.warn('Failed to store token:', error);
  }
};

const validateForAction = (config: SungrowConfig, action: string, requestId: string): Response | null => {
  const errors: string[] = [];

  if (!config.appkey) {
    errors.push('appkey é obrigatório');
  }

  if (config.authMode === 'oauth2') {
    if (!config.authorizationCode && !config.accessToken) {
      errors.push('authorizationCode ou accessToken é obrigatório para OAuth2');
    }
    if (config.authorizationCode && !config.redirectUri) {
      errors.push('redirectUri é obrigatório quando usar authorizationCode');
    }
  } else {
    if (!config.username) errors.push('username é obrigatório para autenticação direta');
    if (!config.password) errors.push('password é obrigatório para autenticação direta');
    if (!config.accessKey) errors.push('accessKey é obrigatório para autenticação direta');
  }

  const actionsRequiringPlantId = [
    'get_station_real_kpi', 
    'get_station_energy', 
    'get_device_list', 
    'get_device_real_time_data', 
    'sync_data'
  ];

  if (actionsRequiringPlantId.includes(action) && !config.plantId) {
    errors.push('plantId é obrigatório para esta ação');
  }

  if (errors.length > 0) {
    return createErrorResponse(
      `Configuração inválida: ${errors.join(', ')}`,
      422,
      requestId,
      { missingFields: errors }
    );
  }

  return null;
};

const handleSungrowError = (resultCode: string, resultMsg: string, requestId: string): Response => {
  const errorInfo = SUNGROW_ERROR_CODES[resultCode] || { 
    description: 'Erro desconhecido', 
    httpStatus: 400 
  };
  
  const message = `${errorInfo.description}: ${resultMsg}`;
  return createErrorResponse(message, errorInfo.httpStatus, requestId, { sungrowCode: resultCode });
};

const requestTimes = new Map<string, number>();
const MIN_REQUEST_INTERVAL = 300;

const enforceRateLimit = async (config: SungrowConfig) => {
  const userKey = `${config.username}_${config.appkey}`;
  const now = Date.now();
  const lastRequestTime = requestTimes.get(userKey) || 0;
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  requestTimes.set(userKey, Date.now());
};

async function makeRequest(url: string, body: any, headers: any, requestId: string, config: SungrowConfig, retries = 2) {
  await enforceRateLimit(config);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.debug(requestId, `HTTP Request attempt ${attempt}`, { url, method: 'POST' });
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug(requestId, 'HTTP Response received', { status: response.status, hasData: !!data });
      
      return data;
    } catch (error) {
      logger.warn(requestId, `Request attempt ${attempt} failed`, { error: error.message, url });
      
      if (attempt === retries) {
        throw error;
      }
      
      const backoffMs = Math.min(1000 * Math.pow(1.5, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

async function authenticateOAuth2(config: SungrowConfig, requestId: string, supabase: any, userId: string): Promise<SungrowOAuth2Response> {
  logger.info(requestId, 'Starting OAuth2 authentication', {
    hasAuthCode: !!config.authorizationCode,
    hasAccessToken: !!config.accessToken,
    authMode: config.authMode
  });

  const storedToken = await getStoredToken(supabase, userId, config);
  if (storedToken) {
    logger.info(requestId, 'Using stored valid token');
    return {
      req_serial_num: `stored_${Date.now()}`,
      result_code: '1',
      result_msg: 'success',
      result_data: {
        access_token: storedToken.access_token,
        token_type: 'bearer',
        refresh_token: storedToken.refresh_token || '',
        expires_in: Math.floor((new Date(storedToken.expires_at).getTime() - Date.now()) / 1000),
        auth_ps_list: config.authorizedPlants || [],
        auth_user: 0
      }
    };
  }

  if (config.accessToken && config.tokenExpiresAt && config.tokenExpiresAt > Date.now()) {
    logger.info(requestId, 'Using config access token');
    return {
      req_serial_num: `config_${Date.now()}`,
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

  if (config.refreshToken && !config.authorizationCode) {
    try {
      return await refreshAccessToken(config, requestId, supabase, userId);
    } catch (error) {
      logger.warn(requestId, 'Token refresh failed, need new authorization code', { error: error.message });
      throw new Error('Token expirado. É necessário obter um novo authorization code.');
    }
  }

  if (!config.authorizationCode || !config.redirectUri) {
    throw new Error('Authorization code e redirect URI são obrigatórios para OAuth2');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Monitor.ai/1.0'
  };

  const body = {
    grant_type: 'authorization_code',
    code: config.authorizationCode,
    redirect_uri: config.redirectUri,
    appkey: config.appkey
  };

  const response = await makeRequest(
    `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.token}`,
    body,
    headers,
    requestId,
    config
  );

  if (response.result_code !== '1') {
    return handleSungrowError(response.result_code, response.result_msg, requestId);
  }

  if (response.result_data) {
    await storeToken(supabase, userId, config, response.result_data);
  }

  return response as SungrowOAuth2Response;
}

async function refreshAccessToken(config: SungrowConfig, requestId: string, supabase: any, userId: string): Promise<SungrowOAuth2Response> {
  if (!config.refreshToken) {
    throw new Error('Refresh token não disponível');
  }

  logger.info(requestId, 'Refreshing access token');

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

  const response = await makeRequest(
    `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.token}`,
    body,
    headers,
    requestId,
    config
  );

  if (response.result_code !== '1') {
    return handleSungrowError(response.result_code, response.result_msg, requestId);
  }

  if (response.result_data) {
    await storeToken(supabase, userId, config, response.result_data);
  }

  logger.info(requestId, 'Token refreshed successfully');
  return response as SungrowOAuth2Response;
}

const isTokenValid = (config: SungrowConfig): boolean => {
  const cacheKey = `${config.username}_${config.appkey}`;
  const cache = authCaches.get(cacheKey);
  
  if (!cache?.token || !cache?.expiresAt) return false;
  
  const notExpired = cache.expiresAt > Date.now() + (5 * 60 * 1000);
  
  return notExpired;
};

async function authenticate(config: SungrowConfig, requestId: string, supabase: any, userId: string) {
  logger.info(requestId, 'Starting authentication', {
    authMode: config.authMode,
    hasAccessToken: !!config.accessToken,
    hasRefreshToken: !!config.refreshToken,
    hasAuthCode: !!config.authorizationCode
  });

  if (config.authMode === 'oauth2') {
    const oauthResponse = await authenticateOAuth2(config, requestId, supabase, userId);
    
    if (oauthResponse.result_data) {
      logger.info(requestId, 'OAuth2 authentication successful', {
        token_type: oauthResponse.result_data.token_type,
        expires_in: oauthResponse.result_data.expires_in
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

  const cacheKey = `${config.username}_${config.appkey}`;
  
  if (isTokenValid(config)) {
    const cache = authCaches.get(cacheKey);
    logger.info(requestId, 'Using cached token');
    return { result_code: '1', token: cache?.token };
  }
  
  logger.info(requestId, 'Authenticating with Sungrow OpenAPI (direct method)');
  
  const headers = {
    'Content-Type': 'application/json',
    'x-access-key': config.accessKey!,
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
    requestId,
    config
  );

  if (response.result_code === '1' && response.token) {
    authCaches.set(cacheKey, {
      token: response.token,
      expiresAt: Date.now() + (55 * 60 * 1000),
      config: { ...config }
    });
    
    logger.info(requestId, 'Direct authentication successful');
    return response;
  } else {
    logger.error(requestId, 'Direct authentication failed', {
      result_code: response.result_code,
      result_msg: response.result_msg
    });
    return handleSungrowError(response.result_code, response.result_msg, requestId);
  }
}

// NEW: Enhanced plant validation function
async function validatePlantConnectivity(
  plantId: string, 
  config: SungrowConfig, 
  token: string, 
  requestId: string
): Promise<{ isOnline: boolean; kpiData?: any; error?: string }> {
  try {
    logger.debug(requestId, `Validating connectivity for plant ${plantId}`);
    
    const headers = config.authMode === 'oauth2' 
      ? {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Monitor.ai/1.0'
        }
      : {
          'Content-Type': 'application/json',
          'x-access-key': config.accessKey!,
          'sys_code': '901',
          'token': token,
          'Accept': 'application/json',
          'User-Agent': 'Monitor.ai/1.0',
        };
    
    const body = config.authMode === 'oauth2'
      ? {
          appkey: config.appkey,
          ps_id: plantId
        }
      : {
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
      config,
      1 // Only 1 retry for validation to avoid timeout
    );

    if (response.result_code === '1' && response.result_data) {
      logger.debug(requestId, `Plant ${plantId} is online with KPI data`);
      return {
        isOnline: true,
        kpiData: response.result_data
      };
    } else {
      logger.warn(requestId, `Plant ${plantId} validation failed`, {
        result_code: response.result_code,
        result_msg: response.result_msg
      });
      return {
        isOnline: false,
        error: `${response.result_code}: ${response.result_msg}`
      };
    }
  } catch (error) {
    logger.error(requestId, `Plant ${plantId} connectivity test failed`, { error: error.message });
    return {
      isOnline: false,
      error: error.message
    };
  }
}

// NEW: Enhanced plant enrichment function
async function enrichPlantData(
  plantIds: string[],
  config: SungrowConfig,
  token: string,
  requestId: string
): Promise<EnrichedPlant[]> {
  logger.info(requestId, `Enriching data for ${plantIds.length} plants`);
  
  const enrichedPlants: EnrichedPlant[] = [];
  const MAX_CONCURRENT = 3; // Limit concurrent requests to avoid overwhelming the API
  
  // Process plants in batches
  for (let i = 0; i < plantIds.length; i += MAX_CONCURRENT) {
    const batch = plantIds.slice(i, i + MAX_CONCURRENT);
    const batchPromises = batch.map(async (plantId) => {
      try {
        // First, try to get basic station info if available
        let plantInfo = {
          id: plantId,
          ps_id: parseInt(plantId),
          name: `Planta ${plantId}`,
          capacity: 0,
          location: 'Localização não informada',
          status: 'Unknown',
          installationDate: '',
          latitude: 0,
          longitude: 0,
          connectivity: 'testing' as const,
          validationStatus: 'pending' as const
        };

        // Try to get station list data first for basic info
        if (config.authMode === 'direct') {
          try {
            const stationListHeaders = {
              'Content-Type': 'application/json',
              'x-access-key': config.accessKey!,
              'sys_code': '901',
              'token': token,
              'Accept': 'application/json',
              'User-Agent': 'Monitor.ai/1.0',
            };

            const stationListBody = {
              appkey: config.appkey,
              token,
              has_token: true,
              page_size: 100,
              page_no: 1
            };

            const stationListResponse = await makeRequest(
              `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.stationList}`,
              stationListBody,
              stationListHeaders,
              requestId,
              config,
              1
            );

            if (stationListResponse.result_code === '1' && stationListResponse.result_data?.page_list) {
              const stationData = stationListResponse.result_data.page_list.find(
                (station: any) => station.ps_id.toString() === plantId
              );
              
              if (stationData) {
                plantInfo = {
                  id: plantId,
                  ps_id: stationData.ps_id,
                  name: stationData.ps_name || `Planta ${plantId}`,
                  capacity: parseFloat(stationData.ps_capacity_kw) || 0,
                  location: stationData.ps_location || 'Localização não informada',
                  status: stationData.ps_status_text || 'Unknown',
                  installationDate: stationData.create_date || '',
                  latitude: parseFloat(stationData.ps_latitude) || 0,
                  longitude: parseFloat(stationData.ps_longitude) || 0,
                  connectivity: 'testing' as const,
                  validationStatus: 'pending' as const
                };
              }
            }
          } catch (error) {
            logger.warn(requestId, `Failed to get station list data for plant ${plantId}`, { error: error.message });
          }
        }

        // Now validate connectivity and get real-time data
        const validation = await validatePlantConnectivity(plantId, config, token, requestId);
        
        const enrichedPlant: EnrichedPlant = {
          ...plantInfo,
          connectivity: validation.isOnline ? 'online' : 'offline',
          validationStatus: validation.isOnline ? 'validated' : 'failed',
          lastUpdate: new Date().toISOString()
        };

        // Add KPI data if available
        if (validation.kpiData) {
          enrichedPlant.currentPower = validation.kpiData.p83022 || 0;
          enrichedPlant.dailyEnergy = validation.kpiData.p83025 || 0;
          
          // Update status based on current power
          if (enrichedPlant.currentPower > 0) {
            enrichedPlant.status = 'Gerando';
          } else {
            enrichedPlant.status = 'Inativo';
          }
        }

        logger.debug(requestId, `Plant ${plantId} enriched successfully`, {
          name: enrichedPlant.name,
          capacity: enrichedPlant.capacity,
          connectivity: enrichedPlant.connectivity,
          currentPower: enrichedPlant.currentPower
        });

        return enrichedPlant;
      } catch (error) {
        logger.error(requestId, `Failed to enrich plant ${plantId}`, { error: error.message });
        
        // Return basic plant info even if enrichment fails
        return {
          id: plantId,
          ps_id: parseInt(plantId),
          name: `Planta ${plantId}`,
          capacity: 0,
          location: 'Erro ao carregar localização',
          status: 'Erro',
          installationDate: '',
          latitude: 0,
          longitude: 0,
          connectivity: 'offline' as const,
          validationStatus: 'failed' as const,
          lastUpdate: new Date().toISOString()
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    enrichedPlants.push(...batchResults);
    
    // Add small delay between batches to avoid overwhelming the API
    if (i + MAX_CONCURRENT < plantIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Sort by connectivity status and capacity
  enrichedPlants.sort((a, b) => {
    // Online plants first
    if (a.connectivity === 'online' && b.connectivity !== 'online') return -1;
    if (b.connectivity === 'online' && a.connectivity !== 'online') return 1;
    
    // Then by capacity (descending)
    return b.capacity - a.capacity;
  });

  logger.info(requestId, `Plant enrichment completed`, {
    total: enrichedPlants.length,
    online: enrichedPlants.filter(p => p.connectivity === 'online').length,
    offline: enrichedPlants.filter(p => p.connectivity === 'offline').length
  });

  return enrichedPlants;
}

// UPDATED: Enhanced plant discovery function
async function discoverPlants(config: SungrowConfig, requestId: string, supabase: any, userId: string) {
  try {
    logger.info(requestId, 'Starting enhanced plant discovery');
    
    const validationError = validateForAction(config, 'discover_plants', requestId);
    if (validationError) return validationError;
    
    const authResult = await authenticate(config, requestId, supabase, userId);
    const token = authResult.token;
    
    let discoveredPlantIds: string[] = [];
    
    // Step 1: Get plant IDs from OAuth2 auth_ps_list or station list
    if (config.authMode === 'oauth2' && authResult.oauth_data?.auth_ps_list) {
      logger.info(requestId, 'Using OAuth2 auth_ps_list for discovery', {
        plant_count: authResult.oauth_data.auth_ps_list.length
      });
      
      discoveredPlantIds = authResult.oauth_data.auth_ps_list;
    } else {
      // Fallback to station list API
      logger.info(requestId, 'Using station list API for discovery');
      
      const headers = config.authMode === 'oauth2' 
        ? {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'Monitor.ai/1.0'
          }
        : {
            'Content-Type': 'application/json',
            'x-access-key': config.accessKey!,
            'sys_code': '901',
            'token': token,
            'Accept': 'application/json',
            'User-Agent': 'Monitor.ai/1.0',
          };
      
      const body = config.authMode === 'oauth2'
        ? {
            appkey: config.appkey
          }
        : {
            appkey: config.appkey, 
            token, 
            has_token: true,
            page_size: 50, // Limit to avoid timeout
            page_no: 1
          };

      const response = await makeRequest(
        `${config.baseUrl || DEFAULT_CONFIG.baseUrl}${DEFAULT_CONFIG.endpoints.stationList}`,
        body,
        headers,
        requestId,
        config
      );

      if (response.result_code === '1' && response.result_data?.page_list) {
        discoveredPlantIds = response.result_data.page_list.map((station: any) => 
          station.ps_id.toString()
        );
        logger.info(requestId, `Found ${discoveredPlantIds.length} plants via station list`);
      } else {
        logger.error(requestId, 'Failed to get station list', {
          result_code: response.result_code,
          result_msg: response.result_msg
        });
        return handleSungrowError(response.result_code, response.result_msg, requestId);
      }
    }

    if (discoveredPlantIds.length === 0) {
      logger.warn(requestId, 'No plants found for discovery');
      return new Response(
        JSON.stringify({ 
          success: true, 
          plants: [],
          message: 'Nenhuma planta encontrada na conta'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Enrich plant data with validation and real-time information
    logger.info(requestId, `Starting enrichment for ${discoveredPlantIds.length} plants`);
    const enrichedPlants = await enrichPlantData(discoveredPlantIds, config, token, requestId);

    // Step 3: Return enhanced results with statistics
    const onlinePlants = enrichedPlants.filter(p => p.connectivity === 'online');
    const totalCapacity = enrichedPlants.reduce((sum, p) => sum + p.capacity, 0);
    
    logger.info(requestId, `Discovery completed successfully`, {
      totalPlants: enrichedPlants.length,
      onlinePlants: onlinePlants.length,
      totalCapacity: totalCapacity
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        plants: enrichedPlants,
        statistics: {
          total: enrichedPlants.length,
          online: onlinePlants.length,
          offline: enrichedPlants.length - onlinePlants.length,
          totalCapacity: Math.round(totalCapacity * 10) / 10,
          averageCapacity: enrichedPlants.length > 0 ? Math.round((totalCapacity / enrichedPlants.length) * 10) / 10 : 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logger.error(requestId, 'Enhanced plant discovery failed', { error: error.message });
    return createErrorResponse(`Falha na descoberta de plantas: ${error.message}`, 500, requestId);
  }
}

async function testConnection(config: SungrowConfig, requestId: string, supabase: any, userId: string) {
  try {
    logger.info(requestId, 'Testing connection');

    const validationError = validateForAction(config, 'test_connection', requestId);
    if (validationError) return validationError;

    await authenticate(config, requestId, supabase, userId);
    
    logger.info(requestId, 'Connection test successful');
    
    return new Response(
      JSON.stringify({ success: true, message: 'Conexão estabelecida com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logger.error(requestId, 'Connection test failed', { error: error.message });
    return createErrorResponse(`Falha na conexão: ${error.message}`, 400, requestId);
  }
}

async function getStationRealKpi(config: SungrowConfig, requestId: string, supabase: any, userId: string) {
  try {
    const validationError = validateForAction(config, 'get_station_real_kpi', requestId);
    if (validationError) return validationError;

    const plantId = config.plantId;
    if (!plantId) throw new Error('Plant ID não configurado. Verifique as configurações da planta.');
    logger.info(requestId, `Getting station real KPI: ${plantId}`);
    
    const authResult = await authenticate(config, requestId, supabase, userId);
    const token = authResult.token;
    
    const headers = {
      'Content-Type': 'application/json',
      'x-access-key': config.accessKey!,
      'sys_code': '901',
      'token': token,
      'Accept': 'application/json',
      'User-Agent': 'Monitor.ai/1.0',
    };
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
      const data = response.result_data;
      if (!data) {
        return createErrorResponse('Dados KPI não encontrados na resposta', 404, requestId);
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return handleSungrowError(response.result_code, response.result_msg, requestId);
    }
  } catch (error: any) {
    logger.error(requestId, 'Failed to get station KPI', { error: error.message });
    return createErrorResponse(`Falha ao buscar KPI da estação: ${error.message}`, 500, requestId);
  }
}

async function getStationEnergy(config: SungrowConfig, period: string, requestId: string, supabase: any, userId: string) {
  try {
    const validationError = validateForAction(config, 'get_station_energy', requestId);
    if (validationError) return validationError;

    const plantId = config.plantId;
    if (!plantId) throw new Error('Plant ID não configurado. Verifique as configurações da planta.');
    logger.info(requestId, `Getting station energy: ${plantId}, period: ${period}`);
    
    const authResult = await authenticate(config, requestId, supabase, userId);
    const token = authResult.token;

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
        return createErrorResponse(`Período não suportado: ${period}`, 422, requestId);
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-access-key': config.accessKey!,
      'sys_code': '901',
      'token': token,
      'Accept': 'application/json',
      'User-Agent': 'Monitor.ai/1.0',
    };
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
      return handleSungrowError(response.result_code, response.result_msg, requestId);
    }
  } catch (error: any) {
    logger.error(requestId, 'Failed to get station energy', { error: error.message });
    return createErrorResponse(`Falha ao buscar energia da estação: ${error.message}`, 500, requestId);
  }
}

async function getDeviceList(config: SungrowConfig, requestId: string, supabase: any, userId: string) {
  try {
    const validationError = validateForAction(config, 'get_device_list', requestId);
    if (validationError) return validationError;

    const plantId = config.plantId;
    if (!plantId) throw new Error('Plant ID não configurado. Verifique as configurações da planta.');
    logger.info(requestId, `Getting device list: ${plantId}`);
    
    const authResult = await authenticate(config, requestId, supabase, userId);
    const token = authResult.token;
    
    const headers = {
      'Content-Type': 'application/json',
      'x-access-key': config.accessKey!,
      'sys_code': '901',
      'token': token,
      'Accept': 'application/json',
      'User-Agent': 'Monitor.ai/1.0',
    };
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
      return handleSungrowError(response.result_code, response.result_msg, requestId);
    }
  } catch (error: any) {
    logger.error(requestId, 'Failed to get device list', { error: error.message });
    return createErrorResponse(`Falha ao buscar lista de dispositivos: ${error.message}`, 500, requestId);
  }
}

async function getDeviceRealTimeData(config: SungrowConfig, deviceType: string, requestId: string, supabase: any, userId: string) {
  try {
    const validationError = validateForAction(config, 'get_device_real_time_data', requestId);
    if (validationError) return validationError;

    const plantId = config.plantId;
    if (!plantId) throw new Error('Plant ID não configurado. Verifique as configurações da planta.');
    logger.info(requestId, `Getting device real-time data: ${plantId}, type: ${deviceType}`);
    
    const authResult = await authenticate(config, requestId, supabase, userId);
    const token = authResult.token;
    
    const headers = {
      'Content-Type': 'application/json',
      'x-access-key': config.accessKey!,
      'sys_code': '901',
      'token': token,
      'Accept': 'application/json',
      'User-Agent': 'Monitor.ai/1.0',
    };
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
      return handleSungrowError(response.result_code, response.result_msg, requestId);
    }
  } catch (error: any) {
    logger.error(requestId, 'Failed to get device real-time data', { error: error.message });
    return createErrorResponse(`Falha ao buscar dados em tempo real: ${error.message}`, 500, requestId);
  }
}

async function syncPlantData(supabase: any, plantId: string, requestId: string, userId: string) {
  const startTime = Date.now();
  let dataPointsSynced = 0;
  
  try {
    logger.info(requestId, `Starting plant data sync: ${plantId}`);

    const { data: plant, error: plantError } = await supabase
      .from('plants')
      .select('*')
      .eq('id', plantId)
      .single();

    if (plantError || !plant) {
      return createErrorResponse(`Planta não encontrada: ${plantError?.message}`, 404, requestId);
    }

    if (plant.monitoring_system !== 'sungrow') {
      return createErrorResponse('Planta não é do tipo Sungrow', 422, requestId);
    }

    if (!plant.api_credentials) {
      return createErrorResponse('Credenciais da API não configuradas', 422, requestId);
    }

    let config = plant.api_credentials as SungrowConfig;
    
    if (!config.plantId && plant.api_site_id) {
      config = { ...config, plantId: plant.api_site_id };
    }

    const validationError = validateForAction(config, 'sync_data', requestId);
    if (validationError) return validationError;

    const plantConfigId = config.plantId;
    if (!plantConfigId) throw new Error('Plant ID não configurado. Verifique as configurações da planta.');
    logger.info(requestId, `Syncing plant: ${plant.name} (${plantConfigId})`);

    try {
      const kpiResponse = await getStationRealKpi(config, requestId, supabase, userId);
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
          logger.error(requestId, 'Failed to insert reading', { error: readingError });
        } else {
          dataPointsSynced++;
          logger.info(requestId, 'Reading inserted successfully');
        }
      }
    } catch (error: any) {
      logger.error(requestId, 'Failed to get KPI data', { error: error.message });
    }

    const syncDuration = Date.now() - startTime;
    logger.info(requestId, `Sync completed in ${syncDuration}ms. Points: ${dataPointsSynced}`);

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

  } catch (error: any) {
    const syncDuration = Date.now() - startTime;
    logger.error(requestId, 'Sync failed', { error: error.message });
    
    return createErrorResponse(
      `Falha na sincronização: ${error.message}`,
      500,
      requestId,
      { dataPointsSynced, syncDuration }
    );
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  logger.info(requestId, `Request: ${req.method} ${req.url}`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Missing Authorization header', 401, requestId);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logger.error(requestId, 'Authentication failed', { authError });
      return createErrorResponse('Unauthorized access', 401, requestId);
    }

    logger.info(requestId, `Authenticated user: ${user.email}`);

    const { action, config, plantId, period, deviceType } = await req.json();
    logger.info(requestId, `Action: ${action}`);

    switch (action) {
      case 'test_connection':
        return await testConnection(config, requestId, supabase, user.id);
      case 'discover_plants':
        return await discoverPlants(config, requestId, supabase, user.id);
      case 'get_station_real_kpi':
        return await getStationRealKpi(config, requestId, supabase, user.id);
      case 'get_station_energy':
        return await getStationEnergy(config, period || 'day', requestId, supabase, user.id);
      case 'get_device_list':
        return await getDeviceList(config, requestId, supabase, user.id);
      case 'get_device_real_time_data':
        return await getDeviceRealTimeData(config, deviceType || '1', requestId, supabase, user.id);
      case 'sync_data':
        return await syncPlantData(supabase, plantId, requestId, user.id);
      case 'oauth2_token':
        const oauthResult = await authenticateOAuth2(config, requestId, supabase, user.id);
        return new Response(
          JSON.stringify({ 
            success: oauthResult.result_code === '1', 
            data: oauthResult.result_data,
            message: oauthResult.result_msg
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      default:
        return createErrorResponse(`Ação não suportada: ${action}`, 422, requestId);
    }
  } catch (error: any) {
    logger.error(requestId, 'Request failed', { error: error.message });
    return createErrorResponse('Erro interno do servidor', 500, requestId);
  }
});
