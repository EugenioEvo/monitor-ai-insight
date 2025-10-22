import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Zap, AlertTriangle } from "lucide-react";
import { usePlantOMStatus } from "@/hooks/useOMMetrics";

export function PlantHeatmap() {
  const { data: plants, isLoading } = usePlantOMStatus();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'operational':
        return {
          color: 'bg-success/20 border-success/40',
          badge: 'bg-success text-success-foreground',
          icon: '✅',
          label: 'Operacional'
        };
      case 'warning':
        return {
          color: 'bg-warning/20 border-warning/40',
          badge: 'bg-warning text-warning-foreground',
          icon: '⚠️',
          label: 'Atenção'
        };
      case 'maintenance':
        return {
          color: 'bg-info/20 border-info/40',
          badge: 'bg-info text-info-foreground',
          icon: '🔧',
          label: 'Manutenção'
        };
      case 'critical':
        return {
          color: 'bg-destructive/20 border-destructive/40',
          badge: 'bg-destructive text-destructive-foreground',
          icon: '🚨',
          label: 'Crítico'
        };
      case 'offline':
        return {
          color: 'bg-muted border-muted',
          badge: 'bg-muted text-muted-foreground',
          icon: '🔌',
          label: 'Offline'
        };
      default:
        return {
          color: 'bg-card border-border',
          badge: 'bg-secondary text-secondary-foreground',
          icon: '❓',
          label: 'Desconhecido'
        };
    }
  };

  const statusCount = plants?.reduce((acc, plant) => {
    acc[plant.status] = (acc[plant.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Mapa de Status das Plantas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Status das Plantas</CardTitle>
              <CardDescription>Visão em tempo real do status operacional</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {plants?.length || 0} plantas
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Status Summary */}
        <div className="flex flex-wrap gap-2 mb-6">
          {statusCount && Object.entries(statusCount).map(([status, count]) => {
            const config = getStatusConfig(status);
            return (
              <Badge key={status} className={config.badge}>
                {config.icon} {config.label}: {count}
              </Badge>
            );
          })}
        </div>

        {/* Plants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plants?.map((plant) => {
            const config = getStatusConfig(plant.status);
            return (
              <Card key={plant.plant_id} className={`border-2 ${config.color} hover:shadow-md transition-all cursor-pointer`}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Plant Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="text-2xl">{config.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm leading-tight">{plant.plant_name}</h4>
                          <Badge className={`${config.badge} text-xs mt-1`}>
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Zap className="w-3 h-3" />
                          <span>Disponibilidade</span>
                        </div>
                        <div className="font-semibold text-sm">
                          {plant.availability_percent.toFixed(1)}%
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Tickets Abertos</span>
                        </div>
                        <div className="font-semibold text-sm">
                          {plant.open_tickets}
                        </div>
                      </div>
                    </div>

                    {/* Critical Alerts */}
                    {plant.critical_alerts > 0 && (
                      <div className="flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 rounded-lg px-2 py-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{plant.critical_alerts} alertas críticos</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {(!plants || plants.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Nenhuma planta encontrada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
