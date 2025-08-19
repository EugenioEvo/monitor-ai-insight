import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  TrendingUp,
  Wifi,
  XCircle,
  Eye,
  Database,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSungrowProfiles } from '@/hooks/useSungrowProfiles';

interface DiagnosticLog {
  timestamp: string;
  event: string;
  level: 'info' | 'warn' | 'error';
  data: any;
}

interface ConnectionMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
  last_success: string | null;
  last_failure: string | null;
  common_errors: Array<{ error: string; count: number }>;
}

export const SungrowDiagnosticPanel = () => {
  const { toast } = useToast();
  const { profiles, selectedProfile, loading: profilesLoading } = useSungrowProfiles();
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Carregar métricas e logs
  const loadDiagnosticData = async () => {
    setLoading(true);
    try {
      // Carregar logs de sistema (últimas 2 horas)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      
      const { data: systemMetrics, error } = await supabase
        .from('system_metrics')
        .select('*')
        .eq('metric_type', 'sungrow_diagnostic')
        .gte('collected_at', twoHoursAgo)
        .order('collected_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Processar logs do metric_data
      const processedLogs: DiagnosticLog[] = systemMetrics?.map(metric => {
        // Type cast para o formato esperado do metric_data
        const metricData = metric.metric_data as any;
        return {
          timestamp: metric.collected_at,
          event: metricData?.event || 'UNKNOWN',
          level: metricData?.level || 'info',
          data: metricData?.data || {}
        };
      }) || [];

      setLogs(processedLogs);

      // Calcular métricas de performance
      const requestLogs = processedLogs.filter(log => 
        log.event === 'API_REQUEST_START' || log.event === 'API_RESPONSE' || log.event === 'API_ERROR'
      );

      const totalRequests = requestLogs.filter(log => log.event === 'API_REQUEST_START').length;
      const successfulRequests = requestLogs.filter(log => 
        log.event === 'API_RESPONSE' && log.data.success
      ).length;
      const failedRequests = totalRequests - successfulRequests;

      const responseTimes = requestLogs
        .filter(log => log.event === 'API_RESPONSE' && log.data.duration_ms)
        .map(log => log.data.duration_ms);
      
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;

      const lastSuccess = processedLogs
        .find(log => log.event === 'API_RESPONSE' && log.data.success)?.timestamp || null;
      
      const lastFailure = processedLogs
        .find(log => log.level === 'error')?.timestamp || null;

      // Erros mais comuns
      const errorLogs = processedLogs.filter(log => log.level === 'error');
      const errorCounts: Record<string, number> = {};
      
      errorLogs.forEach(log => {
        const errorKey = log.data.error_code || log.data.message || log.event;
        errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
      });

      const commonErrors = Object.entries(errorCounts)
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setMetrics({
        total_requests: totalRequests,
        successful_requests: successfulRequests,
        failed_requests: failedRequests,
        avg_response_time: avgResponseTime,
        last_success: lastSuccess,
        last_failure: lastFailure,
        common_errors: commonErrors
      });

    } catch (error) {
      console.error('Erro ao carregar dados diagnósticos:', error);
      toast({
        title: 'Erro ao carregar diagnósticos',
        description: 'Não foi possível carregar os dados de diagnóstico',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Teste de conectividade rápido
  const runQuickConnectivityTest = async () => {
    if (!selectedProfile) {
      toast({
        title: 'Perfil necessário',
        description: 'Selecione um perfil de credenciais primeiro',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const config = {
        authMode: selectedProfile.auth_mode,
        username: selectedProfile.username,
        password: selectedProfile.password,
        appkey: selectedProfile.appkey,
        accessKey: selectedProfile.access_key,
        baseUrl: selectedProfile.base_url
      };

      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'test_connection',
          config
        }
      });

      if (error) throw error;

      toast({
        title: data.success ? 'Conectividade OK' : 'Falha na conectividade',
        description: data.message || data.error,
        variant: data.success ? 'default' : 'destructive'
      });

      // Recarregar dados após o teste
      setTimeout(loadDiagnosticData, 1000);

    } catch (error: any) {
      toast({
        title: 'Erro no teste',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh logs
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      interval = setInterval(loadDiagnosticData, 10000); // A cada 10 segundos
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Carregar dados iniciais
  useEffect(() => {
    loadDiagnosticData();
  }, []);

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getLogBadge = (level: string) => {
    switch (level) {
      case 'error': return <Badge variant="destructive">ERROR</Badge>;
      case 'warn': return <Badge variant="outline" className="text-yellow-600">WARN</Badge>;
      default: return <Badge variant="secondary">INFO</Badge>;
    }
  };

  const successRate = metrics ? 
    (metrics.total_requests > 0 ? (metrics.successful_requests / metrics.total_requests) * 100 : 0) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header com métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <TrendingUp className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <Zap className="w-8 h-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{metrics?.avg_response_time.toFixed(0) || 0}ms</p>
              <p className="text-sm text-muted-foreground">Tempo Médio</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <Database className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{metrics?.total_requests || 0}</p>
              <p className="text-sm text-muted-foreground">Total Requests</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{metrics?.failed_requests || 0}</p>
              <p className="text-sm text-muted-foreground">Falhas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Diagnóstico Sungrow</CardTitle>
              <CardDescription>
                Monitoramento em tempo real da conectividade e logs da API
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? "border-green-500 text-green-700" : ""}
              >
                <Activity className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </Button>
              <Button onClick={runQuickConnectivityTest} disabled={loading}>
                <Wifi className="w-4 h-4 mr-2" />
                Teste Rápido
              </Button>
              <Button onClick={loadDiagnosticData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Logs em Tempo Real</TabsTrigger>
          <TabsTrigger value="errors">Análise de Erros</TabsTrigger>
          <TabsTrigger value="metrics">Métricas Detalhadas</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Logs Recentes (Últimas 2 horas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-2">
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhum log encontrado. Execute uma operação para ver os logs.
                    </p>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        {getLogIcon(log.level)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getLogBadge(log.level)}
                            <span className="font-medium">{log.event}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <pre className="text-xs text-muted-foreground overflow-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Erros Mais Comuns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics?.common_errors?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum erro registrado recentemente. 🎉
                  </p>
                ) : (
                  metrics?.common_errors?.map((error, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                      <span className="font-medium">{error.error}</span>
                      <Badge variant="destructive">{error.count} ocorrências</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Status da Conectividade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Último Sucesso:</span>
                  <span className="text-sm">
                    {metrics?.last_success ? 
                      new Date(metrics.last_success).toLocaleString() : 
                      'Nunca'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Última Falha:</span>
                  <span className="text-sm">
                    {metrics?.last_failure ? 
                      new Date(metrics.last_failure).toLocaleString() : 
                      'Nunca'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Taxa de Sucesso:</span>
                  <Badge variant={successRate > 80 ? "default" : successRate > 50 ? "secondary" : "destructive"}>
                    {successRate.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance da API</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Requests Totais:</span>
                  <span>{metrics?.total_requests || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sucessos:</span>
                  <span className="text-green-600">{metrics?.successful_requests || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Falhas:</span>
                  <span className="text-red-600">{metrics?.failed_requests || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tempo Médio:</span>
                  <span>{metrics?.avg_response_time.toFixed(0) || 0}ms</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};