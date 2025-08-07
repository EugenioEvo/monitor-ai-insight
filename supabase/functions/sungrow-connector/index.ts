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
  language?: string;
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
  'E900': 'Não autorizado - Verificar credenciais',
  'E911': 'Chave de acesso obrigatória - Verificar x-access-key',
  'E912': 'Chave de acesso inválida - Verificar valor da x-access-key',
  '010': 'Parâmetro de idioma inválido - Usando idioma padrão'
};

// Idiomas suportados pela API Sungrow (em ordem de preferência)
const SUPPORTED_LANGUAGES = ['en_US', 'en', 'zh_CN', 'zh'];

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

  private validateConfig(): void {
    console.log('Validando configuração Sungrow:', {
      hasAppkey: !!this.config.appkey,
      hasAccessKey: !!this.config.accessKey,
      hasUsername: !!this.config.username,
      hasPassword: !!this.config.password,
      appkeyLength: this.config.appkey?.length || 0,
      accessKeyLength: this.config.accessKey?.length || 0
    });

    if (!this.config.appkey?.trim()) {
      throw new Error('AppKey é obrigatório e não pode estar vazio');
    }
    
    if (!this.config.accessKey?.trim()) {
      throw new Error('AccessKey (x-access-key) é obrigatório e não pode estar vazio');
    }
    
    // Validação adicional para E912
    if (this.config.accessKey.length < 10) {
      throw new Error('AccessKey parece estar incompleto (muito curto)');
    }
    
    if (!this.config.username?.trim() || !this.config.password?.trim()) {
      throw new Error('Username e Password são obrigatórios para autenticação direta');
    }
  }

  private getValidLanguage(): string | undefined {
    // Se o usuário especificou um idioma, tentar usá-lo
    if (this.config.language && SUPPORTED_LANGUAGES.includes(this.config.language)) {
      return this.config.language;
    }
    
    // Usar idioma padrão mais compatível ou omitir completamente
    return 'en_US';
  }

  private async makeRequest(endpoint: string, data: any) {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    console.log(`Making request to: ${endpoint}`, {
      url,
      hasToken: !!this.token,
      hasAccessKey: !!this.config.accessKey,
      accessKeyPrefix: this.config.accessKey ? `${this.config.accessKey.substring(0, 8)}...` : 'missing',
      dataKeys: Object.keys(data || {}),
      languageParam: data.lang || 'not included'
    });

    // Validar configuração antes de fazer a requisição
    this.validateConfig();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Sungrow-Monitor/1.0'
      };
      // Add Accept-Language when available to improve compatibility
      const acceptLang = this.getValidLanguage();
      if (acceptLang) {
        headers['Accept-Language'] = acceptLang.replace('_', '-');
      }
      // Adicionar x-access-key obrigatório - com validação especial para E912
      if (this.config.accessKey) {
        headers['x-access-key'] = this.config.accessKey.trim();
        console.log('Adding x-access-key header:', {
          keyExists: true,
          keyLength: this.config.accessKey.trim().length,
          keyPrefix: `${this.config.accessKey.trim().substring(0, 8)}...`
        });
      } else {
        console.error('CRITICAL: x-access-key is missing!');
        throw new Error('x-access-key é obrigatório mas não foi fornecido');
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        console.error(`HTTP Error: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`Response from ${endpoint}:`, {
        result_code: result.result_code,
        result_msg: result.result_msg,
        hasData: !!result.result_data
      });

      // Tratamento específico para erro E912
      if (result.result_code === 'E912') {
        console.error('E912 Error Details:', {
          provided_access_key_length: this.config.accessKey?.length || 0,
          provided_access_key_prefix: this.config.accessKey ? `${this.config.accessKey.substring(0, 8)}...` : 'none',
          error_message: result.result_msg
        });
        throw new Error(`Chave de acesso inválida (E912): ${result.result_msg}. Verifique se a x-access-key está correta no portal Sungrow.`);
      }

      return result;
    } catch (error) {
      console.error(`Request failed for ${endpoint}:`, error);
      
      // Melhor tratamento de erro para E912
      if (error instanceof Error && error.message.includes('E912')) {
        throw new Error(`Chave de acesso inválida: Verifique se a x-access-key foi copiada corretamente do portal Sungrow. ${error.message}`);
      }
      
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
      hasAppkey: !!this.config.appkey,
      hasAccessKey: !!this.config.accessKey,
      accessKeyLength: this.config.accessKey?.length || 0
    });

    if (this.config.authMode === 'oauth2' && this.config.accessToken) {
      if (Date.now() < (this.config.tokenExpiresAt || 0)) {
        this.token = this.config.accessToken;
        this.tokenExpires = this.config.tokenExpiresAt || 0;
        return this.token;
      }
    }

    // Tentar autenticação sem parâmetro lang primeiro
    let authData: any = {
      appkey: this.config.appkey.trim(),
      user_account: this.config.username?.trim(),
      user_password: this.config.password?.trim()
    };

    console.log('Attempting authentication without language parameter');

    let response = await this.makeRequest('/openapi/login', authData);
    
    // Se falhar com erro relacionado ao idioma, tentar com idiomas válidos
    if (response.result_code === '010') {
      console.log('Language parameter error detected, trying with supported languages');
      
      for (const lang of SUPPORTED_LANGUAGES) {
        try {
          console.log(`Trying authentication with language: ${lang}`);
          authData = {
            appkey: this.config.appkey.trim(),
            user_account: this.config.username?.trim(),
            user_password: this.config.password?.trim(),
            lang: lang
          };
          
          response = await this.makeRequest('/openapi/login', authData);
          
          if (response.result_code === '1') {
            console.log(`Authentication successful with language: ${lang}`);
            break;
          }
        } catch (error) {
          console.warn(`Authentication failed with language ${lang}:`, error);
          continue;
        }
      }
    }
    
    if (response.result_code !== '1') {
      const errorMsg = SUNGROW_ERROR_CODES[response.result_code] || response.result_msg;
      throw new Error(`Autenticação falhou: ${errorMsg} (${response.result_code})`);
    }

    const tokenFromTop = (response as any)?.token;
    const tokenFromData = (response as any)?.result_data?.token;
    const expireFromTop = (response as any)?.expire_time;
    const expireFromData = (response as any)?.result_data?.expire_time || (response as any)?.result_data?.expires_in;

    this.token = tokenFromTop || tokenFromData || null;
    if (!this.token) {
      console.error('Authentication succeeded but token was not present in response', { hasResultData: !!(response as any)?.result_data });
      throw new Error('Autenticação bem-sucedida, porém a API não retornou o token. Tente novamente e verifique as credenciais.');
    }

    this.tokenExpires = Date.now() + (((expireFromTop || expireFromData) || 3600) * 1000);
    
    console.log('Authentication successful', {
      tokenSource: tokenFromData ? 'result_data' : 'top_level',
      tokenExpires: new Date(this.tokenExpires).toISOString()
    });

    return this.token;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Validar configuração primeiro
      this.validateConfig();
      
      const token = await this.authenticate();
      
      // Test a simple API call without language parameter first
      let testData: any = {
        appkey: this.config.appkey.trim(),
        token: token,
        page_no: 1,
        page_size: 1
      };

      console.log('Testing connection (with pagination, no language)');
      let response = await this.makeRequest('/openapi/getStationList', testData);
      
      if (response.result_code !== '1') {
        // Try with language fallback as some regions require it
        console.log('Initial test failed, retrying with language parameter');
        testData.lang = this.getValidLanguage();
        response = await this.makeRequest('/openapi/getStationList', testData);
      }
      
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
      
      // Melhor guidance para erro E912
      if (error instanceof Error && error.message.includes('E912')) {
        return { 
          success: false, 
          message: `Chave de acesso inválida: Verifique se você copiou corretamente a "Access Key Value" do portal Sungrow iSolarCloud. ${error.message}`
        };
      }
      
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro desconhecido na conexão'
      };
    }
  }

  async discoverPlantsEnhanced(): Promise<{ success: boolean; plants?: any[]; statistics?: any; error?: string }> {
    try {
      // Validar configuração primeiro
      this.validateConfig();
      
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
        
        // Usar idioma compatível ou omitir
        let stationData: any = {
          appkey: this.config.appkey,
          token: token,
          page_no: 1,
          page_size: 50
        };

        // Tentar primeiro sem idioma
        let response = await this.makeRequest('/openapi/getStationList', stationData);
        
        // Se falhar por idioma, tentar com idioma válido
        if (response.result_code === '010') {
          stationData.lang = this.getValidLanguage();
          response = await this.makeRequest('/openapi/getStationList', stationData);
        }
        
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
      
      // Get real-time KPIs - tentar sem idioma primeiro
      let kpiData: any = {
        appkey: this.config.appkey,
        token: token,
        ps_id: plantId
      };

      let kpiResponse = await this.makeRequest('/openapi/getStationRealKpi', kpiData);
      
      // Se falhar por idioma, tentar com idioma válido
      if (kpiResponse.result_code === '010') {
        kpiData.lang = this.getValidLanguage();
        kpiResponse = await this.makeRequest('/openapi/getStationRealKpi', kpiData);
      }
      
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
      
      // Tentar primeiro sem idioma
      let data: any = {
        appkey: this.config.appkey,
        token: token,
        ps_id: plantId
      };

      let response = await this.makeRequest('/openapi/getStationRealKpi', data);
      
      // Se falhar por idioma, tentar com idioma válido
      if (response.result_code === '010') {
        data.lang = this.getValidLanguage();
        response = await this.makeRequest('/openapi/getStationRealKpi', data);
      }
      
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
      
      // Tentar primeiro sem idioma
      let data: any = {
        appkey: this.config.appkey,
        token: token,
        ps_id: plantId,
        query_type: period === 'day' ? 1 : period === 'month' ? 2 : 3
      };

      let response = await this.makeRequest('/openapi/getStationEnergy', data);
      
      // Se falhar por idioma, tentar com idioma válido
      if (response.result_code === '010') {
        data.lang = this.getValidLanguage();
        response = await this.makeRequest('/openapi/getStationEnergy', data);
      }
      
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
      
      // Tentar primeiro sem idioma
      let data: any = {
        appkey: this.config.appkey,
        token: token,
        ps_id: plantId
      };

      let response = await this.makeRequest('/openapi/getDeviceList', data);
      
      // Se falhar por idioma, tentar com idioma válido
      if (response.result_code === '010') {
        data.lang = this.getValidLanguage();
        response = await this.makeRequest('/openapi/getDeviceList', data);
      }
      
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
      
      // Tentar primeiro sem idioma
      let data: any = {
        appkey: this.config.appkey,
        token: token,
        ps_id: plantId,
        device_type: deviceType
      };

      let response = await this.makeRequest('/openapi/getDeviceRealTimeData', data);
      
      // Se falhar por idioma, tentar com idioma válido
      if (response.result_code === '010') {
        data.lang = this.getValidLanguage();
        response = await this.makeRequest('/openapi/getDeviceRealTimeData', data);
      }
      
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
      deviceType,
      hasAccessKey: !!config?.accessKey,
      hasAppkey: !!config?.appkey,
      configuredLanguage: config?.language || 'auto-detect'
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
