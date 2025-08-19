
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SolarEdgeDigitalTwin } from '@/components/dashboard/SolarEdgeDigitalTwin';
import { SimplifiedDigitalTwin } from '@/components/dashboard/SimplifiedDigitalTwin';
import { PlantSyncManager } from '@/components/plants/PlantSyncManager';
import { InvoicePlantMapping } from '@/components/invoices/InvoicePlantMapping';
import { SystemHealthDashboard } from '@/components/alerts/SystemHealthDashboard';
import { EnhancedValidationPanel } from '@/components/invoices/EnhancedValidationPanel';
import { PerformanceOverview } from '@/components/monitoring/PerformanceOverview';
import { ModernMetricCard } from '@/components/dashboard/ModernMetricCard';
import { EnergyChart } from '@/components/dashboard/EnergyChart';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useMetrics } from '@/hooks/useMetrics';
import { useAlerts } from '@/hooks/useAlerts';
import { useState } from 'react';
import { 
  Zap, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  Sun, 
  Battery,
  Wrench,
  RefreshCw,
  Calendar,
  Activity,
  Sparkles
} from 'lucide-react';
import { LiveBadge } from '@/components/dashboard/LiveBadge';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';

type Period = 'today' | 'week' | 'month';
type PeriodSelectorType = 'DAY' | 'MONTH' | 'YEAR';

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [chartPeriod, setChartPeriod] = useState<PeriodSelectorType>('DAY');

  // Inicializa assinaturas em tempo real do dashboard
  const { connected, lastEventAt } = useRealtimeDashboard();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: plants = [], refetch: refetchPlants } = useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(plant => ({
        ...plant,
        status: plant.status as 'active' | 'pending_fix' | 'maintenance',
        monitoring_system: plant.monitoring_system as 'manual' | 'solaredge' | 'sungrow'
      }));
    },
    enabled: !!session,
  });

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useMetrics(selectedPeriod);
  const { data: alerts, isLoading: alertsLoading } = useAlerts(undefined, 'open');

  const formatKWh = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)} MWh`;
    }
    return `${value.toFixed(1)} kWh`;
  };

  const formatValue = (value: number | undefined) => {
    if (value === undefined) return '0';
    return value.toString();
  };

  const getPeriodLabel = (period: Period) => {
    switch (period) {
      case 'today': return 'Hoje';
      case 'week': return 'Última Semana';
      case 'month': return 'Este Mês';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="container mx-auto px-6 py-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between animate-slide-down">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-solar rounded-2xl flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-responsive-2xl font-display font-bold tracking-tight">Dashboard Solar</h1>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Monitoramento inteligente em tempo real
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LiveBadge connected={connected} lastEventAt={lastEventAt} />
              <Button
                variant="outline" 
                size="lg"
                onClick={() => refetchMetrics()}
                disabled={metricsLoading}
                className="group"
              >
                <RefreshCw className={`w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500 ${metricsLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full space-y-8">
            <TabsList className="grid w-full grid-cols-6 glass-card border-0 p-2 h-auto">
              <TabsTrigger value="overview" className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
              <TabsTrigger value="production" className="rounded-lg font-semibold">Produção</TabsTrigger>
              <TabsTrigger value="plants" className="rounded-lg font-semibold">Plantas</TabsTrigger>
              <TabsTrigger value="sync" className="rounded-lg font-semibold">Sincronização</TabsTrigger>
              <TabsTrigger value="mapping" className="rounded-lg font-semibold">Mapeamento</TabsTrigger>
              <TabsTrigger value="health" className="rounded-lg font-semibold">Saúde</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8 animate-fade-in">
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metricsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-8">
                        <Skeleton className="h-4 w-20 mb-4" />
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <>
                    <ModernMetricCard
                      title="Geração Solar"
                      value={formatKWh(metrics?.totalGeneration || 0)}
                      change={`${getPeriodLabel(selectedPeriod)}`}
                      changeType="positive"
                      icon={Sun}
                      description={`${metrics?.activePlants || 0} plantas ativas gerando energia`}
                      trend={[0.3, 0.7, 0.9, 0.8, 1.0, 0.9, 0.95]}
                    />
                    <ModernMetricCard
                      title="Consumo Total"
                      value={formatKWh(metrics?.totalConsumption || 0)}
                      change={`${getPeriodLabel(selectedPeriod)}`}
                      changeType="positive"
                      icon={Battery}
                      description="Baseado em faturas processadas pela IA"
                      trend={[0.8, 0.6, 0.4, 0.7, 0.5, 0.8, 0.9]}
                    />
                    <ModernMetricCard
                      title="Tickets O&M"
                      value={formatValue(metrics?.openTickets)}
                      change={metrics?.openTickets === 0 ? "Sistema estável" : "Requer atenção"}
                      changeType={metrics?.openTickets === 0 ? "positive" : "negative"}
                      icon={Wrench}
                      description="Operação & Manutenção preventiva"
                    />
                    <ModernMetricCard
                      title="Alertas Críticos"
                      value={formatValue(metrics?.openAlerts)}
                      change={metrics?.openAlerts === 0 ? "Tudo funcionando" : "Verificar urgência"}
                      changeType={metrics?.openAlerts === 0 ? "positive" : "negative"}
                      icon={AlertTriangle}
                      description={`${alerts?.filter(a => a.severity === 'critical').length || 0} críticos detectados`}
                    />
                  </>
                )}
              </div>

              {/* Charts and Alerts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <Card className="hover-lift">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <span className="font-display text-xl">Geração vs Consumo</span>
                          <Badge className="ml-3 bg-success/10 text-success border-success/20">
                            {getPeriodLabel(selectedPeriod)}
                          </Badge>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Comparativo inteligente entre energia gerada e consumida
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <EnergyChart period={selectedPeriod} />
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-6">
                  <AlertsList />
                </div>
              </div>
            </TabsContent>

            {/* Keep existing TabsContent for other tabs */}
            <TabsContent value="production" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold">Monitoramento de Produção</h2>
                <PeriodSelector period={chartPeriod} onPeriodChange={setChartPeriod} />
              </div>
              <div className="grid gap-6">
                {plants.map(plant => (
                  <Card key={plant.id} className="hover-lift">
                    <CardHeader>
                      <CardTitle className="font-display">{plant.name}</CardTitle>
                      <CardDescription>
                        Sistema: {plant.monitoring_system} | Capacidade: {plant.capacity_kwp} kWp
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <EnergyChart />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="plants" className="space-y-6">
              <div className="grid gap-6">
                {plants.filter(plant => plant.monitoring_system === 'solaredge').map(plant => (
                  <SolarEdgeDigitalTwin key={plant.id} plant={plant} />
                ))}
                
                {plants.filter(plant => plant.monitoring_system !== 'solaredge').map(plant => (
                  <SimplifiedDigitalTwin 
                    key={plant.id} 
                    plant={plant} 
                    equipmentData={[]} 
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="sync" className="space-y-6">
              <PlantSyncManager plants={plants} onRefresh={refetchPlants} />
            </TabsContent>

            <TabsContent value="mapping" className="space-y-6">
              <InvoicePlantMapping />
            </TabsContent>

            <TabsContent value="health" className="space-y-6">
              <SystemHealthDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}
