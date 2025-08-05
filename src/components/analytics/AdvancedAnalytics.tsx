import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Activity, Zap, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TrendData {
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

interface PlantInfo {
  id: string;
  name: string;
  capacity_kwp: number;
}

export const AdvancedAnalytics: React.FC = () => {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [plants, setPlants] = useState<PlantInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30_days');
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar plantas
      const { data: plantsData, error: plantsError } = await supabase
        .from('plants')
        .select('id, name, capacity_kwp')
        .eq('status', 'active');

      if (plantsError) throw plantsError;
      setPlants(plantsData || []);

      // Buscar tendências (usando query manual)
      const { data: trendsData, error: trendsError } = await supabase
        .rpc('exec_sql', { 
          query: `SELECT * FROM analytics_trends WHERE period = '${selectedPeriod}' ORDER BY calculated_at DESC` 
        });

      if (trendsError) throw trendsError;
      setTrends(trendsData || []);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Erro ao carregar análises",
        description: "Não foi possível carregar os dados de análise avançada.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('analytics-engine', {
        body: { action: 'calculate_trends' }
      });

      if (error) throw error;

      toast({
        title: "Análise executada",
        description: "Nova análise de tendências foi calculada com sucesso.",
      });

      // Recarregar dados
      await fetchData();
    } catch (error) {
      console.error('Error running analysis:', error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível executar a análise de tendências.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Preparar dados para gráficos
  const chartData = trends.map(trend => {
    const plant = plants.find(p => p.id === trend.plant_id);
    return {
      plantName: plant?.name || `Planta ${trend.plant_id.slice(0, 8)}`,
      avgPower: trend.trend_data.avg_power,
      avgEnergy: trend.trend_data.avg_energy,
      percentage: trend.trend_data.percentage,
      direction: trend.trend_data.direction,
      efficiency: plant?.capacity_kwp ? (trend.trend_data.avg_power / (plant.capacity_kwp * 1000)) * 100 : 0
    };
  });

  const performanceData = chartData.map(item => ({
    name: item.plantName,
    performance: Math.round(item.efficiency),
    trend: item.percentage
  }));

  const trendDistribution = [
    { name: 'Crescimento', value: trends.filter(t => t.trend_data.direction === 'up').length, color: '#10b981' },
    { name: 'Declínio', value: trends.filter(t => t.trend_data.direction === 'down').length, color: '#ef4444' },
    { name: 'Estável', value: trends.filter(t => t.trend_data.direction === 'stable').length, color: '#6b7280' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Análise Avançada</h2>
          <p className="text-muted-foreground">
            Análise de tendências e performance das plantas solares
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Executar Análise
        </Button>
      </div>

      <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <TabsList>
          <TabsTrigger value="7_days">7 Dias</TabsTrigger>
          <TabsTrigger value="30_days">30 Dias</TabsTrigger>
          <TabsTrigger value="90_days">90 Dias</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPeriod} className="space-y-6">
          {/* Cartões de resumo */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Plantas</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{plants.length}</div>
                <p className="text-xs text-muted-foreground">
                  {trends.length} com análise disponível
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance Média</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {chartData.length > 0 
                    ? Math.round(chartData.reduce((sum, item) => sum + item.efficiency, 0) / chartData.length)
                    : 0
                  }%
                </div>
                <p className="text-xs text-muted-foreground">
                  da capacidade instalada
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tendência Geral</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {trendDistribution[0].value > trendDistribution[1].value ? 'Positiva' : 'Atenção'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {trendDistribution[0].value} crescendo, {trendDistribution[1].value} em declínio
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance por Planta</CardTitle>
                <CardDescription>
                  Eficiência atual vs capacidade instalada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="performance" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Tendências</CardTitle>
                <CardDescription>
                  Status das tendências de performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={trendDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {trendDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Lista detalhada de tendências */}
          <Card>
            <CardHeader>
              <CardTitle>Análise Detalhada por Planta</CardTitle>
              <CardDescription>
                Tendências e métricas de performance individual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trends.map((trend) => {
                  const plant = plants.find(p => p.id === trend.plant_id);
                  return (
                    <div key={trend.plant_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            {plant?.name || `Planta ${trend.plant_id.slice(0, 8)}`}
                          </h4>
                          {getTrendIcon(trend.trend_data.direction)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Capacidade: {plant?.capacity_kwp || 0} kWp
                        </p>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <div className={`font-medium ${getTrendColor(trend.trend_data.direction)}`}>
                          {trend.trend_data.percentage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Média: {Math.round(trend.trend_data.avg_power / 1000)}kW
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <Badge variant={trend.trend_data.direction === 'up' ? 'default' : 
                                     trend.trend_data.direction === 'down' ? 'destructive' : 'secondary'}>
                          {trend.trend_data.direction === 'up' ? 'Crescimento' :
                           trend.trend_data.direction === 'down' ? 'Declínio' : 'Estável'}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {trend.trend_data.data_points} pontos de dados
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {trends.length === 0 && !loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma análise disponível para o período selecionado.
                    <br />
                    <Button variant="outline" onClick={runAnalysis} className="mt-2">
                      Executar primeira análise
                    </Button>
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