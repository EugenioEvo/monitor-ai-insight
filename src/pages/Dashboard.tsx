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
import { MetricCard } from '@/components/dashboard/MetricCard';
import { EnergyChart } from '@/components/dashboard/EnergyChart';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
  Calendar
} from 'lucide-react';

type Period = 'today' | 'week' | 'month';
type PeriodSelectorType = 'DAY' | 'MONTH' | 'YEAR';

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [chartPeriod, setChartPeriod] = useState<PeriodSelectorType>('DAY');

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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Solar</h1>
            <p className="text-muted-foreground">
              Monitoramento em tempo real das suas usinas
            </p>
          </div>
          <Button
            variant="outline" 
            size="sm"
            onClick={() => refetchMetrics()}
            disabled={metricsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="production">Produção</TabsTrigger>
            <TabsTrigger value="plants">Plantas</TabsTrigger>
            <TabsTrigger value="sync">Sincronização</TabsTrigger>
            <TabsTrigger value="mapping">Mapeamento</TabsTrigger>
            <TabsTrigger value="health">Saúde</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {metricsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-6 rounded-lg border">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-16 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))
              ) : (
                <>
                  <MetricCard
                    title="Geração"
                    value={formatKWh(metrics?.totalGeneration || 0)}
                    change={`${getPeriodLabel(selectedPeriod)}`}
                    changeType="positive"
                    icon={Sun}
                    description={`${metrics?.activePlants || 0} plantas ativas`}
                  />
                  <MetricCard
                    title="Consumo"
                    value={formatKWh(metrics?.totalConsumption || 0)}
                    change={`${getPeriodLabel(selectedPeriod)}`}
                    changeType="positive"
                    icon={Battery}
                    description="Faturas processadas"
                  />
                  <MetricCard
                    title="Tickets O&M"
                    value={formatValue(metrics?.openTickets)}
                    change={metrics?.openTickets === 0 ? "Nenhum aberto" : "Requer atenção"}
                    changeType={metrics?.openTickets === 0 ? "positive" : "negative"}
                    icon={Wrench}
                    description="Operação & Manutenção"
                  />
                  <MetricCard
                    title="Alertas Ativos"
                    value={formatValue(metrics?.openAlerts)}
                    change={metrics?.openAlerts === 0 ? "Nenhum ativo" : "Verificar urgência"}
                    changeType={metrics?.openAlerts === 0 ? "positive" : "negative"}
                    icon={AlertTriangle}
                    description={alerts?.filter(a => a.severity === 'critical').length + " críticos" || ""}
                  />
                </>
              )}
            </div>

            {/* Charts and Alerts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-500" />
                      Geração vs Consumo ({getPeriodLabel(selectedPeriod)})
                    </CardTitle>
                    <CardDescription>
                      Comparativo entre energia gerada e consumida
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EnergyChart />
                  </CardContent>
                </Card>
              </div>
              <div>
                <AlertsList />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="production" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Monitoramento de Produção</h2>
              <PeriodSelector period={chartPeriod} onPeriodChange={setChartPeriod} />
            </div>
            <div className="grid gap-6">
              {plants.map(plant => (
                <Card key={plant.id}>
                  <CardHeader>
                    <CardTitle>{plant.name}</CardTitle>
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
    </ProtectedRoute>
  );
}