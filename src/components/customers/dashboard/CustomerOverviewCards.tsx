
import { TrendingUp, TrendingDown, Zap, DollarSign, Home, Factory } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Plant, CustomerUnit, CustomerMetrics } from "@/types";

interface CustomerOverviewCardsProps {
  plants: Plant[];
  units: CustomerUnit[];
  metrics: CustomerMetrics[];
  selectedPeriod: string;
}

export const CustomerOverviewCards = ({ 
  plants, 
  units, 
  metrics, 
  selectedPeriod 
}: CustomerOverviewCardsProps) => {
  // Calcular métricas dos últimos meses baseado no período selecionado
  const recentMetrics = metrics.slice(0, parseInt(selectedPeriod));
  
  const totalGeneration = recentMetrics.reduce((sum, metric) => sum + metric.total_generation_kwh, 0);
  const totalConsumption = recentMetrics.reduce((sum, metric) => sum + metric.total_consumption_kwh, 0);
  const totalSavings = recentMetrics.reduce((sum, metric) => sum + metric.total_savings_r$, 0);
  const energyBalance = totalGeneration - totalConsumption;
  
  const activePlants = plants.filter(plant => plant.status === 'active').length;
  const totalCapacity = plants.reduce((sum, plant) => sum + plant.capacity_kwp, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Plantas Ativas</CardTitle>
          <Factory className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activePlants}</div>
          <p className="text-xs text-muted-foreground">
            {totalCapacity.toFixed(1)} kWp total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unidades Consumidoras</CardTitle>
          <Home className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{units.length}</div>
          <p className="text-xs text-muted-foreground">
            UCs ativas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Geração Total</CardTitle>
          <Zap className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalGeneration.toLocaleString('pt-BR')}</div>
          <p className="text-xs text-muted-foreground">
            kWh nos últimos {selectedPeriod} meses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Economia Total</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R$ {totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">
            Últimos {selectedPeriod} meses
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Energético</CardTitle>
          {energyBalance >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${energyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {energyBalance >= 0 ? '+' : ''}{energyBalance.toLocaleString('pt-BR')} kWh
          </div>
          <p className="text-xs text-muted-foreground">
            {energyBalance >= 0 ? 'Superávit energético' : 'Déficit energético'}
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Autossuficiência</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {totalConsumption > 0 ? ((totalGeneration / totalConsumption) * 100).toFixed(1) : 0}%
          </div>
          <p className="text-xs text-muted-foreground">
            Percentual de energia própria
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
