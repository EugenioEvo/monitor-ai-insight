import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

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
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  authorizedPlants?: string[];
}

interface SungrowAuthResponse {
  result_code: string;
  result_msg: string;
  token?: string;
  expire_time?: number;
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

const SUNGROW_ERROR_CODES: Record<string, string> = {
  '1': 'Sucesso',
  '0': 'Falha geral',
  '401': 'Não autorizado - Token inválido',
  '403': 'Acesso negado',
  '500': 'Erro interno do servidor',
  '1001': 'Parâmetros inválidos',
  '1002': 'Token expirado',
  '1003': 'Usuário não encontrado',
  '1004': 'Senha incorreta',
  '1005': 'Conta bloqueada',
  '1006': 'Limite de sessões excedido',
  'E900': 'Não autorizado - Verificar credenciais'
};

class SungrowAPI {
  private config: SungrowConfig;
  private token: string | null = null;
  private tokenExpires: number = 0;
  private supabase: any;

  constructor(config: SungrowConfig, supabase: any) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://gateway.isolarcloud.com.hk'
    };
    this.supabase = supabase;
  }

  private async makeRequest(endpoint: string, data: any) {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    console.log(`Making request to: ${endpoint}`, {
      url,
      hasToken: !!this.token,
      dataKeys: Object.keys(data || {})
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Sungrow-Monitor/1.0'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`Response from ${endpoint}:`, {
        result_code: result.result_code,
        result_msg: result.result_msg,
        hasData: !!result.result_data
      });

      return result;
    } catch (error) {
      console.error(`Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  private async authenticate(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpires) {
      return this.token;
    }

    console.log('Authenticating with Sungrow API', {
      authMode: this.config.authMode,
      hasUsername: !!this.config.username,
      hasAppkey: !!this.config.appkey
    });

    if (this.config.authMode === 'oauth2' && this.config.accessToken) {
      if (Date.now() < (this.config.tokenExpiresAt || 0)) {
        this.token = this.config.accessToken;
        this.tokenExpires = this.config.tokenExpiresAt || 0;
        return this.token;
      }
    }

    // Direct authentication
    const authData = {
      appkey: this.config.appkey,
      user_account: this.config.username,
      user_password: this.config.password,
      lang: 'pt'
    };

    const response = await this.makeRequest('/openapi/login', authData);
    
    if (response.result_code !== '1') {
      const errorMsg = SUNGROW_ERROR_CODES[response.result_code] || response.result_msg;
      throw new Error(`Autenticação falhou: ${errorMsg} (${response.result_code})`);
    }

    this.token = response.token;
    this.tokenExpires = Date.now() + ((response.expire_time || 3600) * 1000);
    
    console.log('Authentication successful', {
      tokenExpires: new Date(this.tokenExpires).toISOString()
    });

    return this.token;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const token = await this.authenticate();
      
      // Test a simple API call
      const testData = {
        appkey: this.config.appkey,
        token: token,
        lang: 'pt'
      };

      const response = await this.makeRequest('/openapi/getStationList', testData);
      
      if (response.result_code === '1') {
        return { 
          success: true, 
          message: `Conexão bem-sucedida! Token válido até ${new Date(this.tokenExpires).toLocaleString('pt-BR')}.`
        };
      } else {
        const errorMsg = SUNGROW_ERROR_CODES[response.result_code] || response.result_msg;
        return { 
          success: false, 
          message: `Teste falhou: ${errorMsg} (${response.result_code})`
        };
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro desconhecido na conexão'
      };
    }
  }

  async discoverPlantsEnhanced(): Promise<{ success: boolean; plants?: any[]; statistics?: any; error?: string }> {
    try {
      const token = await this.authenticate();
      let discoveredPlants: any[] = [];
      let statistics = {
        total: 0,
        online: 0,
        offline: 0,
        totalCapacity: 0,
        averageCapacity: 0
      };

      console.log('Starting enhanced plant discovery');

      // Método 1: OAuth2 authorized plants
      if (this.config.authMode === 'oauth2' && this.config.authorizedPlants?.length) {
        console.log('Using OAuth2 authorized plants list', {
          authorizedPlants: this.config.authorizedPlants
        });

        for (const plantId of this.config.authorizedPlants) {
          try {
            const plantData = await this.enrichPlantData(token, plantId);
            if (plantData) {
              discoveredPlants.push(plantData);
            }
          } catch (error) {
            console.warn(`Failed to enrich data for plant ${plantId}:`, error);
            // Add basic plant info even if enrichment fails
            discoveredPlants.push({
              id: plantId,
              ps_id: parseInt(plantId),
              name: `Planta ${plantId}`,
              capacity: 0,
              location: 'Localização desconhecida',
              status: 'Desconhecido',
              connectivity: 'offline',
              validationStatus: 'failed'
            });
          }
        }
      }

      // Método 2: Station List Discovery (fallback ou primary)
      if (discoveredPlants.length === 0) {
        console.log('Discovering plants via getStationList');
        
        const stationData = {
          appkey: this.config.appkey,
          token: token,
          page_no: 1,
          page_size: 50,
          lang: 'pt'
        };

        const response = await this.makeRequest('/openapi/getStationList', stationData);
        
        if (response.result_code === '1' && response.result_data?.page_list) {
          console.log(`Found ${response.result_data.page_list.length} plants in station list`);
          
          // Process stations in parallel with concurrency limit
          const concurrencyLimit = 5;
          const stations = response.result_data.page_list;
          
          for (let i = 0; i < stations.length; i += concurrencyLimit) {
            const batch = stations.slice(i, i + concurrencyLimit);
            const batchPromises = batch.map(async (station: any) => {
              try {
                const enrichedData = await this.enrichPlantData(token, station.ps_id.toString());
                return enrichedData || this.normalizeStationData(station);
              } catch (error) {
                console.warn(`Failed to enrich station ${station.ps_id}:`, error);
                return this.normalizeStationData(station);
              }
            });
            
            const batchResults = await Promise.allSettled(batchPromises);
            batchResults.forEach((result) => {
              if (result.status === 'fulfilled' && result.value) {
                discoveredPlants.push(result.value);
              }
            });
          }
        }
      }

      // Calculate statistics
      statistics.total = discoveredPlants.length;
      statistics.online = discoveredPlants.filter(p => p.connectivity === 'online').length;
      statistics.offline = statistics.total - statistics.online;
      statistics.totalCapacity = discoveredPlants.reduce((sum, p) => sum + (p.capacity || 0), 0);
      statistics.averageCapacity = statistics.total > 0 ? Math.round(statistics.totalCapacity / statistics.total) : 0;

      console.log('Enhanced discovery completed', {
        totalPlants: statistics.total,
        onlinePlants: statistics.online,
        offlinePlants: statistics.offline,
        totalCapacity: statistics.totalCapacity
      });

      return {
        success: true,
        plants: discoveredPlants,
        statistics: statistics
      };

    } catch (error) {
      console.error('Enhanced plant discovery failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido na descoberta'
      };
    }
  }

  private async enrichPlantData(token: string, plantId: string): Promise<any | null> {
    try {
      console.log(`Enriching data for plant ${plantId}`);
      
      // Get real-time KPIs
      const kpiData = {
        appkey: this.config.appkey,
        token: token,
        ps_id: plantId,
        lang: 'pt'
      };

      const kpiResponse = await this.makeRequest('/openapi/getStationRealKpi', kpiData);
      
      if (kpiResponse.result_code === '1' && kpiResponse.result_data) {
        const kpi = kpiResponse.result_data;
        
        // Determine connectivity based on data freshness and power values
        const hasRecentData = kpi.p83022 !== undefined || kpi.p83025 !== undefined;
        const connectivity = hasRecentData ? 'online' : 'offline';
        const validationStatus = hasRecentData ? 'validated' : 'failed';

        return {
          id: plantId,
          ps_id: parseInt(plantId),
          name: `Planta Solar ${plantId}`,
          capacity: this.calculateCapacityFromKpi(kpi),
          location: 'Localização via API',
          status: connectivity === 'online' ? 'Active' : 'Inactive',
          installationDate: new Date().toISOString().split('T')[0],
          latitude: -23.5505, // Default coordinates
          longitude: -46.6333,
          // Enhanced fields
          currentPower: kpi.p83022 || 0,
          dailyEnergy: kpi.p83025 || 0,
          connectivity: connectivity,
          lastUpdate: new Date().toISOString(),
          validationStatus: validationStatus
        };
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to enrich plant ${plantId}:`, error);
      return null;
    }
  }

  private normalizeStationData(station: any): any {
    return {
      id: station.ps_id.toString(),
      ps_id: station.ps_id,
      name: station.ps_name || `Planta ${station.ps_id}`,
      capacity: parseFloat(station.ps_capacity_kw) || 0,
      location: station.ps_location || 'Localização desconhecida',
      status: station.ps_status_text || 'Desconhecido',
      installationDate: station.create_date || new Date().toISOString().split('T')[0],
      latitude: parseFloat(station.ps_latitude) || -23.5505,
      longitude: parseFloat(station.ps_longitude) || -46.6333,
      // Enhanced fields with defaults
      currentPower: 0,
      dailyEnergy: 0,
      connectivity: 'offline', // Default to offline for station list items
      lastUpdate: new Date().toISOString(),
      validationStatus: 'pending'
    };
  }

  private calculateCapacityFromKpi(kpi: any): number {
    // Try to estimate capacity from current power or other metrics
    // This is a heuristic since capacity isn't directly available in KPI
    if (kpi.p83022 && kpi.p83022 > 0) {
      // Assume current power could be up to 80% of capacity during peak
      return Math.round(kpi.p83022 / 0.8);
    }
    return 0; // Unknown capacity
  }

  async getStationRealKpi(plantId: string): Promise<any> {
    try {
      const token = await this.authenticate();
      
      const data = {
        appkey: this.config.appkey,
        token: token,
        ps_id: plantId,
        lang: 'pt'
      };

      const response = await this.makeRequest('/openapi/getStationRealKpi', data);
      
      if (response.result_code === '1') {
        return { success: true, data: response.result_data };
      } else {
        const errorMsg = SUNGROW_ERROR_CODES[response.result_code] || response.result_msg;
        throw new Error(`Erro ao obter KPIs: ${errorMsg}`);
      }
    } catch (error) {
      console.error('getStationRealKpi failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  async getStationEnergy(plantId: string, period: string = 'day'): Promise<any> {
    try {
      const token = await this.authenticate();
      
      const data = {
        appkey: this.config.appkey,
        token: token,
        ps_id: plantId,
        query_type: period === 'day' ? 1 : period === 'month' ? 2 : 3,
        lang: 'pt'
      };

      const response = await this.makeRequest('/openapi/getStationEnergy', data);
      
      if (response.result_code === '1') {
        return { success: true, data: response.result_data };
      } else {
        const errorMsg = SUNGROW_ERROR_CODES[response.result_code] || response.result_msg;
        throw new Error(`Erro ao obter energia: ${errorMsg}`);
      }
    } catch (error) {
      console.error('getStationEnergy failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  async getDeviceList(plantId: string): Promise<any> {
    try {
      const token = await this.authenticate();
      
      const data = {
        appkey: this.config.appkey,
        token: token,
        ps_id: plantId,
        lang: 'pt'
      };

      const response = await this.makeRequest('/openapi/getDeviceList', data);
      
      if (response.result_code === '1') {
        return { success: true, data: response.result_data };
      } else {
        const errorMsg = SUNGROW_ERROR_CODES[response.result_code] || response.result_msg;
        throw new Error(`Erro ao obter dispositivos: ${errorMsg}`);
      }
    } catch (error) {
      console.error('getDeviceList failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  async getDeviceRealTimeData(plantId: string, deviceType: string = '1'): Promise<any> {
    try {
      const token = await this.authenticate();
      
      const data = {
        appkey: this.config.appkey,
        token: token,
        ps_id: plantId,
        device_type: deviceType,
        lang: 'pt'
      };

      const response = await this.makeRequest('/openapi/getDeviceRealTimeData', data);
      
      if (response.result_code === '1') {
        return { success: true, data: response.result_data };
      } else {
        const errorMsg = SUNGROW_ERROR_CODES[response.result_code] || response.result_msg;
        throw new Error(`Erro ao obter dados em tempo real: ${errorMsg}`);
      }
    } catch (error) {
      console.error('getDeviceRealTimeData failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, config, plantId, period, deviceType } = await req.json();
    
    console.log('Sungrow connector action:', action, {
      hasConfig: !!config,
      plantId,
      period,
      deviceType
    });

    const api = new SungrowAPI(config, supabase);

    switch (action) {
      case 'test_connection':
        const testResult = await api.testConnection();
        return new Response(JSON.stringify(testResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'discover_plants':
        const discoveryResult = await api.discoverPlantsEnhanced();
        return new Response(JSON.stringify(discoveryResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_station_real_kpi':
        const kpiResult = await api.getStationRealKpi(config.plantId || plantId);
        return new Response(JSON.stringify(kpiResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_station_energy':
        const energyResult = await api.getStationEnergy(config.plantId || plantId, period || 'day');
        return new Response(JSON.stringify(energyResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_device_list':
        const deviceListResult = await api.getDeviceList(config.plantId || plantId);
        return new Response(JSON.stringify(deviceListResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_device_real_time_data':
        const realtimeResult = await api.getDeviceRealTimeData(config.plantId || plantId, deviceType || '1');
        return new Response(JSON.stringify(realtimeResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'sync_data':
        // Implementation for data synchronization would go here
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Sincronização não implementada ainda',
          dataPointsSynced: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Ação não suportada: ${action}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Sungrow connector error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
