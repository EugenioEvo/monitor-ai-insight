
export const processChartData = (energyData: any, localReadings: any[], period: 'DAY' | 'MONTH' | 'YEAR') => {
  console.log('Processing chart data for period:', period, 'energyData:', energyData, 'localReadings:', localReadings);
  
  if (energyData?.values) {
    return energyData.values.map((point: any) => {
      let dateLabel;
      
      switch (period) {
        case 'DAY':
          // Para período diário, mostrar data completa
          dateLabel = new Date(point.date).toLocaleDateString('pt-BR');
          break;
        case 'MONTH':
          // Para período mensal, mostrar dia do mês
          dateLabel = new Date(point.date).getDate().toString();
          break;
        case 'YEAR':
          // Para período anual, mostrar mês/ano
          dateLabel = new Date(point.date).toLocaleDateString('pt-BR', { 
            month: 'short', 
            year: 'numeric' 
          });
          break;
        default:
          dateLabel = new Date(point.date).toLocaleDateString('pt-BR');
      }
      
      return {
        date: dateLabel,
        energy: point.value / 1000, // Converter para kWh
        timestamp: point.date
      };
    });
  }

  if (localReadings && localReadings.length > 0) {
    const groupedByDay = localReadings.reduce((acc, reading) => {
      let dateKey, dateLabel;
      
      switch (period) {
        case 'DAY':
          dateKey = new Date(reading.timestamp).toLocaleDateString('pt-BR');
          dateLabel = dateKey;
          break;
        case 'MONTH':
          dateKey = new Date(reading.timestamp).toLocaleDateString('pt-BR');
          dateLabel = new Date(reading.timestamp).getDate().toString();
          break;
        case 'YEAR':
          const date = new Date(reading.timestamp);
          dateKey = `${date.getFullYear()}-${date.getMonth()}`;
          dateLabel = date.toLocaleDateString('pt-BR', { 
            month: 'short', 
            year: 'numeric' 
          });
          break;
        default:
          dateKey = new Date(reading.timestamp).toLocaleDateString('pt-BR');
          dateLabel = dateKey;
      }
      
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateLabel, energy: 0, power: 0, count: 0 };
      }
      acc[dateKey].energy += reading.energy_kwh;
      acc[dateKey].power += reading.power_w;
      acc[dateKey].count += 1;
      return acc;
    }, {} as any);

    return Object.values(groupedByDay).map((day: any) => ({
      ...day,
      power: day.power / day.count // Média da potência
    }));
  }

  return [];
};
