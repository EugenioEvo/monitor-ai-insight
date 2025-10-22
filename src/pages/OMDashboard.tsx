import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wrench, RefreshCw, TrendingUp, Clock, DollarSign, Activity, AlertTriangle, Calendar } from 'lucide-react';
import { useOMMetrics, useFailurePredictions } from '@/hooks/useOMMetrics';
import { OMMetricsCard } from '@/components/om/OMMetricsCard';
import { PlantHeatmap } from '@/components/om/PlantHeatmap';
import { EventTimeline } from '@/components/om/EventTimeline';
import { UpcomingMaintenanceWidget } from '@/components/om/UpcomingMaintenanceWidget';
import { DashboardGate } from '@/components/dashboard/DashboardGate';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type Period = 'today' | 'week' | 'month';

function OMDashboardContent() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics, error: metricsError } = useOMMetrics(selectedPeriod);
  const { data: predictions, isLoading: predictionsLoading } = useFailurePredictions();
  
  console.log('[OMDashboard] Component loaded', { 
    metricsLoading, 
    metrics, 
    metricsError,
    selectedPeriod 
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchMetrics();
      toast({
        title: "Dashboard atualizado",
        description: "Métricas de O&M atualizadas com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar as métricas.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-info text-info-foreground';
      default: return 'bg-success text-success-foreground';
    }
  };

  // Loading state
  if (metricsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Carregando Dashboard de O&M...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (metricsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Wrench className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Erro ao carregar Dashboard</h2>
          <p className="text-muted-foreground">{(metricsError as Error).message}</p>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-warning to-warning/80 rounded-2xl flex items-center justify-center shadow-lg">
              <Wrench className="w-6 h-6 text-warning-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Dashboard de O&M
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Operação e Manutenção Inteligente
              </p>
            </div>
          </div>
        </div>

        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as Period)}>
                <SelectTrigger className="w-40 bg-background/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="lg"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="group bg-background/80 hover:bg-background/90"
            >
              <RefreshCw 
                className={`w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500 ${
                  isRefreshing ? 'animate-spin' : ''
                }`} 
              />
              Atualizar
            </Button>
          </div>
        </Card>
      </div>

      {/* KPIs Operacionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <OMMetricsCard
          title="MTBF (Tempo Médio Entre Falhas)"
          value={metrics?.mtbf_hours.toFixed(1) || '0'}
          unit="horas"
          trend={metrics?.trend_mtbf}
          trendLabel="vs. mês anterior"
          icon={Clock}
          description="Meta: >600h"
          status={metrics && metrics.mtbf_hours > 600 ? 'good' : 'warning'}
        />

        <OMMetricsCard
          title="MTTR (Tempo Médio de Reparo)"
          value={metrics?.mttr_hours.toFixed(1) || '0'}
          unit="horas"
          trend={metrics?.trend_mtbf}
          trendLabel="vs. mês anterior"
          icon={Wrench}
          description="Meta: <8h"
          status={metrics && metrics.mttr_hours < 8 ? 'good' : 'warning'}
        />

        <OMMetricsCard
          title="Disponibilidade"
          value={metrics?.availability_percent.toFixed(1) || '0'}
          unit="%"
          trend={metrics?.trend_availability}
          trendLabel="vs. mês anterior"
          icon={Activity}
          description="Meta: >97%"
          status={metrics && metrics.availability_percent > 97 ? 'good' : 'warning'}
        />

        <OMMetricsCard
          title="Compliance SLA"
          value={metrics?.sla_compliance_percent.toFixed(1) || '0'}
          unit="%"
          trend={metrics?.trend_availability}
          trendLabel="vs. mês anterior"
          icon={TrendingUp}
          description="Meta: >95%"
          status={metrics && metrics.sla_compliance_percent > 95 ? 'good' : metrics && metrics.sla_compliance_percent > 90 ? 'warning' : 'critical'}
        />
      </div>

      {/* Métricas de Custo e Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <OMMetricsCard
          title="Custo de O&M"
          value={formatCurrency(metrics?.om_cost_brl || 0)}
          trend={metrics?.trend_cost}
          trendLabel="vs. mês anterior"
          icon={DollarSign}
          description={`${metrics?.cost_per_kwh.toFixed(4) || '0'} R$/kWh`}
        />

        <OMMetricsCard
          title="Tickets Abertos"
          value={metrics?.total_tickets_open || 0}
          icon={AlertTriangle}
          description={`${metrics?.total_tickets_closed || 0} fechados este período`}
          status={metrics && metrics.total_tickets_open > 10 ? 'warning' : 'good'}
        />

        <OMMetricsCard
          title="Alertas Críticos"
          value={metrics?.critical_alerts || 0}
          icon={AlertTriangle}
          description={`${metrics?.pending_maintenance || 0} manutenções pendentes`}
          status={metrics && metrics.critical_alerts > 5 ? 'critical' : metrics && metrics.critical_alerts > 2 ? 'warning' : 'good'}
        />
      </div>

      {/* Previsão de Falhas */}
      {predictions && predictions.length > 0 && (
        <Card className="bg-gradient-to-br from-destructive/10 to-warning/10 border-destructive/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-destructive to-destructive/80 rounded-xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-5 h-5 text-destructive-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  🤖 Previsão de Falhas (IA)
                </CardTitle>
                <CardDescription>Ações recomendadas pelo sistema preditivo</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              <div className="space-y-3">
                {predictions.map((prediction) => (
                  <Card key={prediction.equipment_id} className="bg-card/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getRiskColor(prediction.risk_level)}>
                              {prediction.risk_level}
                            </Badge>
                            <span className="font-semibold text-sm">{prediction.equipment_type}</span>
                            <span className="text-xs text-muted-foreground">• {prediction.plant_name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{prediction.recommended_action}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-muted-foreground">
                              Probabilidade: <span className="font-semibold">{(prediction.failure_probability * 100).toFixed(0)}%</span>
                            </span>
                            <span className="text-muted-foreground">
                              Confiança: <span className="font-semibold">{prediction.confidence_percent}%</span>
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="destructive">
                          Agendar Manutenção
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Mapa de Status + Próximas Manutenções */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlantHeatmap />
        <UpcomingMaintenanceWidget />
      </div>

      {/* Timeline de Eventos */}
      <EventTimeline />
    </div>
  );
}

export default function OMDashboard() {
  return (
    <DashboardGate>
      <OMDashboardContent />
    </DashboardGate>
  );
}
