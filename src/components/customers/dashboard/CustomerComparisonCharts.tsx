
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useCustomerGeneration } from "@/hooks/useCustomerGeneration";
import { useCustomerConsumption } from "@/hooks/useCustomerConsumption";

interface CustomerComparisonChartsProps {
  customerId: string;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}

export const CustomerComparisonCharts = ({ 
  customerId, 
  selectedPeriod, 
  onPeriodChange 
}: CustomerComparisonChartsProps) => {
  const { data: generationData, isLoading: generationLoading } = useCustomerGeneration(customerId);
  const { data: consumptionData, isLoading: consumptionLoading } = useCustomerConsumption(customerId);

  const generationChartData = generationData && typeof generationData === 'object' && 'chartData' in generationData 
    ? generationData.chartData 
    : [];
    
  const consumptionChartData = consumptionData && typeof consumptionData === 'object' && 'chartData' in consumptionData 
    ? consumptionData.chartData 
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Comparação Geração vs Consumo</CardTitle>
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
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="generation" 
                stroke="#22c55e" 
                name="Geração (kWh)"
                data={generationChartData}
              />
              <Line 
                type="monotone" 
                dataKey="consumption" 
                stroke="#ef4444" 
                name="Consumo (kWh)"
                data={consumptionChartData}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolução dos Custos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={consumptionChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`R$ ${value}`, "Custo"]} />
              <Bar dataKey="cost" fill="#3b82f6" name="Custo (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
