import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// Flexible Supabase credentials management with fallbacks
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                   (globalThis as any).SUPABASE_URL || 
                   undefined;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                   (globalThis as any).SUPABASE_SERVICE_ROLE_KEY || 
                   undefined;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment or Lovable secrets.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Complete CORS headers with all required methods
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

interface SungrowConfig {
  username: string;
  password: string;
  appkey: string;
  accessKey: string;
  baseUrl?: string;
  plantId?: string;
}

interface SungrowAuthResponse {
  result_code: number | string;
  result_msg: string;
  result_data: {
    token: string;
    token_timeout: number;
  };
}

interface ApiCache {
  [key: string]: {
    data: any;
    timestamp: number;
    ttl: number;
  };
}

// Cache em memória com TTL configurável
const apiCache: ApiCache = {};

// Intelligent rate limiting with smart reset
let rateLimitDelay = 0;
const MAX_DELAY = 300000; // 5 minutos
const BASE_DELAY = 60000; // 1 minuto

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let reqSerialNum = '';

  try {
    const { action, plantId, config, period, deviceType, cacheKey } = await req.json();
    reqSerialNum = generateRequestId();
    
    console.log(`[${reqSerialNum}] Starting request: ${action}`);
    console.log(`[${reqSerialNum}] Config validation:`, {
      username: config?.username ? `${config.username.substring(0, 3)}***` : 'missing',
      password: config?.password ? '***provided***' : 'missing',
      appkey: config?.appkey ? `${config.appkey.substring(0, 8)}***` : 'missing',
      accessKey: config?.accessKey ? `${config.accessKey.substring(0, 8)}***` : 'missing',
      baseUrl: config?.baseUrl || 'default'
    });
    
    // Validação robusta das credenciais
    if (action !== 'test_connection' && action !== 'discover_plants' && action !== 'get_plant_list') {
      if (!config?.username || !config?.password || !config?.appkey || !config?.accessKey) {
        throw new Error('Credenciais incompletas. Verifique se todos os campos estão preenchidos: username, password, appkey e accessKey são obrigatórios.');
      }
    }
    
    // Rate limiting check with smart delay
    if (rateLimitDelay > 0) {
      console.log(`[${reqSerialNum}] Rate limited, waiting ${rateLimitDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
    }
    
    let result;
    let rowCount = 0;
    
    switch (action) {
      case 'test_connection':
        result = await testConnection(config, reqSerialNum);
        break;
      case 'sync_data':
        result = await syncData(plantId, reqSerialNum);
        break;
      case 'get_plant_list':
        result = await getPlantList(config, reqSerialNum);
        break;
      case 'discover_plants':
        result = await discoverPlants(config, reqSerialNum);
        break;
      case 'get_device_list':
        result = await getDeviceList(config, reqSerialNum);
        break;
      case 'get_station_real_kpi':
        result = await getStationRealKpi(config, reqSerialNum, cacheKey);
        break;
      case 'get_station_energy':
        result = await getStationEnergy(config, period || 'day', reqSerialNum, cacheKey);
        break;
      case 'get_device_real_time_data':
        result = await getDeviceRealTimeData(config, deviceType, reqSerialNum, cacheKey);
        break;
      default:
        throw new Error(`Ação não suportada: ${action}`);
    }

    // Smart reset of rate limit on success or non-rate-limit errors
    if (rateLimitDelay > 0) {
      console.log(`[${reqSerialNum}] Request successful, resetting rate limit delay`);
      rateLimitDelay = 0;
    }
    
    const duration = Date.now() - startTime;
    if (result.data && Array.isArray(result.data)) {
      rowCount = result.data.length;
    } else if (result.success) {
      rowCount = 1;
    }

    console.log(`[${reqSerialNum}] Success: ${action}, duration: ${duration}ms, rows: ${rowCount}`);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Enhanced error handling with specific Sungrow error details
    let errorMessage = error.message;
    let statusCode = 500;
    
    // Handle rate limiting with exponential backoff
    if (error.message.includes('429') || error.message.includes('000110')) {
      rateLimitDelay = Math.min(rateLimitDelay === 0 ? BASE_DELAY : rateLimitDelay * 2, MAX_DELAY);
      console.error(`[${reqSerialNum}] Rate limited, next delay: ${rateLimitDelay}ms`);
      statusCode = 429;
      errorMessage = `Rate limit exceeded. Próxima tentativa em ${Math.round(rateLimitDelay / 1000)} segundos.`;
    } else if (error.message.includes('401')) {
      statusCode = 401;
      errorMessage = 'Credenciais inválidas. Verifique username, password, appkey e accessKey.';
    } else if (error.message.includes('403')) {
      statusCode = 403;
      errorMessage = 'Acesso negado. Verifique se sua accessKey tem as permissões necessárias.';
    } else if (error.message.includes('Supabase credentials')) {
      statusCode = 500;
      errorMessage = 'Configuração do servidor incompleta. Entre em contato com o administrador.';
    }
    
    console.error(`[${reqSerialNum}] Error: ${errorMessage}, duration: ${duration}ms`);
    console.error(`[${reqSerialNum}] Stack trace:`, error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: error.message !== errorMessage ? error.message : undefined,
        reqSerialNum 
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getCacheKey(endpoint: string, params: any): string {
  return `${endpoint}_${JSON.stringify(params)}`;
}

function getFromCache(key: string): any | null {
  const cached = apiCache[key];
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    delete apiCache[key];
    return null;
  }
  
  return cached.data;
}

function setCache(key: string, data: any, ttlMs: number): void {
  apiCache[key] = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs
  };
}

async function authenticateWithRetry(config: SungrowConfig, reqSerialNum: string): Promise<string> {
  const cacheKey = `auth_${config.username}_${config.accessKey}`;
  
  // Check cache first (TTL 23 hours to avoid expiration issues)
  const cachedToken = getFromCache(cacheKey);
  if (cachedToken) {
    console.log(`[${reqSerialNum}] Using cached token`);
    return cachedToken;
  }
  
  console.log(`[${reqSerialNum}] Authenticating with Sungrow...`);
  
  // Enhanced credential validation
  const missingFields = [];
  if (!config.username) missingFields.push('username');
  if (!config.password) missingFields.push('password');
  if (!config.appkey) missingFields.push('appkey');
  if (!config.accessKey) missingFields.push('accessKey');
  
  if (missingFields.length > 0) {
    throw new Error(`Campos obrigatórios ausentes: ${missingFields.join(', ')}`);
  }

  // Updated international Sungrow servers
  const baseUrls = [
    'https://web3.isolarcloud.com.hk',
    'https://web3.isolarcloud.com',
    'https://gateway.isolarcloud.com.hk',
    'https://gateway.isolarcloud.com',
    'https://api.isolarcloud.com.hk',
    'https://api.isolarcloud.com'
  ];

  const endpoints = [
    '/v1/userService/login',
    '/userService/login',
    '/api/v1/userService/login',
    '/api/userService/login'
  ];

  let lastError = null;
  let attemptCount = 0;

  for (const baseUrl of baseUrls) {
    for (const endpoint of endpoints) {
      attemptCount++;
      try {
        console.log(`[${reqSerialNum}] Tentativa ${attemptCount}: ${baseUrl}${endpoint}`);
        
        // Enhanced payload with proper field mapping
        const authPayload = {
          appkey: config.appkey,
          user_account: config.username,
          user_password: config.password,
          lang: 'en_us'
        };

        console.log(`[${reqSerialNum}] Payload:`, {
          appkey: `${config.appkey.substring(0, 8)}***`,
          user_account: config.username,
          user_password: '***',
          lang: 'en_us'
        });

        const headers = {
          'Content-Type': 'application/json',
          'x-access-key': config.accessKey,
          'Accept': 'application/json',
          'User-Agent': 'Monitor.ai/1.0',
          'Origin': baseUrl,
          'Referer': `${baseUrl}/`
        };

        console.log(`[${reqSerialNum}] Headers:`, {
          'Content-Type': 'application/json',
          'x-access-key': `${config.accessKey.substring(0, 8)}***`,
          'Accept': 'application/json',
          'User-Agent': 'Monitor.ai/1.0'
        });

        const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(authPayload)
        }, 30000);

        console.log(`[${reqSerialNum}] Response status: ${response.status}`);

        // Enhanced error handling with specific Sungrow details
        if (!response.ok) {
          const errorDetail = await response.text();
          console.error(`[${reqSerialNum}] HTTP ${response.status}: ${errorDetail}`);
          
          if (response.status === 401) {
            throw new Error(`401 Unauthorized: Credenciais inválidas. Verifique username, password e accessKey. Detalhes: ${errorDetail}`);
          } else if (response.status === 403) {
            throw new Error(`403 Forbidden: AccessKey sem permissão ou inválida. Detalhes: ${errorDetail}`);
          } else if (response.status === 429) {
            throw new Error(`429 Rate Limited: Muitas tentativas. Aguarde antes de tentar novamente. Detalhes: ${errorDetail}`);
          }
          
          lastError = new Error(`Sungrow ${response.status}: ${errorDetail}`);
          continue;
        }

        const data: SungrowAuthResponse = await response.json();
        console.log(`[${reqSerialNum}] Response:`, {
          result_code: data.result_code,
          result_msg: data.result_msg,
          has_token: !!data.result_data?.token
        });
        
        if (data.result_code === 1 && data.result_data?.token) {
          // Cache token for 23 hours
          setCache(cacheKey, data.result_data.token, 82800000);
          
          console.log(`[${reqSerialNum}] Autenticação bem-sucedida com: ${baseUrl}${endpoint}`);
          return data.result_data.token;
        } else {
          const errorMsg = `Erro de autenticação: ${data.result_msg} (Código: ${data.result_code})`;
          console.error(`[${reqSerialNum}] ${errorMsg}`);
          
          // Enhanced error messages with specific guidance
          if (data.result_code === 'E00000' || data.result_msg === 'er_invalid_appkey') {
            throw new Error('App Key inválida. Verifique se a chave da aplicação está correta e foi obtida do portal oficial Sungrow.');
          } else if (data.result_code === 'E00001' || data.result_msg.includes('user')) {
            throw new Error('Usuário ou senha incorretos. Verifique suas credenciais de login do portal iSolarCloud.');
          } else if (data.result_code === 'E00002' || data.result_msg.includes('access')) {
            throw new Error('Access Key inválida. Verifique o valor da chave de acesso obtida no portal.');
          }
          
          lastError = new Error(errorMsg);
        }
      } catch (error) {
        console.error(`[${reqSerialNum}] Falha na requisição para ${baseUrl}${endpoint}: ${error.message}`);
        lastError = error;
        
        // If it's a credential error, don't continue trying other endpoints
        if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Credential')) {
          throw error;
        }
      }
    }
  }

  throw new Error(`Falha na autenticação após ${attemptCount} tentativas. Último erro: ${lastError?.message || 'Erro desconhecido'}`);
}

// Replace AbortSignal.timeout with manual AbortController
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  try {
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    console.log(`Response status: ${response.status}`);
    
    // Smart rate limit reset - if we get a successful response or non-rate-limit error
    if (response.ok || (response.status < 429 && response.status !== 401 && response.status !== 403)) {
      if (rateLimitDelay > 0) {
        console.log(`Request to ${url} successful, resetting rate limit`);
        rateLimitDelay = 0;
      }
    }
    
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await fetchWithTimeout(url, options, 30000);
      
      // Handle specific error codes with detailed messages
      if (response.status === 429) {
        const detail = await response.text();
        throw new Error(`Rate limit exceeded (429): ${detail}`);
      } else if (response.status === 401) {
        const detail = await response.text();
        throw new Error(`Unauthorized (401): ${detail}`);
      } else if (response.status === 403) {
        const detail = await response.text();
        throw new Error(`Forbidden (403): ${detail}`);
      }
      
      return response;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }
      
      console.log(`Request failed, retrying in ${retries * 1000}ms... (${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retries * 1000));
    }
  }
  
  throw new Error('Max retries exceeded');
}

