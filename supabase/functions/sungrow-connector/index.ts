import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

/**
 * Default configuration values loaded from environment variables. These allow the
 * connector to operate without requiring every request to provide a complete
 * configuration object. Secret values such as the app key and access key
 * should be set in the environment (e.g. via project settings in Supabase) and
 * **must not** be hard coded in the code base. When both the incoming request
 * and the database lack a value, the defaults defined here take effect.
 */
const DEFAULT_SUNGROW_USERNAME = Deno.env.get('SUNGROW_USERNAME') || undefined;
const DEFAULT_SUNGROW_PASSWORD = Deno.env.get('SUNGROW_PASSWORD') || undefined;
const DEFAULT_SUNGROW_APPKEY   = Deno.env.get('SUNGROW_APPKEY')   || '';
const DEFAULT_SUNGROW_ACCESSKEY = Deno.env.get('SUNGROW_ACCESSKEY') || '';
const DEFAULT_SUNGROW_BASEURL  = Deno.env.get('SUNGROW_BASE_URL') || 'https://gateway.isolarcloud.com.hk';

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
  // OAuth 2.0 specific
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  authorizationCode?: string;
  scope?: string;
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

interface SungrowTokenRefreshResponse {
  req_serial_num: string;
  result_code: string;
  result_msg: string;
  result_data?: {
    access_token: string;
    refresh_token: string;
    code: string;
    token_type: string;
    expires_in: number;
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

    // Handle OAuth 2.0 authentication
    if (this.config.authMode === 'oauth2') {
      return await this.authenticateOAuth2();
    }

    // Handle direct login authentication (existing logic)
    return await this.authenticateDirectLogin();
  }

  private async authenticateOAuth2(): Promise<string> {
    // If we have a valid access token, use it
    if (this.config.accessToken && Date.now() < (this.config.tokenExpiresAt || 0)) {
      this.token = this.config.accessToken;
      this.tokenExpires = this.config.tokenExpiresAt || 0;
      return this.token;
    }

    // If we have a refresh token, try to refresh
    if (this.config.refreshToken) {
      try {
        const refreshedTokens = await this.refreshAccessToken();
        if (refreshedTokens) {
          return refreshedTokens.access_token;
        }
      } catch (error) {
        console.warn('Token refresh failed, will need re-authorization:', error);
      }
    }

    // If we have an authorization code, exchange it for tokens
    if (this.config.authorizationCode) {
      const tokens = await this.exchangeAuthorizationCode();
      if (tokens) {
        return tokens.access_token;
      }
    }

    throw new Error('OAuth 2.0 authentication failed: No valid tokens or authorization code available');
  }

  private async refreshAccessToken(): Promise<any> {
    if (!this.config.refreshToken) {
      throw new Error('No refresh token available');
    }

    console.log('Refreshing OAuth 2.0 access token');

    const refreshData = {
      refresh_token: this.config.refreshToken,
      appkey: this.config.appkey
    };

    const response = await this.makeRequest('/openapi/apiManage/refreshToken', refreshData);

    if (response.result_code === '1' && response.result_data) {
      const tokenData = response.result_data;
      
      // Update configuration with new tokens
      this.config.accessToken = tokenData.access_token;
      this.config.refreshToken = tokenData.refresh_token;
      this.config.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);
      
      this.token = tokenData.access_token;
      this.tokenExpires = this.config.tokenExpiresAt;

      // Save tokens to database
      await this.saveTokensToDatabase(tokenData);

      console.log('OAuth 2.0 token refreshed successfully');
      return tokenData;
    }

