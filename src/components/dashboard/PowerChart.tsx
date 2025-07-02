
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Zap } from 'lucide-react';

interface PowerChartProps {
  chartData: ProcessedChartData[];
  localReadings: ChartDataPoint[] | undefined;
}

export const PowerChart = React.memo(({ chartData, localReadings }: PowerChartProps) => {
  const chartConfig = {
    power: {
      label: "Potência (W)",
      color: "hsl(var(--chart-2))",
    },
  };

  if (!localReadings || localReadings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Potência Média Diária
        </CardTitle>
        <CardDescription>
          Dados locais de potência coletados do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="power"
                stroke="var(--color-power)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
});

PowerChart.displayName = 'PowerChart';
