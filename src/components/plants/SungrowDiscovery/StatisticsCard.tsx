import React from 'react';
import type { DiscoveryStatistics } from '@/services/sungrowDiscoveryService';

interface StatisticsCardProps {
  statistics: DiscoveryStatistics;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({ statistics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
      <div className="text-center">
        <p className="text-2xl font-bold text-primary">{statistics.total}</p>
        <p className="text-xs text-muted-foreground">Total</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-green-600">{statistics.online}</p>
        <p className="text-xs text-muted-foreground">Online</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-red-600">{statistics.offline}</p>
        <p className="text-xs text-muted-foreground">Offline</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-purple-600">{statistics.totalCapacity}kW</p>
        <p className="text-xs text-muted-foreground">Capacidade</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-orange-600">{statistics.averageCapacity}kW</p>
        <p className="text-xs text-muted-foreground">Média</p>
      </div>
    </div>
  );
};