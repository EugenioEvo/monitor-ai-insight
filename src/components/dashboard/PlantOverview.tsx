
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Zap, Sun, TrendingUp, Calendar, MapPin, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Plant } from '@/types';
import type { SolarEdgeConfig } from '@/types/monitoring';

interface PlantOverviewProps {
  plant: Plant;
}

export const PlantOverview = ({ plant }: PlantOverviewProps) => {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['overview', plant.id],
    queryFn: async () => {
      if (plant.monitoring_system !== 'solaredge' || !plant.api_credentials) {
        return null;
      }

      const { data, error } = await supabase.functions.invoke('solaredge-connector', {
        body: {
          action: 'get_overview',
          config: plant.api_credentials as SolarEdgeConfig
        }
      });

      if (error) throw error;
      return data.success ? data.data : null;
    },
    enabled: plant.monitoring_system === 'solaredge' && !!plant.api_credentials,
    refetchInterval: 5 * 60 * 1000 // Atualizar a cada 5 minutos
  });

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
            {getStatusBadge()}
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
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Energia Hoje"
            value={`${(overview.currentPower?.power || 0).toFixed(2)} kW`}
            icon={Zap}
            description="Potência atual"
          />
          
          <MetricCard
            title="Energia Total"
            value={`${((overview.lifeTimeData?.energy || 0) / 1000).toFixed(1)} MWh`}
            icon={TrendingUp}
            description="Desde o início"
          />
          
          <MetricCard
            title="Este Mês"
            value={`${((overview.lastMonthData?.energy || 0) / 1000).toFixed(1)} MWh`}
            icon={Activity}
            description="Produção mensal"
          />
          
          <MetricCard
            title="Receita Total"
            value={`R$ ${((overview.lifeTimeData?.revenue || 0)).toFixed(0)}`}
            icon={TrendingUp}
            description="Economia total"
          />
        </div>
      )}

      {/* System Status */}
      {plant.monitoring_system === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle>Sistema Manual</CardTitle>
            <CardDescription>
              Esta planta utiliza entrada manual de dados. Configure um sistema de monitoramento para obter dados em tempo real.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};
