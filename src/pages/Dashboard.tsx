import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SolarEdgeDigitalTwin } from '@/components/dashboard/SolarEdgeDigitalTwin';
import { SimplifiedDigitalTwin } from '@/components/dashboard/SimplifiedDigitalTwin';
import { PlantSyncManager } from '@/components/plants/PlantSyncManager';
import { InvoicePlantMapping } from '@/components/invoices/InvoicePlantMapping';
import { SystemHealthDashboard } from '@/components/alerts/SystemHealthDashboard';
import { EnergyChart } from '@/components/dashboard/EnergyChart';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMetrics } from '@/hooks/useMetrics';
import { useAlerts } from '@/hooks/useAlerts';
import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { EnhancedErrorBoundary } from '@/components/ui/enhanced-error-boundary';

type Period = 'today' | 'week' | 'month';
type PeriodSelectorType = 'DAY' | 'MONTH' | 'YEAR';

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [chartPeriod, setChartPeriod] = useState<PeriodSelectorType>('DAY');

  // Realtime updates
  const { connected, lastEventAt } = useRealtimeDashboard();

  // Data queries with error boundaries
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    retry: 1,
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
    retry: 3,
  });

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useMetrics(selectedPeriod);
  const { data: alerts, isLoading: alertsLoading } = useAlerts(undefined, 'open');

  const criticalAlertsCount = alerts?.filter(a => a.severity === 'critical').length || 0;

  return (
    <ProtectedRoute>
      <EnhancedErrorBoundary level="page">
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
          <div className="container mx-auto px-6 py-8 space-y-8">
            {/* Header */}
            <DashboardHeader
              connected={connected}
              lastEventAt={lastEventAt}
              isLoading={metricsLoading}
              onRefresh={() => {
                refetchMetrics();
                refetchPlants();
              }}
            />

            <Tabs defaultValue="overview" className="w-full space-y-8">
              <TabsList className="grid w-full grid-cols-6 glass-card border-0 p-2 h-auto">
                <TabsTrigger value="overview" className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="production" className="rounded-lg font-semibold">
                  Produção
                </TabsTrigger>
                <TabsTrigger value="plants" className="rounded-lg font-semibold">
                  Plantas
                </TabsTrigger>
                <TabsTrigger value="sync" className="rounded-lg font-semibold">
                  Sincronização
                </TabsTrigger>
                <TabsTrigger value="mapping" className="rounded-lg font-semibold">
                  Mapeamento
                </TabsTrigger>
                <TabsTrigger value="health" className="rounded-lg font-semibold">
                  Saúde
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <EnhancedErrorBoundary level="component">
                  <DashboardOverview
                    metrics={metrics}
                    metricsLoading={metricsLoading}
                    selectedPeriod={selectedPeriod}
                    alertsCount={criticalAlertsCount}
                  />
                </EnhancedErrorBoundary>
              </TabsContent>

              <TabsContent value="production" className="space-y-6">
                <EnhancedErrorBoundary level="component">
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
                </EnhancedErrorBoundary>
              </TabsContent>

              <TabsContent value="plants" className="space-y-6">
                <EnhancedErrorBoundary level="component">
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
                </EnhancedErrorBoundary>
              </TabsContent>

              <TabsContent value="sync" className="space-y-6">
                <EnhancedErrorBoundary level="component">
                  <PlantSyncManager plants={plants} onRefresh={refetchPlants} />
                </EnhancedErrorBoundary>
              </TabsContent>

              <TabsContent value="mapping" className="space-y-6">
                <EnhancedErrorBoundary level="component">
                  <InvoicePlantMapping />
                </EnhancedErrorBoundary>
              </TabsContent>

              <TabsContent value="health" className="space-y-6">
                <EnhancedErrorBoundary level="component">
                  <SystemHealthDashboard />
                </EnhancedErrorBoundary>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </EnhancedErrorBoundary>
    </ProtectedRoute>
  );
}