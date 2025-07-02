
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useSungrowEnergyData } from '@/hooks/useSungrowData';
import { PeriodSelector } from './PeriodSelector';
import { EnergyProductionChart } from './EnergyProductionChart';
import type { Plant } from '@/types';

interface SungrowProductionChartsProps {
  plant: Plant;
}

export const SungrowProductionCharts = ({ plant }: SungrowProductionChartsProps) => {
  const [period, setPeriod] = useState<'DAY' | 'MONTH' | 'YEAR'>('DAY');

  const { data: sungrowData, isLoading } = useSungrowEnergyData(
    plant, 
    period.toLowerCase() as 'day' | 'month' | 'year'
  );

  const chartData = React.useMemo(() => {
    if (!sungrowData || !Array.isArray(sungrowData)) return [];
    
    return sungrowData.map((item: SungrowEnergyData) => {
      let dateKey = 'time_str';
      let energyKey = 'energy_yield';
      
      // Adaptar para diferentes períodos
      if (period === 'DAY') {
        dateKey = 'time_str';
        energyKey = 'energy_yield';
      } else if (period === 'MONTH') {
        dateKey = 'time_str';
        energyKey = 'energy_yield';
      } else if (period === 'YEAR') {
        dateKey = 'time_str';
        energyKey = 'energy_yield';
      }

      return {
        date: item[dateKey] || item.time_str || 'N/A',
        energy: parseFloat(item[energyKey] || item.energy_yield || 0),
        time: item.time_str
      };
    }).filter(item => item.energy > 0);
  }, [sungrowData, period]);

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
    </div>
  );
};
