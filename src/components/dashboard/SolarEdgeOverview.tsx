
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Zap, Sun, TrendingUp, Calendar, MapPin, Wifi } from 'lucide-react';
import { useEnergyData } from '@/hooks/useEnergyData';
import { useLocalReadings } from '@/hooks/useLocalReadings';
import { solarEdgeDataAdapter } from '@/utils/dataAdapters';
import type { Plant } from '@/types';

interface SolarEdgeOverviewProps {
  plant: Plant;
}

export const SolarEdgeOverview = ({ plant }: SolarEdgeOverviewProps) => {
  const { data: energyData, isLoading, error } = useEnergyData(plant, 'DAY');
  const { data: localReadings } = useLocalReadings(plant);

  const getStatusBadge = () => {
    if (plant.status === 'active') {
      return <Badge variant="default">Ativa</Badge>;
    } else if (plant.status === 'maintenance') {
      return <Badge variant="outline">Manutenção</Badge>;
    }
    return <Badge variant="destructive">Inativa</Badge>;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const currentPower = localReadings?.[0]?.power_w || 0;
  const normalizedData = solarEdgeDataAdapter.normalizeOverview(energyData || [], currentPower, plant);

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Erro na Conexão SolarEdge</CardTitle>
            <CardDescription className="text-red-600">
              Não foi possível conectar com o SolarEdge. Verifique as configurações de API.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Plant Info Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sun className="w-5 h-5" />
                Informações da Planta SolarEdge
              </CardTitle>
              <CardDescription>
                Dados gerais e status atual da instalação
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {getStatusBadge()}
              <Badge variant="outline" className="text-blue-600">
                <Wifi className="w-3 h-3 mr-1" />
                SolarEdge API
              </Badge>
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
          value={`${normalizedData.currentPower.toFixed(2)} kW`}
          icon={Zap}
          description="Geração instantânea"
        />
        
        <MetricCard
          title="Energia Hoje"
          value={`${normalizedData.dailyEnergy.toFixed(1)} kWh`}
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
          value={`${normalizedData.efficiency.toFixed(1)}%`}
          icon={TrendingUp}
          description="Atual"
        />
      </div>

      {/* Connection Status */}
      {plant.monitoring_system === 'solaredge' && !energyData && !isLoading && !error && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-700">Aguardando Dados</CardTitle>
            <CardDescription className="text-yellow-600">
              Conectado ao SolarEdge, aguardando primeira sincronização de dados.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};
