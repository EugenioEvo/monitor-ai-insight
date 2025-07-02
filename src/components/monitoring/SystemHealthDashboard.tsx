import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMonitoringStore } from '@/stores/monitoringStore';
import { usePlants, useSyncStatuses } from '@/stores/appStore';
import { AlertTriangle, CheckCircle, Clock, Activity, Zap, Database, Wifi } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const SystemHealthDashboard = () => {
  const { healthChecks, alerts, metrics, systemHealth } = useMonitoringStore();
  const plants = usePlants();
  const syncStatuses = useSyncStatuses();
  
  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  const recentMetrics = metrics.slice(-20);
  
  // Calculate sync health
  const activePlants = plants.filter(p => p.sync_enabled);
  const syncingPlants = Object.values(syncStatuses).filter(s => s.status === 'syncing').length;
  const errorPlants = Object.values(syncStatuses).filter(s => s.status === 'error').length;
  
  const HealthStatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'down': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <HealthStatusIcon status={systemHealth} />
              <div>
                <p className="text-2xl font-bold">{systemHealth}</p>
                <p className="text-xs text-muted-foreground">Status Geral</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{activePlants.length}</p>
                <p className="text-xs text-muted-foreground">Plantas Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{syncingPlants}</p>
                <p className="text-xs text-muted-foreground">Sincronizando</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{unacknowledgedAlerts.length}</p>
                <p className="text-xs text-muted-foreground">Alertas Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Health Checks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Saúde dos Serviços
            </CardTitle>
            <CardDescription>Status dos componentes do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.values(healthChecks).map((check) => (
                <div key={check.service} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HealthStatusIcon status={check.status} />
                    <span className="font-medium">{check.service}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {check.responseTime && (
                      <span className="text-xs text-muted-foreground">
                        {check.responseTime}ms
                      </span>
                    )}
                    <Badge variant={
                      check.status === 'healthy' ? 'default' :
                      check.status === 'degraded' ? 'secondary' : 'destructive'
                    }>
                      {check.status}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {Object.keys(healthChecks).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma verificação de saúde ativa
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas Recentes
            </CardTitle>
            <CardDescription>Últimos eventos do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {alerts.slice(0, 10).map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded border ${
                    alert.acknowledged ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          alert.type === 'error' ? 'destructive' :
                          alert.type === 'warning' ? 'secondary' : 'default'
                        }>
                          {alert.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.timestamp), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                      <p className="font-medium mt-1">{alert.message}</p>
                      {alert.details && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.details}
                        </p>
                      )}
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => useMonitoringStore.getState().acknowledgeAlert(alert.id)}
                      >
                        OK
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {alerts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum alerta recente
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Métricas de Performance
            </CardTitle>
            <CardDescription>Tempos de resposta e performance do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-3">APIs Mais Lentas</h4>
                <div className="space-y-2">
                  {recentMetrics
                    .filter(m => m.category === 'api')
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5)
                    .map((metric, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm">{metric.name.replace('api_', '')}</span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={Math.min((metric.value / 5000) * 100, 100)} 
                            className="w-20 h-2" 
                          />
                          <span className="text-xs text-muted-foreground">
                            {metric.value}ms
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Sincronizações Recentes</h4>
                <div className="space-y-2">
                  {recentMetrics
                    .filter(m => m.category === 'sync')
                    .slice(-5)
                    .map((metric, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm">{metric.name.replace('sync_', 'Planta ')}</span>
                        <span className="text-xs text-muted-foreground">
                          {metric.value}ms
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};