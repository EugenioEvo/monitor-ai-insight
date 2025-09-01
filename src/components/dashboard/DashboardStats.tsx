import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ModernMetricCard } from './ModernMetricCard';
import { Sun, Battery, Wrench, AlertTriangle } from 'lucide-react';
import { MetricsSummary } from '@/hooks/useMetrics';

interface DashboardStatsProps {
  metrics: MetricsSummary | undefined;
  isLoading: boolean;
  selectedPeriod: 'today' | 'week' | 'month';
  alertsCount?: number;
}

const getPeriodLabel = (period: 'today' | 'week' | 'month') => {
  switch (period) {
    case 'today': return 'Hoje';
    case 'week': return 'Última Semana';
    case 'month': return 'Este Mês';
  }
};

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

export function DashboardStats({ metrics, isLoading, selectedPeriod, alertsCount = 0 }: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-4" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const criticalAlertsCount = alertsCount || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        description={`${criticalAlertsCount} críticos detectados`}
      />
    </div>
  );
}