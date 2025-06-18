
export const processChartData = (energyData: any, localReadings: any[]) => {
  if (energyData?.values) {
    return energyData.values.map((point: any) => ({
      date: new Date(point.date).toLocaleDateString('pt-BR'),
      energy: point.value / 1000, // Converter para kWh
      timestamp: point.date
    }));
  }

  if (localReadings) {
    const groupedByDay = localReadings.reduce((acc, reading) => {
      const date = new Date(reading.timestamp).toLocaleDateString('pt-BR');
      if (!acc[date]) {
        acc[date] = { date, energy: 0, power: 0, count: 0 };
      }
      acc[date].energy += reading.energy_kwh;
      acc[date].power += reading.power_w;
      acc[date].count += 1;
      return acc;
    }, {} as any);

    return Object.values(groupedByDay).map((day: any) => ({
      ...day,
      power: day.power / day.count // Média da potência
    }));
  }

  return [];
};
