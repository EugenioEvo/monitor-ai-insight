/**
 * Hooks para gerenciar alertas
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface Alert {
  id: string;
  plant_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  status: 'open' | 'acknowledged' | 'resolved';
  acknowledged_by?: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
  // Join com plantas
  plants?: {
    name: string;
    capacity_kwp: number;
  };
}

export const useAlerts = (plantId?: string, status?: string, session?: any) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['alerts', plantId, status, session?.user?.id],
    // Specify the return type of the alerts query.
    queryFn: async (): Promise<Alert[]> => {
      let query = supabase
        .from('alerts')
        .select(`
          *,
          plants!inner(name, capacity_kwp)
        `)
        .order('timestamp', { ascending: false });

      if (plantId) {
        query = query.eq('plant_id', plantId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as Alert[];
    },
    enabled: !!session?.user?.id,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });

  // Subscrição em tempo real
  useEffect(() => {
    const channelName = `alerts-realtime-${plantId ?? 'all'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alerts',
        ...(plantId && { filter: `plant_id=eq.${plantId}` })
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, plantId]);

  return query;
};

export const useAcknowledgeAlert = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, userId }: { alertId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast({
        title: "Alerta reconhecido",
        description: "O alerta foi marcado como reconhecido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao reconhecer alerta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useResolveAlert = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase
        .from('alerts')
        .update({
          status: 'resolved',
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast({
        title: "Alerta resolvido",
        description: "O alerta foi marcado como resolvido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao resolver alerta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCreateAlert = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    // Define the type of alert when creating a new alert, omitting auto-generated fields.
    mutationFn: async (
      alert: Omit<Alert, 'id' | 'timestamp' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await supabase
        .from('alerts')
        .insert([alert])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast({
        title: "Alerta criado",
        description: "Novo alerta foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar alerta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};