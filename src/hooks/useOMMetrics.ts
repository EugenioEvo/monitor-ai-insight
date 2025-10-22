/**
 * Hook para métricas de Operação e Manutenção
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OMMetrics, PlantOMStatus, OMEvent, UpcomingMaintenance, FailurePrediction } from '@/types/om';
import { useAuth } from './useAuth';

export const useOMMetrics = (period: 'today' | 'week' | 'month' = 'today') => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['om-metrics', period, session?.user?.id],
    queryFn: async (): Promise<OMMetrics> => {
      // TODO: Implementar edge function para calcular métricas de O&M
      // Por enquanto, retornar dados simulados
      
      // Buscar dados reais de tickets e alertas
      const [ticketsResult, alertsResult, plantsResult] = await Promise.all([
        supabase.from('tickets').select('*', { count: 'exact' }),
        supabase.from('alerts').select('*', { count: 'exact' }).eq('status', 'open'),
        supabase.from('plants').select('*', { count: 'exact' })
      ]);

      const openTickets = ticketsResult.data?.filter(t => t.status === 'open').length || 0;
      const closedTickets = ticketsResult.data?.filter(t => t.status === 'closed').length || 0;
      const criticalAlerts = alertsResult.data?.filter(a => a.severity === 'critical').length || 0;
      const activePlants = plantsResult.count || 0;

      return {
        mtbf_hours: 720.5,
        mttr_hours: 4.2,
        availability_percent: 98.3,
        sla_compliance_percent: 95.7,
        om_cost_brl: 45320.50,
        cost_per_kwh: 0.12,
        active_plants: activePlants,
        total_tickets_open: openTickets,
        total_tickets_closed: closedTickets,
        critical_alerts: criticalAlerts,
        pending_maintenance: 3,
        performance_ratio: 84.5,
        energy_generated_kwh: 125000,
        expected_energy_kwh: 148000,
        trend_mtbf: 'up',
        trend_availability: 'stable',
        trend_cost: 'down',
        period
      };
    },
    enabled: !!session?.user?.id,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};

export const usePlantOMStatus = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['plant-om-status', session?.user?.id],
    queryFn: async (): Promise<PlantOMStatus[]> => {
      const { data: plants } = await supabase
        .from('plants')
        .select('*');

      if (!plants) return [];

      // Buscar tickets e alertas por planta
      const plantsWithStatus = await Promise.all(
        plants.map(async (plant) => {
          const [ticketsResult, alertsResult] = await Promise.all([
            supabase.from('tickets').select('*', { count: 'exact' }).eq('plant_id', plant.id).eq('status', 'open'),
            supabase.from('alerts').select('*', { count: 'exact' }).eq('plant_id', plant.id).eq('status', 'open')
          ]);

          const openTickets = ticketsResult.count || 0;
          const criticalAlerts = alertsResult.data?.filter(a => a.severity === 'critical').length || 0;

          // Determinar status da planta
          let status: PlantOMStatus['status'] = 'operational';
          if (criticalAlerts > 0) status = 'critical';
          else if (openTickets > 5) status = 'warning';
          else if (openTickets > 0) status = 'maintenance';

          return {
            plant_id: plant.id,
            plant_name: plant.name,
            status,
            availability_percent: 98 - (openTickets * 2),
            last_maintenance: '2025-01-15',
            next_maintenance: '2025-02-15',
            open_tickets: openTickets,
            critical_alerts: criticalAlerts,
          };
        })
      );

      return plantsWithStatus;
    },
    enabled: !!session?.user?.id,
    staleTime: 1 * 60 * 1000,
  });
};

export const useOMEvents = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['om-events', session?.user?.id],
    queryFn: async (): Promise<OMEvent[]> => {
      // Buscar tickets, alertas e anomalias recentes
      const [tickets, alerts, anomalies] = await Promise.all([
        supabase.from('tickets').select('*, plants(name)').order('created_at', { ascending: false }).limit(10),
        supabase.from('alerts').select('*, plants(name)').order('created_at', { ascending: false }).limit(10),
        supabase.from('anomalies').select('*, plants(name)').order('created_at', { ascending: false }).limit(10)
      ]);

      const events: OMEvent[] = [];

      tickets.data?.forEach(ticket => {
        const getSeverity = (): 'low' | 'medium' | 'high' | 'critical' => {
          if (ticket.priority === 'urgent') return 'critical';
          if (ticket.priority === 'high') return 'high';
          return 'medium';
        };
        
        events.push({
          id: ticket.id,
          timestamp: ticket.created_at,
          type: 'ticket',
          severity: getSeverity(),
          title: ticket.title || 'Ticket criado',
          description: ticket.description,
          plant_id: ticket.plant_id,
          plant_name: ticket.plants?.name || 'Planta desconhecida',
          status: ticket.status === 'open' ? 'open' : ticket.status === 'closed' ? 'closed' : 'in_progress'
        });
      });

      alerts.data?.forEach(alert => {
        const getSeverity = (): 'low' | 'medium' | 'high' | 'critical' => {
          const sev = alert.severity;
          if (sev === 'critical' || sev === 'high' || sev === 'medium' || sev === 'low') {
            return sev;
          }
          return 'medium'; // fallback
        };
        
        events.push({
          id: alert.id,
          timestamp: alert.created_at,
          type: 'alert',
          severity: getSeverity(),
          title: alert.message,
          description: `Alerta ${alert.type}`,
          plant_id: alert.plant_id,
          plant_name: alert.plants?.name || 'Planta desconhecida',
          status: alert.status === 'open' ? 'open' : 'resolved'
        });
      });

      anomalies.data?.forEach(anomaly => {
        const getSeverity = (): 'low' | 'medium' | 'high' | 'critical' => {
          const sev = anomaly.severity;
          if (sev === 'critical' || sev === 'high' || sev === 'medium' || sev === 'low') {
            return sev;
          }
          return 'medium'; // fallback
        };
        
        events.push({
          id: anomaly.id,
          timestamp: anomaly.created_at,
          type: 'anomaly',
          severity: getSeverity(),
          title: `Anomalia: ${anomaly.metric_affected}`,
          description: `Tipo: ${anomaly.anomaly_type}`,
          plant_id: anomaly.plant_id,
          plant_name: anomaly.plants?.name || 'Planta desconhecida',
          status: anomaly.status === 'active' ? 'open' : 'resolved'
        });
      });

      return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },
    enabled: !!session?.user?.id,
    staleTime: 1 * 60 * 1000,
  });
};

export const useUpcomingMaintenance = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['upcoming-maintenance', session?.user?.id],
    queryFn: async (): Promise<UpcomingMaintenance[]> => {
      // TODO: Implementar tabela maintenance_schedule
      // Por enquanto retornar dados simulados
      return [
        {
          id: '1',
          plant_id: 'plant-1',
          plant_name: 'Planta Solar Norte',
          maintenance_type: 'preventive',
          scheduled_date: '2025-01-25',
          estimated_duration_hours: 4,
          priority: 'medium',
          description: 'Limpeza de painéis e inspeção visual',
          status: 'scheduled',
        },
        {
          id: '2',
          plant_id: 'plant-2',
          plant_name: 'Planta Solar Sul',
          maintenance_type: 'corrective',
          scheduled_date: '2025-01-22',
          estimated_duration_hours: 8,
          priority: 'high',
          description: 'Substituição de inversor com falha',
          assigned_to: 'João Silva',
          status: 'scheduled',
        },
        {
          id: '3',
          plant_id: 'plant-3',
          plant_name: 'Planta Solar Leste',
          maintenance_type: 'predictive',
          scheduled_date: '2025-01-20',
          estimated_duration_hours: 2,
          priority: 'critical',
          description: 'Verificação preventiva de componente com previsão de falha',
          status: 'overdue',
        },
      ];
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useFailurePredictions = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['failure-predictions', session?.user?.id],
    queryFn: async (): Promise<FailurePrediction[]> => {
      // TODO: Implementar edge function de ML para predição
      return [
        {
          equipment_id: 'inv-001',
          equipment_type: 'Inversor',
          plant_id: 'plant-1',
          plant_name: 'Planta Solar Norte',
          failure_probability: 0.72,
          risk_level: 'high',
          predicted_failure_date: '2025-02-05',
          recommended_action: 'Agendar inspeção preventiva e ter peça de reposição em estoque',
          confidence_percent: 85,
        },
        {
          equipment_id: 'str-005',
          equipment_type: 'String Box',
          plant_id: 'plant-2',
          plant_name: 'Planta Solar Sul',
          failure_probability: 0.45,
          risk_level: 'medium',
          predicted_failure_date: '2025-02-20',
          recommended_action: 'Monitorar performance e agendar verificação',
          confidence_percent: 78,
        },
      ];
    },
    enabled: !!session?.user?.id,
    staleTime: 10 * 60 * 1000,
  });
};
