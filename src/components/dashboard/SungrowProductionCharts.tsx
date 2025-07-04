import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { EnergyChart } from './EnergyChart';
import { PowerChart } from './PowerChart';
import { PeriodSelector } from './PeriodSelector';
import { useSungrowEnergyData } from '@/hooks/useSungrowData';
import { AlertCircle, TrendingUp, Zap } from 'lucide-react';
import type { Plant } from '@/types';

interface SungrowProductionChartsProps {
  plant: Plant;
}

export const SungrowProductionCharts = ({ plant }: SungrowProductionChartsProps) => {
  const [period, setPeriod] = React.useState<'DAY' | 'MONTH' | 'YEAR'>('DAY');
  
  // Converter tipo para hook Sungrow
  const sungrowPeriod = period === 'DAY' ? 'day' : period === 'MONTH' ? 'month' : 'year';
  const { data: energyData, isLoading, error } = useSungrowEnergyData(plant, sungrowPeriod);

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Erro nos Dados de Produção
          </CardTitle>
          <CardDescription className="text-red-600">
            Não foi possível carregar os dados de produção do Sungrow. Verifique as configurações de API.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Processar dados para os gráficos
  const processChartData = () => {
    if (!energyData?.list) return [];
    
    return energyData.list.map((item: any) => ({
      time: item.time,
      power: item.power || 0,
      energy: item.energy || 0,
      irradiation: item.irradiation || 0,
      temperature: item.temperature || 0
    }));
  };

  const chartData = processChartData();

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gráficos de Produção Sungrow</h2>
        <PeriodSelector period={period} onPeriodChange={setPeriod} />
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="energy" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="energy">
            <TrendingUp className="w-4 h-4 mr-2" />
            Energia
          </TabsTrigger>
          <TabsTrigger value="power">
            <Zap className="w-4 h-4 mr-2" />
            Potência
          </TabsTrigger>
          <TabsTrigger value="environmental">
            Condições Ambientais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="energy">
          <Card>
            <CardHeader>
              <CardTitle>Produção de Energia</CardTitle>
              <CardDescription>
                Dados de energia produzida no período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="energy" fill="#0ea5e9" name="Energia (kWh)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhum dado de energia disponível para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="power">
          <Card>
            <CardHeader>
              <CardTitle>Curva de Potência</CardTitle>
              <CardDescription>
                Variação da potência gerada ao longo do período
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="power" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="Potência (kW)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhum dado de potência disponível para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environmental">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Irradiação Solar</CardTitle>
                <CardDescription>
                  Níveis de irradiação solar (W/m²)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="irradiation" 
                        stroke="#eab308" 
                        strokeWidth={2}
                        name="Irradiação (W/m²)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    Dados não disponíveis
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Temperatura</CardTitle>
                <CardDescription>
                  Temperatura do ambiente/equipamento (°C)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="temperature" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="Temperatura (°C)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    Dados não disponíveis
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};