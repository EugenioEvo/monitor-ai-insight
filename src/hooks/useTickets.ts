/**
 * Hooks para gerenciar tickets de manutenção
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface Ticket {
  id: string;
  plant_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'waiting_parts' | 'completed' | 'cancelled';
  type: 'maintenance' | 'repair' | 'inspection' | 'upgrade';
  assigned_to?: string;
  opened_at: string;
  closed_at?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  created_at: string;
  updated_at: string;
  // Join com plantas
  plants?: {
    name: string;
    capacity_kwp: number;
  };
}

export const useTickets = (plantId?: string, status?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tickets', plantId, status],
    queryFn: async (): Promise<Ticket[]> => {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          plants!inner(name, capacity_kwp)
        `)
        .order('created_at', { ascending: false });

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

      return (data || []) as Ticket[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // Subscrição em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('tickets-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tickets',
        ...(plantId && { filter: `plant_id=eq.${plantId}` })
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, plantId]);

  return query;
};

export const useUpdateTicket = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      ticketId, 
      updates, 
      notes 
    }: { 
      ticketId: string; 
      updates: Partial<Ticket>; 
      notes?: string; 
    }) => {
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('update-ticket-status', {
        body: { ticketId, updates, notes },
        headers: { 
          Authorization: `Bearer ${session?.session?.access_token}` 
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: "Ticket atualizado",
        description: "O ticket foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCreateTicket = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticket: Omit<Ticket, 'id' | 'created_at' | 'updated_at' | 'opened_at'>) => {
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('create-ticket', {
        body: ticket,
        headers: { 
          Authorization: `Bearer ${session?.session?.access_token}` 
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data.ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: "Ticket criado",
        description: "Novo ticket foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export default useTickets;