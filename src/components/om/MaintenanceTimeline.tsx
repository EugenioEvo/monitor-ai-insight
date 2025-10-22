import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  Brain,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTickets } from "@/hooks/useTickets";
import { useAlerts } from "@/hooks/useAlerts";

interface TimelineEvent {
  id: string;
  type: "ticket" | "alert" | "maintenance" | "prediction";
  title: string;
  description: string;
  timestamp: Date;
  severity?: string;
  status?: string;
}

const eventIcons = {
  ticket: Wrench,
  alert: AlertTriangle,
  maintenance: CheckCircle2,
  prediction: Brain,
};

const eventColors = {
  ticket: "text-blue-500",
  alert: "text-red-500",
  maintenance: "text-green-500",
  prediction: "text-purple-500",
};

export function MaintenanceTimeline() {
  const { data: tickets } = useTickets();
  const { data: alerts } = useAlerts();

  const events: TimelineEvent[] = [
    ...(tickets?.slice(0, 5).map((ticket: any) => ({
      id: ticket.id,
      type: "ticket" as const,
      title: ticket.title || "Ticket criado",
      description: ticket.description,
      timestamp: new Date(ticket.opened_at),
      status: ticket.status,
    })) || []),
    ...(alerts?.slice(0, 5).map((alert: any) => ({
      id: alert.id,
      type: "alert" as const,
      title: alert.message,
      description: alert.type,
      timestamp: new Date(alert.timestamp),
      severity: alert.severity,
    })) || []),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Atividades Recentes</h3>
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Últimas 24h
          </Badge>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {events.map((event, index) => {
              const Icon = eventIcons[event.type];
              const isLast = index === events.length - 1;

              return (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center h-8 w-8 rounded-full bg-background border-2 ${eventColors[event.type]}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {!isLast && (
                      <div className="w-px h-full bg-border mt-2" />
                    )}
                  </div>

                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatDistanceToNow(event.timestamp, {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {event.severity && (
                        <Badge variant="outline" className="text-xs">
                          {event.severity}
                        </Badge>
                      )}
                      {event.status && (
                        <Badge variant="outline" className="text-xs">
                          {event.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
