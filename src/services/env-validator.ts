
/**
 * Validação de Environment Variables com Zod
 * Garantir que todas as variáveis necessárias estão presentes e válidas
 */

import { z } from 'zod';
import { logger } from './logger';

// Schema para validação das variáveis de ambiente
const envSchema = z.object({
  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL deve ser uma URL válida'),
  SUPABASE_ANON_KEY: z.string().min(32, 'SUPABASE_ANON_KEY deve ter pelo menos 32 caracteres'),
  
  // Configurações opcionais com defaults
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL']).default('INFO'),
  
  // Rate limiting
  MIN_REQUEST_INTERVAL: z.coerce.number().min(100).max(5000).default(350),
  MAX_RETRY_ATTEMPTS: z.coerce.number().min(1).max(10).default(3),
  
  // Cache settings
  CACHE_TTL_MINUTES: z.coerce.number().min(1).max(1440).default(55),
  
  // Performance
  MAX_CONCURRENT_REQUESTS: z.coerce.number().min(1).max(100).default(10),
});

// Schema para edge functions (ambiente Deno)
const edgeEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(32),
  
  // Opcional - se não estiver presente, função falha graciosamente
  OPENAI_API_KEY: z.string().min(20).optional(),
  GOOGLE_CLOUD_API_KEY: z.string().min(20).optional(),
});

type EnvVars = z.infer<typeof envSchema>;
type EdgeEnvVars = z.infer<typeof edgeEnvSchema>;

class EnvironmentValidator {
  private validatedEnv: EnvVars | null = null;
  private isEdgeRuntime = false;

  constructor() {
    this.isEdgeRuntime = typeof globalThis !== 'undefined' && 'Deno' in globalThis;
  }

  /**
   * Validar environment para aplicação cliente
   */
  validateClientEnv(): EnvVars {
    if (this.validatedEnv) {
      return this.validatedEnv;
    }

    try {
      const env = {
        SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://znsctgihxeuhjqcofgsi.supabase.co',
        SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpuc2N0Z2loeGV1aGpxY29mZ3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyMTI0NTEsImV4cCI6MjA2NTc4ODQ1MX0WhS2sUvEtUCyIWxSEKn8BsZI3T2rp-lhplo0Jh9c-ww',
        NODE_ENV: import.meta.env.MODE as 'development' | 'production',
        LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL,
        MIN_REQUEST_INTERVAL: import.meta.env.VITE_MIN_REQUEST_INTERVAL,
        MAX_RETRY_ATTEMPTS: import.meta.env.VITE_MAX_RETRY_ATTEMPTS,
        CACHE_TTL_MINUTES: import.meta.env.VITE_CACHE_TTL_MINUTES,
        MAX_CONCURRENT_REQUESTS: import.meta.env.VITE_MAX_CONCURRENT_REQUESTS,
      };

      this.validatedEnv = envSchema.parse(env);
      
      logger.info('Environment validado com sucesso', {
        component: 'EnvironmentValidator',
        nodeEnv: this.validatedEnv.NODE_ENV,
        logLevel: this.validatedEnv.LOG_LEVEL
      });
      
      return this.validatedEnv;
    } catch (error) {
      const zodError = error as z.ZodError;
      const errorDetails = zodError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      
      logger.critical('Falha na validação do environment', error as Error, {
        component: 'EnvironmentValidator',
        errors: errorDetails
      });
      
      throw new Error(`Environment inválido: ${errorDetails}`);
    }
  }

  /**
   * Validar environment para edge functions
   */
  validateEdgeEnv(): EdgeEnvVars {
    if (!this.isEdgeRuntime) {
      throw new Error('validateEdgeEnv só pode ser usado em edge functions');
    }

    try {
      const env = {
        SUPABASE_URL: (globalThis as any).Deno?.env.get('SUPABASE_URL'),
        SUPABASE_SERVICE_ROLE_KEY: (globalThis as any).Deno?.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        OPENAI_API_KEY: (globalThis as any).Deno?.env.get('OPENAI_API_KEY'),
        GOOGLE_CLOUD_API_KEY: (globalThis as any).Deno?.env.get('GOOGLE_CLOUD_API_KEY'),
      };

      return edgeEnvSchema.parse(env);
    } catch (error) {
      const zodError = error as z.ZodError;
      const errorDetails = zodError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      
      // Em edge functions, usar console direto pois logger pode não estar disponível
      console.error('🚨 CRÍTICO: Falha na validação do environment edge:', errorDetails);
      
      throw new Error(`Environment edge inválido: ${errorDetails}`);
    }
  }

  /**
   * Verificar se uma secret opcional está disponível
   */
  hasSecret(secretName: keyof EdgeEnvVars): boolean {
    if (!this.isEdgeRuntime) {
      return false;
    }
    
    const value = (globalThis as any).Deno?.env.get(secretName);
    return Boolean(value && value.length > 0);
  }

  /**
   * Obter configurações validadas
   */
  getConfig(): EnvVars {
    return this.validateClientEnv();
  }

  /**
   * Health check do environment
   */
  healthCheck(): {
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const env = this.validateClientEnv();
      
      // Verificar configurações de performance
      if (env.MIN_REQUEST_INTERVAL < 300) {
        issues.push('MIN_REQUEST_INTERVAL muito baixo (< 300ms)');
        recommendations.push('Aumentar MIN_REQUEST_INTERVAL para 350ms para evitar rate limiting');
      }
      
      if (env.MAX_RETRY_ATTEMPTS > 5) {
        issues.push('MAX_RETRY_ATTEMPTS muito alto (> 5)');
        recommendations.push('Reduzir MAX_RETRY_ATTEMPTS para 3 para evitar timeouts longos');
      }
      
      if (env.CACHE_TTL_MINUTES > 60) {
        issues.push('CACHE_TTL_MINUTES muito alto (> 60 min)');
        recommendations.push('Reduzir CACHE_TTL_MINUTES para 55 minutos para token refresh');
      }

      // Verificar environment
      if (env.NODE_ENV === 'production' && env.LOG_LEVEL === 'DEBUG') {
        issues.push('LOG_LEVEL é DEBUG em produção');
        recommendations.push('Usar LOG_LEVEL ERROR ou WARN em produção');
      }

      const status = issues.length === 0 ? 'healthy' : 'warning';
      
      return { status, issues, recommendations };
    } catch (error) {
      return {
        status: 'error',
        issues: ['Falha na validação do environment'],
        recommendations: ['Verificar e corrigir variáveis de ambiente']
      };
    }
  }
}

// Instância singleton
export const envValidator = new EnvironmentValidator();

// Hook para React
export const useEnvironment = () => {
  const env = envValidator.getConfig();
  const healthCheck = envValidator.healthCheck();
  
  return {
    env,
    healthCheck,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
  };
};

// Utilitários para edge functions
export const getEdgeEnv = () => envValidator.validateEdgeEnv();
export const hasEdgeSecret = (secretName: keyof EdgeEnvVars) => envValidator.hasSecret(secretName);

// Validação na inicialização (se não for SSR)
if (typeof window !== 'undefined') {
  try {
    envValidator.validateClientEnv();
  } catch (error) {
    console.error('❌ Falha na validação inicial do environment:', error);
  }
}
