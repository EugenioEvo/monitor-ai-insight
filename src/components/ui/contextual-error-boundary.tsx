
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, Bug, ExternalLink } from 'lucide-react';
import { logger } from '@/services/logger';
import { errorHandler } from '@/services/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context: {
    component: string;
    page?: string;
    feature?: string;
    critical?: boolean;
  };
  showDetails?: boolean;
  allowRetry?: boolean;
  showReportBug?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

export class ContextualErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { context } = this.props;
    const errorId = this.state.errorId || 'unknown';
    
    // Log estruturado do erro
    const logLevel = context.critical ? 'critical' : 'error';
    const logMethod = context.critical ? logger.critical : logger.error;
    
    logMethod('React Error Boundary ativado', error, {
      component: 'ContextualErrorBoundary',
      errorId,
      context: context.component,
      page: context.page,
      feature: context.feature,
      retryCount: this.state.retryCount,
      componentStack: errorInfo.componentStack,
      metadata: {
        props: this.props,
        errorInfo
      }
    });

    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Se crítico, reportar imediatamente
    if (context.critical) {
      this.reportError(error, errorInfo, errorId);
    }
  }

  private async reportError(error: Error, errorInfo: ErrorInfo, errorId: string) {
    try {
      // TODO: Integração com Sentry ou sistema de bug tracking
      const errorReport = {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        context: this.props.context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };

      // Por enquanto, salvar no localStorage para debug
      const existingReports = JSON.parse(localStorage.getItem('error_reports') || '[]');
      existingReports.push(errorReport);
      localStorage.setItem('error_reports', JSON.stringify(existingReports.slice(-10))); // Manter apenas os últimos 10

      logger.info('Erro reportado para tracking', {
        component: 'ContextualErrorBoundary',
        errorId
      });
    } catch (reportError) {
      logger.warn('Falha ao reportar erro', {
        component: 'ContextualErrorBoundary',
        originalErrorId: errorId,
        reportError: (reportError as Error).message
      });
    }
  }

  private handleRetry = () => {
    const { context } = this.props;
    
    logger.info('Tentando recuperar do erro', {
      component: 'ContextualErrorBoundary',
      errorId: this.state.errorId,
      context: context.component,
      retryCount: this.state.retryCount + 1,
      action: 'retry'
    });

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    const { context } = this.props;
    
    const bugReport = {
      title: `Erro em ${context.component}${context.page ? ` - ${context.page}` : ''}`,
      body: `
**Descrição do Erro:**
${error?.message}

**Contexto:**
- Componente: ${context.component}
- Página: ${context.page || 'N/A'}
- Feature: ${context.feature || 'N/A'}
- Crítico: ${context.critical ? 'Sim' : 'Não'}
- Error ID: ${errorId}
- Tentativas de retry: ${this.state.retryCount}

**Stack Trace:**
\`\`\`
${error?.stack}
\`\`\`

**Component Stack:**
\`\`\`
${errorInfo?.componentStack}
\`\`\`

**Informações do Browser:**
- URL: ${window.location.href}
- User Agent: ${navigator.userAgent}
- Timestamp: ${new Date().toISOString()}
      `.trim();

    // Criar issue no GitHub ou abrir modal de feedback
    const issueUrl = `https://github.com/seu-usuario/monitor-ai/issues/new?title=${encodeURIComponent(bugReport.title)}&body=${encodeURIComponent(bugReport.body)}`;
    window.open(issueUrl, '_blank');
    
    logger.info('Bug report iniciado', {
      component: 'ContextualErrorBoundary',
      errorId,
      context: context.component
    });
  };

  private renderMinimalFallback() {
    const { context, allowRetry = true } = this.props;
    const { retryCount } = this.state;
    const canRetry = allowRetry && retryCount < this.maxRetries;

    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Erro em {context.component}
            {context.feature && ` (${context.feature})`}.
          </span>
          <div className="flex gap-2 ml-4">
            {canRetry && (
              <Button variant="link" className="p-0 h-auto" onClick={this.handleRetry}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Tentar novamente
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  private renderDetailedFallback() {
    const { error, errorInfo, errorId, retryCount } = this.state;
    const { context, showDetails = false, allowRetry = true, showReportBug = true } = this.props;
    const canRetry = allowRetry && retryCount < this.maxRetries;

    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${context.critical ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {context.critical ? '🚨 Erro Crítico' : 'Oops! Algo deu errado'}
                  {context.page && ` em ${context.page}`}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Erro no componente <code className="bg-muted px-1 py-0.5 rounded text-xs">{context.component}</code>
                  {context.feature && (
                    <>
                      {' '}na funcionalidade <code className="bg-muted px-1 py-0.5 rounded text-xs">{context.feature}</code>
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert variant={context.critical ? "destructive" : "default"}>
              <AlertDescription>
                <strong>Mensagem:</strong> {errorHandler.getErrorMessage(error || new Error('Erro desconhecido'))}
              </AlertDescription>
            </Alert>

            {retryCount > 0 && (
              <Alert>
                <AlertDescription>
                  <strong>Tentativas de recuperação:</strong> {retryCount} de {this.maxRetries}
                </AlertDescription>
              </Alert>
            )}

            {showDetails && errorId && (
              <details className="space-y-2">
                <summary className="cursor-pointer text-sm font-medium hover:text-primary">
                  Detalhes técnicos (ID: {errorId})
                </summary>
                <div className="bg-muted p-4 rounded border text-xs space-y-3">
                  <div>
                    <strong>Mensagem:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{error?.message}</pre>
                  </div>
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-xs max-h-32 overflow-auto">
                      {error?.stack}
                    </pre>
                  </div>
                  {errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-xs max-h-32 overflow-auto">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                  <div>
                    <strong>Contexto:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-xs">
                      {JSON.stringify(context, null, 2)}
                    </pre>
                  </div>
                </div>
              </details>
            )}

            <div className="flex gap-3 pt-4 flex-wrap">
              {canRetry && (
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Tentar Novamente ({this.maxRetries - retryCount} restantes)
                </Button>
              )}
              
              {context.page && (
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/'} 
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Ir para Home
                </Button>
              )}

              {showReportBug && (
                <Button 
                  variant="outline" 
                  onClick={this.handleReportBug}
                  className="flex items-center gap-2"
                >
                  <Bug className="h-4 w-4" />
                  Reportar Bug
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>

            {context.critical && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Este é um erro crítico.</strong> O suporte técnico foi notificado automaticamente. 
                  Se o problema persistir, entre em contato conosco.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      const { context } = this.props;
      return context.critical || context.page 
        ? this.renderDetailedFallback()
        : this.renderMinimalFallback();
    }

    return this.props.children;
  }
}

// HOC para facilitar uso
export const withContextualErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  context: Props['context'],
  options?: Omit<Props, 'children' | 'context'>
) => {
  const WrappedComponent = (props: P) => (
    <ContextualErrorBoundary context={context} {...options}>
      <Component {...props} />
    </ContextualErrorBoundary>
  );
  
  WrappedComponent.displayName = `withContextualErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook para usar error boundaries programaticamente
export const useErrorBoundary = (context: Props['context']) => {
  const [error, setError] = React.useState<Error | null>(null);

  const reportError = React.useCallback((error: Error, extra?: Record<string, any>) => {
    logger.error('Error boundary programático', error, {
      component: 'useErrorBoundary',
      context: context.component,
      ...extra
    });
    setError(error);
  }, [context]);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  // Se houver erro, renderizar boundary inline
  if (error) {
    return {
      ErrorComponent: () => (
        <ContextualErrorBoundary 
          context={context}
          onError={() => {}}
          allowRetry={true}
          showReportBug={true}
        >
          <div>{/* Erro será capturado automaticamente */}</div>
        </ContextualErrorBoundary>
      ),
      reportError,
      clearError,
      hasError: true
    };
  }

  return {
    ErrorComponent: null,
    reportError,
    clearError,
    hasError: false
  };
};