async function testConnection(config: SungrowConfig, reqSerialNum: string) {
  try {
    console.log(`[${reqSerialNum}] Testing Sungrow connection...`);
    
    // Enhanced credential validation with specific field checks
    const missingFields = [];
    if (!config.username) missingFields.push('username');
    if (!config.password) missingFields.push('password');
    if (!config.appkey) missingFields.push('appkey');
    if (!config.accessKey) missingFields.push('accessKey');
    
    if (missingFields.length > 0) {
      throw new Error(`Campos obrigatórios não preenchidos: ${missingFields.join(', ')}. Todos os campos são necessários para conectar com o Sungrow.`);
    }
    
    const token = await authenticateWithRetry(config, reqSerialNum);
    
    return {
      success: true,
      message: 'Conexão estabelecida com sucesso! Credenciais válidas e token obtido.',
      token: token.substring(0, 10) + '...',
      reqSerialNum
    };
  } catch (error) {
    console.error(`[${reqSerialNum}] Connection test failed:`, error.message);
    throw new Error(`Teste de conexão falhou: ${error.message}`);
  }
}

async function discoverPlants(config: SungrowConfig, reqSerialNum?: string) {
  try {
    console.log(`[${reqSerialNum || 'unknown'}] Discovering Sungrow plants...`);
    
    const token = await authenticateWithRetry(config, reqSerialNum || 'discovery');
    
    // Try multiple endpoints for getting station list
    const endpoints = [
      '/v1/stationService/getStationList',
      '/stationService/getStationList',
      '/api/v1/stationService/getStationList'
    ];
    
    const baseUrls = [
      config.baseUrl || 'https://web3.isolarcloud.com.hk',
      'https://web3.isolarcloud.com',
      'https://gateway.isolarcloud.com.hk',
      'https://gateway.isolarcloud.com'
    ];

    for (const baseUrl of baseUrls) {
      for (const endpoint of endpoints) {
        try {
          console.log(`[${reqSerialNum || 'unknown'}] Trying: ${baseUrl}${endpoint}`);
          
          const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-access-key': config.accessKey,
              'token': token,
              'Accept': 'application/json',
              'User-Agent': 'Monitor.ai/1.0'
            },
            body: JSON.stringify({
              lang: 'en_us'
            })
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.result_code === 1) {
              const plants = data.result_data?.map((station: any) => ({
                id: station.ps_id?.toString() || station.id?.toString(),
                name: station.ps_name || station.name || 'Unknown Plant',
                capacity: station.nominal_power || station.capacity || 0,
                location: station.ps_location_lat && station.ps_location_lng 
                  ? `${station.ps_location_lat}, ${station.ps_location_lng}` 
                  : 'Location not available',
                status: station.ps_status === 1 ? 'Active' : 'Inactive',
                installationDate: station.create_date || station.installation_date
              })) || [];

              console.log(`[${reqSerialNum || 'unknown'}] ${plants.length} plants discovered`);

              return {
                success: true,
                plants,
                reqSerialNum
              };
            }
          }
        } catch (error) {
          console.error(`[${reqSerialNum || 'unknown'}] Endpoint ${baseUrl}${endpoint} failed:`, error.message);
        }
      }
    }

    throw new Error('Failed to discover plants with any endpoint');
  } catch (error) {
    throw new Error(`Plant discovery failed: ${error.message}`);
  }
}

