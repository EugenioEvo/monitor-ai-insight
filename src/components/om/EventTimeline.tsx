import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Ticket, AlertTriangle, Activity, TrendingUp } from "lucide-react";
import { useOMEvents } from "@/hooks/useOMMetrics";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function EventTimeline() {
  const { data: events, isLoading } = useOMEvents();

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ticket': return <Ticket className="w-4 h-4" />;
      case 'alert': return <AlertTriangle className="w-4 h-4" />;
      case 'anomaly': return <TrendingUp className="w-4 h-4" />;
      case 'maintenance': return <Activity className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-info text-info-foreground';
      case 'low': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ticket': return 'text-info';
      case 'alert': return 'text-warning';
      case 'anomaly': return 'text-destructive';
      case 'maintenance': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return { label: 'Aberto', variant: 'destructive' as const };
      case 'in_progress': return { label: 'Em andamento', variant: 'default' as const };
      case 'resolved': return { label: 'Resolvido', variant: 'secondary' as const };
      case 'closed': return { label: 'Fechado', variant: 'outline' as const };
      default: return { label: status, variant: 'secondary' as const };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Timeline de Eventos
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-info to-info/80 rounded-xl flex items-center justify-center shadow-lg">
            <Clock className="w-5 h-5 text-info-foreground" />
          </div>
          <div>
            <CardTitle className="text-xl">Timeline de Eventos</CardTitle>
            <CardDescription>Atividades recentes do sistema</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-4">
              {events?.map((event, index) => {
                const statusBadge = getStatusBadge(event.status);
                return (
                  <div key={event.id} className="relative pl-12">
                    {/* Timeline dot */}
                    <div className={`absolute left-0 w-10 h-10 rounded-xl bg-card border-2 flex items-center justify-center shadow-sm ${getTypeColor(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>

                    {/* Event card */}
                    <Card className="hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm leading-tight">{event.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                            </div>
                            <Badge className={getSeverityColor(event.severity)}>
                              {event.severity}
                            </Badge>
                          </div>

                          {/* Details */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant={statusBadge.variant} className="text-xs">
                              {statusBadge.label}
                            </Badge>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{event.plant_name}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              {format(new Date(event.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}

              {(!events || events.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Nenhum evento recente</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
