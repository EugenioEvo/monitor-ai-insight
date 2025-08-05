import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Wifi,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PerformanceMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_latency: number;
  active_connections: number;
  response_times: {
    api_avg: number;
    database_avg: number;
    edge_functions_avg: number;
  };
}

interface SystemAlert {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export default function RealTimeSystemMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('performance-monitor', {
        body: { action: 'collect_metrics' }
      });

      if (error) throw error;

      setMetrics(data.metrics);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: "Erro ao buscar métricas",
        description: "Não foi possível obter dados de performance",
        variant: "destructive",
      });
    }
  };

  const analyzePerformance = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('performance-monitor', {
        body: { action: 'analyze_performance' }
      });

      if (error) throw error;

      setAlerts(data.analysis.alerts || []);
    } catch (error) {
      console.error('Error analyzing performance:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchMetrics(), analyzePerformance()]);
      setIsLoading(false);
    };

    loadData();

    // Set up real-time updates
    const interval = setInterval(() => {
      fetchMetrics();
      analyzePerformance();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getUsageColor = (usage: number) => {
    if (usage > 90) return "text-red-600";
    if (usage > 75) return "text-yellow-600";
    return "text-green-600";
  };

  const getResponseTimeColor = (time: number) => {
    if (time > 1000) return "text-red-600";
    if (time > 500) return "text-yellow-600";
    return "text-green-600";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando métricas do sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Monitor do Sistema</h2>
          <p className="text-muted-foreground">
            Monitoramento em tempo real da performance do sistema
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {lastUpdate ? `Atualizado ${lastUpdate.toLocaleTimeString()}` : 'Nunca atualizado'}
          </Badge>
          <Button onClick={fetchMetrics} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Alertas do Sistema */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} variant={getSeverityColor(alert.severity) as any}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Alerta de {alert.severity}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Métricas de Performance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(metrics?.cpu_usage || 0)}`}>
              {metrics?.cpu_usage?.toFixed(1)}%
            </div>
            <Progress value={metrics?.cpu_usage || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memória</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(metrics?.memory_usage || 0)}`}>
              {metrics?.memory_usage?.toFixed(1)}%
            </div>
            <Progress value={metrics?.memory_usage || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disco</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(metrics?.disk_usage || 0)}`}>
              {metrics?.disk_usage?.toFixed(1)}%
            </div>
            <Progress value={metrics?.disk_usage || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latência</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getResponseTimeColor(metrics?.network_latency || 0)}`}>
              {metrics?.network_latency?.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.active_connections} conexões ativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tempos de Resposta */}
      <Card>
        <CardHeader>
          <CardTitle>Tempos de Resposta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API</span>
                <span className={`text-sm ${getResponseTimeColor(metrics?.response_times?.api_avg || 0)}`}>
                  {metrics?.response_times?.api_avg?.toFixed(0)}ms
                </span>
              </div>
              <Progress value={Math.min((metrics?.response_times?.api_avg || 0) / 10, 100)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database</span>
                <span className={`text-sm ${getResponseTimeColor(metrics?.response_times?.database_avg || 0)}`}>
                  {metrics?.response_times?.database_avg?.toFixed(0)}ms
                </span>
              </div>
              <Progress value={Math.min((metrics?.response_times?.database_avg || 0) / 5, 100)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Edge Functions</span>
                <span className={`text-sm ${getResponseTimeColor(metrics?.response_times?.edge_functions_avg || 0)}`}>
                  {metrics?.response_times?.edge_functions_avg?.toFixed(0)}ms
                </span>
              </div>
              <Progress value={Math.min((metrics?.response_times?.edge_functions_avg || 0) / 10, 100)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Geral */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            {alerts.length === 0 ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">Sistema operando normalmente</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-600 font-medium">
                  {alerts.length} alerta{alerts.length > 1 ? 's' : ''} ativo{alerts.length > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}