
/**
 * ApiClient Universal Base
 * Cliente HTTP robusto com cache, retry, circuit breaker e rate limiting
 */

import { logger } from './logger';
import { envValidator } from './env-validator';

export interface ApiClientConfig {
  baseUrl: string;
  accessKey?: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  cache?: {
    enabled: boolean;
    ttlMs: number;
  };
}

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  skipCache?: boolean;
  skipRateLimit?: boolean;
  retryCondition?: (error: Error) => boolean;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
  cached?: boolean;
  duration: number;
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

class ApiClient {
  private config: Required<ApiClientConfig>;
  private cache = new Map<string, CacheEntry>();
  private rateLimitQueue = new Map<string, number[]>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private requestId: string;

  constructor(config: ApiClientConfig) {
    const env = envValidator.getConfig();
    
    this.config = {
      timeout: 30000,
      retryAttempts: env.MAX_RETRY_ATTEMPTS,
      retryDelay: env.MIN_REQUEST_INTERVAL,
      rateLimit: {
        requests: 10,
        windowMs: 60000
      },
      cache: {
        enabled: true,
        ttlMs: env.CACHE_TTL_MINUTES * 60 * 1000
      },
      ...config
    };

    this.requestId = logger.createContext({ component: 'ApiClient' }).requestId;
    
    logger.info('ApiClient inicializado', {
      component: 'ApiClient',
      requestId: this.requestId,
      baseUrl: this.config.baseUrl,
      cacheEnabled: this.config.cache.enabled,
      rateLimitEnabled: Boolean(this.config.rateLimit)
    });
  }

