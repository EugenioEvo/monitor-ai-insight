
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, AlertTriangle, CheckCircle, Clock, Zap, Database, Wifi } from 'lucide-react';
import { logger } from '@/services/logger';
import { envValidator } from '@/services/env-validator';
import { useLogger } from '@/services/logger';

export const SystemMetrics = () => {
  const systemLogger = useLogger('SystemMetrics');
  
  // Estado dos dados de sistema
  const [metrics, setMetrics] = React.useState({
    logs: logger.getMetrics(),
    environment: envValidator.healthCheck(),
    performance: {
      memoryUsage: 0,
      responseTime: 0,
      uptime: performance.now()
    }
  });

  // Atualizar métricas periodicamente
  React.useEffect(() => {
    const interval = setInterval(() => {
      try {
        const newMetrics = {
          logs: logger.getMetrics(),
          environment: envValidator.healthCheck(),
          performance: {
            memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
            responseTime: metrics.performance.responseTime,
            uptime: performance.now()
          }
        };
        
        setMetrics(newMetrics);
        
        systemLogger.debug('Métricas do sistema atualizadas', {
          errorRate: newMetrics.logs.errorRate,
          environmentStatus: newMetrics.environment.status,
          memoryUsage: newMetrics.performance.memoryUsage,
          uptime: newMetrics.performance.uptime
        });
      } catch (error) {
        systemLogger.error('Erro ao atualizar métricas', error as Error);
      }
    }, 5000); // Atualizar a cada 5 segundos

    return () => clearInterval(interval);
  }, [systemLogger, metrics.performance.responseTime]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
      case 'unhealthy':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'error':
      case 'unhealthy':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatMemory = (bytes: number) => {
    if (bytes === 0) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Métricas do Sistema</h2>
          <p className="text-muted-foreground">
            Monitoramento em tempo real da saúde da aplicação
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Activity className="w-3 h-3" />
          Live
        </Badge>
      </div>

      {/* Status Geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColor(metrics.environment.status)}`}>
              {getStatusIcon(metrics.environment.status)}
              <span className="font-medium capitalize">{metrics.environment.status}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUptime(metrics.performance.uptime)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="w-4 h-4" />
              Memória
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMemory(metrics.performance.memoryUsage)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Logs e Eventos
          </CardTitle>
          <CardDescription>
            Estatísticas dos logs da aplicação ({metrics.logs.totalLogs} logs total)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Taxa de Erro</span>
                <span className="text-sm text-muted-foreground">
                  {metrics.logs.errorRate.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={metrics.logs.errorRate} 
                className="h-2"
                max={100}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Taxa de Warning</span>
                <span className="text-sm text-muted-foreground">
                  {metrics.logs.warningRate.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={metrics.logs.warningRate} 
                className="h-2"
                max={100}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tempo Médio Request</span>
                <span className="text-sm text-muted-foreground">
                  {metrics.logs.averageRequestTime?.toFixed(0) || 'N/A'}ms
                </span>
              </div>
              <Progress 
                value={Math.min((metrics.logs.averageRequestTime || 0) / 10, 100)} 
                className="h-2"
                max={100}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Issues */}
      {metrics.environment.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Problemas Detectados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.environment.issues.map((issue, index) => (
              <Alert key={index}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{issue}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {metrics.environment.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Zap className="w-5 h-5" />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.environment.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{rec}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Debug Info (apenas em desenvolvimento) */}
      {envValidator.getConfig().NODE_ENV === 'development' && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            Informações de Debug
          </summary>
          <Card className="mt-4">
            <CardContent className="pt-6">
              <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-64">
                {JSON.stringify(metrics, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </details>
      )}
    </div>
  );
};
