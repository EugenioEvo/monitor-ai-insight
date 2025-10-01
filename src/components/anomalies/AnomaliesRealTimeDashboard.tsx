import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  TrendingDown,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  BarChart3,
  Search,
  Play,
} from 'lucide-react';
import { useAnomalies } from '@/hooks/useAnomalies';
import { AnomalyCard } from './AnomalyCard';
import { RootCauseViewer } from './RootCauseViewer';
import { format } from 'date-fns';

interface AnomaliesRealTimeDashboardProps {
  plantId: string;
}

export function AnomaliesRealTimeDashboard({ plantId }: AnomaliesRealTimeDashboardProps) {
  const {
    detectAnomalies,
    anomalies,
    anomaliesLoading,
    activeAnomalies,
    anomalyStats,
  } = useAnomalies(plantId);

  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);

  const handleDetect = () => {
    detectAnomalies.mutate({ plant_id: plantId, period_hours: 168 }); // 7 dias
  };

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
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'high':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'medium':
        return <TrendingDown className="h-5 w-5 text-primary" />;
      case 'low':
        return <Activity className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Detecção de Anomalias</h2>
          <p className="text-muted-foreground">
            Monitoramento em tempo real com IA e Digital Twin
          </p>
        </div>
        <Button onClick={handleDetect} disabled={detectAnomalies.isPending}>
          {detectAnomalies.isPending ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Detectar Anomalias
            </>
          )}
        </Button>
      </div>

      {/* Cards de métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Anomalias</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{anomalyStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{anomalyStats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">Requerem atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Críticas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {anomalyStats?.critical || 0}
            </div>
            <p className="text-xs text-muted-foreground">Alta prioridade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alta Severidade</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{anomalyStats?.high || 0}</div>
            <p className="text-xs text-muted-foreground">Média prioridade</p>
          </CardContent>
        </Card>
      </div>

      {/* Anomalias ativas em destaque */}
      {activeAnomalies && activeAnomalies.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção Imediata Necessária</AlertTitle>
          <AlertDescription>
            {activeAnomalies.length} anomalia(s) ativa(s) detectada(s). Clique nas cards abaixo
            para investigar.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs de anomalias */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Ativas ({anomalyStats?.active || 0})
          </TabsTrigger>
          <TabsTrigger value="all">Todas ({anomalyStats?.total || 0})</TabsTrigger>
          <TabsTrigger value="resolved">Resolvidas</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <ScrollArea className="h-[600px] pr-4">
            {activeAnomalies && activeAnomalies.length > 0 ? (
              <div className="space-y-3">
                {activeAnomalies.map((anomaly) => (
                  <AnomalyCard
                    key={anomaly.id}
                    anomaly={anomaly}
                    onSelect={() => setSelectedAnomalyId(anomaly.id)}
                    isSelected={selectedAnomalyId === anomaly.id}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Nenhuma anomalia ativa</p>
                  <p className="text-sm text-muted-foreground">
                    Sistema operando normalmente
                  </p>
                </CardContent>
              </Card>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <ScrollArea className="h-[600px] pr-4">
            {anomalies && anomalies.length > 0 ? (
              <div className="space-y-3">
                {anomalies.map((anomaly) => (
                  <AnomalyCard
                    key={anomaly.id}
                    anomaly={anomaly}
                    onSelect={() => setSelectedAnomalyId(anomaly.id)}
                    isSelected={selectedAnomalyId === anomaly.id}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Nenhuma anomalia detectada</p>
                  <p className="text-sm text-muted-foreground">
                    Execute uma detecção para começar
                  </p>
                </CardContent>
              </Card>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          <ScrollArea className="h-[600px] pr-4">
            {anomalies?.filter((a) => a.status === 'resolved').length ? (
              <div className="space-y-3">
                {anomalies
                  .filter((a) => a.status === 'resolved')
                  .map((anomaly) => (
                    <AnomalyCard
                      key={anomaly.id}
                      anomaly={anomaly}
                      onSelect={() => setSelectedAnomalyId(anomaly.id)}
                      isSelected={selectedAnomalyId === anomaly.id}
                    />
                  ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Nenhuma anomalia resolvida</p>
                </CardContent>
              </Card>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Root Cause Analysis Viewer */}
      {selectedAnomalyId && (
        <RootCauseViewer anomalyId={selectedAnomalyId} onClose={() => setSelectedAnomalyId(null)} />
      )}
    </div>
  );
}
