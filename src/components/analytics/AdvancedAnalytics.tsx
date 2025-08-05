import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3, Play, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAnalyticsTrends, useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';

interface TrendData {
  id: string;
  plant_id: string;
  metric_type: string;
  period: string;
  trend_data: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    avg_power: number;
    avg_energy: number;
    data_points: number;
  };
  calculated_at: string;
}

export const AdvancedAnalytics: React.FC = () => {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();
  const { runAnalyticsEngine } = useAdvancedAnalytics();
  const { data: analyticsTrends, refetch: refetchTrends } = useAnalyticsTrends();

  useEffect(() => {
    fetchTrends();
  }, []);

  // Buscar dados de tendências via edge function
  const fetchTrends = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('analytics-engine', {
        body: { action: 'get_trends', limit: 10 }
      });
      
      if (error) throw error;
      setTrends(data?.trends || []);
    } catch (error) {
      console.error('Erro ao buscar tendências:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as tendências.",
        variant: "destructive",
      });
    }
  };

  // Executar análise de tendências
  const runAnalysis = async () => {
    setIsRunning(true);
    try {
      await runAnalyticsEngine();
      await fetchTrends();
      refetchTrends();
    } finally {
      setIsRunning(false);
    }
  };

  // Preparar dados para gráficos
  const chartData = trends.map(trend => ({
    plant: `Planta ${trend.plant_id.substring(0, 8)}`,
    percentage: trend.trend_data.percentage,
    avg_power: trend.trend_data.avg_power,
    avg_energy: trend.trend_data.avg_energy,
    direction: trend.trend_data.direction
  }));

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up': return 'bg-green-100 text-green-800';
      case 'down': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Análise Avançada</h2>
          <p className="text-muted-foreground">
            Tendências energéticas e análise preditiva baseada em IA
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTrends}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={runAnalysis} disabled={isRunning}>
            {isRunning ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunning ? 'Analisando...' : 'Executar Análise'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendências Identificadas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trends.length}</div>
            <p className="text-xs text-muted-foreground">
              +{trends.filter(t => t.trend_data.direction === 'up').length} positivas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média de Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trends.length > 0 
                ? `${(trends.reduce((acc, t) => acc + t.trend_data.percentage, 0) / trends.length).toFixed(1)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Variação média mensal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pontos de Dados</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trends.reduce((acc, t) => acc + t.trend_data.data_points, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total analisado
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
          <TabsTrigger value="predictions">Previsões</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendências Recentes</CardTitle>
              <CardDescription>
                Análise das tendências de performance das plantas nos últimos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trends.map((trend) => (
                  <div key={trend.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getTrendIcon(trend.trend_data.direction)}
                      <div>
                        <h4 className="text-sm font-medium">
                          Planta {trend.plant_id.substring(0, 8)}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {trend.metric_type} - {trend.period}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getTrendColor(trend.trend_data.direction)}>
                        {trend.trend_data.direction === 'up' ? '+' : trend.trend_data.direction === 'down' ? '-' : ''}
                        {trend.trend_data.percentage.toFixed(1)}%
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {trend.trend_data.avg_power}W médio
                      </p>
                    </div>
                  </div>
                ))}
                {trends.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma tendência encontrada. Execute uma análise para gerar dados.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Variação de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="plant" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="percentage" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Potência Média</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="plant" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="avg_power" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Previsões de Performance</CardTitle>
              <CardDescription>
                Projeções baseadas nas tendências identificadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trends.slice(0, 5).map((trend) => {
                  const projectedChange = trend.trend_data.percentage * 1.2; // Projeção simples
                  return (
                    <div key={trend.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">
                          Planta {trend.plant_id.substring(0, 8)}
                        </h4>
                        <Badge variant={projectedChange > 0 ? "default" : "destructive"}>
                          {projectedChange > 0 ? '+' : ''}{projectedChange.toFixed(1)}%
                        </Badge>
                      </div>
                      <Progress 
                        value={Math.abs(projectedChange)} 
                        className="h-2" 
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Projeção para próximo mês baseada na tendência atual
                      </p>
                    </div>
                  );
                })}
                {trends.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Execute uma análise para gerar previsões.
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