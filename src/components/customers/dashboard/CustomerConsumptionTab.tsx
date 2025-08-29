
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Building, DollarSign, TrendingDown } from "lucide-react";
import { useCustomerConsumption } from "@/hooks/useCustomerConsumption";
import type { CustomerUnit, Invoice } from "@/types";

interface CustomerConsumptionTabProps {
  customerId: string;
}

export const CustomerConsumptionTab = ({ customerId }: CustomerConsumptionTabProps) => {
  const { data: consumptionData, isLoading } = useCustomerConsumption(customerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Carregando dados de consumo...</div>
      </div>
    );
  }

  const unitsData = consumptionData && typeof consumptionData === 'object' && 'units' in consumptionData 
    ? consumptionData.units 
    : [];

  const chartData = consumptionData && typeof consumptionData === 'object' && 'chartData' in consumptionData 
    ? consumptionData.chartData 
    : [];

  const totalConsumption = chartData.reduce((sum: any, data: any) => sum + data.consumption, 0);
  const totalCost = chartData.reduce((sum: any, data: any) => sum + data.cost, 0);
  const averageCost = chartData.length > 0 ? totalCost / chartData.length : 0;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades Ativas</CardTitle>
            <Building className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unitsData.length}</div>
            <p className="text-xs text-muted-foreground">
              Unidades consumidoras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consumo Total</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConsumption.toLocaleString()} kWh</div>
            <p className="text-xs text-muted-foreground">
              Período atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {averageCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Por mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Unidades Consumidoras */}
      <Card>
        <CardHeader>
          <CardTitle>Unidades Consumidoras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {unitsData.map((unit: any) => (
              <div key={unit.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{unit.unit_name || unit.uc_code}</h4>
                  <p className="text-sm text-muted-foreground">
                    UC: {unit.uc_code}
                  </p>
                </div>
                <Badge 
                  variant="default"
                >
                  Ativa
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Consumo */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Consumo Mensal (kWh)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="consumption" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custos Mensais (R$)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`R$ ${value}`, "Custo"]} />
                  <Line type="monotone" dataKey="cost" stroke="#ef4444" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dados Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Consumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{totalConsumption.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">kWh Total</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-red-600">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-muted-foreground">Custo Total</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-green-600">R$ {averageCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-muted-foreground">Custo Médio</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
