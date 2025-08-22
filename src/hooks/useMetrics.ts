/**
 * Hooks para gerenciar métricas do dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MetricsSummary {
  totalGeneration: number;
  totalConsumption: number;
  openTickets: number;
  openAlerts: number;
  activePlants: number;
  period: string;
}

export const useMetrics = (period: 'today' | 'week' | 'month' = 'today') => {
  return useQuery({
    queryKey: ['metrics-summary', period],
    queryFn: async (): Promise<MetricsSummary> => {
      try {
        const { data: session } = await supabase.auth.getSession();
        
        const { data, error } = await supabase.functions.invoke('metrics-summary', {
          body: { period },
          headers: { 
            Authorization: `Bearer ${session?.session?.access_token}` 
          }
        });

        if (error) {
          console.error('Metrics API error:', error);
          throw new Error(error.message || 'Erro ao buscar métricas');
        }

        return data || {
          totalGeneration: 0,
          totalConsumption: 0,
          openTickets: 0,
          openAlerts: 0,
          activePlants: 0,
          period
        };
      } catch (error) {
        console.error('Error fetching metrics:', error);
        // Return fallback data instead of throwing
        return {
          totalGeneration: 0,
          totalConsumption: 0,
          openTickets: 0,
          openAlerts: 0,
          activePlants: 0,
          period
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos para reduzir chamadas
    gcTime: 10 * 60 * 1000, // 10 minutos de cache
    retry: 2, // Reduzir tentativas
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false, // Evitar refetch desnecessário
    refetchInterval: 5 * 60 * 1000, // Refetch a cada 5 minutos
  });
};

export default useMetrics;