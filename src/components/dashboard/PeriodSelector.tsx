
import React from 'react';
import { Button } from '@/components/ui/button';

interface PeriodSelectorProps {
  period: 'DAY' | 'MONTH' | 'YEAR';
  onPeriodChange: (period: 'DAY' | 'MONTH' | 'YEAR') => void;
}

export const PeriodSelector = ({ period, onPeriodChange }: PeriodSelectorProps) => {
  return (
    <div className="flex gap-2">
      <Button
        variant={period === 'DAY' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPeriodChange('DAY')}
      >
        Diário
      </Button>
      <Button
        variant={period === 'MONTH' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPeriodChange('MONTH')}
      >
        Mensal
      </Button>
      <Button
        variant={period === 'YEAR' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPeriodChange('YEAR')}
      >
        Anual
      </Button>
    </div>
  );
};
