import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { DataQualityScore, SystemDataHealth } from '@/types/data-quality';

export const useDataQuality = (plantId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Analyze Data Quality
  const analyzeQuality = useMutation({
    mutationFn: async ({
      plant_id,
      data_source,
      period_hours,
    }: {
      plant_id?: string;
      data_source?: string;
      period_hours?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('data-quality-monitor', {
        body: {
          action: 'analyze_quality',
          plant_id: plant_id || plantId,
          data_source,
          period_hours,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to analyze data quality');
      return data.quality as DataQualityScore;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-quality-logs'] });
      toast({
        title: 'Análise concluída',
        description: 'Qualidade dos dados analisada com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao analisar qualidade',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get System Health
  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('data-quality-monitor', {
        body: {
          action: 'get_system_health',
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to get system health');
      return data.system_health as SystemDataHealth;
    },
    refetchInterval: 60000, // Atualizar a cada minuto
  });

  // Fetch Quality Logs
  const { data: qualityLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['data-quality-logs', plantId],
    queryFn: async () => {
      let query = supabase
        .from('data_quality_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (plantId) {
        query = query.eq('plant_id', plantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as DataQualityScore[];
    },
    enabled: !!plantId,
  });

  // Fetch Quality Logs by Source
  const getQualityBySource = (dataSource: string) => {
    return qualityLogs?.filter((log: any) => log.data_source === dataSource);
  };

  // Calculate Average Score by Source
  const getAverageScoreBySource = (dataSource: string) => {
    const logs = getQualityBySource(dataSource);
    if (!logs || logs.length === 0) return 0;
    
    const sum = logs.reduce((acc: number, log: any) => acc + (log.overall_score || 0), 0);
    return sum / logs.length;
  };

  return {
    analyzeQuality,
    systemHealth,
    healthLoading,
    qualityLogs,
    logsLoading,
    getQualityBySource,
    getAverageScoreBySource,
  };
};
