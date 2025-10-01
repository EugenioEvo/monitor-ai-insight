import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Anomaly } from '@/types/anomaly';
import { cn } from '@/lib/utils';

interface AnomalyCardProps {
  anomaly: Anomaly;
  onSelect: () => void;
  isSelected: boolean;
}

export function AnomalyCard({ anomaly, onSelect, isSelected }: AnomalyCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'high':
        return <AlertCircle className="h-4 w-4" />;
      case 'medium':
        return <TrendingDown className="h-4 w-4" />;
      case 'low':
        return <Activity className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getAnomalyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      generation_drop: 'Queda de Geração',
      efficiency_drop: 'Queda de Eficiência',
      offline: 'Sistema Offline',
      underperformance: 'Baixa Performance',
      data_gap: 'Falha de Dados',
      unexpected_spike: 'Pico Anormal',
      overperformance: 'Performance Acima do Esperado',
    };
    return labels[type] || type;
  };

  const getDetectorLabel = (detector: string) => {
    const labels: Record<string, string> = {
      statistical: 'Estatístico',
      ml_isolation_forest: 'ML - Isolation Forest',
      ml_autoencoder: 'ML - Autoencoder',
      digital_twin: 'Digital Twin',
    };
    return labels[detector] || detector;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Zap className="h-4 w-4 text-primary" />;
      case 'investigating':
        return <Clock className="h-4 w-4 text-primary" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'false_positive':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg',
        isSelected && 'ring-2 ring-primary',
        anomaly.severity === 'critical' && 'border-destructive'
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getSeverityIcon(anomaly.severity)}
            <CardTitle className="text-lg">{getAnomalyTypeLabel(anomaly.anomaly_type)}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getSeverityColor(anomaly.severity)}>
              {anomaly.severity.toUpperCase()}
            </Badge>
            {getStatusIcon(anomaly.status)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Timestamp */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {format(new Date(anomaly.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>

        {/* Métrica afetada e detector */}
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Métrica: </span>
            <span className="font-medium">{anomaly.metric_affected.toUpperCase()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Detector: </span>
            <span className="font-medium">{getDetectorLabel(anomaly.detected_by)}</span>
          </div>
        </div>

        {/* Valores esperado vs real */}
        {anomaly.expected_value !== undefined && anomaly.actual_value !== undefined && (
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
            <div>
              <div className="text-muted-foreground">Esperado</div>
              <div className="font-semibold">{anomaly.expected_value.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Real</div>
              <div className="font-semibold">{anomaly.actual_value.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Desvio</div>
              <div
                className={cn(
                  'font-semibold',
                  anomaly.deviation_percent && anomaly.deviation_percent < 0
                    ? 'text-destructive'
                    : 'text-green-500'
                )}
              >
                {anomaly.deviation_percent?.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Confiança */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Confiança da detecção:</span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${anomaly.confidence * 100}%` }}
              />
            </div>
            <span className="font-medium">{(anomaly.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Botão de análise */}
        <Button variant="outline" size="sm" className="w-full" onClick={onSelect}>
          Analisar Causa Raiz
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
