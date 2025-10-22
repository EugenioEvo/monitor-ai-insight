import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, Clock, Eye } from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const severityConfig = {
  low: {
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: AlertTriangle,
    label: "Baixa",
  },
  medium: {
    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    icon: AlertTriangle,
    label: "Média",
  },
  high: {
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    icon: AlertTriangle,
    label: "Alta",
  },
  critical: {
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    icon: AlertTriangle,
    label: "Crítica",
  },
};

const statusConfig = {
  open: { label: "Aberto", variant: "destructive" as const },
  acknowledged: { label: "Reconhecido", variant: "secondary" as const },
  resolved: { label: "Resolvido", variant: "default" as const },
};

export function AlertsListView() {
  const { data: alerts, isLoading } = useAlerts();

  if (isLoading) {
    return <div>Carregando alertas...</div>;
  }

  const groupedAlerts = alerts?.reduce((acc: any, alert: any) => {
    const severity = alert.severity || "low";
    if (!acc[severity]) acc[severity] = [];
    acc[severity].push(alert);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupedAlerts || {}).map(([severity, severityAlerts]: [string, any]) => {
        const config = severityConfig[severity as keyof typeof severityConfig];
        const SeverityIcon = config.icon;

        return (
          <div key={severity}>
            <div className="flex items-center gap-2 mb-3">
              <SeverityIcon className={cn("h-5 w-5", config.color.split(" ")[1])} />
              <h3 className="text-lg font-semibold">
                {config.label} ({severityAlerts.length})
              </h3>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {severityAlerts.map((alert: any) => (
                  <Card
                    key={alert.id}
                    className={cn(
                      "border-l-4 hover:shadow-md transition-shadow",
                      config.color
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{alert.message}</h4>
                            <Badge variant={statusConfig[alert.status as keyof typeof statusConfig]?.variant}>
                              {statusConfig[alert.status as keyof typeof statusConfig]?.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{alert.type}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(alert.timestamp), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {alert.status === "open" && (
                            <>
                              <Button variant="outline" size="sm">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Reconhecer
                              </Button>
                              <Button variant="outline" size="sm">
                                Criar Ticket
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
