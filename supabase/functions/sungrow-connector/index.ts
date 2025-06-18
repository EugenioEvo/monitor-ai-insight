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
  plantId?: string;
}

interface SungrowAuthResponse {
  result_code: number;
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

// Rate limiting com exponential backoff
let rateLimitDelay = 0;
const MAX_DELAY = 300000; // 5 minutos
const BASE_DELAY = 60000; // 1 minuto

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let reqSerialNum = '';

  try {
    const { action, plantId, config, period, deviceType, cacheKey } = await req.json();
    reqSerialNum = generateRequestId();
    
    console.log(`[${reqSerialNum}] Starting request: ${action}`);
    
    // Rate limiting check
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

    // Reset rate limit on success
    rateLimitDelay = 0;
    
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
    
    // Handle rate limiting with exponential backoff
    if (error.message.includes('429') || error.message.includes('000110')) {
      rateLimitDelay = Math.min(rateLimitDelay === 0 ? BASE_DELAY : rateLimitDelay * 2, MAX_DELAY);
      console.error(`[${reqSerialNum}] Rate limited, next delay: ${rateLimitDelay}ms`);
    }
    
    console.error(`[${reqSerialNum}] Error: ${error.message}, duration: ${duration}ms`);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        reqSerialNum 
      }),
      { status: error.message.includes('429') ? 429 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
  const cacheKey = `auth_${config.username}_${config.appkey}`;
  
  // Check cache first (TTL 23 hours to avoid expiration issues)
  const cachedToken = getFromCache(cacheKey);
  if (cachedToken) {
    console.log(`[${reqSerialNum}] Using cached token`);
    return cachedToken;
  }
  
  console.log(`[${reqSerialNum}] Authenticating with Sungrow...`);
  
  if (!config.username || !config.password || !config.appkey) {
    throw new Error('Username, password e appkey são obrigatórios');
  }

  const baseUrl = config.baseUrl || 'https://gateway.isolarcloud.com.hk';
  const authPayload = {
    appkey: config.appkey,
    user_account: config.username,
    user_password: config.password,
    lang: 'en_us'
  };

  const response = await fetchWithHeaders(`${baseUrl}/v1/userService/login`, {
    method: 'POST',
    headers: getStandardHeaders(config.appkey),
    body: JSON.stringify(authPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Auth failed: ${response.status} - ${errorText}`);
  }

  const data: SungrowAuthResponse = await response.json();
  
  if (data.result_code !== 1) {
    throw new Error(`Auth failed: ${data.result_msg}`);
  }

  // Cache token for 23 hours (86400000ms - 1 hour buffer)
  setCache(cacheKey, data.result_data.token, 82800000);
  
  console.log(`[${reqSerialNum}] Authentication successful`);
  return data.result_data.token;
}

function getStandardHeaders(appkey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-access-key': appkey,
    'Accept': 'application/json',
    'User-Agent': 'Monitor.ai/1.0'
  };
}

async function fetchWithHeaders(url: string, options: RequestInit): Promise<Response> {
  const response = await fetch(url, options);
  
  // Handle specific Sungrow error codes
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded (429)');
    }
    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`);
    }
  }
  
  return response;
}

async function testConnection(config: SungrowConfig, reqSerialNum: string) {
  try {
    console.log(`[${reqSerialNum}] Testing Sungrow connection...`);
    
    const token = await authenticateWithRetry(config, reqSerialNum);
    
    return {
      success: true,
      message: 'Conexão estabelecida com sucesso',
      token: token.substring(0, 10) + '...',
      reqSerialNum
    };
  } catch (error) {
    throw new Error(`Connection test failed: ${error.message}`);
  }
}

