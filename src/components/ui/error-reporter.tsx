/**
 * Error Reporter para observabilidade avançada
 * Coleta e reporta erros com contexto detalhado
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bug, RefreshCw, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';

interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
}

interface ErrorReportData {
  error: Error;
  errorInfo: ErrorInfo;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  buildInfo: {
    mode: string;
    timestamp: string;
  };
}

interface ErrorReporterProps {
  error: Error;
  errorInfo: ErrorInfo;
  onRetry?: () => void;
  onReset?: () => void;
  level: 'page' | 'component' | 'critical';
}

export const ErrorReporter: React.FC<ErrorReporterProps> = ({
  error,
  errorInfo,
  onRetry,
  onReset,
  level,
}) => {
  const { toast } = useToast();
  
  const errorReport: ErrorReportData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack || '',
    } as Error,
    errorInfo,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    sessionId: sessionStorage.getItem('session_id') || 'unknown',
    buildInfo: {
      mode: import.meta.env.MODE,
      timestamp: import.meta.env.VITE_BUILD_TIME || 'unknown',
    },
  };

  // Log do erro para debugging
  React.useEffect(() => {
    logger.error('Erro capturado pelo ErrorReporter', error, {
      component: 'ErrorReporter',
      level,
      ...errorReport,
    });
  }, [error, errorReport, level]);

  const copyErrorDetails = async () => {
    const errorDetails = `
🐛 **Erro no Monitor.AI**

**Tipo:** ${error.name}
**Mensagem:** ${error.message}
**Nível:** ${level}
**Timestamp:** ${errorReport.timestamp}
**URL:** ${errorReport.url}
**Build:** ${errorReport.buildInfo.mode}

**Stack Trace:**
\`\`\`
${error.stack}
\`\`\`

**Component Stack:**
\`\`\`
${errorInfo.componentStack}
\`\`\`

**User Agent:** ${errorReport.userAgent}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
      toast({
        title: "Detalhes copiados",
        description: "Detalhes do erro copiados para a área de transferência",
      });
    } catch {
      // Fallback para browsers que não suportam clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = errorDetails;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Detalhes copiados",
        description: "Detalhes do erro copiados para a área de transferência",
      });
    }
  };

  const reportToSupport = () => {
    const subject = encodeURIComponent(`[Monitor.AI] Erro: ${error.name}`);
    const body = encodeURIComponent(`
Olá,

Encontrei um erro no Monitor.AI:

Tipo: ${error.name}
Mensagem: ${error.message}
Timestamp: ${errorReport.timestamp}
URL: ${errorReport.url}

Detalhes adicionais estão em anexo.

Obrigado!
    `);
    
    window.open(`mailto:suporte@monitorai.com.br?subject=${subject}&body=${body}`);
  };

  const getLevelConfig = () => {
    switch (level) {
      case 'critical':
        return {
          icon: AlertTriangle,
          color: 'destructive' as const,
          title: 'Erro Crítico',
          description: 'O sistema encontrou um erro crítico e precisa ser reiniciado.',
        };
      case 'page':
        return {
          icon: Bug,
          color: 'destructive' as const,
          title: 'Erro na Página',
          description: 'Esta página encontrou um erro. Você pode tentar recarregar.',
        };
      case 'component':
        return {
          icon: Bug,
          color: 'secondary' as const,
          title: 'Erro no Componente',
          description: 'Um componente da interface encontrou um problema.',
        };
    }
  };

  const config = getLevelConfig();
  const IconComponent = config.icon;

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconComponent className="h-6 w-6 text-destructive" />
            <div>
              <CardTitle className="flex items-center gap-2">
                {config.title}
                <Badge variant={config.color}>{level}</Badge>
              </CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <Bug className="h-4 w-4" />
            <AlertDescription>
              <strong>{error.name}:</strong> {error.message}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>
              <strong>Timestamp:</strong> {new Date(errorReport.timestamp).toLocaleString('pt-BR')}
            </div>
            <div>
              <strong>Sessão:</strong> {errorReport.sessionId}
            </div>
            <div>
              <strong>Build:</strong> {errorReport.buildInfo.mode}
            </div>
            <div>
              <strong>URL:</strong> {new URL(errorReport.url).pathname}
            </div>
          </div>

          {import.meta.env.DEV && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">Detalhes Técnicos (Dev Mode)</summary>
              <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                {error.stack}
              </pre>
              <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto max-h-20">
                Component Stack:{errorInfo.componentStack}
              </pre>
            </details>
          )}

          <div className="flex flex-wrap gap-2 pt-4">
            {onRetry && (
              <Button onClick={onRetry} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            )}
            
            {onReset && (
              <Button onClick={onReset} variant="outline">
                Resetar Componente
              </Button>
            )}
            
            <Button onClick={copyErrorDetails} variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Copiar Detalhes
            </Button>
            
            <Button onClick={reportToSupport} variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Reportar Bug
            </Button>
            
            <Button 
              onClick={() => window.location.reload()} 
              variant="secondary"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recarregar Página
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorReporter;