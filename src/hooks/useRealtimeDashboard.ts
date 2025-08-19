
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface RealtimeStatus {
  connected: boolean;
  lastEventAt: Date | null;
}

/**
 * Hook centralizado para atualizações em tempo real no dashboard.
 * - Invalida queries relevantes ao receber eventos de readings, alerts, plants, sync_logs
 * - Mostra toast em alertas críticos e em novas plantas cadastradas
 */
export const useRealtimeDashboard = (): RealtimeStatus => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Cleanup any existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Canal único para o dashboard - use a more stable identifier
    const channel = supabase.channel('dashboard-realtime');

    // Leituras: atualizar métricas e gráficos
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'readings' },
      (payload) => {
        console.log('[Realtime] readings event:', payload.eventType, payload);
        setLastEventAt(new Date());
        // Invalida métricas resumidas e quaisquer gráficos baseados em leituras
        queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
        queryClient.invalidateQueries({ queryKey: ['readings'] });
        queryClient.invalidateQueries({ queryKey: ['energy-data'] });
      }
    );

    // Alertas: atualizar lista de alertas e métricas; toast para críticos
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'alerts' },
      (payload: any) => {
        console.log('[Realtime] alerts event:', payload.eventType, payload);
        setLastEventAt(new Date());
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
        queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });

        const newRow = payload.new;
        if (payload.eventType === 'INSERT' && newRow?.severity === 'critical') {
          toast({
            title: 'Alerta crítico',
            description: newRow?.message || 'Novo alerta crítico detectado.',
            variant: 'destructive',
          });
        }
      }
    );

    // Invoices: atualizar dados de consumo
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'invoices' },
      (payload) => {
        console.log('[Realtime] invoices event:', payload.eventType, payload);
        setLastEventAt(new Date());
        queryClient.invalidateQueries({ queryKey: ['customer-consumption'] });
        queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
      }
    );

    // Customer Units: atualizar dados de consumo
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'customer_units' },
      (payload) => {
        console.log('[Realtime] customer_units event:', payload.eventType, payload);
        setLastEventAt(new Date());
        queryClient.invalidateQueries({ queryKey: ['customer-consumption'] });
      }
    );

    // Sync logs: atualizar status e possíveis métricas
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sync_logs' },
      (payload) => {
        console.log('[Realtime] sync_logs event:', payload.eventType, payload);
        setLastEventAt(new Date());
        queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
        queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
      }
    );

    // Tickets: atualizar métricas
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tickets' },
      (payload) => {
        console.log('[Realtime] tickets event:', payload.eventType, payload);
        setLastEventAt(new Date());
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
      }
    );

    // Plants: novas plantas e atualizações de status
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'plants' },
      (payload: any) => {
        console.log('[Realtime] plants event:', payload.eventType, payload);
        setLastEventAt(new Date());
        queryClient.invalidateQueries({ queryKey: ['plants'] });

        if (payload.eventType === 'INSERT') {
          const name = payload.new?.name || 'Nova planta';
          toast({
            title: 'Planta cadastrada',
            description: `${name} foi adicionada e está disponível no dashboard.`,
          });
        }
      }
    );

    channel.subscribe((status) => {
      console.log('[Realtime] dashboard channel status:', status);
      setConnected(status === 'SUBSCRIBED');
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient, toast]);

  return { connected, lastEventAt };
};

export default useRealtimeDashboard;
