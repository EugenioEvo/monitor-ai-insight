import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  RefreshCw,
  Zap,
  TrendingUp 
} from 'lucide-react';

interface HealthMetrics {
  totalPlants: number;
  activePlants: number;
  recentSyncs: number;
  failedSyncs: number;
  openAlerts: number;
  avgSyncDuration: number;
  lastSyncTime: string | null;
}

interface SyncLog {
  id: string;
  plant_id: string;
  system_type: string;
  status: string;
  message: string | null;
  data_points_synced: number;
  sync_duration_ms: number | null;
  created_at: string;
}

export const SystemHealthDashboard = () => {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadHealthData();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(loadHealthData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadHealthData = async () => {
    try {
      setIsRefreshing(true);
      
      // Carregar métricas principais
      const [plantsData, syncLogsData, alertsData] = await Promise.all([
        supabase.from('plants').select('id, sync_enabled, last_sync'),
        supabase
          .from('sync_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('alerts').select('id, status').eq('status', 'open')
      ]);

      if (plantsData.error) throw plantsData.error;
      if (syncLogsData.error) throw syncLogsData.error;
      if (alertsData.error) throw alertsData.error;

      const plants = plantsData.data || [];
      const syncLogs = syncLogsData.data || [];
      const alerts = alertsData.data || [];

      // Calcular métricas
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentSyncLogs = syncLogs.filter(log => 
        new Date(log.created_at) > last24Hours
      );

      const successfulSyncs = recentSyncLogs.filter(log => log.status === 'success');
      const failedSyncs = recentSyncLogs.filter(log => log.status === 'error');
      
      const avgDuration = successfulSyncs.length > 0 
        ? successfulSyncs.reduce((sum, log) => sum + (log.sync_duration_ms || 0), 0) / successfulSyncs.length
        : 0;

      const lastSync = syncLogs.length > 0 ? syncLogs[0].created_at : null;

      const healthMetrics: HealthMetrics = {
        totalPlants: plants.length,
        activePlants: plants.filter(p => p.sync_enabled).length,
        recentSyncs: recentSyncLogs.length,
        failedSyncs: failedSyncs.length,
        openAlerts: alerts.length,
        avgSyncDuration: avgDuration,
        lastSyncTime: lastSync
      };

      setMetrics(healthMetrics);
      setRecentLogs(syncLogs.slice(0, 10));

    } catch (error: any) {
      console.error('Erro ao carregar dados de saúde:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados de saúde do sistema",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getHealthStatus = (): 'healthy' | 'warning' | 'critical' => {
    if (!metrics) return 'warning';
    
    if (metrics.failedSyncs > 5 || metrics.openAlerts > 10) return 'critical';
    if (metrics.failedSyncs > 2 || metrics.openAlerts > 5 || metrics.activePlants === 0) return 'warning';
    return 'healthy';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  if (isLoading) {
    return <div>Carregando dashboard de saúde...</div>;
  }

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(healthStatus)}
                Saúde do Sistema
              </CardTitle>
              <CardDescription>
                Monitoramento em tempo real do status das sincronizações e alertas
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadHealthData}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold">{metrics?.activePlants || 0}</div>
              <div className="text-sm text-muted-foreground">Plantas Ativas</div>
              <div className="text-xs text-muted-foreground">de {metrics?.totalPlants || 0} total</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold">{metrics?.recentSyncs || 0}</div>
              <div className="text-sm text-muted-foreground">Syncs 24h</div>
              <div className="text-xs text-muted-foreground">{metrics?.failedSyncs || 0} falhas</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold">{metrics?.openAlerts || 0}</div>
              <div className="text-sm text-muted-foreground">Alertas Abertos</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold">
                {metrics?.avgSyncDuration ? `${(metrics.avgSyncDuration / 1000).toFixed(1)}s` : '—'}
              </div>
              <div className="text-sm text-muted-foreground">Tempo Médio</div>
            </div>
          </div>

          <div className="mt-6">
            <Alert className={`border-l-4 ${
              healthStatus === 'healthy' ? 'border-l-green-500 bg-green-50' :
              healthStatus === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
              'border-l-red-500 bg-red-50'
            }`}>
              <div className="flex items-center gap-2">
                {getStatusIcon(healthStatus)}
                <AlertDescription className={getStatusColor(healthStatus)}>
                  {healthStatus === 'healthy' && 'Sistema funcionando normalmente'}
                  {healthStatus === 'warning' && 'Sistema apresenta alguns problemas que requerem atenção'}
                  {healthStatus === 'critical' && 'Sistema apresenta problemas críticos que requerem ação imediata'}
                </AlertDescription>
              </div>
            </Alert>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs Recentes de Sincronização</CardTitle>
          <CardDescription>
            Últimas 10 tentativas de sincronização de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  {log.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.system_type}</Badge>
                      <span className="text-sm font-medium">
                        {log.status === 'success' ? 'Sucesso' : 'Falha'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.message || (log.status === 'success' ? `${log.data_points_synced} pontos sincronizados` : 'Erro na sincronização')}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{new Date(log.created_at).toLocaleString()}</div>
                  {log.sync_duration_ms && (
                    <div>{(log.sync_duration_ms / 1000).toFixed(1)}s</div>
                  )}
                </div>
              </div>
            ))}
            
            {recentLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log de sincronização encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};