import { useState, useCallback } from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useToast } from '@/hooks/use-toast';
import { useMetrics } from '@/hooks/useMetrics';
import { useAlerts } from '@/hooks/useAlerts';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';

// Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { SolarEdgeDigitalTwin } from '@/components/dashboard/SolarEdgeDigitalTwin';
import { SimplifiedDigitalTwin } from '@/components/dashboard/SimplifiedDigitalTwin';
import { PlantSyncManager } from '@/components/plants/PlantSyncManager';
import { InvoicePlantMapping } from '@/components/invoices/InvoicePlantMapping';
import { SystemHealthDashboard } from '@/components/alerts/SystemHealthDashboard';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { EnergyChart } from '@/components/dashboard/EnergyChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Types
type Period = 'today' | 'week' | 'month';
type PeriodSelectorType = 'DAY' | 'MONTH' | 'YEAR';

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [chartPeriod, setChartPeriod] = useState<PeriodSelectorType>('DAY');
  const { toast } = useToast();

  // Hooks
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
      
      if (error) {
        console.error('Error fetching plants:', error);
        throw error;
      }
      
      return (data || []).map(plant => ({
        ...plant,
        status: plant.status as 'active' | 'pending_fix' | 'maintenance',
        monitoring_system: plant.monitoring_system as 'manual' | 'solaredge' | 'sungrow'
      }));
    },
    enabled: !!session,
  });

  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    error: metricsError,
    refetch: refetchMetrics 
  } = useMetrics(selectedPeriod);

  const { 
    data: alerts, 
    isLoading: alertsLoading,
    error: alertsError 
  } = useAlerts(undefined, 'open');

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.allSettled([
        refetchMetrics(),
        refetchPlants(),
      ]);
      
      toast({
        title: "Dashboard atualizado",
        description: "Todos os dados foram atualizados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Ocorreu um erro ao atualizar os dados do dashboard.",
        variant: "destructive",
      });
    }
  }, [refetchMetrics, refetchPlants, toast]);

  // Error handling
  if (metricsError || alertsError) {
    console.error('Dashboard errors:', { metricsError, alertsError });
  }

  const criticalAlertsCount = alerts?.filter(a => a.severity === 'critical').length || 0;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-6 py-8 space-y-8">
          
          {/* Header */}
          <DashboardHeader
            connected={connected}
            lastEventAt={lastEventAt}
            onRefresh={handleRefresh}
            isRefreshing={metricsLoading}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />

          {/* Main Content */}
          <Tabs defaultValue="overview" className="w-full space-y-8">
            <TabsList className="grid w-full grid-cols-6 bg-card/50 backdrop-blur-sm border-border/50 p-2 h-auto shadow-lg">
              <TabsTrigger 
                value="overview" 
                className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="production" 
                className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Produção
              </TabsTrigger>
              <TabsTrigger 
                value="plants" 
                className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Plantas
              </TabsTrigger>
              <TabsTrigger 
                value="sync" 
                className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Sincronização
              </TabsTrigger>
              <TabsTrigger 
                value="mapping" 
                className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Mapeamento
              </TabsTrigger>
              <TabsTrigger 
                value="health" 
                className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Saúde
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8 animate-fade-in">
              {/* Statistics Cards */}
              <DashboardStats
                metrics={metrics}
                isLoading={metricsLoading}
                selectedPeriod={selectedPeriod}
                alertsCount={criticalAlertsCount}
              />

              {/* Charts and Alerts */}
              <DashboardOverview selectedPeriod={selectedPeriod} />
            </TabsContent>

            {/* Production Tab */}
            <TabsContent value="production" className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-tight">Monitoramento de Produção</h2>
                <PeriodSelector period={chartPeriod} onPeriodChange={setChartPeriod} />
              </div>
              
              <div className="grid gap-6">
                {plants.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <p className="text-muted-foreground">
                        Nenhuma planta cadastrada ainda. Adicione plantas para visualizar a produção.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  plants.map(plant => (
                    <Card key={plant.id} className="shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="font-bold">{plant.name}</CardTitle>
                        <CardDescription>
                          Sistema: {plant.monitoring_system} | Capacidade: {plant.capacity_kwp} kWp
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <EnergyChart />
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Plants Tab */}
            <TabsContent value="plants" className="space-y-6 animate-fade-in">
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

                {plants.length === 0 && (
                  <Card className="text-center py-12">
                    <CardContent>
                      <p className="text-muted-foreground">
                        Nenhuma planta cadastrada ainda.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Sync Tab */}
            <TabsContent value="sync" className="space-y-6 animate-fade-in">
              <PlantSyncManager plants={plants} onRefresh={refetchPlants} />
            </TabsContent>

            {/* Mapping Tab */}
            <TabsContent value="mapping" className="space-y-6 animate-fade-in">
              <InvoicePlantMapping />
            </TabsContent>

            {/* Health Tab */}
            <TabsContent value="health" className="space-y-6 animate-fade-in">
              <SystemHealthDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}