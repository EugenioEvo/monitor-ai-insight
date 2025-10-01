import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Anomaly {
  id: string;
  plant_id: string;
  timestamp: string;
  anomaly_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  detected_by: string;
  metric_affected: string;
  expected_value?: number;
  actual_value?: number;
  deviation_percent?: number;
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  root_cause_id?: string;
  metadata?: any;
  created_at: string;
  resolved_at?: string;
}

export interface RootCauseAnalysis {
  id: string;
  anomaly_id: string;
  plant_id: string;
  probable_causes: Array<{
    cause: string;
    confidence: number;
    evidence: string;
    estimated_impact_kwh: number;
  }>;
  dependency_graph?: any;
  recommended_actions: Array<{
    action: string;
    priority: string;
    estimated_time_hours: number;
    estimated_cost_brl: number;
  }>;
  investigation_status: 'pending' | 'in_progress' | 'completed';
  resolution_summary?: string;
  actual_cause?: string;
  lessons_learned?: string;
  created_at: string;
  completed_at?: string;
}

export const useAnomalies = (plantId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Detect Anomalies
  const detectAnomalies = useMutation({
    mutationFn: async ({
      plant_id,
      period_hours,
      config,
    }: {
      plant_id?: string;
      period_hours?: number;
      config?: any;
    }) => {
      const { data, error } = await supabase.functions.invoke('anomaly-detector', {
        body: {
          action: 'detect_anomalies',
          plant_id: plant_id || plantId,
          period_hours,
          config,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to detect anomalies');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      toast({
        title: 'Detecção concluída',
        description: `${data.anomalies_detected} anomalia(s) detectada(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao detectar anomalias',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Analyze Root Cause
  const analyzeRootCause = useMutation({
    mutationFn: async (anomaly_id: string) => {
      const { data, error } = await supabase.functions.invoke('anomaly-detector', {
        body: {
          action: 'analyze_root_cause',
          anomaly_id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to analyze root cause');
      return data.rca as RootCauseAnalysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['root-cause-analysis'] });
      toast({
        title: 'Análise concluída',
        description: 'Causa raiz identificada com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao analisar causa raiz',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch Anomalies
  const { data: anomalies, isLoading: anomaliesLoading } = useQuery({
    queryKey: ['anomalies', plantId],
    queryFn: async () => {
      let query = supabase
        .from('anomalies')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (plantId) {
        query = query.eq('plant_id', plantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as Anomaly[];
    },
    enabled: !!plantId,
  });

  // Fetch Active Anomalies
  const { data: activeAnomalies } = useQuery({
    queryKey: ['anomalies-active', plantId],
    queryFn: async () => {
      let query = supabase
        .from('anomalies')
        .select('*')
        .eq('status', 'active')
        .order('severity', { ascending: false })
        .order('timestamp', { ascending: false });

      if (plantId) {
        query = query.eq('plant_id', plantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as Anomaly[];
    },
  });

  // Fetch RCA for Anomaly
  const getRootCauseAnalysis = (anomalyId: string) => {
    return useQuery({
      queryKey: ['root-cause-analysis', anomalyId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('root_cause_analysis')
          .select('*')
          .eq('anomaly_id', anomalyId)
          .maybeSingle();

        if (error) throw error;
        return data as unknown as RootCauseAnalysis | null;
      },
      enabled: !!anomalyId,
    });
  };

  // Update Anomaly Status
  const updateAnomalyStatus = useMutation({
    mutationFn: async ({ anomalyId, status }: { anomalyId: string; status: string }) => {
      const updates: any = { status };
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('anomalies')
        .update(updates)
        .eq('id', anomalyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['anomalies-active'] });
      toast({
        title: 'Status atualizado',
        description: 'Status da anomalia atualizado com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get Statistics
  const anomalyStats = anomalies
    ? {
        total: anomalies.length,
        active: anomalies.filter((a) => a.status === 'active').length,
        critical: anomalies.filter((a) => a.severity === 'critical' && a.status === 'active')
          .length,
        high: anomalies.filter((a) => a.severity === 'high' && a.status === 'active').length,
        byType: anomalies.reduce((acc: any, a) => {
          acc[a.anomaly_type] = (acc[a.anomaly_type] || 0) + 1;
          return acc;
        }, {}),
        byDetector: anomalies.reduce((acc: any, a) => {
          acc[a.detected_by] = (acc[a.detected_by] || 0) + 1;
          return acc;
        }, {}),
      }
    : null;

  return {
    detectAnomalies,
    analyzeRootCause,
    anomalies,
    anomaliesLoading,
    activeAnomalies,
    getRootCauseAnalysis,
    updateAnomalyStatus,
    anomalyStats,
  };
};
