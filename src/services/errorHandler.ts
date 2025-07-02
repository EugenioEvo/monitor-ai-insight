/**
 * Sistema de Error Handling Avançado
 * Providencia retry automático, mensagens contextuais e recovery strategies
 */

import { logger } from './logger';
import { useToast } from '@/hooks/use-toast';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  plantId?: string;
  metadata?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: Error) => boolean;
}

export interface ErrorRecoveryStrategy {
  canRecover: (error: Error, context: ErrorContext) => boolean;
  recover: (error: Error, context: ErrorContext) => Promise<void>;
  description: string;
}

class ErrorHandler {
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryCondition: (error) => this.isRetryableError(error)
  };

  private recoveryStrategies: ErrorRecoveryStrategy[] = [
    {
      canRecover: (error) => error.message.includes('token') || error.message.includes('401'),
      recover: async () => {
        // Tentar renovar token ou reautenticar
        logger.info('Tentando recuperar da falha de autenticação');
        window.location.reload();
      },
      description: 'Renovação de autenticação'
    },
    {
      canRecover: (error) => error.message.includes('network') || error.message.includes('timeout'),
      recover: async () => {
        // Aguardar um momento e tentar novamente
        logger.info('Aguardando antes de retry por problema de rede');
        await new Promise(resolve => setTimeout(resolve, 2000));
      },
      description: 'Retry por problema de rede'
    }
  ];

  private isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /500/,
      /502/,
      /503/,
      /504/,
      /ECONNRESET/,
      /rate.?limit/i
    ];

    return retryablePatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    );
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelay);
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        logger.debug(`Executando operação - tentativa ${attempt}`, {
          component: context.component,
          action: context.action,
          attempt,
          maxAttempts: config.maxAttempts
        });

        const result = await operation();
        
        if (attempt > 1) {
          logger.info(`Operação bem-sucedida após ${attempt} tentativas`, context);
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        
        logger.warn(`Tentativa ${attempt} falhou: ${lastError.message}`, {
          ...context,
          attempt,
          willRetry: attempt < config.maxAttempts && (config.retryCondition?.(lastError) ?? true),
          error: lastError
        });

        // Não fazer retry se não for retryable ou se for a última tentativa
        if (attempt === config.maxAttempts || !config.retryCondition?.(lastError)) {
          break;
        }

        // Tentar estratégias de recovery
        const strategy = this.recoveryStrategies.find(s => s.canRecover(lastError, context));
        if (strategy) {
          logger.info(`Executando estratégia de recovery: ${strategy.description}`, context);
          try {
            await strategy.recover(lastError, context);
          } catch (recoveryError) {
            logger.error('Falha na estratégia de recovery', recoveryError as Error, context);
          }
        }

        // Aguardar antes do próximo retry
        const delay = this.calculateDelay(attempt, config);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    logger.error(`Operação falhou após ${config.maxAttempts} tentativas`, lastError!, context);
    throw lastError!;
  }

  getErrorMessage(error: Error, context?: ErrorContext): string {
    // Mapear erros comuns para mensagens amigáveis
    const errorMappings: Record<string, string> = {
      'Network request failed': 'Problema de conexão com a internet. Tente novamente.',
      'timeout': 'A operação demorou muito para responder. Tente novamente.',
      'rate limit': 'Muitas tentativas. Aguarde um momento antes de tentar novamente.',
      '401': 'Sessão expirada. Faça login novamente.',
      '403': 'Você não tem permissão para esta operação.',
      '404': 'Recurso não encontrado.',
      '500': 'Erro interno do servidor. Tente novamente mais tarde.',
      'Configuração incompleta': 'Configuração incompleta. Verifique as credenciais.'
    };

    // Buscar por padrões conhecidos
    for (const [pattern, message] of Object.entries(errorMappings)) {
      if (error.message.toLowerCase().includes(pattern.toLowerCase())) {
        return message;
      }
    }

    // Mensagem genérica se não encontrar padrão específico
    return context?.component 
      ? `Erro em ${context.component}: ${error.message}`
      : error.message;
  }

  showErrorToast(error: Error, context?: ErrorContext): void {
    const { toast } = useToast();
    const message = this.getErrorMessage(error, context);
    
    toast({
      title: "Erro",
      description: message,
      variant: "destructive",
    });
  }

  addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }
}

// Instância singleton
export const errorHandler = new ErrorHandler();

// Hook para usar error handling em componentes
export const useErrorHandler = (component: string) => {
  return {
    executeWithRetry: <T>(
      operation: () => Promise<T>,
      action: string,
      retryConfig?: Partial<RetryConfig>
    ) => errorHandler.executeWithRetry(
      operation,
      { component, action },
      retryConfig
    ),
    
    handleError: (error: Error, action?: string) => {
      const context = { component, action };
      logger.error(`Erro em ${component}`, error, context);
      errorHandler.showErrorToast(error, context);
    },

    getErrorMessage: (error: Error) => 
      errorHandler.getErrorMessage(error, { component })
  };
};