    throw new Error(`Token refresh failed: ${response.result_msg}`);
  }

  private async exchangeAuthorizationCode(): Promise<any> {
    if (!this.config.authorizationCode || !this.config.redirectUri) {
      throw new Error('Authorization code and redirect URI are required');
    }

    console.log('Exchanging authorization code for tokens');

    const tokenData = {
      appkey: this.config.appkey,
      grant_type: 'authorization_code',
      code: this.config.authorizationCode,
      redirect_uri: this.config.redirectUri
    };

    const response = await this.makeRequest('/openapi/apiManage/token', tokenData);

    if (response.result_code === '1' && response.result_data) {
      const tokenData = response.result_data;
      
      // Update configuration with new tokens
      this.config.accessToken = tokenData.access_token;
      this.config.refreshToken = tokenData.refresh_token;
      this.config.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);
      this.config.authorizedPlants = tokenData.auth_ps_list || [];
      
      this.token = tokenData.access_token;
      this.tokenExpires = this.config.tokenExpiresAt;

      // Save tokens to database
      await this.saveTokensToDatabase(tokenData);

      console.log('OAuth 2.0 tokens obtained successfully', {
        authorizedPlants: tokenData.auth_ps_list?.length || 0
      });
      
      return tokenData;
    }

    throw new Error(`Authorization code exchange failed: ${response.result_msg}`);
  }

  private async saveTokensToDatabase(tokenData: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sungrow_tokens')
        .upsert({
          user_id: tokenData.auth_user || 'system',
          plant_id: this.config.plantId || null,
          provider: 'sungrow',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(this.config.tokenExpiresAt || Date.now() + 172800000).toISOString(), // 2 days default
          config_hash: this.generateConfigHash()
        });

      if (error) {
        console.error('Failed to save tokens to database:', error);
      } else {
        console.log('Tokens saved to database successfully');
      }
    } catch (error) {
      console.error('Error saving tokens to database:', error);
    }
  }

  private generateConfigHash(): string {
    const configStr = JSON.stringify({
      appkey: this.config.appkey,
      baseUrl: this.config.baseUrl,
      authMode: this.config.authMode
    });
    
    // Simple hash function for config identification
    let hash = 0;
    for (let i = 0; i < configStr.length; i++) {
      const char = configStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private async authenticateDirectLogin(): Promise<string> {

    // Tentar autenticação sem parâmetro lang primeiro
    let authData: any = {
      appkey: this.config.appkey.trim(),
      user_account: this.config.username?.trim(),
      user_password: this.config.password?.trim()
    };

    console.log('Attempting direct login authentication without language parameter');

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

  // OAuth 2.0 utility methods
  generateOAuthURL(redirectUri: string, state?: string): string {
    const baseUrl = this.config.baseUrl || 'https://gateway.isolarcloud.com.hk';
    const params = new URLSearchParams({
      applicationId: this.config.appkey,
      redirectUrl: redirectUri
    });
    
    if (state) {
      params.append('state', state);
    }

    // Note: cloudId should be obtained from the application configuration
    const cloudId = 'YOUR_ACCOUNT_BELONG_TO_CLOUD'; // This should be configurable
    
    return `${baseUrl}/authorized-app?cloudId=${cloudId}&${params.toString()}`;
  }

  async exchangeAuthorizationCodeStandalone(code: string, redirectUri: string): Promise<any> {
    try {
      const tempConfig = { ...this.config, authorizationCode: code, redirectUri };
      const tempApi = new SungrowAPI(tempConfig, this.supabase);
      
      const result = await tempApi.exchangeAuthorizationCode();
      
      return {
        success: true,
        tokens: {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          expires_in: result.expires_in,
          token_type: result.token_type,
          authorized_plants: result.auth_ps_list || []
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to exchange authorization code'
      };
    }
  }

  async refreshTokenStandalone(refreshToken: string): Promise<any> {
    try {
      const tempConfig = { ...this.config, refreshToken };
      const tempApi = new SungrowAPI(tempConfig, this.supabase);
      
      const result = await tempApi.refreshAccessToken();
      
      return {
        success: true,
        tokens: {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          expires_in: result.expires_in,
          token_type: result.token_type
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh token'
      };
    }
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

async function performSyncData(plantId: string, api: SungrowAPI, supabase: any) {
  const startTime = Date.now();
  let dataPointsSynced = 0;
  try {
    // fetch energy data for the last day
    const energyResult = await api.getStationEnergy(plantId, 'day');
    if (!energyResult.success || !energyResult.data?.list) {
      throw new Error(energyResult.error || 'Falha ao obter energia');
    }

    // transform Sungrow energy points into rows for the `readings` table
    const readings = energyResult.data.list.map((pt: any) => {
      const timestamp = new Date(pt.time).toISOString();
      return {
        plant_id: plantId,
        timestamp,
        energy_kwh: pt.energy > 0 ? pt.energy / 1000 : 0, // convert Wh to kWh
        power_w: pt.power || 0,
        created_at: new Date().toISOString()
      };
    });

    // upsert readings (ignore duplicates on plant_id + timestamp)
    if (readings.length > 0) {
      const { error } = await supabase.from('readings').upsert(readings, {
        onConflict: 'plant_id,timestamp',
        ignoreDuplicates: true
      });
      if (error) throw new Error(`Erro ao inserir dados: ${error.message}`);
      dataPointsSynced = readings.length;
    }

    // update last sync timestamp on the plant
    await supabase.from('plants')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', plantId);

    // log success
    await supabase.from('sync_logs').insert({
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
    // log the error
    await supabase.from('sync_logs').insert({
      plant_id: plantId,
      system_type: 'sungrow',
      status: 'error',
      message: error.message,
      data_points_synced: dataPointsSynced,
      sync_duration_ms: Date.now() - startTime
    });
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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

    const { action, config = {}, plantId, period, deviceType, use_saved } = await req.json();
    
    const effectivePlantId = config.plantId || plantId;

    console.log('Sungrow connector action:', action, {
      hasConfig: !!config,
      plantId: effectivePlantId,
      period,
      deviceType,
      hasAccessKey: !!config?.accessKey,
      hasAppkey: !!config?.appkey,
      configuredLanguage: config?.language || 'auto-detect',
      use_saved: !!use_saved
    });

    // Optionally load saved credentials from DB if requested or if critical fields are missing
    let mergedConfig = { ...config } as SungrowConfig;
    try {
      const needsSaved = !!use_saved || !config?.appkey || !config?.accessKey || !config?.username || !config?.password;
      if (needsSaved) {
        if (!effectivePlantId) {
          throw new Error('plantId é obrigatório para usar credenciais salvas');
        }
        const { data: saved, error: savedErr } = await supabase
          .from('plant_credentials')
          .select('username, password, appkey, access_key, base_url')
          .eq('plant_id', effectivePlantId)
          .eq('provider', 'sungrow')
          .maybeSingle();
        if (savedErr) {
          console.warn('Could not load saved credentials:', savedErr.message);
        }
        if (saved) {
          console.log('Using saved credentials for plant', { plantId: effectivePlantId, hasAppkey: !!saved.appkey, hasAccessKey: !!saved.access_key });
          mergedConfig = {
            authMode: 'direct',
            baseUrl: saved.base_url || config.baseUrl,
            appkey: (config.appkey || saved.appkey || '').trim(),
            accessKey: (config.accessKey || saved.access_key || '').trim(),
            username: (config.username || saved.username || '').trim(),
            password: (config.password || saved.password || '').trim(),
            plantId: effectivePlantId,
            language: config.language
          } as SungrowConfig;
        }
      }
    } catch (e) {
      console.warn('Saved credentials merging warning:', e instanceof Error ? e.message : e);
    }

    // Apply environment defaults when necessary
    mergedConfig = {
      authMode: mergedConfig.authMode || 'direct',
      username: mergedConfig.username || DEFAULT_SUNGROW_USERNAME,
      password: mergedConfig.password || DEFAULT_SUNGROW_PASSWORD,
      appkey:   mergedConfig.appkey   || DEFAULT_SUNGROW_APPKEY,
      accessKey: mergedConfig.accessKey || DEFAULT_SUNGROW_ACCESSKEY,
      baseUrl:  mergedConfig.baseUrl  || DEFAULT_SUNGROW_BASEURL,
      plantId:  mergedConfig.plantId || effectivePlantId,
      language: mergedConfig.language,
      // OAuth 2.0 fields
      accessToken: mergedConfig.accessToken,
      refreshToken: mergedConfig.refreshToken,
      tokenExpiresAt: mergedConfig.tokenExpiresAt,
      authorizedPlants: mergedConfig.authorizedPlants,
      clientId: mergedConfig.clientId,
      clientSecret: mergedConfig.clientSecret,
      redirectUri: mergedConfig.redirectUri,
      authorizationCode: mergedConfig.authorizationCode,
      scope: mergedConfig.scope
    };

    const api = new SungrowAPI(mergedConfig as SungrowConfig, supabase);

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

      case 'generate_oauth_url':
        const { redirectUri, state } = await req.json();
        const oauthUrl = api.generateOAuthURL(redirectUri, state);
        return new Response(JSON.stringify({ success: true, authUrl: oauthUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'exchange_code':
        const { code, redirectUri: exchangeRedirectUri } = await req.json();
        const exchangeResult = await api.exchangeAuthorizationCodeStandalone(code, exchangeRedirectUri);
        return new Response(JSON.stringify(exchangeResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'refresh_token':
        const { refreshToken } = await req.json();
        const refreshResult = await api.refreshTokenStandalone(refreshToken);
        return new Response(JSON.stringify(refreshResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

      case 'sync_data': {
        // ensure plantId is available
        if (!effectivePlantId) {
          throw new Error('plantId é obrigatório para sincronização');
        }
        const api = new SungrowAPI(mergedConfig, supabase);
        return await performSyncData(effectivePlantId, api, supabase);
      }

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
