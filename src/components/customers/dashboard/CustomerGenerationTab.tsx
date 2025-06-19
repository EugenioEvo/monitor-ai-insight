
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useCustomerGenerationData } from "@/hooks/useCustomerDashboard";
import type { Plant, Reading } from "@/types";

interface CustomerGenerationTabProps {
  customerId: string;
  plants: Plant[];
  readings: Reading[];
}

export const CustomerGenerationTab = ({ 
  customerId, 
  plants, 
  readings 
}: CustomerGenerationTabProps) => {
  const { data: generationData } = useCustomerGenerationData(customerId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'maintenance':
        return 'bg-yellow-500';
      case 'pending_fix':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativa';
      case 'maintenance':
        return 'Manutenção';
      case 'pending_fix':
        return 'Aguardando Reparo';
      default:
        return 'Desconhecido';
    }
  };

  return (
    <div className="space-y-6">
      {/* Lista de Plantas */}
      <Card>
        <CardHeader>
          <CardTitle>Plantas do Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plants.map((plant) => (
              <Card key={plant.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{plant.name}</h4>
                    <Badge className={getStatusColor(plant.status)}>
                      {getStatusText(plant.status)}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Capacidade: {plant.capacity_kwp} kWp</p>
                    <p>Concessionária: {plant.concessionaria}</p>
                    <p>Início: {new Date(plant.start_date).toLocaleDateString('pt-BR')}</p>
                    {plant.monitoring_system && (
                      <p>Monitoramento: {plant.monitoring_system}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Geração Mensal */}
      {generationData && (
        <Card>
          <CardHeader>
            <CardTitle>Geração Mensal por Planta</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={generationData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString('pt-BR')} kWh`,
                    generationData.plants.find(p => p.id === name)?.name || name
                  ]}
                />
                <Legend 
                  formatter={(value: string) => 
                    generationData.plants.find(p => p.id === value)?.name || value
                  }
                />
                {generationData.plants.map((plant, index) => (
                  <Bar 
                    key={plant.id}
                    dataKey={plant.id} 
                    stackId="generation"
                    fill={`hsl(${index * 60}, 70%, 50%)`}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas de Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance das Plantas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {plants.filter(p => p.status === 'active').length}
              </div>
              <p className="text-sm text-muted-foreground">Plantas Ativas</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {plants.reduce((sum, plant) => sum + plant.capacity_kwp, 0).toFixed(1)} kWp
              </div>
              <p className="text-sm text-muted-foreground">Capacidade Total</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {readings.length}
              </div>
              <p className="text-sm text-muted-foreground">Leituras Registradas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
