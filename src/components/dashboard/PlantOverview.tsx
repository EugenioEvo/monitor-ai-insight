
import React from 'react';
import { SungrowPlantOverview } from './SungrowPlantOverview';
import { SungrowManualSync } from './SungrowManualSync';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from './MetricCard';
import { Zap, Sun, TrendingUp, Calendar, MapPin, Activity } from 'lucide-react';
import { useEnergyData } from '@/hooks/useEnergyData';
import { useLocalReadings } from '@/hooks/useLocalReadings';
import { useAutoSync } from '@/hooks/useAutoSync';
import type { Plant } from '@/types';

interface PlantOverviewProps {
  plant: Plant;
}

export const PlantOverview = ({ plant }: PlantOverviewProps) => {
  // Inicializar sincronização automática
  const { syncEnabled } = useAutoSync(plant);

  // Se for planta Sungrow, usar componente específico
  if (plant.monitoring_system === 'sungrow') {
    return (
      <div className="space-y-6">
        <SungrowPlantOverview plant={plant} />
        <SungrowManualSync plant={plant} />
        
        {/* Indicador de sincronização automática */}
        {syncEnabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-green-500" />
                Sincronização Automática Ativa
              </CardTitle>
              <CardDescription>
                Dados sendo sincronizados automaticamente a cada 15 minutos
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    );
  }

  const { data: energyData } = useEnergyData(plant, 'DAY');
  const { data: localReadings } = useLocalReadings(plant);

  const getStatusBadge = () => {
    if (plant.status === 'active') {
      return <Badge variant="default">Ativa</Badge>;
    } else if (plant.status === 'maintenance') {
      return <Badge variant="outline">Manutenção</Badge>;
    }
    return <Badge variant="destructive">Inativa</Badge>;
  };

  const todayEnergy = energyData?.reduce((sum, reading) => sum + (reading.energy_kwh || 0), 0) || 0;
  const currentPower = localReadings?.[0]?.power_w || 0;

  return (
    <div className="space-y-6">
      {/* Plant Info Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sun className="w-5 h-5" />
                Informações da Planta
              </CardTitle>
              <CardDescription>
                Dados gerais e status atual da instalação
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {getStatusBadge()}
              {syncEnabled && (
                <Badge variant="outline" className="text-green-600">
                  <Activity className="w-3 h-3 mr-1" />
                  Auto-Sync
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Zap className="w-4 h-4 mr-2" />
              Capacidade Instalada
            </div>
            <div className="text-2xl font-bold">{plant.capacity_kwp} kWp</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mr-2" />
              Concessionária
            </div>
            <div className="text-lg font-medium">{plant.concessionaria}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              Data de Início
            </div>
            <div className="text-lg font-medium">
              {new Date(plant.start_date).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Potência Atual"
          value={`${(currentPower / 1000).toFixed(2)} kW`}
          icon={Zap}
          description="Geração agora"
        />
        
        <MetricCard
          title="Energia Hoje"
          value={`${todayEnergy.toFixed(1)} kWh`}
          icon={Sun}
          description="Produção diária"
        />
        
        <MetricCard
          title="Capacidade"
          value={`${plant.capacity_kwp} kWp`}
          icon={TrendingUp}
          description="Instalada"
        />
        
        <MetricCard
          title="Eficiência"
          value={`${plant.capacity_kwp > 0 ? ((currentPower / 1000) / plant.capacity_kwp * 100).toFixed(1) : 0}%`}
          icon={TrendingUp}
          description="Atual"
        />
      </div>
    </div>
  );
};
