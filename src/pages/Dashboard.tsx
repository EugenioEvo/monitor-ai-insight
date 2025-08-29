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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMetrics } from '@/hooks/useMetrics';
import { useAlerts } from '@/hooks/useAlerts';
import { useState, useCallback, useMemo } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { EnhancedErrorBoundary } from '@/components/ui/enhanced-error-boundary';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Activity, Zap, Settings, RefreshCw, CheckCircle } from 'lucide-react';

type Period = 'today' | 'week' | 'month';
type PeriodSelectorType = 'DAY' | 'MONTH' | 'YEAR';

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [chartPeriod, setChartPeriod] = useState<PeriodSelectorType>('DAY');
  const [activeTab, setActiveTab] = useState('overview');

  // Realtime updates with error handling and fallback
  const realtimeResult = (() => {
    try {
      return useRealtimeDashboard();
    } catch (error) {
      console.error('Realtime dashboard error:', error);
      return { connected: false, lastEventAt: undefined };
    }
  })();
  
  const { connected, lastEventAt } = realtimeResult;

  // Session query with better error handling
  const { data: session, error: sessionError } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
      } catch (error) {
        console.error('Session error:', error);
        return null;
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Plants query with enhanced error handling
  const { 
    data: plants = [], 
    refetch: refetchPlants,
    isLoading: plantsLoading,
    error: plantsError 
  } = useQuery({
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
    retry: 3,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Metrics and alerts with better error handling
  const metricsResult = (() => {
    try {
      return useMetrics(selectedPeriod);
    } catch (error) {
      console.error('Metrics hook error:', error);
      return { data: undefined, isLoading: false, refetch: () => Promise.resolve(), error: error };
    }
  })();

  const alertsResult = (() => {
    try {
      return useAlerts(undefined, 'open');
    } catch (error) {
      console.error('Alerts hook error:', error);
      return { data: [], isLoading: false, error: error };
    }
  })();

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics, error: metricsError } = metricsResult;
  const { data: alerts, isLoading: alertsLoading, error: alertsError } = alertsResult;

  // Memoized calculations
  const criticalAlertsCount = useMemo(() => 
    alerts?.filter(a => a.severity === 'critical').length || 0, 
    [alerts]
  );

  const activePlantsCount = useMemo(() => 
    plants.filter(p => p.status === 'active').length, 
    [plants]
  );

  const solarEdgePlants = useMemo(() => 
    plants.filter(plant => plant.monitoring_system === 'solaredge'), 
    [plants]
  );

  const otherPlants = useMemo(() => 
    plants.filter(plant => plant.monitoring_system !== 'solaredge'), 
    [plants]
  );

  // Refresh handlers with better UX
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.allSettled([
        refetchMetrics(),
        refetchPlants()
      ]);
      toast({
        title: "Dashboard Atualizado",
        description: "Dados atualizados com sucesso",
      });
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      toast({
        title: "Erro na Atualização",
        description: "Alguns dados podem não ter sido atualizados",
        variant: "destructive",
      });
    }
  }, [refetchMetrics, refetchPlants]);

  // Error display helper
  const hasErrors = sessionError || plantsError || metricsError || alertsError;

  // Loading state
  const isMainLoading = metricsLoading || plantsLoading;

  if (sessionError) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-destructive">Erro de Autenticação</CardTitle>
              <CardDescription className="text-center">
                Não foi possível verificar sua sessão
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => window.location.reload()}>
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <EnhancedErrorBoundary level="page">
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
          <div className="container mx-auto px-6 py-8 space-y-8 animate-fade-in">
            {/* Enhanced Header with Status */}
            <DashboardHeader
              connected={connected}
              lastEventAt={lastEventAt}
              isLoading={isMainLoading}
              onRefresh={handleRefresh}
            />

            {/* Status Bar */}
            {hasErrors && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="flex items-center gap-3 py-4">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive">Alguns dados podem estar desatualizados</p>
                    <p className="text-sm text-muted-foreground">
                      Problemas de conectividade detectados. Tentando reconectar...
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    Tentar Novamente
                  </Button>
                </CardContent>
              </Card>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
              <TabsList className="grid w-full grid-cols-6 glass-card border-0 p-2 h-auto">
                <TabsTrigger 
                  value="overview" 
                  className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="production" 
                  className="rounded-lg font-semibold flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span className="hidden sm:inline">Produção</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="plants" 
                  className="rounded-lg font-semibold flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Plantas</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="sync" 
                  className="rounded-lg font-semibold flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Sync</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="mapping" 
                  className="rounded-lg font-semibold flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Map</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="health" 
                  className="rounded-lg font-semibold flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden sm:inline">Saúde</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <EnhancedErrorBoundary level="component">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-display font-bold">Visão Geral do Sistema</h2>
                      <p className="text-muted-foreground mt-1">
                        Resumo executivo das principais métricas e indicadores
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Período:</span>
                      <Button
                        variant={selectedPeriod === 'today' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedPeriod('today')}
                      >
                        Hoje
                      </Button>
                      <Button
                        variant={selectedPeriod === 'week' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedPeriod('week')}
                      >
                        Semana
                      </Button>
                      <Button
                        variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedPeriod('month')}
                      >
                        Mês
                      </Button>
                    </div>
                  </div>
                  <DashboardOverview
                    metrics={metrics}
                    metricsLoading={metricsLoading}
                    selectedPeriod={selectedPeriod}
                    alertsCount={criticalAlertsCount}
                    plants={plants}
                    alerts={alerts}
                  />
                </EnhancedErrorBoundary>
              </TabsContent>

              <TabsContent value="production" className="space-y-6">
                <EnhancedErrorBoundary level="component">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-display font-bold">Monitoramento de Produção</h2>
                      <p className="text-muted-foreground mt-1">
                        {activePlantsCount} plantas ativas gerando energia
                      </p>
                    </div>
                    <PeriodSelector period={chartPeriod} onPeriodChange={setChartPeriod} />
                  </div>
                  
                  {plants.length === 0 ? (
                    <Card>
                      <CardContent className="flex items-center justify-center py-12">
                        <div className="text-center space-y-3">
                          <Zap className="w-12 h-12 mx-auto text-muted-foreground" />
                          <p className="text-lg font-medium">Nenhuma planta cadastrada</p>
                          <p className="text-muted-foreground">
                            Configure suas plantas para começar o monitoramento
                          </p>
                          <Button 
                            onClick={() => setActiveTab('plants')}
                            className="mt-4"
                          >
                            Configurar Plantas
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-6">
                      {plants.map(plant => (
                        <Card key={plant.id} className="hover-lift">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="font-display flex items-center gap-3">
                                  {plant.name}
                                  <Badge 
                                    variant={plant.status === 'active' ? 'default' : plant.status === 'maintenance' ? 'secondary' : 'destructive'}
                                    className="capitalize"
                                  >
                                    {plant.status}
                                  </Badge>
                                </CardTitle>
                                <CardDescription>
                                  Sistema: {plant.monitoring_system} | Capacidade: {plant.capacity_kwp} kWp
                                </CardDescription>
                              </div>
                              {plant.last_sync && (
                                <div className="text-right text-sm text-muted-foreground">
                                  Última sincronização:<br />
                                  {new Date(plant.last_sync).toLocaleString('pt-BR')}
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <EnergyChart 
                              period={chartPeriod === 'DAY' ? 'today' : chartPeriod === 'MONTH' ? 'month' : 'week'} 
                              plantId={plant.id} 
                              height={240} 
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </EnhancedErrorBoundary>
              </TabsContent>

              <TabsContent value="plants" className="space-y-6">
                <EnhancedErrorBoundary level="component">
                  <div className="mb-6">
                    <h2 className="text-2xl font-display font-bold">Monitoramento das Plantas</h2>
                    <p className="text-muted-foreground mt-1">
                      Visualização detalhada do status e desempenho de cada planta
                    </p>
                  </div>
                  
                  {plants.length === 0 ? (
                    <Card>
                      <CardContent className="flex items-center justify-center py-12">
                        <div className="text-center space-y-3">
                          <Settings className="w-12 h-12 mx-auto text-muted-foreground" />
                          <p className="text-lg font-medium">Nenhuma planta encontrada</p>
                          <p className="text-muted-foreground">
                            Adicione plantas para começar o monitoramento detalhado
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-6">
                      {solarEdgePlants.map(plant => (
                        <SolarEdgeDigitalTwin key={plant.id} plant={plant} />
                      ))}
                      
                      {otherPlants.map(plant => (
                        <SimplifiedDigitalTwin 
                          key={plant.id} 
                          plant={plant} 
                          equipmentData={[]} 
                        />
                      ))}
                    </div>
                  )}
                </EnhancedErrorBoundary>
              </TabsContent>

              <TabsContent value="sync" className="space-y-6">
                <EnhancedErrorBoundary level="component">
                  <div className="mb-6">
                    <h2 className="text-2xl font-display font-bold">Sincronização de Dados</h2>
                    <p className="text-muted-foreground mt-1">
                      Gerencie a sincronização automática com os sistemas de monitoramento
                    </p>
                  </div>
                  <PlantSyncManager plants={plants} onRefresh={refetchPlants} />
                </EnhancedErrorBoundary>
              </TabsContent>

              <TabsContent value="mapping" className="space-y-6">
                <EnhancedErrorBoundary level="component">
                  <div className="mb-6">
                    <h2 className="text-2xl font-display font-bold">Mapeamento de Faturas</h2>
                    <p className="text-muted-foreground mt-1">
                      Configure o mapeamento entre plantas e unidades consumidoras
                    </p>
                  </div>
                  <InvoicePlantMapping />
                </EnhancedErrorBoundary>
              </TabsContent>

              <TabsContent value="health" className="space-y-6">
                <EnhancedErrorBoundary level="component">
                  <div className="mb-6">
                    <h2 className="text-2xl font-display font-bold">Saúde do Sistema</h2>
                    <p className="text-muted-foreground mt-1">
                      Monitoramento avançado da integridade e performance do sistema
                    </p>
                  </div>
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