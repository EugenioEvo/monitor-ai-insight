
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useEnergyData } from '@/hooks/useEnergyData';
import { useLocalReadings } from '@/hooks/useLocalReadings';
import { PeriodSelector } from './PeriodSelector';
import { EnergyProductionChart } from './EnergyProductionChart';
import { PowerChart } from './PowerChart';
import { SungrowProductionCharts } from './SungrowProductionCharts';
import { SolarEdgeProductionCharts } from './SolarEdgeProductionCharts';
import { processChartData } from '@/utils/chartDataProcessor';
import { ContextualErrorBoundary } from '@/components/ui/contextual-error-boundary';
import { ChartSkeleton } from '@/components/ui/universal-skeleton';
import { useLogger } from '@/services/logger';
import type { Plant } from '@/types';

interface ProductionChartsProps {
  plant: Plant;
}

export const ProductionCharts = ({ plant }: ProductionChartsProps) => {
  const logger = useLogger('ProductionCharts');
  const [period, setPeriod] = useState<'DAY' | 'MONTH' | 'YEAR'>('DAY');

  // Log da renderização do componente
  React.useEffect(() => {
    logger.info('ProductionCharts renderizado', {
      plantId: plant.id,
      plantName: plant.name,
      monitoringSystem: plant.monitoring_system,
      period
    });
  }, [plant.id, plant.monitoring_system, period, logger]);

  // Se for planta Sungrow, usar componente específico
  if (plant.monitoring_system === 'sungrow') {
    return (
      <ContextualErrorBoundary
        context={{
          component: 'ProductionCharts',
          feature: 'SungrowCharts',
          page: 'PlantDashboard'
        }}
        allowRetry={true}
        showReportBug={true}
      >
        <SungrowProductionCharts plant={plant} />
      </ContextualErrorBoundary>
    );
  }

  // Se for planta SolarEdge, usar componente específico
  if (plant.monitoring_system === 'solaredge') {
    return (
      <ContextualErrorBoundary
        context={{
          component: 'ProductionCharts',
          feature: 'SolarEdgeCharts',
          page: 'PlantDashboard'
        }}
        allowRetry={true}
        showReportBug={true}
      >
        <SolarEdgeProductionCharts plant={plant} />
      </ContextualErrorBoundary>
    );
  }

  // Fallback para plantas manuais ou outros sistemas
  const { data: energyData, isLoading, error } = useEnergyData(plant, period);
  const { data: localReadings } = useLocalReadings(plant);

  const chartData = React.useMemo(() => {
    const timer = logger.startTimer('processChartData', {
      plantId: plant.id,
      period,
      dataPoints: energyData?.length || 0
    });
    
    try {
      const result = processChartData(energyData, localReadings, period);
      timer(); // Finalizar timer
      return result;
    } catch (error) {
      logger.error('Erro ao processar dados do gráfico', error as Error, {
        plantId: plant.id,
        period,
        hasEnergyData: Boolean(energyData),
        hasLocalReadings: Boolean(localReadings)
      });
      timer(); // Finalizar timer mesmo em caso de erro
      return [];
    }
  }, [energyData, localReadings, period, logger, plant.id]);

  // Log de error se houver
  React.useEffect(() => {
    if (error) {
      logger.error('Erro ao carregar dados de energia', error as Error, {
        plantId: plant.id,
        period,
        monitoringSystem: plant.monitoring_system
      });
    }
  }, [error, logger, plant.id, plant.monitoring_system, period]);

  if (isLoading) {
    logger.debug('Mostrando skeleton de loading', {
      plantId: plant.id,
      period
    });
    
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (error) {
    logger.warn('Fallback para erro de carregamento', {
      plantId: plant.id,
      error: (error as Error).message
    });
  }

  return (
    <ContextualErrorBoundary
      context={{
        component: 'ProductionCharts',
        feature: 'ManualCharts',
        page: 'PlantDashboard'
      }}
      allowRetry={true}
      showReportBug={false}
    >
      <div className="space-y-6">
        <PeriodSelector period={period} onPeriodChange={setPeriod} />
        <EnergyProductionChart chartData={chartData} period={period} plant={plant} />
        <PowerChart chartData={chartData} localReadings={localReadings?.map(r => ({ ...r, energy: r.energy_kwh, timestamp: r.timestamp }))} />
      </div>
    </ContextualErrorBoundary>
  );
};
