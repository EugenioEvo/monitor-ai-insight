import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAlerts } from "@/hooks/useAlerts";
import { useTickets } from "@/hooks/useTickets";
import { useState } from "react";
import { ModernKPICard } from "@/components/om/ModernKPICard";
import { MaintenanceKanbanBoard } from "@/components/om/MaintenanceKanbanBoard";
import { MaintenanceTimeline } from "@/components/om/MaintenanceTimeline";
import { AlertsListView } from "@/components/om/AlertsListView";
import { MaintenanceRecommendations } from "@/components/om/MaintenanceRecommendations";
import { EquipmentHistoryViewer } from "@/components/maintenance/EquipmentHistoryViewer";
import { UpcomingMaintenanceWidget } from "@/components/om/UpcomingMaintenanceWidget";
import { OMMetricsChart } from "@/components/om/OMMetricsChart";
import { TicketForm } from "@/components/tickets/TicketForm";
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  CheckCircle2,
  Plus,
} from "lucide-react";

export default function Maintenance() {
  const [showTicketForm, setShowTicketForm] = useState(false);
  const { data: alerts } = useAlerts();
  const { data: tickets } = useTickets();

  const activeAlerts = alerts?.filter(a => a.status === 'open').length || 0;
  const openTickets = tickets?.filter(t => t.status === 'open').length || 0;
  const todayCompleted = tickets?.filter(t => 
    t.status === 'completed' && 
    t.closed_at &&
    new Date(t.closed_at).toDateString() === new Date().toDateString()
  ).length || 0;
  const avgResponseTime = tickets?.length ? 
    Math.round(tickets.reduce((acc: number, t: any) => acc + (t.actual_hours || 0), 0) / tickets.length) : 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manutenção</h1>
          <p className="text-muted-foreground">
            Gestão inteligente de O&M com IA e automação
          </p>
        </div>
        <Button size="lg" onClick={() => setShowTicketForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Ticket
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ModernKPICard
          title="Alertas Ativos"
          value={activeAlerts}
          subtitle="Requerem atenção"
          trend={activeAlerts > 5 ? "up" : "down"}
          trendValue={activeAlerts > 5 ? "+12%" : "-8%"}
          icon={<AlertTriangle className="h-6 w-6" />}
          variant={activeAlerts > 10 ? "danger" : "default"}
          sparklineData={[3, 5, 4, 8, 6, 9, activeAlerts]}
        />
        
        <ModernKPICard
          title="Tickets Abertos"
          value={openTickets}
          subtitle="Em andamento"
          trend="stable"
          icon={<Activity className="h-6 w-6" />}
          sparklineData={[12, 15, 13, 14, 16, 15, openTickets]}
        />
        
        <ModernKPICard
          title="Concluídos Hoje"
          value={todayCompleted}
          subtitle="Últimas 24h"
          trend="up"
          trendValue="+15%"
          icon={<CheckCircle2 className="h-6 w-6" />}
          variant="success"
          sparklineData={[2, 3, 4, 3, 5, 4, todayCompleted]}
        />
        
        <ModernKPICard
          title="Tempo Médio"
          value={`${avgResponseTime}h`}
          subtitle="Resolução de tickets"
          trend="down"
          trendValue="-20%"
          icon={<Clock className="h-6 w-6" />}
          sparklineData={[6, 5, 7, 5, 4, 5, avgResponseTime]}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="gap-2">
            <Activity className="h-4 w-4" />
            Manutenção Inteligente
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Tickets & Alertas
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MaintenanceTimeline />
            </div>
            <div>
              <UpcomingMaintenanceWidget />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          <MaintenanceRecommendations />
          <EquipmentHistoryViewer />
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          <MaintenanceKanbanBoard />
          <AlertsListView />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <OMMetricsChart />
        </TabsContent>
      </Tabs>

      {showTicketForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl">
            <TicketForm onSuccess={() => setShowTicketForm(false)} />
            <Button
              variant="ghost"
              className="absolute right-4 top-4"
              onClick={() => setShowTicketForm(false)}
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
