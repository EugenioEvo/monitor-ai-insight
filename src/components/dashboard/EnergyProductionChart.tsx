
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import type { Plant } from '@/types';

interface EnergyProductionChartProps {
  chartData: any[];
  period: 'DAY' | 'MONTH' | 'YEAR';
  plant: Plant;
}

export const EnergyProductionChart = ({ chartData, period, plant }: EnergyProductionChartProps) => {
  const chartConfig = {
    energy: {
      label: "Energia (kWh)",
      color: "hsl(var(--chart-1))",
    },
  };

  const getChartTitle = () => {
    switch (period) {
      case 'DAY':
        return 'Produção de Energia - Curva Diária';
      case 'MONTH':
        return 'Produção de Energia - Dias do Mês';
      case 'YEAR':
        return 'Produção de Energia - Mensal';
      default:
        return 'Produção de Energia';
    }
  };

  const getChartDescription = () => {
    switch (period) {
      case 'DAY':
        return 'Curva de produção de energia dia a dia';
      case 'MONTH':
        return 'Produção de energia por dia do mês corrente';
      case 'YEAR':
        return 'Produção de energia mês a mês';
      default:
        return 'Histórico de produção de energia da planta';
    }
  };

  const renderChart = () => {
    if (period === 'DAY') {
      // Gráfico de linha/área para período diário
      return (
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="energy"
            stroke="var(--color-energy)"
            fill="var(--color-energy)"
            fillOpacity={0.3}
          />
        </AreaChart>
      );
    } else {
      // Gráfico de barras para períodos mensal e anual
      return (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            angle={period === 'YEAR' ? -45 : 0}
            textAnchor={period === 'YEAR' ? "end" : "middle"}
            height={period === 'YEAR' ? 60 : 40}
          />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="energy"
            fill="var(--color-energy)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {getChartTitle()}
        </CardTitle>
        <CardDescription>
          {getChartDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dado de produção disponível</p>
              {plant.monitoring_system === 'manual' && (
                <p className="text-sm mt-2">Configure um sistema de monitoramento para visualizar dados</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