  /**
   * Rate limiting inteligente
   */
  private async enforceRateLimit(key: string = 'default'): Promise<void> {
    const now = Date.now();
    const window = this.config.rateLimit.windowMs;
    const maxRequests = this.config.rateLimit.requests;
    
    if (!this.rateLimitQueue.has(key)) {
      this.rateLimitQueue.set(key, []);
    }
    
    const requests = this.rateLimitQueue.get(key)!;
    
    // Limpar requests antigos
    const validRequests = requests.filter(timestamp => now - timestamp < window);
    
    if (validRequests.length >= maxRequests) {
      const oldestRequest = Math.min(...validRequests);
      const waitTime = window - (now - oldestRequest);
      
      logger.warn('Rate limit atingido, aguardando', {
        component: 'ApiClient',
        requestId: this.requestId,
        key,
        waitTime,
        requestsInWindow: validRequests.length
      });
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    validRequests.push(now);
    this.rateLimitQueue.set(key, validRequests);
  }

  /**
   * Circuit breaker pattern
   */
  private getCircuitBreakerState(key: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, {
        failures: 0,
        lastFailure: 0,
        state: 'closed'
      });
    }
    return this.circuitBreakers.get(key)!;
  }

  private updateCircuitBreaker(key: string, success: boolean): void {
    const breaker = this.getCircuitBreakerState(key);
    
    if (success) {
      // Reset em caso de sucesso
      breaker.failures = 0;
      breaker.state = 'closed';
    } else {
      breaker.failures++;
      breaker.lastFailure = Date.now();
      
      // Abrir circuit após 5 falhas consecutivas
      if (breaker.failures >= 5) {
        breaker.state = 'open';
        logger.warn('Circuit breaker aberto', {
          component: 'ApiClient',
          requestId: this.requestId,
          key,
          failures: breaker.failures
        });
      }
    }
    
    this.circuitBreakers.set(key, breaker);
  }

  private canMakeRequest(key: string): boolean {
    const breaker = this.getCircuitBreakerState(key);
    
    if (breaker.state === 'closed') {
      return true;
    }
    
    if (breaker.state === 'open') {
      // Tentar meio-aberto após 60 segundos
      if (Date.now() - breaker.lastFailure > 60000) {
        breaker.state = 'half-open';
        this.circuitBreakers.set(key, breaker);
        return true;
      }
      return false;
    }
    
    // half-open: permitir uma tentativa
    return breaker.state === 'half-open';
  }

  /**
   * Cache inteligente
   */
  private getCacheKey(url: string, config: RequestConfig): string {
    const method = config.method || 'GET';
    const body = config.body ? JSON.stringify(config.body) : '';
    return `${method}:${url}:${body}`;
  }

  private getCached<T>(key: string): T | null {
    if (!this.config.cache.enabled) return null;
    
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCache(key: string, data: any, customTtl?: number): void {
    if (!this.config.cache.enabled) return;
    
    const ttl = customTtl || this.config.cache.ttlMs;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Retry com backoff exponencial
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RequestConfig,
    context: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          logger.info('Operação bem-sucedida após retry', {
            component: 'ApiClient',
            requestId: this.requestId,
            context,
            attempt,
            totalAttempts: this.config.retryAttempts
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        const shouldRetry = attempt < this.config.retryAttempts && 
          (config.retryCondition?.(lastError) ?? this.defaultRetryCondition(lastError));
        
        if (!shouldRetry) {
          break;
        }
        
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        
        logger.warn('Tentativa falhou, fazendo retry', {
          component: 'ApiClient',
          requestId: this.requestId,
          context,
          attempt,
          nextDelay: delay,
          error: lastError.message
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  private defaultRetryCondition(error: Error): boolean {
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /429/, // Rate limit
      /500/, /502/, /503/, /504/, // Server errors
      /ECONNRESET/,
      /ETIMEDOUT/
    ];
    
    return retryablePatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    );
  }

  /**
   * Fazer request HTTP
   */
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const method = config.method || 'GET';
    const cacheKey = this.getCacheKey(url, config);
    const circuitKey = `${this.config.baseUrl}:${endpoint}`;
    
    // Verificar circuit breaker
    if (!this.canMakeRequest(circuitKey)) {
      throw new Error(`Circuit breaker open para ${circuitKey}`);
    }
    
    // Verificar cache (apenas para GET)
    if (method === 'GET' && !config.skipCache) {
      const cached = this.getCached<T>(cacheKey);
      if (cached) {
        logger.debug('Cache hit', {
          component: 'ApiClient',
          requestId: this.requestId,
          url,
          method
        });
        
        return {
          data: cached,
          status: 200,
          headers: new Headers(),
          cached: true,
          duration: 0
        };
      }
    }
    
    // Rate limiting
    if (!config.skipRateLimit) {
      await this.enforceRateLimit(circuitKey);
    }
    
    const startTime = performance.now();
    
    try {
      const response = await this.executeWithRetry(
        () => this.makeHttpRequest(url, config),
        config,
        `${method} ${endpoint}`
      );
      
      const duration = Math.round(performance.now() - startTime);
      
      // Atualizar circuit breaker (sucesso)
      this.updateCircuitBreaker(circuitKey, true);
      
      // Cache da resposta (apenas GET com sucesso)
      if (method === 'GET' && response.status >= 200 && response.status < 300) {
        this.setCache(cacheKey, response.data);
      }
      
      logger.info('Request bem-sucedido', {
        component: 'ApiClient',
        requestId: this.requestId,
        method,
        url,
        status: response.status,
        duration
      });
      
      return {
        ...response,
        duration
      };
      
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      
      // Atualizar circuit breaker (falha)
      this.updateCircuitBreaker(circuitKey, false);
      
      logger.error('Request falhou', error as Error, {
        component: 'ApiClient',
        requestId: this.requestId,
        method,
        url,
        duration
      });
      
      throw error;
    }
  }

  private async makeHttpRequest<T>(
    url: string,
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Monitor.ai/2.0',
      ...config.headers
    };
    
    // Adicionar chaves de autenticação se disponíveis
    if (this.config.accessKey) {
      headers['x-access-key'] = this.config.accessKey;
    }
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    
    const timeout = config.timeout || this.config.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method: config.method || 'GET',
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        data,
        status: response.status,
        headers: response.headers,
        duration: 0 // Será preenchido pelo caller
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout após ${timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Métodos de conveniência
   */
  async get<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  async put<T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  async delete<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * Utilitários de cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const [key] of this.cache) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
    
    logger.info('Cache limpo', {
      component: 'ApiClient',
      requestId: this.requestId,
      pattern
    });
  }

  /**
   * Estatísticas e métricas
   */
  getStats(): {
    cacheSize: number;
    hitRate: number;
    circuitBreakers: Record<string, CircuitBreakerState>;
    activeRateLimits: number;
  } {
    const circuitBreakers: Record<string, CircuitBreakerState> = {};
    for (const [key, state] of this.circuitBreakers) {
      circuitBreakers[key] = { ...state };
    }
    
    return {
      cacheSize: this.cache.size,
      hitRate: 0, // TODO: Implementar tracking de hit rate
      circuitBreakers,
      activeRateLimits: this.rateLimitQueue.size
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const stats = this.getStats();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Verificar circuit breakers
    const openCircuits = Object.values(stats.circuitBreakers).filter(cb => cb.state === 'open').length;
    if (openCircuits > 0) {
      status = openCircuits > 2 ? 'unhealthy' : 'degraded';
    }
    
    // Verificar cache size
    if (stats.cacheSize > 1000) {
      status = 'degraded';
    }
    
    return {
      status,
      details: {
        ...stats,
        openCircuits,
        baseUrl: this.config.baseUrl
      }
    };
  }
}

// Factory functions para conectores específicos
export const createSungrowClient = (config: {
  username: string;
  password: string;
  appkey: string;
  accessKey: string;
  baseUrl?: string;
}) => {
  return new ApiClient({
    baseUrl: config.baseUrl || 'https://gateway.isolarcloud.com.hk',
    accessKey: config.accessKey,
    timeout: 45000,
    retryAttempts: 3,
    rateLimit: {
      requests: 8,
      windowMs: 60000
    },
    cache: {
      enabled: true,
      ttlMs: 55 * 60 * 1000 // 55 minutos
    }
  });
};

export const createSolarEdgeClient = (config: {
  apiKey: string;
  baseUrl?: string;
}) => {
  return new ApiClient({
    baseUrl: config.baseUrl || 'https://monitoringapi.solaredge.com',
    apiKey: config.apiKey,
    timeout: 30000,
    retryAttempts: 3,
    rateLimit: {
      requests: 300,
      windowMs: 60000 // SolarEdge permite 300 req/min
    },
    cache: {
      enabled: true,
      ttlMs: 15 * 60 * 1000 // 15 minutos para dados mais frescos
    }
  });
};

export { ApiClient };
