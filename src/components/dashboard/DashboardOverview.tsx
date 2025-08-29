import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { MetricsGrid } from "./MetricsGrid";
import { EnergyChart } from "./EnergyChart";
import { AlertsList } from "./AlertsList";
import { DashboardStats } from "./DashboardStats";
import type { MetricsSummary } from "@/hooks/useMetrics";

interface DashboardOverviewProps {
  metrics?: MetricsSummary;
  metricsLoading: boolean;
  selectedPeriod: 'today' | 'week' | 'month';
  alertsCount?: number;
  plants?: any[];
  alerts?: any[];
}

export function DashboardOverview({ 
  metrics, 
  metricsLoading, 
  selectedPeriod, 
  alertsCount,
  plants = [],
  alerts = []
}: DashboardOverviewProps) {
  const getPeriodLabel = (period: 'today' | 'week' | 'month') => {
    switch (period) {
      case 'today': return 'Hoje';
      case 'week': return 'Última Semana';
      case 'month': return 'Este Mês';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Quick Stats */}
      <DashboardStats
        plants={plants}
        alerts={alerts}
        isLoading={metricsLoading}
      />

      {/* Metrics Cards */}
      <MetricsGrid
        metrics={metrics}
        isLoading={metricsLoading}
        selectedPeriod={selectedPeriod}
        alertsCount={alertsCount}
      />

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
    </div>
  );
}