async function getDeviceList(config: SungrowConfig, reqSerialNum: string) {
  try {
    console.log(`[${reqSerialNum}] Fetching device list...`);
    
    const cacheKey = getCacheKey('device_list', { appkey: config.appkey, plantId: config.plantId });
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`[${reqSerialNum}] Using cached device list`);
      return { success: true, data: cached, cached: true };
    }
    
    const token = await authenticateWithRetry(config, reqSerialNum);
    const baseUrl = config.baseUrl || 'https://gateway.isolarcloud.com.hk';

    const payload = {
      ps_id: config.plantId,
      lang: 'en_us'
    };

    const response = await fetchWithHeaders(`${baseUrl}/v1/stationService/getDeviceList`, {
      method: 'POST',
      headers: {
        ...getStandardHeaders(config.appkey),
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
    
    const key = cacheKey || getCacheKey('station_real_kpi', { appkey: config.appkey, plantId: config.plantId });
    const cached = getFromCache(key);
    if (cached) {
      console.log(`[${reqSerialNum}] Using cached KPI data`);
      return { success: true, data: cached, cached: true };
    }
    
    const token = await authenticateWithRetry(config, reqSerialNum);
    const baseUrl = config.baseUrl || 'https://gateway.isolarcloud.com.hk';

    const payload = {
      ps_id: config.plantId,
      lang: 'en_us'
    };

    const response = await fetchWithHeaders(`${baseUrl}/v1/reportService/getStationRealKpi`, {
      method: 'POST',
      headers: {
        ...getStandardHeaders(config.appkey),
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
    
    const key = cacheKey || getCacheKey('station_energy', { appkey: config.appkey, plantId: config.plantId, period });
    const cached = getFromCache(key);
    if (cached) {
      console.log(`[${reqSerialNum}] Using cached energy data`);
      return { success: true, data: cached, cached: true };
    }
    
    const token = await authenticateWithRetry(config, reqSerialNum);
    const baseUrl = config.baseUrl || 'https://gateway.isolarcloud.com.hk';

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
        ...getStandardHeaders(config.appkey),
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
    
    const key = cacheKey || getCacheKey('device_realtime', { appkey: config.appkey, plantId: config.plantId, deviceType });
    const cached = getFromCache(key);
    if (cached) {
      console.log(`[${reqSerialNum}] Using cached device real-time data`);
      return { success: true, data: cached, cached: true };
    }
    
    const token = await authenticateWithRetry(config, reqSerialNum);
    const baseUrl = config.baseUrl || 'https://gateway.isolarcloud.com.hk';

    const payload = {
      ps_id: config.plantId,
      device_type: deviceType || 1, // 1 for inverter, 7 for optimizer, etc.
      lang: 'en_us'
    };

    const response = await fetchWithHeaders(`${baseUrl}/v1/reportService/getDeviceRealTimeData`, {
      method: 'POST',
      headers: {
        ...getStandardHeaders(config.appkey),
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

// ... keep existing code (discoverPlants, syncData, getPlantList functions)
async function discoverPlants(config: SungrowConfig, reqSerialNum?: string) {
  try {
    console.log(`[${reqSerialNum || 'unknown'}] Discovering Sungrow plants...`);
    
    const token = await authenticateWithRetry(config, reqSerialNum || 'discovery');
    const baseUrl = config.baseUrl || 'https://gateway.isolarcloud.com.hk';

    const response = await fetchWithHeaders(`${baseUrl}/v1/stationService/getStationList`, {
      method: 'POST',
      headers: {
        ...getStandardHeaders(config.appkey),
        'token': token
      },
      body: JSON.stringify({
        lang: 'en_us'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.result_code !== 1) {
      throw new Error(`Error: ${data.result_msg}`);
    }

    const plants = data.result_data?.map((station: any) => ({
      id: station.ps_id.toString(),
      name: station.ps_name,
      capacity: station.nominal_power,
      location: `${station.ps_location_lat || 'N/A'}, ${station.ps_location_lng || 'N/A'}`,
      status: station.ps_status === 1 ? 'Active' : 'Inactive',
      installationDate: station.create_date
    })) || [];

    console.log(`[${reqSerialNum || 'unknown'}] ${plants.length} plants discovered`);

    return {
      success: true,
      plants,
      reqSerialNum
    };
  } catch (error) {
    throw new Error(`Plant discovery failed: ${error.message}`);
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
    if (!config?.username || !config?.password || !config?.appkey) {
      throw new Error('API configuration not found');
    }

    const token = await authenticateWithRetry(config, reqSerialNum || 'sync');
    const baseUrl = config.baseUrl || 'https://gateway.isolarcloud.com.hk';

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
    const baseUrl = config.baseUrl || 'https://gateway.isolarcloud.com.hk';

    const response = await fetchWithHeaders(`${baseUrl}/v1/stationService/getStationList`, {
      method: 'POST',
      headers: {
        ...getStandardHeaders(config.appkey),
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
