import { logger } from './logger';
import { toast } from 'sonner';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: Error, context?: ErrorContext) => boolean;
  recover: (error: Error, context?: ErrorContext) => Promise<boolean>;
}

export class CentralizedErrorHandler {
  private recoveryStrategies: RecoveryStrategy[] = [];
  private errorCounts = new Map<string, number>();
  private errorThresholds = {
    low: 10,
    medium: 5,
    high: 3,
    critical: 1
  };

  constructor() {
    this.initializeDefaultStrategies();
    this.setupGlobalErrorHandlers();
  }

  private initializeDefaultStrategies() {
    // Auth recovery strategy
    this.addRecoveryStrategy({
      name: 'auth-recovery',
      canRecover: (error) => 
        error.message.includes('JWT') || 
        error.message.includes('auth') || 
        error.message.includes('unauthorized'),
      recover: async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            window.location.href = '/auth';
            return true;
          }
          return false;
        } catch {
          return false;
        }
      }
    });

    // Network retry strategy
    this.addRecoveryStrategy({
      name: 'network-retry',
      canRecover: (error) => 
        error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('timeout'),
      recover: async (error, context) => {
        if (context?.metadata?.retryCount && context.metadata.retryCount >= 3) {
          return false;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      }
    });

    // Database connection recovery
    this.addRecoveryStrategy({
      name: 'database-recovery',
      canRecover: (error) => 
        error.message.includes('connection') || 
        error.message.includes('database') ||
        error.message.includes('PGRST'),
      recover: async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { error } = await supabase.from('profiles').select('id').limit(1);
          return !error;
        } catch {
          return false;
        }
      }
    });
  }

  private setupGlobalErrorHandlers() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        component: 'global',
        action: 'uncaught-error',
        severity: 'high',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason), {
        component: 'global',
        action: 'unhandled-promise-rejection',
        severity: 'high'
      });
    });

    // Handle React errors (will be caught by error boundaries)
    if (typeof window !== 'undefined') {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const errorMessage = args.join(' ');
        if (errorMessage.includes('React') || errorMessage.includes('Warning:')) {
          this.handleError(new Error(errorMessage), {
            component: 'react',
            action: 'react-error',
            severity: 'medium'
          });
        }
        originalConsoleError.call(console, ...args);
      };
    }
  }

  addRecoveryStrategy(strategy: RecoveryStrategy) {
    this.recoveryStrategies.push(strategy);
  }

  async handleError(error: Error, context?: ErrorContext): Promise<boolean> {
    const errorKey = this.generateErrorKey(error, context);
    const errorCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, errorCount + 1);

    // Log the error
    logger.error('Centralized error handler', error, {
      component: context?.component || 'unknown',
      action: context?.action || 'unknown',
      userId: context?.userId,
      metadata: context?.metadata,
      severity: context?.severity || 'medium',
      errorCount: errorCount + 1
    });

    // Check if we should attempt recovery
    const severity = context?.severity || 'medium';
    const threshold = this.errorThresholds[severity];
    
    if (errorCount >= threshold) {
      this.handleCriticalError(error, context);
      return false;
    }

    // Try recovery strategies
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(error, context)) {
        try {
          const recovered = await strategy.recover(error, context);
          if (recovered) {
          logger.info('Error recovered', {
            component: context?.component || 'unknown',
            strategy: strategy.name,
            error: error.message
          });
            
            // Show success toast for user-facing recoveries
            if (context?.component !== 'global') {
              toast.success('Problema resolvido automaticamente');
            }
            
            return true;
          }
        } catch (recoveryError) {
        logger.error('Recovery strategy failed', recoveryError as Error, {
          component: context?.component || 'unknown',
          strategy: strategy.name,
          originalError: error.message
        });
        }
      }
    }

    // Show user-friendly error message
    this.showUserError(error, context);
    return false;
  }

  private generateErrorKey(error: Error, context?: ErrorContext): string {
    return `${context?.component || 'unknown'}-${context?.action || 'unknown'}-${error.message}`;
  }

  private handleCriticalError(error: Error, context?: ErrorContext) {
    logger.critical('Critical error threshold reached', error, {
      component: context?.component || 'unknown',
      action: context?.action || 'unknown',
      metadata: context?.metadata
    });

    // Show critical error notification
    toast.error('Erro crítico detectado. Reinicie a aplicação se necessário.', {
      duration: 10000,
      action: {
        label: 'Recarregar',
        onClick: () => window.location.reload()
      }
    });

    // Report to monitoring service
    this.reportCriticalError(error, context);
  }

  private async reportCriticalError(error: Error, context?: ErrorContext) {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.functions.invoke('performance-monitor', {
        body: {
          action: 'report_critical_error',
          error: {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        }
      });
    } catch (reportError) {
      logger.error('Failed to report critical error', reportError as Error, {
        component: 'centralizedErrorHandler',
        action: 'report-critical-error',
        originalError: error.message
      });
    }
  }

  private showUserError(error: Error, context?: ErrorContext) {
    const userFriendlyMessages = {
      'auth': 'Problema de autenticação. Faça login novamente.',
      'network': 'Problemas de conexão. Verifique sua internet.',
      'database': 'Problema no servidor. Tente novamente em alguns instantes.',
      'validation': 'Dados inválidos. Verifique os campos preenchidos.',
      'permission': 'Você não tem permissão para esta ação.',
      'not-found': 'Recurso não encontrado.',
      'rate-limit': 'Muitas tentativas. Aguarde alguns minutos.',
      'server': 'Erro interno do servidor. Tente novamente mais tarde.'
    };

    const errorType = this.categorizeError(error);
    const message = userFriendlyMessages[errorType] || 'Ocorreu um erro inesperado. Tente novamente.';

    const severity = context?.severity || 'medium';
    const toastFunction = severity === 'critical' ? toast.error : 
                         severity === 'high' ? toast.error :
                         severity === 'medium' ? toast.warning : toast.info;

    toastFunction(message, {
      description: context?.component ? `Componente: ${context.component}` : undefined,
      duration: severity === 'critical' ? 10000 : 5000,
      action: severity === 'critical' ? {
        label: 'Reportar',
        onClick: () => this.openReportDialog(error, context)
      } : undefined
    });
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('jwt') || message.includes('auth') || message.includes('unauthorized')) {
      return 'auth';
    }
    if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
      return 'network';
    }
    if (message.includes('database') || message.includes('pgrst') || message.includes('connection')) {
      return 'database';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return 'permission';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not-found';
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return 'rate-limit';
    }
    
    return 'server';
  }

  private openReportDialog(error: Error, context?: ErrorContext) {
    // Implementation for error reporting dialog
    console.log('Opening error report dialog', { error, context });
  }

  // Public methods for manual error handling
  async handleAsync<T>(
    operation: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      await this.handleError(error as Error, context);
      return null;
    }
  }

  handleSync<T>(
    operation: () => T,
    context?: ErrorContext
  ): T | null {
    try {
      return operation();
    } catch (error) {
      this.handleError(error as Error, context);
      return null;
    }
  }

  // Clear error counts (useful for testing or reset)
  clearErrorCounts() {
    this.errorCounts.clear();
  }

  // Get error statistics
  getErrorStats(): { [key: string]: number } {
    return Object.fromEntries(this.errorCounts.entries());
  }
}

// Singleton instance
export const centralizedErrorHandler = new CentralizedErrorHandler();