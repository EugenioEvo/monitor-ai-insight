
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Produção de Energia
        </CardTitle>
        <CardDescription>
          Histórico de produção de energia da planta ({period.toLowerCase()})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
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
