
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useEnergyData } from '@/hooks/useEnergyData';
import { useLocalReadings } from '@/hooks/useLocalReadings';
import { PeriodSelector } from './PeriodSelector';
import { EnergyProductionChart } from './EnergyProductionChart';
import { PowerChart } from './PowerChart';
import { processChartData } from '@/utils/chartDataProcessor';
import type { Plant } from '@/types';

interface ProductionChartsProps {
  plant: Plant;
}

export const ProductionCharts = ({ plant }: ProductionChartsProps) => {
  const [period, setPeriod] = useState<'DAY' | 'MONTH' | 'YEAR'>('DAY');

  const { data: energyData, isLoading } = useEnergyData(plant, period);
  const { data: localReadings } = useLocalReadings(plant);

  const chartData = React.useMemo(() => {
    return processChartData(energyData, localReadings);
  }, [energyData, localReadings]);

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
