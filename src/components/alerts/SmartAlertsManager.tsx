import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Clock, Play, RefreshCw, Bell, BellOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSmartAlerts, useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';

interface SmartAlert {
  id: string;
  alert_type: string;
  plant_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  conditions: any;
  triggered_at: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

export const SmartAlertsManager: React.FC = () => {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { runSmartAlertsAnalysis } = useAdvancedAnalytics();
  const { data: smartAlerts, refetch: refetchAlerts } = useSmartAlerts();

  useEffect(() => {
    fetchSmartAlerts();
  }, []);

  // Buscar alertas inteligentes
  const fetchSmartAlerts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('smart-alerts', {
        body: { action: 'get_alerts', limit: 20 }
      });
      
      if (error) throw error;
      setAlerts(data?.alerts || []);
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os alertas inteligentes.",
        variant: "destructive",
      });
    }
  };

  // Executar análise de alertas inteligentes
  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await runSmartAlertsAnalysis();
      await fetchSmartAlerts();
      refetchAlerts();
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Marcar alerta como reconhecido
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase.functions.invoke('smart-alerts', {
        body: { 
          action: 'update_alert',
          alert_id: alertId,
          status: 'acknowledged'
        }
      });

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Alerta marcado como reconhecido.",
      });
      
      fetchSmartAlerts();
    } catch (error) {
      console.error('Erro ao reconhecer alerta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reconhecer o alerta.",
        variant: "destructive",
      });
    }
  };

  // Resolver alerta
  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase.functions.invoke('smart-alerts', {
        body: { 
          action: 'update_alert',
          alert_id: alertId,
          status: 'resolved'
        }
      });

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Alerta marcado como resolvido.",
      });
      
      fetchSmartAlerts();
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível resolver o alerta.",
        variant: "destructive",
      });
    }
  };

  // Filtrar alertas por status
  const activeAlerts = alerts.filter(alert => alert.status === 'active');
  const acknowledgedAlerts = alerts.filter(alert => alert.status === 'acknowledged');
  const resolvedAlerts = alerts.filter(alert => alert.status === 'resolved');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'acknowledged':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Alertas Inteligentes</h2>
          <p className="text-muted-foreground">
            Sistema inteligente de monitoramento e alertas baseado em ML
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSmartAlerts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={runAnalysis} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isAnalyzing ? 'Analisando...' : 'Executar Análise'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Ativos</CardTitle>
            <Bell className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{activeAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reconhecidos</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{acknowledgedAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Concluídos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Resolução</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.length > 0 
                ? `${Math.round((resolvedAlerts.length / alerts.length) * 100)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Alertas resolvidos
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Ativos ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="acknowledged">
            Reconhecidos ({acknowledgedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolvidos ({resolvedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Todos ({alerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas Ativos</CardTitle>
              <CardDescription>
                Alertas que requerem atenção imediata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeAlerts.map((alert) => (
                  <Alert key={alert.id} className={`border ${getSeverityColor(alert.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              {alert.alert_type}
                            </Badge>
                          </div>
                          <AlertDescription className="text-sm">
                            {alert.message}
                          </AlertDescription>
                          <p className="text-xs text-muted-foreground mt-2">
                            Planta: {alert.plant_id.substring(0, 8)} • 
                            {new Date(alert.triggered_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Reconhecer
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => resolveAlert(alert.id)}
                        >
                          Resolver
                        </Button>
                      </div>
                    </div>
                  </Alert>
                ))}
                {activeAlerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum alerta ativo no momento.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acknowledged" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas Reconhecidos</CardTitle>
              <CardDescription>
                Alertas que foram reconhecidos e estão sendo tratados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {acknowledgedAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(alert.status)}
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {alert.alert_type}
                          </Badge>
                        </div>
                        <p className="text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Planta: {alert.plant_id.substring(0, 8)} • 
                          {new Date(alert.triggered_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolver
                    </Button>
                  </div>
                ))}
                {acknowledgedAlerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum alerta reconhecido.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas Resolvidos</CardTitle>
              <CardDescription>
                Histórico de alertas que foram resolvidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resolvedAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center space-x-3 p-4 border rounded-lg opacity-75">
                    {getStatusIcon(alert.status)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="secondary">
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {alert.alert_type}
                        </Badge>
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Planta: {alert.plant_id.substring(0, 8)} • 
                        {new Date(alert.triggered_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
                {resolvedAlerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum alerta resolvido.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Alertas</CardTitle>
              <CardDescription>
                Visão geral de todos os alertas do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center space-x-3 p-4 border rounded-lg">
                    {getStatusIcon(alert.status)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {alert.alert_type}
                        </Badge>
                        <Badge variant="secondary">
                          {alert.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Planta: {alert.plant_id.substring(0, 8)} • 
                        {new Date(alert.triggered_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum alerta encontrado. Execute uma análise para gerar alertas.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};