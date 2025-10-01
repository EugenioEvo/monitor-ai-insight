import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Clock,
  Target,
  Activity,
  Database,
  Wifi
} from 'lucide-react';
import type { SystemDataHealth, DataQualityScore } from '@/types/data-quality';

interface DataHealthDashboardProps {
  healthData: SystemDataHealth;
}

export const DataHealthDashboard = ({ healthData }: DataHealthDashboardProps) => {
  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const renderSourceCard = (source: DataQualityScore) => (
    <Card key={source.source_id} className="relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <CardTitle className="text-base">{source.source_name}</CardTitle>
          </div>
          <Badge variant={source.overall_score >= 90 ? "default" : source.overall_score >= 70 ? "secondary" : "destructive"}>
            {source.overall_score.toFixed(0)}%
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {source.source_type} • Última atualização: {new Date(source.timestamp).toLocaleString('pt-BR')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Completeness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Target className="w-3 h-3" />
              Completude
            </span>
            <span className={getScoreColor(source.metrics.completeness.score)}>
              {source.metrics.completeness.score.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={source.metrics.completeness.score} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            {source.metrics.completeness.actual_points} / {source.metrics.completeness.expected_points} pontos
            {source.metrics.completeness.gaps.length > 0 && ` • ${source.metrics.completeness.gaps.length} gaps`}
          </p>
        </div>

        {/* Timeliness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Pontualidade
            </span>
            <span className={getScoreColor(source.metrics.timeliness.score)}>
              {source.metrics.timeliness.score.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={source.metrics.timeliness.score} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            Latência média: {source.metrics.timeliness.average_latency_seconds.toFixed(0)}s
            {source.metrics.timeliness.is_live && <Wifi className="w-3 h-3 inline ml-2 text-green-500" />}
          </p>
        </div>

        {/* Accuracy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Activity className="w-3 h-3" />
              Acurácia
            </span>
            <span className={getScoreColor(source.metrics.accuracy.score)}>
              {source.metrics.accuracy.score.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={source.metrics.accuracy.score} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            {source.metrics.accuracy.outliers_count} outliers detectados
          </p>
        </div>

        {/* Consistency */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3" />
              Consistência
            </span>
            <span className={getScoreColor(source.metrics.consistency.score)}>
              {source.metrics.consistency.score.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={source.metrics.consistency.score} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            {source.metrics.consistency.cross_source_issues.length} conflitos entre fontes
          </p>
        </div>

        {/* Issues */}
        {source.issues.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium mb-2">Problemas Principais:</p>
            <div className="space-y-1">
              {source.issues.slice(0, 2).map((issue, idx) => (
                <div key={idx} className="text-xs flex items-start gap-2">
                  <Badge variant="outline" className="text-xs">
                    {issue.severity}
                  </Badge>
                  <span className="text-muted-foreground">{issue.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Overall Health */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getHealthIcon(healthData.overall_health)}
              <div>
                <CardTitle>Saúde Geral dos Dados</CardTitle>
                <CardDescription>
                  Score: {healthData.overall_score.toFixed(0)}/100 • Última verificação: {new Date(healthData.last_check).toLocaleString('pt-BR')}
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant={
                healthData.overall_health === 'healthy' ? 'default' :
                healthData.overall_health === 'degraded' ? 'secondary' :
                'destructive'
              }
              className="text-lg px-4 py-2"
            >
              {healthData.overall_health.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-green-600">{healthData.summary.healthy_sources}</p>
              <p className="text-xs text-muted-foreground">Fontes Saudáveis</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{healthData.summary.degraded_sources}</p>
              <p className="text-xs text-muted-foreground">Degradadas</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-red-600">{healthData.summary.critical_sources}</p>
              <p className="text-xs text-muted-foreground">Críticas</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold">{healthData.summary.total_sources}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>

          {/* Average Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Completude</p>
              <div className="flex items-center gap-2">
                <Progress value={healthData.summary.avg_completeness} className="h-2" />
                <span className="text-sm font-semibold">{healthData.summary.avg_completeness.toFixed(0)}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Pontualidade</p>
              <div className="flex items-center gap-2">
                <Progress value={healthData.summary.avg_timeliness} className="h-2" />
                <span className="text-sm font-semibold">{healthData.summary.avg_timeliness.toFixed(0)}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Acurácia</p>
              <div className="flex items-center gap-2">
                <Progress value={healthData.summary.avg_accuracy} className="h-2" />
                <span className="text-sm font-semibold">{healthData.summary.avg_accuracy.toFixed(0)}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Consistência</p>
              <div className="flex items-center gap-2">
                <Progress value={healthData.summary.avg_consistency} className="h-2" />
                <span className="text-sm font-semibold">{healthData.summary.avg_consistency.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Critical Issues */}
          {healthData.critical_issues.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">{healthData.critical_issues.length} Problemas Críticos Detectados:</p>
                <ul className="list-disc list-inside space-y-1">
                  {healthData.critical_issues.slice(0, 3).map((issue, idx) => (
                    <li key={idx} className="text-sm">{issue.title}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Recommendations */}
          {healthData.recommendations.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-semibold text-sm mb-2 text-blue-900">Recomendações:</p>
              <ul className="space-y-1">
                {healthData.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                    <span>•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Sources */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Fontes de Dados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthData.sources.map(renderSourceCard)}
        </div>
      </div>
    </div>
  );
};
