import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface RealtimeStatus {
  connected: boolean;
  lastEventAt: Date | null;
}

// Global state to prevent multiple subscriptions
let globalChannel: ReturnType<typeof supabase.channel> | null = null;
let subscriberCount = 0;
const globalCallbacks = new Set<() => void>();

/**
 * Hook centralizado para atualizações em tempo real no dashboard.
 * Implementa singleton pattern para evitar múltiplas subscrições
 */
export const useRealtimeDashboard = (): RealtimeStatus => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);
  const callbackIdRef = useRef<string | null>(null);

  const updateLastEvent = useCallback(() => {
    setLastEventAt(new Date());
  }, []);

  const invalidateQueries = useCallback((tables: string[]) => {
    tables.forEach(table => {
      queryClient.invalidateQueries({ queryKey: [table] });
    });
  }, [queryClient]);

  useEffect(() => {
    subscriberCount++;
    const callbackId = `callback_${Date.now()}_${Math.random()}`;
    callbackIdRef.current = callbackId;

    // Callback para este hook específico
    const myCallback = () => {
      updateLastEvent();
    };
    globalCallbacks.add(myCallback);

    // Criar canal global apenas se não existir
    if (!globalChannel) {
      console.log('[Realtime] Creating global dashboard channel');
      globalChannel = supabase.channel('dashboard-realtime-global');

      // Leituras: atualizar métricas e gráficos
      globalChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'readings' },
        (payload) => {
          console.log('[Realtime] readings event:', payload.eventType, payload);
          globalCallbacks.forEach(cb => cb());
          queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
          queryClient.invalidateQueries({ queryKey: ['readings'] });
          queryClient.invalidateQueries({ queryKey: ['energy-data'] });
        }
      );

      // Alertas: atualizar lista de alertas e métricas; toast para críticos
      globalChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        (payload: any) => {
          console.log('[Realtime] alerts event:', payload.eventType, payload);
          globalCallbacks.forEach(cb => cb());
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

      // Sync logs: atualizar status e possíveis métricas
      globalChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sync_logs' },
        (payload) => {
          console.log('[Realtime] sync_logs event:', payload.eventType, payload);
          globalCallbacks.forEach(cb => cb());
          queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
          queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
        }
      );

      // Plants: novas plantas e atualizações de status
      globalChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plants' },
        (payload: any) => {
          console.log('[Realtime] plants event:', payload.eventType, payload);
          globalCallbacks.forEach(cb => cb());
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

      globalChannel.subscribe((status) => {
        console.log('[Realtime] global channel status:', status);
        setConnected(status === 'SUBSCRIBED');
      });
    } else {
      // Canal já existe, apenas conectar ao status
      setConnected(true);
    }

    return () => {
      subscriberCount--;
      if (callbackIdRef.current) {
        globalCallbacks.delete(myCallback);
      }

      // Remover canal global apenas quando não há mais subscribers
      if (subscriberCount === 0 && globalChannel) {
        console.log('[Realtime] Removing global dashboard channel');
        supabase.removeChannel(globalChannel);
        globalChannel = null;
        globalCallbacks.clear();
        setConnected(false);
      }
    };
  }, [queryClient, toast, updateLastEvent]);

  return { connected, lastEventAt };
};

export default useRealtimeDashboard;