async function getDeviceList(config: SungrowConfig, reqSerialNum: string) {
  try {
    console.log(`[${reqSerialNum}] Fetching device list...`);
    
    const cacheKey = getCacheKey('device_list', { accessKey: config.accessKey, plantId: config.plantId });
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`[${reqSerialNum}] Using cached device list`);
      return { success: true, data: cached, cached: true };
    }
    
    const token = await authenticateWithRetry(config, reqSerialNum);
    const baseUrl = config.baseUrl || 'https://web3.isolarcloud.com.hk';

    const payload = {
      ps_id: config.plantId,
      lang: 'en_us'
    };

    const response = await fetchWithHeaders(`${baseUrl}/v1/stationService/getDeviceList`, {
      method: 'POST',
      headers: {
        ...getStandardHeaders(config.accessKey),
        'token': token
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result_code !== 1) {
      throw new Error(`API Error: ${data.result_msg}`);
    }

    // Cache for 10 minutes (devices don't change frequently)
    setCache(cacheKey, data.result_data, 600000);

    console.log(`[${reqSerialNum}] Device list fetched: ${data.result_data?.length || 0} devices`);

    return {
      success: true,
      data: data.result_data,
      reqSerialNum
    };
  } catch (error) {
    throw new Error(`Failed to fetch device list: ${error.message}`);
  }
}

