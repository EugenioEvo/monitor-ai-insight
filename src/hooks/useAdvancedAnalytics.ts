import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface AnalyticsTrend {
  id: string;
  plant_id: string;
  metric_type: string;
  period: string;
  trend_data: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    avg_power: number;
    avg_energy: number;
    data_points: number;
  };
  calculated_at: string;
}

export interface SmartAlert {
  id: string;
  alert_type: string;
  plant_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  conditions: any;
  triggered_at: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

export interface CacheEntry {
  id: string;
  cache_key: string;
  cache_data: any;
  created_at: string;
  expires_at: string;
}

export interface AutomatedReport {
  id: string;
  report_type: string;
  plant_id?: string;
  period_start: string;
  period_end: string;
  report_data: any;
  generated_at: string;
}

export const useAnalyticsTrends = (period: string = '30_days') => {
  return useQuery({
    queryKey: ['analytics-trends', period],
    queryFn: async (): Promise<AnalyticsTrend[]> => {
      const { data, error } = await supabase.functions.invoke('analytics-engine', {
        body: { action: 'get_trends', period }
      });

      if (error) throw error;
      return data?.trends || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // 10 minutos
    retry: 2
  });
};

export const useSmartAlerts = (status?: string) => {
  return useQuery({
    queryKey: ['smart-alerts', status],
    queryFn: async (): Promise<SmartAlert[]> => {
      const { data, error } = await supabase.functions.invoke('smart-alerts', {
        body: { action: 'get_alerts', status, limit: 100 }
      });

      if (error) throw error;
      return data?.alerts || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 5 * 60 * 1000, // 5 minutos
    retry: 2
  });
};

export const useMetricsCache = () => {
  return useQuery({
    queryKey: ['metrics-cache'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('cache-optimizer', {
        body: { action: 'get_cache_stats' }
      });

      if (error) throw error;
      return data?.stats || {};
    },
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000, // 1 minuto
    retry: 1
  });
};

export const useAutomatedReports = (reportType?: string, plantId?: string) => {
  return useQuery({
    queryKey: ['automated-reports', reportType, plantId],
    queryFn: async (): Promise<AutomatedReport[]> => {
      const { data, error } = await supabase.functions.invoke('report-generator', {
        body: { 
          action: 'get_reports',
          report_type: reportType,
          plant_id: plantId,
          limit: 50
        }
      });

      if (error) throw error;
      return data?.reports || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 15 * 60 * 1000, // 15 minutos
    retry: 1
  });
};

export const useAdvancedAnalytics = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const runAnalyticsEngine = async () => {
    try {
      const { error } = await supabase.functions.invoke('analytics-engine', {
        body: { action: 'calculate_trends' }
      });

      if (error) throw error;

      // Invalidar cache para recarregar dados
      queryClient.invalidateQueries({ queryKey: ['analytics-trends'] });
      
      toast({
        title: "Análise executada",
        description: "Análise de tendências calculada com sucesso.",
      });
    } catch (error) {
      console.error('Error running analytics engine:', error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível executar a análise.",
        variant: "destructive",
      });
    }
  };

  const runSmartAlertsAnalysis = async () => {
    try {
      const { error } = await supabase.functions.invoke('smart-alerts', {
        body: { action: 'analyze_performance' }
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['smart-alerts'] });
      
      toast({
        title: "Análise de alertas executada",
        description: "Sistema inteligente de alertas executado com sucesso.",
      });
    } catch (error) {
      console.error('Error running smart alerts:', error);
      toast({
        title: "Erro nos alertas",
        description: "Não foi possível executar a análise de alertas.",
        variant: "destructive",
      });
    }
  };

  const optimizeCache = async () => {
    try {
      const { error } = await supabase.functions.invoke('cache-optimizer', {
        body: { action: 'optimize_cache' }
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['metrics-cache'] });
      
      toast({
        title: "Cache otimizado",
        description: "Otimização de cache executada com sucesso.",
      });
    } catch (error) {
      console.error('Error optimizing cache:', error);
      toast({
        title: "Erro na otimização",
        description: "Não foi possível otimizar o cache.",
        variant: "destructive",
      });
    }
  };

  const generateReport = async (reportType: string, plantId?: string) => {
    try {
      const { error } = await supabase.functions.invoke('report-generator', {
        body: { 
          action: 'generate_monthly_report',
          report_type: reportType,
          plant_id: plantId
        }
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['automated-reports'] });
      
      toast({
        title: "Relatório gerado",
        description: "Relatório automatizado gerado com sucesso.",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro no relatório",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    }
  };

  return {
    runAnalyticsEngine,
    runSmartAlertsAnalysis,
    optimizeCache,
    generateReport,
  };
};