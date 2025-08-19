
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart } from "recharts";

interface CustomerComparisonChartsProps {
  chartData: Array<{
    month: string;
    generation: number;
    consumption: number;
    cost: number;
    balance: number;
    selfSufficiency: number;
  }>;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  isLoading?: boolean;
}

export const CustomerComparisonCharts = ({ 
  chartData,
  selectedPeriod, 
  onPeriodChange,
  isLoading = false
}: CustomerComparisonChartsProps) => {
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${month}/${year.slice(2)}`;
  };

  const formattedData = chartData.map(item => ({
    ...item,
    monthDisplay: formatMonth(item.month)
  }));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Carregando dados...</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Carregando dados...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Análise Energética</h3>
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
            <SelectItem value="24">Últimos 24 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Geração vs Consumo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthDisplay" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString('pt-BR')} kWh`, 
                    name
                  ]}
                />
                <Legend />
                <Bar 
                  dataKey="generation" 
                  fill="hsl(var(--chart-1))" 
                  name="Geração"
                  opacity={0.8}
                />
                <Line 
                  type="monotone" 
                  dataKey="consumption" 
                  stroke="hsl(var(--chart-2))" 
                  name="Consumo"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo Energético</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthDisplay" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [
                    `${value >= 0 ? '+' : ''}${value.toLocaleString('pt-BR')} kWh`, 
                    "Saldo"
                  ]}
                />
                <Bar 
                  dataKey="balance" 
                  fill="hsl(var(--chart-3))"
                  name="Saldo Energético"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução dos Custos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthDisplay" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
                    "Custo"
                  ]} 
                />
                <Bar dataKey="cost" fill="hsl(var(--chart-3))" name="Custo" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Autossuficiência Energética</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthDisplay" />
                <YAxis domain={[0, 'dataMax + 10']} />
                <Tooltip 
                  formatter={(value: number) => [
                    `${value.toFixed(1)}%`, 
                    "Autossuficiência"
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="selfSufficiency" 
                  stroke="hsl(var(--chart-4))" 
                  strokeWidth={3}
                  name="Autossuficiência (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
