
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockAlerts } from "@/data/mockData";

const severityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800', 
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

const severityIcons = {
  low: Clock,
  medium: AlertTriangle,
  high: AlertTriangle,
  critical: XCircle
};

export function AlertsList() {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          Alertas Recentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockAlerts.slice(0, 5).map((alert) => {
          const Icon = severityIcons[alert.severity];
          return (
            <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
              <Icon className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-gray-900">
                  {alert.message}
                </p>
                <div className="flex items-center gap-2">
                  <Badge className={severityColors[alert.severity]}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-xs">
                Verificar
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
