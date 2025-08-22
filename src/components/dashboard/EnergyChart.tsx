import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import { useAggregateReadings, type DashboardPeriod } from '@/hooks/useAggregateReadings';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface EnergyChartProps {
  period?: DashboardPeriod;
  plantId?: string;
  height?: number;
}

export function EnergyChart({ period = 'today', plantId, height = 320 }: EnergyChartProps) {
  const { data = [], isLoading, error } = useAggregateReadings(period, plantId);

  if (isLoading) {
    return (
      <div className={`h-${height} w-full flex items-center justify-center`}>
        <div className="space-y-3 w-full">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-64 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-${height} w-full flex items-center justify-center text-muted-foreground`}>
        <div className="text-center space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-sm">Erro ao carregar dados do gráfico</p>
          <p className="text-xs">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`h-${height} w-full flex items-center justify-center text-muted-foreground`}>
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <p className="text-sm">Nenhum dado de geração disponível</p>
          <p className="text-xs">Para o período selecionado</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-${height} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`geracaoGradient${plantId || 'default'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            className="text-xs" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            className="text-xs" 
            tick={{ fontSize: 12 }}
            label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} 
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-elegant)',
              fontSize: '12px'
            }}
            formatter={(value: any) => [`${Number(value).toFixed(2)} kWh`, 'Geração']}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Area
            type="monotone"
            dataKey="geracao"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill={`url(#geracaoGradient${plantId || 'default'})`}
            name="Geração"
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
