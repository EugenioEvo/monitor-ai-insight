
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
import type { Plant } from '@/types';

interface ProductionChartsProps {
  plant: Plant;
}

export const ProductionCharts = ({ plant }: ProductionChartsProps) => {
  // Se for planta Sungrow, usar componente específico
  if (plant.monitoring_system === 'sungrow') {
    return <SungrowProductionCharts plant={plant} />;
  }

  // Se for planta SolarEdge, usar componente específico
  if (plant.monitoring_system === 'solaredge') {
    return <SolarEdgeProductionCharts plant={plant} />;
  }

  // Fallback para plantas manuais ou outros sistemas
  const [period, setPeriod] = useState<'DAY' | 'MONTH' | 'YEAR'>('DAY');

  const { data: energyData, isLoading } = useEnergyData(plant, period);
  const { data: localReadings } = useLocalReadings(plant);

  const chartData = React.useMemo(() => {
    return processChartData(energyData, localReadings, period);
  }, [energyData, localReadings, period]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <div className="p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PeriodSelector period={period} onPeriodChange={setPeriod} />
      <EnergyProductionChart chartData={chartData} period={period} plant={plant} />
      <PowerChart chartData={chartData} localReadings={localReadings} />
    </div>
  );
};
