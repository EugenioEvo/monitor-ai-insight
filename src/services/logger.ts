
/**
 * Sistema de Logging Estruturado Avançado
 * Centraliza todos os logs da aplicação com contexto e request IDs
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface LogContext {
  requestId?: string;
  userId?: string;
  plantId?: string;
  component?: string;
  action?: string;
  connector?: 'sungrow' | 'solaredge' | 'manual';
  duration?: number;
  status?: 'success' | 'error' | 'pending';
  metadata?: Record<string, any>;
  // Allow any additional properties for flexibility
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: Error;
  masked?: boolean;
}

class AdvancedLogger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 2000;
  private sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'key', 'appkey', 'accessKey'];

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private safeSerialize(data: any, maxDepth = 3, currentDepth = 0): any {
    // Prevenir recursão infinita
    if (currentDepth > maxDepth) {
      return '[MAX_DEPTH_REACHED]';
    }

    // Detectar referências circulares
    const seen = new WeakSet();
    
    const serialize = (obj: any, depth: number): any => {
      if (depth > maxDepth) return '[MAX_DEPTH_REACHED]';
      
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      // Verificar se já foi visto (referência circular)
      if (seen.has(obj)) {
        return '[CIRCULAR_REFERENCE]';
      }
      seen.add(obj);

      // Filtrar propriedades problemáticas do React/DOM
      if (obj._reactInternalFiber || obj._reactInternals || obj.nodeType) {
        return '[REACT/DOM_OBJECT]';
      }

      // Arrays
      if (Array.isArray(obj)) {
        return obj.slice(0, 10).map(item => serialize(item, depth + 1));
      }

      // Objetos regulares
      const result: any = {};
      let count = 0;
      for (const key in obj) {
        if (count >= 20) { // Limitar número de propriedades
          result['...'] = '[TRUNCATED]';
          break;
        }
        if (obj.hasOwnProperty && obj.hasOwnProperty(key)) {
          try {
            result[key] = serialize(obj[key], depth + 1);
            count++;
          } catch (e) {
            result[key] = '[SERIALIZATION_ERROR]';
          }
        }
      }
      return result;
    };

    return serialize(data, currentDepth);
  }

  private maskSensitiveData(data: any): any {
    if (typeof data === 'string') {
      // Mask tokens and keys in strings
      return data.replace(/([a-zA-Z0-9]{8})[a-zA-Z0-9]+/g, '$1***');
    }
    
    if (typeof data === 'object' && data !== null) {
      try {
        const safeSerialized = this.safeSerialize(data);
        const masked = { ...safeSerialized };
        this.sensitiveFields.forEach(field => {
          if (masked[field]) {
            const value = String(masked[field]);
            masked[field] = value.length > 8 
              ? value.substring(0, 4) + '***' + value.substring(value.length - 4)
              : '***';
          }
        });
        return masked;
      } catch (e) {
        return '[MASK_ERROR]';
      }
    }
    
    return data;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    error?: Error
  ): LogEntry {
    const maskedContext = this.maskSensitiveData(context);
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        requestId: context.requestId || this.generateRequestId(),
        ...maskedContext
      },
      error,
      masked: true
    };

    // Adicionar à lista de logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    return entry;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    
    // Em produção, log apenas WARN, ERROR e CRITICAL
    const productionLevels: LogLevel[] = ['WARN', 'ERROR', 'CRITICAL'];
    return productionLevels.includes(level);
  }

  private formatLogMessage(entry: LogEntry): string {
    const { timestamp, level, message, context } = entry;
    let contextStr = '';
    
    if (Object.keys(context).length > 0) {
      try {
        const safeContext = this.safeSerialize(context, 2);
        contextStr = ` [${JSON.stringify(safeContext)}]`;
      } catch (e) {
        contextStr = ' [CONTEXT_SERIALIZATION_ERROR]';
      }
    }
    
    return `[${timestamp}] ${level}: ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('DEBUG')) return;
    
    const entry = this.createLogEntry('DEBUG', message, context);
    console.debug(this.formatLogMessage(entry));
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('INFO')) return;
    
    const entry = this.createLogEntry('INFO', message, context);
    console.info(this.formatLogMessage(entry));
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('WARN')) return;
    
    const entry = this.createLogEntry('WARN', message, context);
    console.warn(this.formatLogMessage(entry));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const entry = this.createLogEntry('ERROR', message, context, error);
    console.error(this.formatLogMessage(entry), error);
    
    // Em produção, enviar erros para serviço de monitoramento
    if (!this.isDevelopment) {
      this.sendToMonitoring(entry);
    }
  }

  critical(message: string, error?: Error, context?: LogContext): void {
    const entry = this.createLogEntry('CRITICAL', message, context, error);
    console.error(`🚨 CRÍTICO: ${this.formatLogMessage(entry)}`, error);
    
    // SEMPRE enviar críticos para monitoramento
    this.sendToMonitoring(entry);
  }

  private async sendToMonitoring(entry: LogEntry): Promise<void> {
    try {
      // TODO: Integrar com Sentry quando disponível
      localStorage.setItem('last_critical_error', JSON.stringify(entry));
      
      // Opcionalmente, enviar para endpoint de monitoramento
      if (typeof window !== 'undefined') {
        fetch('/api/monitoring/error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        }).catch(() => {
          // Falhou silenciosamente - não queremos criar loop de erros
        });
      }
    } catch (err) {
      // Falha silenciosa para evitar loops de erro
    }
  }

  /**
   * Performance tracking para operações
   */
  startTimer(operation: string, context?: LogContext): () => void {
    const startTime = performance.now();
    const requestId = context?.requestId || this.generateRequestId();
    
    this.debug(`⏱️  Iniciando ${operation}`, { ...context, requestId });
    
    return () => {
      const duration = Math.round(performance.now() - startTime);
      this.info(`✅ ${operation} concluído`, { 
        ...context, 
        requestId, 
        duration,
        status: 'success'
      });
    };
  }

  /**
   * Buscar logs por filtros
   */
  getLogs(filter?: {
    level?: LogLevel;
    component?: string;
    connector?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level);
    }

    if (filter?.component) {
      filteredLogs = filteredLogs.filter(log => 
        log.context.component === filter.component
      );
    }

    if (filter?.connector) {
      filteredLogs = filteredLogs.filter(log => 
        log.context.connector === filter.connector
      );
    }

    if (filter?.startTime) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= filter.startTime!
      );
    }

    if (filter?.endTime) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) <= filter.endTime!
      );
    }

    if (filter?.limit) {
      filteredLogs = filteredLogs.slice(-filter.limit);
    }

    return filteredLogs.reverse(); // Mais recentes primeiro
  }

  /**
   * Métricas de sistema
   */
  getMetrics(): {
    totalLogs: number;
    errorRate: number;
    warningRate: number;
    averageRequestTime?: number;
  } {
    const recentLogs = this.logs.slice(-100); // Últimos 100 logs
    const errors = recentLogs.filter(l => l.level === 'ERROR' || l.level === 'CRITICAL').length;
    const warnings = recentLogs.filter(l => l.level === 'WARN').length;
    
    const requestTimes = recentLogs
      .filter(l => l.context.duration)
      .map(l => l.context.duration!);
    
    const averageRequestTime = requestTimes.length > 0
      ? requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length
      : undefined;

    return {
      totalLogs: this.logs.length,
      errorRate: (errors / recentLogs.length) * 100,
      warningRate: (warnings / recentLogs.length) * 100,
      averageRequestTime
    };
  }

  /**
   * Criar contexto para uma operação específica
   */
  createContext(base: LogContext): LogContext & { requestId: string } {
    return {
      requestId: this.generateRequestId(),
      ...base
    };
  }

  /**
   * Limpar logs antigos
   */
  clearLogs(olderThan?: Date): void {
    if (olderThan) {
      this.logs = this.logs.filter(log => new Date(log.timestamp) >= olderThan);
    } else {
      this.logs = [];
    }
  }
}

// Instância singleton do logger avançado
export const logger = new AdvancedLogger();

// Hook para usar o logger em componentes React
export const useLogger = (component: string) => {
  return {
    debug: (message: string, context?: Omit<LogContext, 'component'>) => 
      logger.debug(message, { component, ...context }),
    info: (message: string, context?: Omit<LogContext, 'component'>) => 
      logger.info(message, { component, ...context }),
    warn: (message: string, context?: Omit<LogContext, 'component'>) => 
      logger.warn(message, { component, ...context }),
    error: (message: string, error?: Error, context?: Omit<LogContext, 'component'>) => 
      logger.error(message, error, { component, ...context }),
    critical: (message: string, error?: Error, context?: Omit<LogContext, 'component'>) => 
      logger.critical(message, error, { component, ...context }),
    startTimer: (operation: string, context?: Omit<LogContext, 'component'>) =>
      logger.startTimer(operation, { component, ...context }),
    createContext: (base?: Omit<LogContext, 'component'>) =>
      logger.createContext({ component, ...base }),
  };
};
