import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertCircle,
  Lightbulb,
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle,
  Play,
  Loader2,
} from 'lucide-react';
import { useAnomalies } from '@/hooks/useAnomalies';
import { cn } from '@/lib/utils';

interface RootCauseViewerProps {
  anomalyId: string;
  onClose: () => void;
}

export function RootCauseViewer({ anomalyId, onClose }: RootCauseViewerProps) {
  const { getRootCauseAnalysis, analyzeRootCause, updateAnomalyStatus } = useAnomalies();
  const { data: rca, isLoading } = getRootCauseAnalysis(anomalyId);

  const handleAnalyze = () => {
    analyzeRootCause.mutate(anomalyId);
  };

  const handleResolve = () => {
    updateAnomalyStatus.mutate(
      { anomalyId, status: 'resolved' },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  return (
    <Dialog open={!!anomalyId} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Análise de Causa Raiz (RCA)</DialogTitle>
          <DialogDescription>
            Análise detalhada das causas prováveis e recomendações de ação
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !rca ? (
            <div className="space-y-4">
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Análise não executada</p>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Clique no botão abaixo para iniciar a análise de causa raiz desta anomalia
                  </p>
                  <Button onClick={handleAnalyze} disabled={analyzeRootCause.isPending}>
                    {analyzeRootCause.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Executar Análise RCA
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status da investigação */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Status da Investigação</CardTitle>
                    <Badge
                      variant={
                        rca.investigation_status === 'completed'
                          ? 'default'
                          : rca.investigation_status === 'in_progress'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {rca.investigation_status === 'completed'
                        ? 'Concluída'
                        : rca.investigation_status === 'in_progress'
                        ? 'Em Andamento'
                        : 'Pendente'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {rca.resolution_summary && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Resumo da Resolução:</p>
                      <p className="text-sm text-muted-foreground">{rca.resolution_summary}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Causas Prováveis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Causas Prováveis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rca.probable_causes.map((cause, index) => (
                    <div
                      key={index}
                      className="rounded-lg border p-4 space-y-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">{cause.cause}</h4>
                        <Badge variant="outline">{(cause.confidence * 100).toFixed(0)}% confiança</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{cause.evidence}</p>
                      {cause.estimated_impact_kwh > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp className="h-4 w-4 text-destructive" />
                          <span className="text-muted-foreground">Impacto estimado:</span>
                          <span className="font-semibold">
                            {cause.estimated_impact_kwh.toFixed(2)} kWh
                          </span>
                        </div>
                      )}
                      {/* Barra de confiança */}
                      <div className="mt-2">
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all',
                              cause.confidence > 0.7
                                ? 'bg-green-500'
                                : cause.confidence > 0.5
                                ? 'bg-primary'
                                : 'bg-muted-foreground'
                            )}
                            style={{ width: `${cause.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Ações Recomendadas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Ações Recomendadas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rca.recommended_actions.map((action, index) => (
                    <div
                      key={index}
                      className="rounded-lg border p-4 space-y-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">{action.action}</h4>
                        <Badge variant={getPriorityColor(action.priority)}>
                          {action.priority.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Tempo estimado:</span>
                          <span className="font-medium">{action.estimated_time_hours}h</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Custo estimado:</span>
                          <span className="font-medium">R$ {action.estimated_cost_brl.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Lessons Learned */}
              {rca.lessons_learned && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Lições Aprendidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{rca.lessons_learned}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="flex items-center justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {rca && (
            <Button onClick={handleResolve} disabled={updateAnomalyStatus.isPending}>
              {updateAnomalyStatus.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resolvendo...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Marcar como Resolvida
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
