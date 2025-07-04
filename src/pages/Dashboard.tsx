
import React, { useState } from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { EnergyChart } from '@/components/dashboard/EnergyChart';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMetrics } from '@/hooks/useMetrics';
import { useAlerts } from '@/hooks/useAlerts';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Solar</h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real das suas usinas
          </p>
        </div>
        <div className="flex items-center gap-4">
          <PeriodSelector 
            period={chartPeriod} 
            onPeriodChange={setChartPeriod}
          />
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
      </div>

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
        {/* Energy Chart */}
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

        {/* Alerts List */}
        <div>
          <AlertsList />
        </div>
      </div>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plants Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Battery className="w-5 h-5 text-green-500" />
              Status das Plantas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg border">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium">Plantas Ativas</p>
                    <p className="text-sm text-muted-foreground">
                      {metrics?.activePlants || 0} usinas operacionais
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-600 font-semibold">
                      {metrics?.activePlants || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Online</p>
                  </div>
                </div>
                
                {(metrics?.openTickets || 0) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium">Manutenção Pendente</p>
                      <p className="text-sm text-muted-foreground">
                        Tickets aguardando ação
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-600 font-semibold">
                        {metrics?.openTickets}
                      </p>
                      <p className="text-xs text-muted-foreground">Abertos</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Saúde do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Conectividade</span>
                <span className="text-green-600 font-medium">✓ Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Sincronização</span>
                <span className="text-green-600 font-medium">✓ Atualizado</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Alertas Críticos</span>
                <span className={`font-medium ${(alerts?.filter(a => a.severity === 'critical').length || 0) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(alerts?.filter(a => a.severity === 'critical').length || 0) === 0 ? '✓ Nenhum' : `⚠ ${alerts?.filter(a => a.severity === 'critical').length}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Performance Geral</span>
                <span className="text-green-600 font-medium">✓ Normal</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
