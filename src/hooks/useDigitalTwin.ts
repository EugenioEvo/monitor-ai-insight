import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { DigitalTwinConfig, BaselineForecast, PerformanceGap } from '@/types/digital-twin';

export const useDigitalTwin = (plantId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Digital Twin Config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['digital-twin-config', plantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('digital_twin_configs')
        .select('*')
        .eq('plant_id', plantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as DigitalTwinConfig | null;
    },
    enabled: !!plantId,
  });

  // Save Digital Twin Config
  const saveConfig = useMutation({
    mutationFn: async (configData: Partial<DigitalTwinConfig>) => {
      const { data, error } = await supabase
        .from('digital_twin_configs')
        .upsert({
          plant_id: plantId,
          ...(configData as any),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-twin-config', plantId] });
      toast({
        title: 'Configuração salva',
        description: 'Digital Twin configurado com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar configuração',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate Baseline
  const calculateBaseline = useMutation({
    mutationFn: async ({ timestamp, weatherData }: { timestamp?: string; weatherData?: any }) => {
      const { data, error } = await supabase.functions.invoke('digital-twin-calculator', {
        body: {
          action: 'calculate_baseline',
          plant_id: plantId,
          timestamp,
          weather_data: weatherData,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to calculate baseline');
      return data.baseline as BaselineForecast;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baseline-forecasts', plantId] });
      toast({
        title: 'Baseline calculado',
        description: 'Baseline dinâmico gerado com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao calcular baseline',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate Performance Gap
  const calculatePerformanceGap = useMutation({
    mutationFn: async (timestamp: string) => {
      const { data, error } = await supabase.functions.invoke('digital-twin-calculator', {
        body: {
          action: 'calculate_performance_gap',
          plant_id: plantId,
          timestamp,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to calculate performance gap');
      return data.gap as PerformanceGap;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-gaps', plantId] });
    },
    onError: (error: any) => {
      console.error('Error calculating performance gap:', error);
      toast({
        title: 'Erro ao calcular gap de performance',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch Baseline Forecasts
  const { data: baselineForecasts, isLoading: forecastsLoading } = useQuery({
    queryKey: ['baseline-forecasts', plantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('baseline_forecasts')
        .select('*')
        .eq('plant_id', plantId)
        .order('timestamp', { ascending: false })
        .limit(24); // Últimas 24 horas

      if (error) throw error;
      return data as unknown as BaselineForecast[];
    },
    enabled: !!plantId && !!config,
  });

  // Fetch Performance Gaps
  const { data: performanceGaps, isLoading: gapsLoading } = useQuery({
    queryKey: ['performance-gaps', plantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_gaps')
        .select('*')
        .eq('plant_id', plantId)
        .order('timestamp', { ascending: false })
        .limit(24); // Últimas 24 horas

      if (error) throw error;
      return data as unknown as PerformanceGap[];
    },
    enabled: !!plantId && !!config,
  });

  return {
    config,
    configLoading,
    saveConfig,
    calculateBaseline,
    calculatePerformanceGap,
    baselineForecasts,
    forecastsLoading,
    performanceGaps,
    gapsLoading,
    hasConfig: !!config,
  };
};
