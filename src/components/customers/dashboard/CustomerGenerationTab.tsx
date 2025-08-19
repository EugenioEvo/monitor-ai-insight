
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp } from "lucide-react";
import { useCustomerGeneration } from "@/hooks/useCustomerGeneration";
import type { Plant, Reading } from "@/types";

interface CustomerGenerationTabProps {
  customerId: string;
}

export const CustomerGenerationTab = ({ customerId }: CustomerGenerationTabProps) => {
  const { data: generationData, isLoading } = useCustomerGeneration(customerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Carregando dados de geração...</div>
      </div>
    );
  }

  const chartData = generationData && typeof generationData === 'object' && 'chartData' in generationData 
    ? generationData.chartData 
    : [];

  const plantsData = generationData && typeof generationData === 'object' && 'plants' in generationData 
    ? generationData.plants 
    : [];

  const totalCapacity = plantsData.reduce((sum: any, plant: any) => sum + plant.capacity_kwp, 0);
  const totalGeneration = chartData.reduce((sum: any, data: any) => sum + data.total, 0);

  const getPlantColors = () => {
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return plantsData.reduce((acc, plant, index) => {
      acc[plant.id] = colors[index % colors.length];
      return acc;
    }, {} as { [key: string]: string });
  };

  const plantColors = getPlantColors();

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plantas Ativas</CardTitle>
            <Zap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plantsData.length}</div>
            <p className="text-xs text-muted-foreground">
              {totalCapacity.toFixed(1)} kWp total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Geração Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGeneration.toLocaleString()} kWh</div>
            <p className="text-xs text-muted-foreground">
              Período atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCapacity > 0 ? ((totalGeneration / totalCapacity) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Eficiência média
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Plantas */}
      <Card>
        <CardHeader>
          <CardTitle>Plantas do Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plantsData.map((plant: any) => (
              <div key={plant.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{plant.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {plant.capacity_kwp} kWp
                  </p>
                </div>
                <Badge 
                  variant="default"
                  className="capitalize"
                >
                  Ativa
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Geração */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Geração Mensal por Planta</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                {plantsData.map((plant) => (
                  <Line
                    key={plant.id}
                    type="monotone"
                    dataKey={plant.id}
                    stroke={plantColors[plant.id]}
                    name={plant.name}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#000000"
                  strokeWidth={2}
                  name="Total"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
