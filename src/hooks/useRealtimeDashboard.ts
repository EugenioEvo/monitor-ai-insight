import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useDebounce } from './useDebounce';

interface RealtimeStatus {
  connected: boolean;
  lastEventAt?: Date;
}

// Global state to prevent multiple subscriptions
let globalChannel: ReturnType<typeof supabase.channel> | null = null;
let isGlobalSubscribed = false;
let subscribersCount = 0;

export const useRealtimeDashboard = (): RealtimeStatus => {
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<Date>();
  const queryClient = useQueryClient();
  const hasSubscribed = useRef(false);

  const debouncedInvalidateQueries = useCallback(
    useDebounce(() => {
      setLastEventAt(new Date());
      
      // Batch invalidate related queries with error handling
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['readings'] }),
        queryClient.invalidateQueries({ queryKey: ['plants'] }),
        queryClient.invalidateQueries({ queryKey: ['alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['metrics-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['sync-status'] }),
        queryClient.invalidateQueries({ queryKey: ['customer-dashboard-data'] }),
        queryClient.invalidateQueries({ queryKey: ['plant-consumption'] }),
      ]).catch(error => {
        console.error('Error invalidating queries:', error);
      });
    }, 300),
    [queryClient]
  );

  useEffect(() => {
    // Prevent multiple subscriptions from the same component
    if (hasSubscribed.current) return;
    
    subscribersCount++;
    hasSubscribed.current = true;

    const initializeChannel = () => {
      try {
        // Only create channel if not already created
        if (!globalChannel) {
          globalChannel = supabase.channel('dashboard-realtime-v2', {
            config: { 
              presence: { key: 'dashboard' },
              broadcast: { self: false }
            }
          });
        }

        // Only subscribe if not already subscribed
        if (!isGlobalSubscribed && globalChannel) {
          globalChannel
            .on('postgres_changes', { event: '*', schema: 'public', table: 'readings' }, () => {
              debouncedInvalidateQueries();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
              if (payload.eventType === 'INSERT' && payload.new?.severity === 'critical') {
                toast({
                  title: 'Alerta Crítico Detectado',
                  description: payload.new.message || 'Verifique o sistema imediatamente',
                  variant: 'destructive'
                });
              }
              debouncedInvalidateQueries();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'plants' }, (payload) => {
              if (payload.eventType === 'INSERT') {
                toast({
                  title: 'Nova Planta Registrada',
                  description: `Planta ${payload.new?.name} foi adicionada ao sistema`,
                });
              }
              debouncedInvalidateQueries();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
              debouncedInvalidateQueries();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_units' }, () => {
              debouncedInvalidateQueries();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_logs' }, () => {
              debouncedInvalidateQueries();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
              debouncedInvalidateQueries();
            })
            .subscribe((status) => {
              console.log('Realtime status:', status);
              if (status === 'SUBSCRIBED') {
                isGlobalSubscribed = true;
                setConnected(true);
              } else if (status === 'CLOSED' || status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
                isGlobalSubscribed = false;
                setConnected(false);
              }
            });
        } else {
          // If already subscribed, just set connected state
          setConnected(isGlobalSubscribed);
        }
      } catch (error) {
        console.error('Failed to initialize realtime channel:', error);
        setConnected(false);
      }
    };

    initializeChannel();

    return () => {
      hasSubscribed.current = false;
      subscribersCount--;
      
      // Only cleanup if this is the last subscriber
      if (subscribersCount === 0 && globalChannel) {
        try {
          globalChannel.unsubscribe();
          globalChannel = null;
          isGlobalSubscribed = false;
          setConnected(false);
        } catch (error) {
          console.error('Error cleaning up realtime channel:', error);
        }
      }
    };
  }, [debouncedInvalidateQueries]);

  return { connected, lastEventAt };
};