async function getStationRealKpi(config: SungrowConfig, reqSerialNum: string, cacheKey?: string) {
  try {
    console.log(`[${reqSerialNum}] Fetching station real-time KPIs...`);
    
    const key = cacheKey || getCacheKey('station_real_kpi', { accessKey: config.accessKey, plantId: config.plantId });
    const cached = getFromCache(key);
    if (cached) {
      console.log(`[${reqSerialNum}] Using cached KPI data`);
      return { success: true, data: cached, cached: true };
    }
    
    const token = await authenticateWithRetry(config, reqSerialNum);
    const baseUrl = config.baseUrl || 'https://web3.isolarcloud.com.hk';

    const payload = {
      ps_id: config.plantId,
      lang: 'en_us'
    };

    const response = await fetchWithHeaders(`${baseUrl}/v1/reportService/getStationRealKpi`, {
      method: 'POST',
      headers: {
        ...getStandardHeaders(config.accessKey),
        'token': token
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result_code !== 1) {
      throw new Error(`API Error: ${data.result_msg}`);
    }

    // Cache for 5 minutes (real-time data)
    setCache(key, data.result_data, 300000);

    console.log(`[${reqSerialNum}] Real-time KPIs fetched successfully`);

    return {
      success: true,
      data: data.result_data,
      reqSerialNum
    };
  } catch (error) {
    throw new Error(`Failed to fetch station KPIs: ${error.message}`);
  }
}

async function getStationEnergy(config: SungrowConfig, period: string, reqSerialNum: string, cacheKey?: string) {
  try {
    console.log(`[${reqSerialNum}] Fetching station energy for period: ${period}`);
    
    const key = cacheKey || getCacheKey('station_energy', { accessKey: config.accessKey, plantId: config.plantId, period });
    const cached = getFromCache(key);
    if (cached) {
      console.log(`[${reqSerialNum}] Using cached energy data`);
      return { success: true, data: cached, cached: true };
    }
    
    const token = await authenticateWithRetry(config, reqSerialNum);
    const baseUrl = config.baseUrl || 'https://web3.isolarcloud.com.hk';

    // Calculate date range based on period
    const today = new Date();
    let startDate: string;
    let endDate: string;
    let dateType: number;

    switch (period) {
      case 'day':
        startDate = today.toISOString().split('T')[0].replace(/-/g, '');
        endDate = startDate;
        dateType = 1; // Daily
        break;
      case 'month':
        startDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}01`;
        endDate = today.toISOString().split('T')[0].replace(/-/g, '');
        dateType = 2; // Monthly
        break;
      case 'year':
        startDate = `${today.getFullYear()}0101`;
        endDate = today.toISOString().split('T')[0].replace(/-/g, '');
        dateType = 3; // Yearly
        break;
      default:
        throw new Error(`Unsupported period: ${period}`);
    }

    const payload = {
      ps_id: config.plantId,
      start_time: startDate,
      end_time: endDate,
      date_type: dateType,
      lang: 'en_us'
    };

    const response = await fetchWithHeaders(`${baseUrl}/v1/reportService/getStationEnergy`, {
      method: 'POST',
      headers: {
        ...getStandardHeaders(config.accessKey),
        'token': token
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result_code !== 1) {
      throw new Error(`API Error: ${data.result_msg}`);
    }

    // Cache for different TTLs based on period
    const cacheTtl = period === 'day' ? 300000 : // 5 minutes for daily
                     period === 'month' ? 1800000 : // 30 minutes for monthly
                     3600000; // 1 hour for yearly
    
    setCache(key, data.result_data, cacheTtl);

    console.log(`[${reqSerialNum}] Station energy fetched: ${data.result_data?.length || 0} records`);

    return {
      success: true,
      data: data.result_data,
      period,
      reqSerialNum
    };
  } catch (error) {
    throw new Error(`Failed to fetch station energy: ${error.message}`);
  }
}

async function getDeviceRealTimeData(config: SungrowConfig, deviceType: string, reqSerialNum: string, cacheKey?: string) {
  try {
    console.log(`[${reqSerialNum}] Fetching device real-time data for type: ${deviceType}`);
    
    const key = cacheKey || getCacheKey('device_realtime', { accessKey: config.accessKey, plantId: config.plantId, deviceType });
    const cached = getFromCache(key);
    if (cached) {
      console.log(`[${reqSerialNum}] Using cached device real-time data`);
      return { success: true, data: cached, cached: true };
    }
    
    const token = await authenticateWithRetry(config, reqSerialNum);
    const baseUrl = config.baseUrl || 'https://web3.isolarcloud.com.hk';

    const payload = {
      ps_id: config.plantId,
      device_type: deviceType || 1, // 1 for inverter, 7 for optimizer, etc.
      lang: 'en_us'
    };

    const response = await fetchWithHeaders(`${baseUrl}/v1/reportService/getDeviceRealTimeData`, {
      method: 'POST',
      headers: {
        ...getStandardHeaders(config.accessKey),
        'token': token
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result_code !== 1) {
      throw new Error(`API Error: ${data.result_msg}`);
    }

    // Cache for 2 minutes (very fresh real-time data)
    setCache(key, data.result_data, 120000);

    console.log(`[${reqSerialNum}] Device real-time data fetched: ${data.result_data?.length || 0} devices`);

    return {
      success: true,
      data: data.result_data,
      deviceType,
      reqSerialNum
    };
  } catch (error) {
    throw new Error(`Failed to fetch device real-time data: ${error.message}`);
  }
}

async function syncData(plantId: string, reqSerialNum?: string) {
  const startTime = Date.now();
  let dataPointsSynced = 0;

  try {
    const { data: plant, error: plantError } = await supabase
      .from('plants')
      .select('*')
      .eq('id', plantId)
      .single();

    if (plantError || !plant) {
      throw new Error('Plant not found');
    }

    const config = plant.api_credentials as SungrowConfig & { plantId: string };
    if (!config?.username || !config?.password || !config?.appkey || !config.accessKey) {
      throw new Error('API configuration not found');
    }

    const token = await authenticateWithRetry(config, reqSerialNum || 'sync');
    const baseUrl = config.baseUrl || 'https://web3.isolarcloud.com.hk';

    // Fetch real-time KPIs
    const kpiData = await getStationRealKpi(config, reqSerialNum || 'sync');
    
    // Fetch energy data for today
    const energyData = await getStationEnergy(config, 'day', reqSerialNum || 'sync');

    // Process and store data
    const readings = [];
    const now = new Date().toISOString();

    if (kpiData.success && kpiData.data) {
      readings.push({
        plant_id: plantId,
        timestamp: now,
        power_w: Math.round((kpiData.data.p83022 || 0) * 1000), // Convert kW to W
        energy_kwh: kpiData.data.p83043 || 0, // Daily energy
        created_at: now
      });
    }

    if (readings.length > 0) {
      const { error: insertError } = await supabase
        .from('readings')
        .upsert(readings, { 
          onConflict: 'plant_id,timestamp',
          ignoreDuplicates: true 
        });

      if (insertError) {
        throw new Error(`Insert error: ${insertError.message}`);
      }

      dataPointsSynced = readings.length;
    }

    // Update last sync timestamp
    await supabase
      .from('plants')
      .update({ last_sync: now })
      .eq('id', plantId);

    // Log success
    await supabase
      .from('sync_logs')
      .insert({
        plant_id: plantId,
        system_type: 'sungrow',
        status: 'success',
        message: `Synced ${dataPointsSynced} data points`,
        data_points_synced: dataPointsSynced,
        sync_duration_ms: Date.now() - startTime
      });

    console.log(`[${reqSerialNum || 'sync'}] Sync completed: ${dataPointsSynced} points`);

    return {
      success: true,
      message: `Synced ${dataPointsSynced} data points`,
      dataPointsSynced,
      reqSerialNum: reqSerialNum || 'sync'
    };

  } catch (error) {
    // Log error
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

async function getPlantList(config: SungrowConfig, reqSerialNum?: string) {
  try {
    const token = await authenticateWithRetry(config, reqSerialNum || 'list');
    const baseUrl = config.baseUrl || 'https://web3.isolarcloud.com.hk';

    const response = await fetchWithHeaders(`${baseUrl}/v1/stationService/getStationList`, {
      method: 'POST',
      headers: {
        ...getStandardHeaders(config.accessKey),
        'token': token
      },
      body: JSON.stringify({
        lang: 'en_us'
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result_code !== 1) {
      throw new Error(`Error: ${data.result_msg}`);
    }

    return {
      success: true,
      data: data.result_data,
      reqSerialNum: reqSerialNum || 'list'
    };
  } catch (error) {
    throw new Error(`Failed to fetch plant list: ${error.message}`);
  }
}

function getStandardHeaders(accessKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-access-key': accessKey,
    'Accept': 'application/json',
    'User-Agent': 'Monitor.ai/1.0'
  };
}

async function fetchWithHeaders(url: string, options: RequestInit): Promise<Response> {
  console.log(`Making request to: ${url}`);
  console.log(`Headers:`, JSON.stringify(options.headers, null, 2));
  
  const response = await fetchWithTimeout(url, options);
  console.log(`Response status: ${response.status}`);
  
  // Enhanced error handling with specific Sungrow error codes
  if (!response.ok) {
    const errorDetail = await response.text();
    
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded (429): ${errorDetail}`);
    }
    if (response.status >= 500) {
      throw new Error(`Server error (${response.status}): ${errorDetail}`);
    }
    if (response.status === 401) {
      throw new Error(`Unauthorized access (401): Verifique suas credenciais. ${errorDetail}`);
    }
    if (response.status === 403) {
      throw new Error(`Forbidden access (403): Verifique sua access key. ${errorDetail}`);
    }
    
    throw new Error(`Sungrow API error (${response.status}): ${errorDetail}`);
  }
  
  return response;
}
