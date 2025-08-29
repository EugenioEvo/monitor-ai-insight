import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, AlertTriangle, CheckCircle, TrendingUp, Clock } from "lucide-react";
import { useMemo } from "react";

interface DashboardStatsProps {
  plants: any[];
  alerts: any[];
  isLoading?: boolean;
}

export function DashboardStats({ plants, alerts, isLoading }: DashboardStatsProps) {
  const stats = useMemo(() => {
    const activePlants = plants.filter(p => p.status === 'active').length;
    const totalCapacity = plants.reduce((sum, p) => sum + (p.capacity_kwp || 0), 0);
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const totalAlerts = alerts.length;
    const syncedPlants = plants.filter(p => p.last_sync).length;
    
    return {
      activePlants,
      totalPlants: plants.length,
      totalCapacity,
      criticalAlerts,
      totalAlerts,
      syncedPlants,
      syncPercentage: plants.length > 0 ? Math.round((syncedPlants / plants.length) * 100) : 0
    };
  }, [plants, alerts]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-8 bg-muted rounded mb-1" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="hover-lift transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Plantas Ativas</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{stats.activePlants}</p>
            <p className="text-xs text-muted-foreground">
              de {stats.totalPlants} total
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="hover-lift transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-yellow-500/10 rounded-full flex items-center justify-center">
              <Zap className="w-4 h-4 text-yellow-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Capacidade</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{stats.totalCapacity.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">kWp instalados</p>
          </div>
        </CardContent>
      </Card>

      <Card className="hover-lift transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Alertas</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{stats.totalAlerts}</p>
              {stats.criticalAlerts > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.criticalAlerts} críticos
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.criticalAlerts === 0 ? 'Nenhum crítico' : `${stats.criticalAlerts} requerem atenção`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="hover-lift transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center">
              <Clock className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Sincronização</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{stats.syncPercentage}%</p>
              <Badge 
                variant={stats.syncPercentage >= 80 ? "default" : stats.syncPercentage >= 50 ? "secondary" : "destructive"}
                className="text-xs"
              >
                {stats.syncedPlants}/{stats.totalPlants}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              plantas sincronizadas
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}