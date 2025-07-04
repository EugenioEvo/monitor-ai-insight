/**
 * Hooks para gerenciar métricas do dashboard
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface MetricsSummary {
  totalGeneration: number;
  totalConsumption: number;
  openTickets: number;
  openAlerts: number;
  activePlants: number;
  period: string;
}

export const useMetrics = (period: 'today' | 'week' | 'month' = 'today') => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['metrics-summary', period],
    queryFn: async (): Promise<MetricsSummary> => {
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('metrics-summary', {
        body: {},
        headers: { 
          Authorization: `Bearer ${session?.session?.access_token}` 
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
  });

  // Subscrição em tempo real para invalidar cache
  useEffect(() => {
    const channel = supabase
      .channel('metrics-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'readings' 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'alerts' 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tickets' 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

export default useMetrics;