import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Clock, Zap, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useMonitoringStore } from '@/stores/monitoringStore';

interface MetricSummary {
  category: string;
  avgTime: number;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export function PerformanceOverview() {
  const { metrics, healthChecks, getSystemHealth } = useMonitoringStore();
  const [metricSummary, setMetricSummary] = useState<MetricSummary[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Process metrics for summary
    const categoryStats = metrics.reduce((acc, metric) => {
      if (!acc[metric.category]) {
        acc[metric.category] = { total: 0, count: 0, values: [] };
      }
      acc[metric.category].total += metric.value;
      acc[metric.category].count += 1;
      acc[metric.category].values.push(metric.value);
      return acc;
    }, {} as any);

    const summary = Object.entries(categoryStats).map(([category, stats]: [string, any]) => {
      const avgTime = stats.total / stats.count;
      const recent = stats.values.slice(-10);
      const older = stats.values.slice(-20, -10);
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        const diff = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        if (diff > 10) trend = 'up';
        else if (diff < -10) trend = 'down';
      }

      return {
        category,
        avgTime,
        count: stats.count,
        trend
      };
    });

    setMetricSummary(summary);

    // Process metrics for chart
    const last24Hours = metrics
      .filter(m => new Date(m.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const hourlyData = last24Hours.reduce((acc, metric) => {
      const hour = new Date(metric.timestamp).getHours();
      const key = `${hour}:00`;
      
      if (!acc[key]) {
        acc[key] = { hour: key, api: 0, render: 0, sync: 0, navigation: 0, count: {} };
      }
      
      acc[key][metric.category] += metric.value;
      acc[key].count[metric.category] = (acc[key].count[metric.category] || 0) + 1;
      
      return acc;
    }, {} as any);

    // Average the values
    const chartData = Object.values(hourlyData).map((data: any) => ({
      hour: data.hour,
      api: data.count.api ? data.api / data.count.api : 0,
      render: data.count.render ? data.render / data.count.render : 0,
      sync: data.count.sync ? data.sync / data.count.sync : 0,
      navigation: data.count.navigation ? data.navigation / data.count.navigation : 0
    }));

    setChartData(chartData);
  }, [metrics]);

  const systemHealth = getSystemHealth();
  
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <Activity className="w-4 h-4 text-green-600" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'down': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-green-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status do Sistema</p>
                <div className="flex items-center gap-2 mt-1">
                  {getHealthIcon(systemHealth)}
                  <span className={`font-medium ${getHealthColor(systemHealth)}`}>
                    {systemHealth === 'healthy' ? 'Saudável' : 
                     systemHealth === 'degraded' ? 'Degradado' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Métricas Coletadas</p>
                <p className="text-2xl font-bold">{metrics.length}</p>
              </div>
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Serviços Monitorados</p>
                <p className="text-2xl font-bold">{Object.keys(healthChecks).length}</p>
              </div>
              <Zap className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="health">Saúde dos Serviços</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Performance</CardTitle>
              <CardDescription>
                Tempo médio de resposta por categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metricSummary.map((metric) => (
                  <div key={metric.category} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">{metric.category}</h4>
                      {getTrendIcon(metric.trend)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {Math.round(metric.avgTime)}ms
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {metric.count} operações
                      </div>
                      <Progress 
                        value={Math.min(100, (metric.avgTime / 5000) * 100)} 
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Tendência de Performance (24h)</CardTitle>
              <CardDescription>
                Tempo médio de resposta por hora
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="api" stroke="#8884d8" name="API" />
                  <Line type="monotone" dataKey="render" stroke="#82ca9d" name="Render" />
                  <Line type="monotone" dataKey="sync" stroke="#ffc658" name="Sync" />
                  <Line type="monotone" dataKey="navigation" stroke="#ff7300" name="Navigation" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status dos Serviços</CardTitle>
              <CardDescription>
                Monitoramento em tempo real dos serviços
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(healthChecks).map(([service, check]) => (
                  <div key={service} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getHealthIcon(check.status)}
                      <div>
                        <h4 className="font-medium capitalize">{service}</h4>
                        <p className="text-sm text-muted-foreground">
                          Última verificação: {new Date(check.lastCheck).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        check.status === 'healthy' ? 'default' :
                        check.status === 'degraded' ? 'secondary' : 'destructive'
                      }>
                        {check.status === 'healthy' ? 'Saudável' :
                         check.status === 'degraded' ? 'Degradado' : 'Inativo'}
                      </Badge>
                      {check.responseTime && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {Math.round(check.responseTime)}ms
                        </p>
                      )}
                      {check.error && (
                        <p className="text-sm text-red-600 mt-1">
                          {check.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {Object.keys(healthChecks).length === 0 && (
                  <div className="text-center p-8 text-muted-foreground">
                    Nenhum serviço sendo monitorado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Tendências</CardTitle>
              <CardDescription>
                Comparação de performance ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metricSummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgTime" fill="#8884d8" name="Tempo Médio (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}