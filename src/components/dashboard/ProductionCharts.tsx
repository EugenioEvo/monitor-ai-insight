
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Calendar, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Plant } from '@/types';
import type { SolarEdgeConfig } from '@/types/monitoring';

interface ProductionChartsProps {
  plant: Plant;
}

export const ProductionCharts = ({ plant }: ProductionChartsProps) => {
  const [period, setPeriod] = useState<'DAY' | 'MONTH' | 'YEAR'>('DAY');

  const { data: energyData, isLoading } = useQuery({
    queryKey: ['energy-details', plant.id, period],
    queryFn: async () => {
      if (plant.monitoring_system !== 'solaredge' || !plant.api_credentials) {
        return null;
      }

      const { data, error } = await supabase.functions.invoke('solaredge-connector', {
        body: {
          action: 'get_energy_details',
          config: plant.api_credentials as SolarEdgeConfig,
          period
        }
      });

      if (error) throw error;
      return data.success ? data.data : null;
    },
    enabled: plant.monitoring_system === 'solaredge' && !!plant.api_credentials
  });

  const { data: localReadings } = useQuery({
    queryKey: ['local-readings', plant.id],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .eq('plant_id', plant.id)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const chartData = React.useMemo(() => {
    if (energyData?.values) {
      return energyData.values.map((point: any) => ({
        date: new Date(point.date).toLocaleDateString('pt-BR'),
        energy: point.value / 1000, // Converter para kWh
        timestamp: point.date
      }));
    }

    if (localReadings) {
      const groupedByDay = localReadings.reduce((acc, reading) => {
        const date = new Date(reading.timestamp).toLocaleDateString('pt-BR');
        if (!acc[date]) {
          acc[date] = { date, energy: 0, power: 0, count: 0 };
        }
        acc[date].energy += reading.energy_kwh;
        acc[date].power += reading.power_w;
        acc[date].count += 1;
        return acc;
      }, {} as any);

      return Object.values(groupedByDay).map((day: any) => ({
        ...day,
        power: day.power / day.count // Média da potência
      }));
    }

    return [];
  }, [energyData, localReadings]);

  const chartConfig = {
    energy: {
      label: "Energia (kWh)",
      color: "hsl(var(--chart-1))",
    },
    power: {
      label: "Potência (W)",
      color: "hsl(var(--chart-2))",
    },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        <Button
          variant={period === 'DAY' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod('DAY')}
        >
          Diário
        </Button>
        <Button
          variant={period === 'MONTH' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod('MONTH')}
        >
          Mensal
        </Button>
        <Button
          variant={period === 'YEAR' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod('YEAR')}
        >
          Anual
        </Button>
      </div>

      {/* Energy Production Chart */}
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

      {/* Power Chart (if local readings available) */}
      {localReadings && localReadings.length > 0 && (
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
      )}
    </div>
  );
};
