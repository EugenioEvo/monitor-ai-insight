import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, Wrench, AlertTriangle, ChevronRight } from "lucide-react";
import { useUpcomingMaintenance } from "@/hooks/useOMMetrics";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function UpcomingMaintenanceWidget() {
  const { data: maintenances, isLoading } = useUpcomingMaintenance();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-info text-info-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'bg-destructive/10 border-destructive/30 text-destructive';
      case 'in_progress': return 'bg-info/10 border-info/30 text-info';
      case 'completed': return 'bg-success/10 border-success/30 text-success';
      default: return 'bg-card border-border text-foreground';
    }
  };

  const getMaintenanceTypeIcon = (type: string) => {
    switch (type) {
      case 'preventive': return '🛡️';
      case 'corrective': return '🔧';
      case 'predictive': return '🤖';
      default: return '⚙️';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Próximas Manutenções
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
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
            <div className="w-10 h-10 bg-gradient-to-br from-warning to-warning/80 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-5 h-5 text-warning-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Próximas Manutenções</CardTitle>
              <CardDescription>Agendamentos e ações recomendadas</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {maintenances?.length || 0} agendadas
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {maintenances?.map((maintenance) => (
              <Card key={maintenance.id} className={`border ${getStatusColor(maintenance.status)} hover:shadow-md transition-all`}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="text-2xl">{getMaintenanceTypeIcon(maintenance.maintenance_type)}</span>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm leading-tight">{maintenance.plant_name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{maintenance.description}</p>
                        </div>
                      </div>
                      <Badge className={getPriorityColor(maintenance.priority)}>
                        {maintenance.priority}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(maintenance.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {maintenance.estimated_duration_hours}h
                      </div>
                      {maintenance.assigned_to && (
                        <div className="flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          {maintenance.assigned_to}
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    {maintenance.status === 'overdue' && (
                      <div className="flex items-center gap-1 text-xs font-medium text-destructive">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Atrasada - Ação urgente necessária</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1 h-8">
                        Ver Detalhes
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!maintenances || maintenances.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma manutenção agendada</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
