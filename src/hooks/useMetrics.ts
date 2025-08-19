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
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('metrics-summary', {
        body: { period },
        headers: { 
          Authorization: `Bearer ${session?.session?.access_token}` 
        }
      });

      if (error) {
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
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export default useMetrics;