import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, 
  Zap, 
  Sun, 
  Battery, 
  AlertTriangle, 
  TrendingUp,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useMetrics } from '@/hooks/useMetrics';
import { useAlerts } from '@/hooks/useAlerts';
import { useAuth } from '@/hooks/useAuth';
import { EnergyChart } from '@/components/dashboard/EnergyChart';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { DashboardGate } from '@/components/dashboard/DashboardGate';
import { useToast } from '@/hooks/use-toast';

type Period = 'today' | 'week' | 'month';

const periodLabels = {
  today: 'Hoje',
  week: 'Última Semana',
  month: 'Este Mês'
};

function DashboardContent() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const { session, loading } = useAuth();
  
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics, error: metricsError } = useMetrics(selectedPeriod, session);
  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts, error: alertsError } = useAlerts('open');

  const handleRefresh = async () => {
    if (!session) {
      toast({
        title: "Erro",
        description: "Sessão não encontrada. Faça login novamente.",
        variant: "destructive"
      });
      return;
    }

    setIsRefreshing(true);
    try {
      const results = await Promise.allSettled([
        refetchMetrics(),
        refetchAlerts()
      ]);
      
      const failures = results.filter(result => result.status === 'rejected');
      
      if (failures.length === 0) {
        toast({
          title: "Dashboard atualizado",
          description: "Dados atualizados com sucesso!"
        });
      } else {
        toast({
          title: "Atualização parcial",
          description: `${failures.length} operação(ões) falharam.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show loading state while session is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if there are critical errors
  if (metricsError || alertsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Erro no Dashboard</h2>
          <p className="text-muted-foreground">
            {metricsError?.message || alertsError?.message || 'Erro desconhecido'}
          </p>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const formatKWh = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)} MWh`;
    }
    return `${value.toFixed(1)} kWh`;
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Dashboard Solar
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Monitoramento inteligente em tempo real
              </p>
            </div>
          </div>
        </div>

        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Period Selector */}
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

            {/* Refresh Button */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Geração Solar"
          value={formatKWh(metrics?.totalGeneration || 0)}
          change={`${periodLabels[selectedPeriod]}`}
          changeType="positive"
          icon={Sun}
          description={`${metrics?.activePlants || 0} plantas ativas`}
        />
        
        <MetricCard
          title="Consumo Total"
          value={formatKWh(metrics?.totalConsumption || 0)}
          change={`${periodLabels[selectedPeriod]}`}
          changeType="positive"
          icon={Battery}
          description="Baseado em faturas processadas"
        />
        
        <MetricCard
          title="Plantas Ativas"
          value={metrics?.activePlants?.toString() || '0'}
          change="Sistema estável"
          changeType="positive"
          icon={Zap}
          description="Monitoramento em tempo real"
        />
        
        <MetricCard
          title="Alertas"
          value={alerts?.length?.toString() || '0'}
          change={alerts?.length === 0 ? "Tudo funcionando" : "Requer atenção"}
          changeType={alerts?.length === 0 ? "positive" : "negative"}
          icon={AlertTriangle}
          description="Alertas ativos no sistema"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Energy Chart */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold">Geração vs Consumo</span>
                  <Badge 
                    variant="secondary" 
                    className="bg-primary/10 text-primary border-primary/20 font-medium"
                  >
                    {periodLabels[selectedPeriod]}
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Comparativo inteligente entre energia gerada e consumida
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <EnergyChart period={selectedPeriod} />
            </CardContent>
          </Card>
        </div>

        {/* Alerts Sidebar */}
        <div className="space-y-6">
          <AlertsList />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <DashboardGate>
      <DashboardContent />
    </DashboardGate>
  );
}