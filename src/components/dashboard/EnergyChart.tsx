
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const mockData = [
  { time: '06:00', geracao: 0, consumo: 12 },
  { time: '07:00', geracao: 15, consumo: 18 },
  { time: '08:00', geracao: 35, consumo: 22 },
  { time: '09:00', geracao: 55, consumo: 28 },
  { time: '10:00', geracao: 75, consumo: 32 },
  { time: '11:00', geracao: 95, consumo: 35 },
  { time: '12:00', geracao: 120, consumo: 40 },
  { time: '13:00', geracao: 115, consumo: 38 },
  { time: '14:00', geracao: 105, consumo: 36 },
  { time: '15:00', geracao: 85, consumo: 33 },
  { time: '16:00', geracao: 65, consumo: 29 },
  { time: '17:00', geracao: 35, consumo: 45 },
  { time: '18:00', geracao: 5, consumo: 55 },
];

export function EnergyChart() {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={mockData}>
          <defs>
            <linearGradient id="geracaoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="consumoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="time" 
            axisLine={false}
            tickLine={false}
            className="text-xs"
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            className="text-xs"
            label={{ value: 'kW', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
          <Area
            type="monotone"
            dataKey="geracao"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#geracaoGradient)"
            name="Geração"
          />
          <Area
            type="monotone"
            dataKey="consumo"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#consumoGradient)"
            name="Consumo"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
