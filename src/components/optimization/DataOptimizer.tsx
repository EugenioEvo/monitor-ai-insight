import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  Database, 
  TrendingUp, 
  Archive,
  Gauge,
  Clock,
  HardDrive,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OptimizationStats {
  total_records: number;
  archived_records: number;
  cache_hit_rate: number;
  query_performance: number;
  storage_efficiency: number;
  last_optimization: string;
}

interface OptimizationTask {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  started_at: string;
  completed_at?: string;
  results?: any;
}

export default function DataOptimizer() {
  const [stats, setStats] = useState<OptimizationStats | null>(null);
  const [tasks, setTasks] = useState<OptimizationTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      // Simulate fetching optimization stats
      const mockStats: OptimizationStats = {
        total_records: 125000 + Math.floor(Math.random() * 50000),
        archived_records: 25000 + Math.floor(Math.random() * 10000),
        cache_hit_rate: 85 + Math.random() * 10,
        query_performance: 75 + Math.random() * 20,
        storage_efficiency: 80 + Math.random() * 15,
        last_optimization: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
      };

      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching optimization stats:', error);
      toast({
        title: "Erro ao buscar estatísticas",
        description: "Não foi possível carregar dados de otimização",
        variant: "destructive",
      });
    }
  };

  const fetchTasks = async () => {
    try {
      // Simulate fetching optimization tasks
      const mockTasks: OptimizationTask[] = [
        {
          id: '1',
          type: 'data_compression',
          status: 'completed',
          progress: 100,
          started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          results: { compressed_mb: 245, savings_percent: 35 }
        },
        {
          id: '2',
          type: 'index_optimization',
          status: 'completed',
          progress: 100,
          started_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
          results: { queries_improved: 15, performance_gain: 25 }
        }
      ];

      setTasks(mockTasks);
    } catch (error) {
      console.error('Error fetching optimization tasks:', error);
    }
  };

  const runOptimization = async (type: string) => {
    setIsOptimizing(true);
    try {
      // Simulate optimization process
      const taskId = crypto.randomUUID();
      const newTask: OptimizationTask = {
        id: taskId,
        type,
        status: 'running',
        progress: 0,
        started_at: new Date().toISOString()
      };

      setTasks(prev => [newTask, ...prev]);

      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setTasks(prev => prev.map(task => 
          task.id === taskId 
            ? { ...task, progress: i }
            : task
        ));
      }

      // Complete task
      const completedTask: OptimizationTask = {
        ...newTask,
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        results: {
          records_processed: Math.floor(Math.random() * 10000),
          performance_improvement: Math.floor(Math.random() * 30) + 10
        }
      };

      setTasks(prev => prev.map(task => 
        task.id === taskId ? completedTask : task
      ));

      toast({
        title: "Otimização concluída",
        description: `${type} executado com sucesso`,
      });

      fetchStats();
    } catch (error) {
      console.error('Error running optimization:', error);
      toast({
        title: "Erro na otimização",
        description: "Não foi possível executar a otimização",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchStats(), fetchTasks()]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'running': return 'secondary';
      case 'failed': return 'destructive';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'running': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPerformanceColor = (value: number) => {
    if (value >= 90) return "text-green-600";
    if (value >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando dados de otimização...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Otimizador de Dados</h2>
          <p className="text-muted-foreground">
            Monitore e otimize a performance do banco de dados
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => runOptimization('full_optimization')}
            disabled={isOptimizing}
          >
            <Zap className="h-4 w-4 mr-2" />
            {isOptimizing ? 'Otimizando...' : 'Otimizar Agora'}
          </Button>
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros Totais</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total_records?.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Dados no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Cache</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(stats?.cache_hit_rate || 0)}`}>
              {stats?.cache_hit_rate?.toFixed(1)}%
            </div>
            <Progress value={stats?.cache_hit_rate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Query</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(stats?.query_performance || 0)}`}>
              {stats?.query_performance?.toFixed(1)}%
            </div>
            <Progress value={stats?.query_performance || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiência Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(stats?.storage_efficiency || 0)}`}>
              {stats?.storage_efficiency?.toFixed(1)}%
            </div>
            <Progress value={stats?.storage_efficiency || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dados Arquivados</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.archived_records?.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Registros arquivados
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="optimization" className="space-y-4">
        <TabsList>
          <TabsTrigger value="optimization">Otimizações</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
        </TabsList>

        <TabsContent value="optimization" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Compressão de Dados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Comprime dados antigos para reduzir uso de armazenamento
                </p>
                <Button 
                  onClick={() => runOptimization('data_compression')}
                  disabled={isOptimizing}
                  className="w-full"
                >
                  Executar Compressão
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Otimização de Índices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Reconstrói índices para melhorar performance de queries
                </p>
                <Button 
                  onClick={() => runOptimization('index_optimization')}
                  disabled={isOptimizing}
                  className="w-full"
                >
                  Otimizar Índices
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Archive className="h-5 w-5 mr-2" />
                  Arquivamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Move dados antigos para storage de arquivamento
                </p>
                <Button 
                  onClick={() => runOptimization('data_archiving')}
                  disabled={isOptimizing}
                  className="w-full"
                >
                  Arquivar Dados
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma tarefa executada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusColor(task.status)}>
                            {getStatusIcon(task.status)}
                            <span className="ml-1">{task.status}</span>
                          </Badge>
                          <span className="font-medium">{task.type.replace('_', ' ')}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(task.started_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      
                      {task.status === 'running' && (
                        <Progress value={task.progress} className="mb-2" />
                      )}
                      
                      {task.results && (
                        <div className="text-sm text-muted-foreground">
                          Resultados: {JSON.stringify(task.results)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Informações */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertTitle>Otimização Automática</AlertTitle>
        <AlertDescription>
          Última otimização: {stats?.last_optimization ? new Date(stats.last_optimization).toLocaleString('pt-BR') : 'Nunca'}.
          Otimizações automáticas são executadas diariamente às 3:00 AM.
        </AlertDescription>
      </Alert>
    </div>
  );
}