
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle } from 'lucide-react';

type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertRow {
  id: string;
  plant_id: string;
  timestamp: string;
  severity: Severity;
  message: string;
  type: 'performance' | 'compliance' | 'maintenance' | string;
  acknowledged_by?: string | null;
  status?: 'open' | 'acknowledged' | 'resolved';
}

interface TypeMeta {
  label: string;
  icon: any;
  color: string;
}

interface SeverityMeta {
  color: string;
  icon: any;
  label: string;
}

interface AlertCardProps {
  alert: AlertRow;
  getPlantName: (id: string) => string;
  severityConfig: Record<Severity, SeverityMeta>;
  typeConfig: Record<string, TypeMeta>;
  onAcknowledge: (alertId: string) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  getPlantName,
  severityConfig,
  typeConfig,
  onAcknowledge,
}) => {
  const SeverityIcon = severityConfig[alert.severity]?.icon || Bell;
  const typeMeta = typeConfig[alert.type] || { label: alert.type, icon: Bell, color: 'text-muted-foreground' };

  return (
    <div className={`border rounded-lg p-4 ${alert.status === 'acknowledged' ? 'opacity-80' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <SeverityIcon className="w-5 h-5 mt-0.5 text-muted-foreground" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={severityConfig[alert.severity]?.color} variant="outline">
                {severityConfig[alert.severity]?.label || alert.severity}
              </Badge>
              <div className={`flex items-center gap-1 text-sm ${typeMeta.color}`}>
                <typeMeta.icon className="w-4 h-4" />
                {typeMeta.label}
              </div>
              <span className="text-sm text-muted-foreground">{getPlantName(alert.plant_id)}</span>
              {alert.status && (
                <Badge variant="secondary">{alert.status.toUpperCase()}</Badge>
              )}
            </div>
            <p className="font-medium">{alert.message}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleString('pt-BR')}</span>
              {alert.status !== 'acknowledged' && alert.status !== 'resolved' && (
                <Button variant="outline" size="sm" onClick={() => onAcknowledge(alert.id)}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Reconhecer
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
