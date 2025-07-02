
import React from 'react';
import { SungrowPlantOverview } from './SungrowPlantOverview';
import { SolarEdgeOverview } from './SolarEdgeOverview';
import { SyncStatusMonitor } from './SyncStatusMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from './MetricCard';
import { Zap, Sun, TrendingUp, Calendar, MapPin, Activity } from 'lucide-react';
import { useEnergyData } from '@/hooks/useEnergyData';
import { useLocalReadings } from '@/hooks/useLocalReadings';
import { useAutoSync } from '@/hooks/useAutoSync';
import { ContextualErrorBoundary } from '@/components/ui/contextual-error-boundary';
import { DashboardSkeleton } from '@/components/ui/universal-skeleton';
import { useLogger } from '@/services/logger';
import type { Plant } from '@/types';

interface PlantOverviewProps {
  plant: Plant;
}

export const PlantOverview = ({ plant }: PlantOverviewProps) => {
  const logger = useLogger('PlantOverview');
  
  // Inicializar sincronização automática
  const { syncEnabled } = useAutoSync(plant);

  // Log da renderização principal
  React.useEffect(() => {
    logger.info('PlantOverview renderizado', {
      plantId: plant.id,
      plantName: plant.name,
      monitoringSystem: plant.monitoring_system,
      syncEnabled,
      capacity: plant.capacity_kwp
    });
  }, [plant.id, plant.name, plant.monitoring_system, syncEnabled, plant.capacity_kwp, logger]);

  // Se for planta Sungrow, usar componente específico
  if (plant.monitoring_system === 'sungrow') {
    return (
      <ContextualErrorBoundary
        context={{
          component: 'PlantOverview',
          feature: 'SungrowOverview',
          page: 'PlantDashboard',
          critical: true // Overview é crítico
        }}
        allowRetry={true}
        showReportBug={true}
      >
        <div className="space-y-6">
          <SungrowPlantOverview plant={plant} />
          <SyncStatusMonitor plant={plant} />
          
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
      </ContextualErrorBoundary>
    );
  }

  // Se for planta SolarEdge, usar componente específico
  if (plant.monitoring_system === 'solaredge') {
    return (
      <ContextualErrorBoundary
        context={{
          component: 'PlantOverview',
          feature: 'SolarEdgeOverview',
          page: 'PlantDashboard',
          critical: true
        }}
        allowRetry={true}
        showReportBug={true}
      >
        <div className="space-y-6">
          <SolarEdgeOverview plant={plant} />
          <SyncStatusMonitor plant={plant} />
          
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
      </ContextualErrorBoundary>
    );
  }

  // Fallback para plantas manuais ou outros sistemas
  const ManualPlantOverview = () => {
    const { data: energyData, isLoading: energyLoading, error: energyError } = useEnergyData(plant, 'DAY');
    const { data: localReadings, isLoading: readingsLoading } = useLocalReadings(plant);

    // Log dos dados carregados
    React.useEffect(() => {
      if (energyData) {
        logger.info('Dados de energia carregados', {
          plantId: plant.id,
          dataPoints: energyData.length,
          period: 'DAY'
        });
      }
      if (localReadings) {
        logger.info('Leituras locais carregadas', {
          plantId: plant.id,
          readingsCount: localReadings.length
        });
      }
      if (energyError) {
        logger.error('Erro ao carregar dados de energia', energyError as Error, {
          plantId: plant.id,
          monitoringSystem: plant.monitoring_system
        });
      }
    }, [energyData, localReadings, energyError, plant.id, plant.monitoring_system, logger]);

    const getStatusBadge = () => {
      if (plant.status === 'active') {
        return <Badge variant="default">Ativa</Badge>;
      } else if (plant.status === 'maintenance') {
        return <Badge variant="outline">Manutenção</Badge>;
      }
      return <Badge variant="destructive">Inativa</Badge>;
    };

    const todayEnergy = React.useMemo(() => {
      const energy = energyData?.reduce((sum, reading) => sum + (reading.energy_kwh || 0), 0) || 0;
      logger.debug('Calculada energia do dia', {
        plantId: plant.id,
        todayEnergy: energy,
        dataPoints: energyData?.length || 0
      });
      return energy;
    }, [energyData, plant.id, logger]);

    const currentPower = React.useMemo(() => {
      const power = localReadings?.[0]?.power_w || 0;
      logger.debug('Calculada potência atual', {
        plantId: plant.id,
        currentPower: power,
        hasReadings: Boolean(localReadings?.length)
      });
      return power;
    }, [localReadings, plant.id, logger]);

    if (energyLoading || readingsLoading) {
      logger.debug('Mostrando skeleton para overview manual', {
        plantId: plant.id,
        energyLoading,
        readingsLoading
      });
      return <DashboardSkeleton />;
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
        
        {/* Monitor de Sincronização para plantas não-manuais */}
        {plant.monitoring_system !== 'manual' && (
          <SyncStatusMonitor plant={plant} />
        )}
      </div>
    );
  };

  return (
    <ContextualErrorBoundary
      context={{
        component: 'PlantOverview',
        feature: 'ManualOverview',
        page: 'PlantDashboard'
      }}
      allowRetry={true}
      showReportBug={false}
    >
      <ManualPlantOverview />
    </ContextualErrorBoundary>
  );
};
