import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import { useAggregateReadings, type DashboardPeriod } from '@/hooks/useAggregateReadings';

interface EnergyChartProps {
  period?: DashboardPeriod;
}

export function EnergyChart({ period = 'today' }: EnergyChartProps) {
  const { data = [], isLoading } = useAggregateReadings(period);

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="geracaoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="time" axisLine={false} tickLine={false} className="text-xs" />
          <YAxis axisLine={false} tickLine={false} className="text-xs" label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: 'none',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-elegant)'
            }}
            formatter={(value: any) => [`${Number(value).toFixed(2)} kWh`, 'Geração']}
          />
          <Area
            type="monotone"
            dataKey="geracao"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="url(#geracaoGradient)"
            name="Geração"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
