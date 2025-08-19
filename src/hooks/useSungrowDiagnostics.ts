import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DiagnosticLog {
  timestamp: string;
  event: string;
  level: 'info' | 'warn' | 'error';
  data: any;
}

interface DiagnosticMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  successRate: number;
  lastSuccess: string | null;
  lastFailure: string | null;
  commonErrors: Array<{ error: string; count: number; suggestion?: string }>;
}

export const useSungrowDiagnostics = (autoRefresh = false) => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [metrics, setMetrics] = useState<DiagnosticMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDiagnosticData = async () => {
    setLoading(true);
    try {
      // Carregar logs de sistema das últimas 24 horas
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: systemMetrics, error } = await supabase
        .from('system_metrics')
        .select('*')
        .eq('metric_type', 'sungrow_diagnostic')
        .gte('collected_at', oneDayAgo)
        .order('collected_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Processar logs
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

      // Calcular métricas
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

      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

      const lastSuccess = processedLogs
        .find(log => log.event === 'API_RESPONSE' && log.data.success)?.timestamp || null;
      
      const lastFailure = processedLogs
        .find(log => log.level === 'error')?.timestamp || null;

      // Análise de erros com sugestões
      const errorLogs = processedLogs.filter(log => log.level === 'error');
      const errorCounts: Record<string, { count: number; suggestion?: string }> = {};
      
      errorLogs.forEach(log => {
        const errorCode = log.data.error_code;
        const errorKey = errorCode || log.data.message || log.event;
        
        if (!errorCounts[errorKey]) {
          errorCounts[errorKey] = { 
            count: 0,
            suggestion: getErrorSuggestion(errorCode)
          };
        }
        errorCounts[errorKey].count += 1;
      });

      const commonErrors = Object.entries(errorCounts)
        .map(([error, { count, suggestion }]) => ({ error, count, suggestion }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setMetrics({
        totalRequests,
        successfulRequests,
        failedRequests,
        avgResponseTime,
        successRate,
        lastSuccess,
        lastFailure,
        commonErrors
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

  const getErrorSuggestion = (errorCode: string | undefined): string | undefined => {
    const suggestions: Record<string, string> = {
      'E912': 'Verifique se a Access Key está correta no portal Sungrow. Copie novamente sem espaços extras.',
      'E00000': 'App Key inválida. Confirme se a App Key foi registrada corretamente no portal.',
      '4': 'Problema OAuth: Client ID não confere. Verifique a configuração OAuth no portal.',
      'E900': 'Credenciais inválidas. Verifique usuário, senha e se OpenAPI está habilitado.',
      '1002': 'Token expirado. Realize nova autenticação.',
      '1005': 'Conta bloqueada. Entre em contato com suporte Sungrow.',
      'er_invalid_appkey': 'App Key rejeitada pela API. Verifique se está registrada e ativa.'
    };

    return errorCode ? suggestions[errorCode] : undefined;
  };

  const runHealthCheck = async (): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    recommendations: string[];
  }> => {
    if (!metrics) {
      await loadDiagnosticData();
    }

    const issues: string[] = [];
    const recommendations: string[] = [];
    
    if (!metrics) {
      return { status: 'unhealthy', issues: ['Não foi possível carregar métricas'], recommendations: [] };
    }

    // Verificações de saúde
    if (metrics.successRate < 50) {
      issues.push(`Taxa de sucesso muito baixa: ${metrics.successRate.toFixed(1)}%`);
      recommendations.push('Verifique as credenciais e configurações');
    }

    if (metrics.avgResponseTime > 5000) {
      issues.push(`Tempo de resposta alto: ${metrics.avgResponseTime.toFixed(0)}ms`);
      recommendations.push('Verifique a conectividade de rede');
    }

    if (metrics.lastSuccess && new Date().getTime() - new Date(metrics.lastSuccess).getTime() > 60 * 60 * 1000) {
      issues.push('Nenhum sucesso nas últimas 1 hora');
      recommendations.push('Execute um teste de conectividade');
    }

    // Verificar erros comuns
    const criticalErrors = metrics.commonErrors.filter(e => 
      e.error.includes('E912') || e.error.includes('E00000') || e.error.includes('4')
    );

    if (criticalErrors.length > 0) {
      issues.push(`Erros críticos detectados: ${criticalErrors.map(e => e.error).join(', ')}`);
      recommendations.push('Revise e atualize as credenciais de API');
    }

    // Determinar status geral
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 0) {
      status = metrics.successRate > 20 ? 'degraded' : 'unhealthy';
    }

    return { status, issues, recommendations };
  };

  // Auto-refresh
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      interval = setInterval(loadDiagnosticData, 15000); // A cada 15 segundos
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  return {
    logs,
    metrics,
    loading,
    loadDiagnosticData,
    runHealthCheck
  };
};