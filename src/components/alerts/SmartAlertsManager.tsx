import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Brain, Activity, TrendingDown, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SmartAlert {
  id: string;
  alert_type: string;
  plant_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  conditions: any;
  triggered_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

interface PlantInfo {
  id: string;
  name: string;
}

export const SmartAlertsManager: React.FC = () => {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [plants, setPlants] = useState<PlantInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar plantas
      const { data: plantsData, error: plantsError } = await supabase
        .from('plants')
        .select('id, name')
        .eq('status', 'active');

      if (plantsError) throw plantsError;
      setPlants(plantsData || []);

      // Buscar alertas inteligentes (usando query manual)
      const { data: alertsData, error: alertsError } = await supabase
        .rpc('exec_sql', { 
          query: 'SELECT * FROM smart_alerts ORDER BY triggered_at DESC LIMIT 100' 
        });

      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);

    } catch (error) {
      console.error('Error fetching smart alerts:', error);
      toast({
        title: "Erro ao carregar alertas",
        description: "Não foi possível carregar os alertas inteligentes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runSmartAnalysis = async () => {
    setAnalysisRunning(true);
    try {
      const { error } = await supabase.functions.invoke('smart-alerts', {
        body: { action: 'analyze_performance' }
      });

      if (error) throw error;

      toast({
        title: "Análise executada",
        description: "Nova análise inteligente foi executada com sucesso.",
      });

      // Recarregar dados
      await fetchData();
    } catch (error) {
      console.error('Error running smart analysis:', error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível executar a análise inteligente.",
        variant: "destructive",
      });
    } finally {
      setAnalysisRunning(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('smart_alerts')
        .update({ 
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Alerta reconhecido",
        description: "O alerta foi marcado como reconhecido.",
      });

      await fetchData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reconhecer o alerta.",
        variant: "destructive",
      });
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('smart_alerts')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Alerta resolvido",
        description: "O alerta foi marcado como resolvido.",
      });

      await fetchData();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: "Erro",
        description: "Não foi possível resolver o alerta.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'no_data': return <XCircle className="h-4 w-4" />;
      case 'low_performance': return <TrendingDown className="h-4 w-4" />;
      case 'abnormal_variation': return <Activity className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertTypeName = (type: string) => {
    switch (type) {
      case 'no_data': return 'Sem Dados';
      case 'low_performance': return 'Baixa Performance';
      case 'abnormal_variation': return 'Variação Anormal';
      default: return type;
    }
  };

  const filterAlerts = (status: string) => {
    return alerts.filter(alert => {
      if (status === 'active') return alert.status === 'active';
      if (status === 'acknowledged') return alert.status === 'acknowledged';
      if (status === 'resolved') return alert.status === 'resolved';
      return true;
    });
  };

  const alertCounts = {
    active: alerts.filter(a => a.status === 'active').length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    critical: alerts.filter(a => a.severity === 'critical').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Alertas Inteligentes</h2>
          <p className="text-muted-foreground">
            Sistema inteligente de detecção e análise de problemas
          </p>
        </div>
        <Button onClick={runSmartAnalysis} disabled={analysisRunning}>
          <Brain className={`mr-2 h-4 w-4 ${analysisRunning ? 'animate-pulse' : ''}`} />
          Executar Análise IA
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Ativos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{alertCounts.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reconhecidos</CardTitle>
            <Clock className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertCounts.acknowledged}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{alertCounts.resolved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Críticos</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{alertCounts.critical}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            Ativos ({alertCounts.active})
          </TabsTrigger>
          <TabsTrigger value="acknowledged">
            Reconhecidos ({alertCounts.acknowledged})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolvidos ({alertCounts.resolved})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>
                Alertas {activeTab === 'active' ? 'Ativos' : 
                         activeTab === 'acknowledged' ? 'Reconhecidos' : 'Resolvidos'}
              </CardTitle>
              <CardDescription>
                Lista de alertas inteligentes detectados automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Planta</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterAlerts(activeTab).map((alert) => {
                    const plant = plants.find(p => p.id === alert.plant_id);
                    return (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getAlertTypeIcon(alert.alert_type)}
                            <span className="font-medium">
                              {getAlertTypeName(alert.alert_type)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {plant?.name || `Planta ${alert.plant_id.slice(0, 8)}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(alert.severity)}>
                            <span className="flex items-center gap-1">
                              {getSeverityIcon(alert.severity)}
                              {alert.severity.toUpperCase()}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="space-y-1">
                            <p className="text-sm">{alert.message}</p>
                            {alert.conditions && (
                              <details className="text-xs text-muted-foreground">
                                <summary className="cursor-pointer">Detalhes</summary>
                                <pre className="mt-1 overflow-auto">
                                  {JSON.stringify(alert.conditions, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(alert.triggered_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {alert.status === 'active' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => acknowledgeAlert(alert.id)}
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  Reconhecer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => resolveAlert(alert.id)}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Resolver
                                </Button>
                              </>
                            )}
                            {alert.status === 'acknowledged' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => resolveAlert(alert.id)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolver
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {filterAlerts(activeTab).length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  {activeTab === 'active' 
                    ? 'Nenhum alerta ativo encontrado. Sistema funcionando normalmente!'
                    : `Nenhum alerta ${activeTab === 'acknowledged' ? 'reconhecido' : 'resolvido'} encontrado.`
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};