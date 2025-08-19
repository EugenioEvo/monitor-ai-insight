import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from './MetricCard';
import { Activity, Zap, DollarSign, TrendingDown } from 'lucide-react';
import { usePlantConsumption } from '@/hooks/usePlantConsumption';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import type { Plant } from '@/types';

interface PlantConsumptionViewProps {
  plant: Plant;
}

export const PlantConsumptionView = ({ plant }: PlantConsumptionViewProps) => {
  const { data: consumption, isLoading, error } = usePlantConsumption(plant);

  // Helper function to format month
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${month}/${year.slice(2)}`;
  };

  if (!plant.consumer_unit_code) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Consumo da Planta
          </CardTitle>
          <CardDescription>
            Nenhuma UC de consumo configurada para esta planta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Para visualizar dados de consumo, configure o código da UC consumidora nas configurações da planta.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Erro ao carregar dados de consumo</CardTitle>
          <CardDescription className="text-red-600">
            Não foi possível carregar os dados de consumo da UC {plant.consumer_unit_code}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartData = consumption?.chartData?.map(item => ({
    ...item,
    month: formatMonth(item.month)
  })) || [];

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Consumo da UC {consumption?.ucCode}
          </CardTitle>
          <CardDescription>
            Dados de consumo baseados nas faturas processadas
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Consumo Total (12m)"
          value={`${(consumption?.totalConsumption || 0).toLocaleString('pt-BR')} kWh`}
          icon={Zap}
          description="Últimos 12 meses"
        />
        
        <MetricCard
          title="Custo Total (12m)"
          value={`R$ ${(consumption?.totalCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          description="Últimos 12 meses"
        />

        <MetricCard
          title="Custo Médio kWh"
          value={`R$ ${consumption?.totalConsumption ? (consumption.totalCost / consumption.totalConsumption).toFixed(3) : '0,000'}`}
          icon={TrendingDown}
          description="Tarifa média"
        />
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Consumption Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Consumo Mensal</CardTitle>
              <CardDescription>Evolução do consumo em kWh</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toLocaleString('pt-BR')} kWh`, 'Consumo']}
                  />
                  <Bar dataKey="consumption" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Custo Mensal</CardTitle>
              <CardDescription>Evolução dos custos em R$</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Custo']}
                  />
                  <Line type="monotone" dataKey="cost" stroke="hsl(var(--destructive))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {chartData.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum dado de consumo encontrado</CardTitle>
            <CardDescription>
              Não foram encontradas faturas processadas para a UC {consumption?.ucCode}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};