import React, { Component, ErrorInfo as ReactErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/services/logger';
import { errorHandler } from '@/services/errorHandler';
import { ErrorReporter } from './error-reporter';

interface ErrorInfo {
  componentStack: string;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'feature';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ReactErrorInfo) {
    const errorId = this.state.errorId || 'unknown';
    
    // Log detalhado do erro
    logger.error('React Error Boundary ativado', error, {
      component: 'ErrorBoundary',
      errorId,
      level: this.props.level || 'component',
      componentStack: errorInfo.componentStack,
      metadata: {
        props: this.props,
        errorInfo
      }
    });

    // Converter ReactErrorInfo para nossa interface ErrorInfo
    const adaptedErrorInfo: ErrorInfo = {
      componentStack: errorInfo.componentStack || ''
    };

    this.setState({ errorInfo: adaptedErrorInfo });
    this.props.onError?.(error, adaptedErrorInfo);
  }

  private handleRetry = () => {
    logger.info('Tentando recuperar do erro', {
      component: 'ErrorBoundary',
      errorId: this.state.errorId,
      action: 'retry'
    });

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  private handleGoHome = () => {
    logger.info('Redirecionando para home após erro', {
      component: 'ErrorBoundary',
      errorId: this.state.errorId,
      action: 'go_home'
    });

    window.location.href = '/';
  };

  private renderMinimalFallback() {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Algo deu errado. 
          <Button variant="link" className="p-0 h-auto ml-1" onClick={this.handleRetry}>
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  private renderDetailedFallback() {
    const { error, errorInfo, errorId } = this.state;
    const { level = 'component' } = this.props;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <CardTitle>Oops! Algo deu errado</CardTitle>
                <CardDescription>
                  {level === 'page' 
                    ? 'Ocorreu um erro inesperado nesta página'
                    : 'Ocorreu um erro inesperado neste componente'
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Erro:</strong> {errorHandler.getErrorMessage(error || new Error('Erro desconhecido'))}
              </AlertDescription>
            </Alert>

            {this.props.showDetails && (
              <details className="space-y-2">
                <summary className="cursor-pointer text-sm font-medium">
                  Detalhes técnicos (ID: {errorId})
                </summary>
                <div className="text-xs space-y-2 bg-muted p-3 rounded border">
                  <div>
                    <strong>Mensagem:</strong> {error?.message}
                  </div>
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-xs">
                      {error?.stack}
                    </pre>
                  </div>
                  {errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-xs">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={this.handleRetry} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Tentar Novamente
              </Button>
              
              {level === 'page' && (
                <Button variant="outline" onClick={this.handleGoHome} className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Ir para Home
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      const { level = 'component' } = this.props;
      
      // Para componentes, usar o fallback minimal
      if (level === 'component') {
        return this.renderMinimalFallback();
      }
      
      // Para páginas ou funcionalidades, usar o ErrorReporter avançado
      return (
        <ErrorReporter
          error={this.state.error}
          errorInfo={this.state.errorInfo || { componentStack: '' }}
          onRetry={this.handleRetry}
          onReset={this.handleRetry}
          level={level === 'feature' ? 'component' : level}
        />
      );
    }

    return this.props.children;
  }
}

// Wrapper hooks para facilitar uso
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};