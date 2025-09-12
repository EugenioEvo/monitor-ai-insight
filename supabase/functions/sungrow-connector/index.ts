import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { corsHeaders } from '../_shared/cors.ts';
import { validateInput, rateLimit, sanitizeString, logSecurityEvent, securityHeaders, SecurityError } from '../_shared/security.ts';

/**
 * IMPORTANTE: As credenciais devem ser fornecidas a cada requisição.
 * Não usamos mais defaults das variáveis de ambiente para forçar
 * o uso de credenciais frescas em cada operação.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
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
  sysCode?: string;
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
    
    // Log configuração inicial (sem dados sensíveis)
    this.logDiagnostic('CONFIG_INIT', {
      authMode: config.authMode,
      hasUsername: !!config.username,
      hasAppkey: !!config.appkey,
      hasAccessKey: !!config.accessKey,
      baseUrl: config.baseUrl,
      appkeyLength: config.appkey?.length || 0,
      accessKeyLength: config.accessKey?.length || 0
    });
  }

  // Sistema de logging diagnóstico centralizado
  private async logDiagnostic(event: string, data: any, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      level,
      data: typeof data === 'object' ? data : { message: data }
    };
    
    console.log(`[SUNGROW-${level.toUpperCase()}] ${event}:`, logEntry.data);
    
    // Salvar logs críticos no banco para análise posterior
    if (level === 'error' || event.includes('AUTH_FAIL') || event.includes('API_ERROR')) {
      try {
        await this.supabase.from('system_metrics').insert({
          metric_type: 'sungrow_diagnostic',
          metric_data: logEntry
        });
      } catch (dbError) {
        console.warn('Failed to save diagnostic log to database:', dbError);
      }
    }
  }

  private validateConfig(): void {
    const validationData = {
      hasAppkey: !!this.config.appkey,
      hasAccessKey: !!this.config.accessKey,
      hasUsername: !!this.config.username,
      hasPassword: !!this.config.password,
      appkeyLength: this.config.appkey?.length || 0,
      accessKeyLength: this.config.accessKey?.length || 0
    };
    
    this.logDiagnostic('CONFIG_VALIDATION', validationData);

    const validationErrors: string[] = [];
    
    if (!this.config.appkey?.trim()) {
      validationErrors.push('AppKey é obrigatório');
    }
    
    if (!this.config.accessKey?.trim()) {
      validationErrors.push('AccessKey é obrigatório');
    } else if (this.config.accessKey.length < 10) {
      validationErrors.push('AccessKey muito curto (pode estar incompleto)');
    } else if (this.config.accessKey.includes('\n') || this.config.accessKey.includes('\r')) {
      validationErrors.push('AccessKey contém quebras de linha (formato inválido)');
    }
    
    if (this.config.authMode === 'direct') {
      if (!this.config.username?.trim()) validationErrors.push('Username é obrigatório para autenticação direta');
      if (!this.config.password?.trim()) validationErrors.push('Password é obrigatório para autenticação direta');
    }
    
    if (validationErrors.length > 0) {
      this.logDiagnostic('CONFIG_VALIDATION_FAILED', { errors: validationErrors }, 'error');
      throw new Error(`Configuração inválida: ${validationErrors.join(', ')}`);
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
    
    const requestData = {
      url,
      endpoint,
      hasToken: !!this.token,
      hasAccessKey: !!this.config.accessKey,
      accessKeyPrefix: this.config.accessKey ? `${this.config.accessKey.substring(0, 8)}...` : 'missing',
      dataKeys: Object.keys(data || {}),
      languageParam: data.lang || 'not included',
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.logDiagnostic('API_REQUEST_START', requestData);

    // Garantir que o parâmetro sys_code seja sempre enviado (requisito de algumas regiões)
    if (data && typeof data === 'object' && data.sys_code === undefined) {
      data.sys_code = '901';
    }

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
        const accessKey = this.config.accessKey.trim();
        
        // Validar se é uma chave de acesso válida (não contém quebras de linha ou texto longo)
        if (accessKey.includes('\n') || accessKey.includes('\r') || accessKey.length > 100) {
          console.error('CRITICAL: Invalid access key format detected!', {
            hasNewlines: accessKey.includes('\n') || accessKey.includes('\r'),
            length: accessKey.length,
            preview: accessKey.substring(0, 50) + '...'
          });
          throw new Error('Access Key inválida: parece conter texto em vez de uma chave de API válida. Verifique se você copiou a chave correta do portal Sungrow.');
        }
        
        headers['x-access-key'] = accessKey;
        console.log('Adding x-access-key header:', {
          keyExists: true,
          keyLength: accessKey.length,
          keyPrefix: `${accessKey.substring(0, 8)}...`
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
      
      const responseData = {
        endpoint,
        result_code: result.result_code,
        result_msg: result.result_msg,
        hasData: !!result.result_data,
        duration_ms: Date.now() - parseInt(requestData.requestId.split('_')[1]),
        success: result.result_code === '1'
      };
      
      this.logDiagnostic('API_RESPONSE', responseData, result.result_code === '1' ? 'info' : 'warn');

      // Tratamento detalhado de erros com diagnóstico
      if (result.result_code !== '1') {
        const errorDetails = {
          error_code: result.result_code,
          error_message: result.result_msg,
          endpoint,
          provided_access_key_length: this.config.accessKey?.length || 0,
          provided_access_key_prefix: this.config.accessKey ? `${this.config.accessKey.substring(0, 8)}...` : 'none',
          suggested_solution: this.getSuggestedSolution(result.result_code)
        };
        
        this.logDiagnostic('API_ERROR', errorDetails, 'error');
        
        if (result.result_code === 'E912') {
          throw new Error(`Chave de acesso inválida (E912): ${result.result_msg}. ${errorDetails.suggested_solution}`);
        } else if (result.result_code === 'E00000' && result.result_msg === 'er_invalid_appkey') {
          throw new Error(`App Key inválida: ${result.result_msg}. Verifique se a App Key está correta no portal Sungrow.`);
        } else if (result.result_code === '4') {
          throw new Error(`Client ID não confere (OAuth): ${result.result_msg}. Verifique a configuração OAuth no portal.`);
        } else {
          const knownError = SUNGROW_ERROR_CODES[result.result_code] || result.result_msg;
          throw new Error(`API Error (${result.result_code}): ${knownError}`);
        }
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
    this.logDiagnostic('OAUTH_AUTH_START', {
      hasAccessToken: !!this.config.accessToken,
      hasRefreshToken: !!this.config.refreshToken,
      hasAuthCode: !!this.config.authorizationCode,
      tokenExpiry: this.config.tokenExpiresAt
    });

    // If we have a valid access token, use it
    if (this.config.accessToken && Date.now() < (this.config.tokenExpiresAt || 0)) {
      this.token = this.config.accessToken;
      this.tokenExpires = this.config.tokenExpiresAt || 0;
      this.logDiagnostic('OAUTH_EXISTING_TOKEN_USED', { expiresAt: this.config.tokenExpiresAt });
      return this.token;
    }

    // If we have a refresh token, try to refresh
    if (this.config.refreshToken) {
      try {
        const refreshedTokens = await this.refreshAccessToken();
        if (refreshedTokens) {
          this.logDiagnostic('OAUTH_TOKEN_REFRESHED', { success: true });
          return refreshedTokens.access_token;
        }
      } catch (error) {
        this.logDiagnostic('OAUTH_REFRESH_FAILED', { error: (error as Error).message }, 'warn');
        console.warn('Token refresh failed, will need re-authorization:', error);
      }
    }

    // If we have an authorization code, exchange it for tokens
    if (this.config.authorizationCode) {
      try {
        const tokens = await this.exchangeAuthorizationCode();
        if (tokens) {
          this.logDiagnostic('OAUTH_CODE_EXCHANGED', { success: true });
          return tokens.access_token;
        }
      } catch (error) {
        this.logDiagnostic('OAUTH_CODE_EXCHANGE_FAILED', { error: (error as Error).message }, 'error');
        
        // Se OAuth falhar completamente, tentar fallback para autenticação direta se as credenciais estiverem disponíveis
        if (this.config.username && this.config.password) {
          this.logDiagnostic('OAUTH_FALLBACK_TO_DIRECT', { attempting: true }, 'warn');
          try {
            const directToken = await this.authenticateDirectLogin();
            this.logDiagnostic('OAUTH_FALLBACK_SUCCESS', { success: true }, 'warn');
            return directToken;
          } catch (directError) {
            this.logDiagnostic('OAUTH_FALLBACK_FAILED', { error: (directError as Error).message }, 'error');
          }
        }
        
        throw error;
      }
    }

    // Se não temos nenhum método OAuth disponível, tentar fallback direto se possível
    if (this.config.username && this.config.password) {
      this.logDiagnostic('OAUTH_NO_TOKENS_FALLBACK_TO_DIRECT', { attempting: true }, 'warn');
      try {
        const directToken = await this.authenticateDirectLogin();
        this.logDiagnostic('OAUTH_NO_TOKENS_FALLBACK_SUCCESS', { success: true }, 'warn');
        return directToken;
      } catch (directError) {
        this.logDiagnostic('OAUTH_NO_TOKENS_FALLBACK_FAILED', { error: (directError as Error).message }, 'error');
      }
    }

    this.logDiagnostic('OAUTH_AUTH_COMPLETE_FAILURE', {
      message: 'No valid OAuth tokens, authorization codes, or direct login fallback available'
    }, 'error');
    
    throw new Error('OAuth 2.0 authentication failed: No valid tokens or authorization code available. Verifique se o OpenAPI está habilitado no portal Sungrow e as credenciais OAuth estão configuradas corretamente.');
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

    const tokenPayload = {
      appkey: this.config.appkey,
      grant_type: 'authorization_code',
      code: this.config.authorizationCode,
      redirect_uri: this.config.redirectUri
    };

    const response = await this.makeRequest('/openapi/apiManage/token', tokenPayload);

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

  private getSuggestedSolution(errorCode: string): string {
    const solutions: Record<string, string> = {
      'E912': 'Copie novamente a Access Key do portal sem espaços extras',
      'E00000': 'Verifique se a App Key está registrada e ativa no portal',
      '4': 'Configure corretamente o Client ID no OAuth do portal Sungrow',
      'E900': 'Verifique credenciais e se OpenAPI está habilitado',
      '1002': 'Token expirado - realize nova autenticação',
      '1005': 'Conta bloqueada - contate suporte Sungrow',
      'er_invalid_appkey': 'App Key não registrada ou inativa no portal'
    };
    
    return solutions[errorCode] || 'Verifique a documentação da API Sungrow';
  }

  private async authenticateDirectLogin(): Promise<string> {

    // Tentar autenticação sem parâmetro lang primeiro
    let authData: any = {
      appkey: this.config.appkey.trim(),
      user_account: this.config.username?.trim(),
      user_password: this.config.password?.trim(),
      sys_code: this.config.sysCode || '901'  // Configurável, mantendo '901' como default
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
            sys_code: this.config.sysCode || '901',  // Configurável
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
    // Use Sungrow's web3 OAuth portal
    const oauthBaseUrl = 'https://web3.isolarcloud.com.hk/#/authorized-app';
    
    // Use user's actual appkey as applicationId
    const params = new URLSearchParams({
      cloudId: '2', // Standard cloudId for iSolarCloud
      applicationId: this.config.appkey, // Use user's registered application key
      redirectUrl: redirectUri
    });
    
    if (state) {
      params.append('state', state);
    }
    
    const fullUrl = `${oauthBaseUrl}?${params.toString()}`;
    console.log('Generated OAuth URL with appkey as applicationId:', {
      cloudId: '2',
      applicationId: this.config.appkey,
      redirectUrl: redirectUri,
      fullUrl
    });
    
    return fullUrl;
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
      
      // Melhor guidance para erros específicos
      if (error instanceof Error) {
        if (error.message.includes('E912')) {
          return { 
            success: false, 
            message: `Chave de acesso inválida (E912): Verifique se você copiou corretamente a "Access Key Value" do portal Sungrow iSolarCloud. ${error.message}`
          };
        } else if (error.message.includes('E900')) {
          return { 
            success: false, 
            message: `Não autorizado (E900): Credenciais inválidas ou OpenAPI não habilitado. Verifique suas credenciais e permissões no portal iSolarCloud.`
          };
        } else if (error.message.includes('Method Not Allowed')) {
          return { 
            success: false, 
            message: `Método não permitido: Base URL incorreta para login direto. Use 'https://gateway.isolarcloud.com.hk' ou tente OAuth 2.0.`
          };
        }
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
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no ambiente'
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🔴 LER UMA ÚNICA VEZ
    const body = await req.json().catch(() => ({}));
    const {
      action,
      config = {},
      plantId,
      period,
      deviceType,
      use_saved,
      // campos usados pelos outros cases:
      redirectUri,
      state,
      code,
      refreshToken
    } = body;
    
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

    // Load credentials from config, profile, or saved plant credentials
    let mergedConfig = { ...config } as SungrowConfig;
    
    try {
      // Check if we have complete credentials in the request
      const hasCompleteCredentials = config?.appkey && config?.accessKey && config?.username && config?.password;
      
      if (hasCompleteCredentials) {
        // Use provided credentials directly
        console.log('Using provided credentials in request');
        mergedConfig = {
          authMode: config.authMode || 'direct',
          baseUrl: config.baseUrl || 'https://gateway.isolarcloud.com.hk',
          appkey: config.appkey.trim(),
          accessKey: config.accessKey.trim(),
          username: config.username.trim(),
          password: config.password.trim(),
          plantId: effectivePlantId,
          language: config.language
        } as SungrowConfig;
      } else {
        // Need to load from saved sources
        let credentialsFound = false;
        
        // First, try to load from user's default profile
        try {
          // Get user's default profile directly using service role key
          const { data: defaultProfile, error: profileError } = await supabase
            .from('sungrow_credential_profiles')
            .select('*')
            .eq('is_default', true)
            .maybeSingle();

          if (defaultProfile && !profileError) {
            console.log('Using default profile credentials:', { 
              profileId: defaultProfile.id, 
              profileName: defaultProfile.name,
              hasAppkey: !!defaultProfile.appkey,
              hasAccessKey: !!defaultProfile.access_key,
              authMode: defaultProfile.auth_mode
            });
            
            mergedConfig = {
              authMode: defaultProfile.auth_mode === 'oauth' ? 'oauth2' : 'direct',
              baseUrl: defaultProfile.base_url || config.baseUrl,
              appkey: (config.appkey || defaultProfile.appkey || '').trim(),
              accessKey: (config.accessKey || defaultProfile.access_key || '').trim(),
              username: (config.username || defaultProfile.username || '').trim(),
              password: (config.password || defaultProfile.password || '').trim(),
              plantId: effectivePlantId,
              language: config.language
            } as SungrowConfig;
            credentialsFound = true;
          }
        } catch (profileErr) {
          console.warn('Could not load default profile credentials:', profileErr);
        }

        // If no profile credentials found, try plant-specific credentials
        if (!credentialsFound && effectivePlantId) {
          const { data: saved, error: savedErr } = await supabase
            .from('plant_credentials')
            .select('username, password, appkey, access_key, base_url')
            .eq('plant_id', effectivePlantId)
            .eq('provider', 'sungrow')
            .maybeSingle();
            
          if (savedErr) {
            console.warn('Could not load saved plant credentials:', savedErr.message);
          }
          if (saved) {
            console.log('Using saved plant credentials for:', { plantId: effectivePlantId, hasAppkey: !!saved.appkey, hasAccessKey: !!saved.access_key });
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
            credentialsFound = true;
          }
        }
        
        // Only throw error if no credentials were provided AND none were found in storage
        if (!credentialsFound) {
          throw new Error('Nenhuma credencial encontrada. Configure um perfil padrão ou forneça credenciais na requisição.');
        }
      }
    } catch (e) {
      console.error('Credentials loading error:', e instanceof Error ? e.message : e);
      if (e instanceof Error && e.message.includes('Nenhuma credencial encontrada')) {
        throw e; // Re-throw this specific error
      }
    }

    // Não usar defaults de ambiente - sempre exigir credenciais frescas
    mergedConfig = {
      authMode: mergedConfig.authMode || 'direct',
      username: mergedConfig.username,
      password: mergedConfig.password, 
      appkey: mergedConfig.appkey,
      accessKey: mergedConfig.accessKey,
      // Set correct baseUrl based on auth mode
      baseUrl: mergedConfig.authMode === 'oauth2' ? '' : (mergedConfig.baseUrl || 'https://gateway.isolarcloud.com.hk'),
      plantId: mergedConfig.plantId || effectivePlantId,
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

    // Validação por ação
    const oauthActions = ['generate_oauth_url', 'exchange_code', 'refresh_token'];
    if (!oauthActions.includes(action)) {
      if (!mergedConfig.username || !mergedConfig.password || !mergedConfig.appkey || !mergedConfig.accessKey) {
        const errorMsg = `Credenciais obrigatórias não fornecidas. Necessário: username, password, appkey, accessKey. 
        
Para resolver este problema:
1. Vá para a página de Plantas → aba Perfis
2. Crie um novo perfil com todas as credenciais necessárias
3. Defina-o como perfil padrão
4. Ou forneça as credenciais diretamente na requisição

Status atual: ${JSON.stringify({
          hasUsername: !!mergedConfig.username,
          hasPassword: !!mergedConfig.password,
          hasAppkey: !!mergedConfig.appkey,
          hasAccessKey: !!mergedConfig.accessKey,
          authMode: mergedConfig.authMode
        })}`;
        throw new Error(errorMsg);
      }
    } else {
      // Requisitos mínimos para fluxos OAuth
      if (action === 'generate_oauth_url') {
        if (!mergedConfig.appkey) {
          throw new Error('App Key (applicationId) é obrigatória para gerar a URL de autorização. Configure um perfil com App Key válida.');
        }
      }
      if (action === 'exchange_code') {
        if (!mergedConfig.appkey || !code || !redirectUri) {
          throw new Error('Para exchange_code informe appkey, code e redirectUri');
        }
      }
      if (action === 'refresh_token') {
        if (!mergedConfig.appkey || !refreshToken) {
          throw new Error('Para refresh_token informe appkey e refreshToken');
        }
      }
    }

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

      case 'generate_oauth_url': {
        const oauthUrl = api.generateOAuthURL(redirectUri, state);
        return new Response(JSON.stringify({ success: true, authUrl: oauthUrl }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      case 'exchange_code': {
        const exchangeResult = await api.exchangeAuthorizationCodeStandalone(code, redirectUri);
        return new Response(JSON.stringify(exchangeResult), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      case 'refresh_token': {
        const refreshResult = await api.refreshTokenStandalone(refreshToken);
        return new Response(JSON.stringify(refreshResult), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

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
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    const status = /credenciais obrigatórias|plantId é obrigatório/i.test(message) ? 400 : 500;
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
