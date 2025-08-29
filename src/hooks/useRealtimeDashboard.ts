import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useDebounce } from './useDebounce';

interface RealtimeStatus {
  connected: boolean;
  lastEventAt?: Date;
}

// Singleton pattern for channel management
class RealtimeChannelManager {
  private static instance: RealtimeChannelManager;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private subscribers = new Set<() => void>();
  private lastInvalidation = 0;
  private invalidationQueue = new Map<string, NodeJS.Timeout>();
  private isSubscribed = false;

  static getInstance() {
    if (!RealtimeChannelManager.instance) {
      RealtimeChannelManager.instance = new RealtimeChannelManager();
    }
    return RealtimeChannelManager.instance;
  }

  subscribe(callback: () => void) {
    this.subscribers.add(callback);
    if (!this.channel) {
      this.initializeChannel();
    }
    return () => this.subscribers.delete(callback);
  }

  private debouncedInvalidate = (queryKey: string, invalidateFn: () => void) => {
    // Clear existing timeout for this query key
    if (this.invalidationQueue.has(queryKey)) {
      clearTimeout(this.invalidationQueue.get(queryKey)!);
    }
    
    // Set new timeout
    const timeoutId = setTimeout(() => {
      invalidateFn();
      this.invalidationQueue.delete(queryKey);
    }, 500); // 500ms debounce
    
    this.invalidationQueue.set(queryKey, timeoutId);
  };

  private initializeChannel() {
    try {
      // Prevent double subscribe on the same channel instance
      if (this.channel && this.isSubscribed) {
        return;
      }
      if (!this.channel) {
        this.channel = supabase.channel('dashboard-realtime', {
          config: { presence: { key: 'dashboard' } }
        });
      }

      this.channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'readings' }, () => {
          this.debouncedInvalidate('readings', () => {
            this.subscribers.forEach(callback => callback());
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
          if (payload.eventType === 'INSERT' && payload.new?.severity === 'critical') {
            toast({
              title: 'Alerta Crítico Detectado',
              description: payload.new.message || 'Verifique o sistema imediatamente',
              variant: 'destructive'
            });
          }
          this.debouncedInvalidate('alerts', () => {
            this.subscribers.forEach(callback => callback());
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'plants' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            toast({
              title: 'Nova Planta Registrada',
              description: `Planta ${payload.new?.name} foi adicionada ao sistema`,
            });
          }
          this.debouncedInvalidate('plants', () => {
            this.subscribers.forEach(callback => callback());
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
          this.debouncedInvalidate('invoices', () => {
            this.subscribers.forEach(callback => callback());
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_units' }, () => {
          this.debouncedInvalidate('customer-units', () => {
            this.subscribers.forEach(callback => callback());
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_logs' }, () => {
          this.debouncedInvalidate('sync-logs', () => {
            this.subscribers.forEach(callback => callback());
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
          this.debouncedInvalidate('tickets', () => {
            this.subscribers.forEach(callback => callback());
          });
        })
        .subscribe((status) => {
          console.log('Realtime status:', status);
          if (status === 'SUBSCRIBED') {
            this.isSubscribed = true;
          }
          if (status === 'CLOSED' || status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            this.isSubscribed = false;
            this.channel = null;
          }
        });
    } catch (error) {
      console.error('Failed to initialize realtime channel:', error);
    }
  }

  cleanup() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
      this.isSubscribed = false;
    }
    this.subscribers.clear();
    // Clear all pending invalidations
    this.invalidationQueue.forEach(timeout => clearTimeout(timeout));
    this.invalidationQueue.clear();
  }
}

export const useRealtimeDashboard = (): RealtimeStatus => {
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<Date>();
  const queryClient = useQueryClient();
  const manager = useRef<RealtimeChannelManager>(RealtimeChannelManager.getInstance());

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
    const unsubscribe = manager.current.subscribe(debouncedInvalidateQueries);
    setConnected(true);

    return () => {
      unsubscribe();
    };
  }, [debouncedInvalidateQueries]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (manager.current) {
        manager.current.cleanup();
      }
    };
  }, []);

  return { connected, lastEventAt };
};