/**
 * Sistema de Logging Estruturado
 * Centraliza todos os logs da aplicação com contexto e request IDs
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  requestId?: string;
  userId?: string;
  plantId?: string;
  component?: string;
  action?: string;
  [key: string]: any; // Permitir propriedades adicionais
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: Error;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Manter apenas os últimos 1000 logs

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        requestId: context.requestId || this.generateRequestId(),
        ...context
      },
      error
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
    
    // Em produção, log apenas WARN e ERROR
    return level === 'WARN' || level === 'ERROR';
  }

  private formatLogMessage(entry: LogEntry): string {
    const { timestamp, level, message, context } = entry;
    const contextStr = Object.keys(context).length > 0 
      ? ` [${JSON.stringify(context)}]` 
      : '';
    
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

  private async sendToMonitoring(entry: LogEntry): Promise<void> {
    try {
      // Implementar envio para serviço de monitoramento (ex: Sentry, LogRocket)
      // Por enquanto apenas armazenar localmente
      localStorage.setItem('last_error', JSON.stringify(entry));
    } catch (err) {
      console.error('Failed to send log to monitoring:', err);
    }
  }

  /**
   * Buscar logs por filtros
   */
  getLogs(filter?: {
    level?: LogLevel;
    component?: string;
    startTime?: Date;
    endTime?: Date;
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

    return filteredLogs;
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
  clearLogs(): void {
    this.logs = [];
  }
}

// Instância singleton do logger
export const logger = new Logger();

// Hook para usar o logger em componentes React
export const useLogger = (component: string) => {
  return {
    debug: (message: string, context?: Omit<LogContext, 'component'>) => 
      logger.debug(message, { ...context, component }),
    info: (message: string, context?: Omit<LogContext, 'component'>) => 
      logger.info(message, { ...context, component }),
    warn: (message: string, context?: Omit<LogContext, 'component'>) => 
      logger.warn(message, { ...context, component }),
    error: (message: string, error?: Error, context?: Omit<LogContext, 'component'>) => 
      logger.error(message, error, { ...context, component }),
    createContext: (extra?: Omit<LogContext, 'component'>) => 
      logger.createContext({ ...extra, component })
  };
};