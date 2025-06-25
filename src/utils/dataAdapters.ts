
// Data adapters to normalize different API responses
export interface NormalizedPlantData {
  currentPower: number; // kW
  dailyEnergy: number; // kWh
  monthlyEnergy: number; // kWh
  totalEnergy: number; // kWh
  efficiency: number; // %
  lastUpdate: string;
  status: 'online' | 'offline' | 'warning';
}

export interface NormalizedChartData {
  date: string;
  energy: number;
  power?: number;
  time?: string;
}

export const solarEdgeDataAdapter = {
  normalizeOverview: (energyData: any, currentPower: number = 0, plant: any): NormalizedPlantData => {
    // Garantir que energyData seja tratado corretamente
    let dailyEnergy = 0;
    
    if (energyData && energyData.values && Array.isArray(energyData.values)) {
      // Se energyData tem uma estrutura de SolarEdge com values array
      dailyEnergy = energyData.values.reduce((sum: number, reading: any) => {
        const value = reading.value || reading.energy || 0;
        return sum + (typeof value === 'number' ? value / 1000 : 0); // Convert Wh to kWh
      }, 0);
    } else if (Array.isArray(energyData)) {
      // Se energyData é um array direto
      dailyEnergy = energyData.reduce((sum: number, reading: any) => {
        const value = reading.value || reading.energy || 0;
        return sum + (typeof value === 'number' ? value / 1000 : 0); // Convert Wh to kWh
      }, 0);
    } else if (energyData && typeof energyData === 'object') {
      // Se energyData é um objeto único
      const value = energyData.value || energyData.energy || 0;
      dailyEnergy = typeof value === 'number' ? value / 1000 : 0; // Convert Wh to kWh
    }

    const efficiency = plant && plant.capacity_kwp > 0 ? (currentPower / 1000 / plant.capacity_kwp * 100) : 0;
    
    return {
      currentPower: currentPower / 1000, // Convert W to kW
      dailyEnergy,
      monthlyEnergy: dailyEnergy, // SolarEdge doesn't provide monthly directly
      totalEnergy: dailyEnergy, // Would need separate API call
      efficiency,
      lastUpdate: new Date().toISOString(),
      status: currentPower > 0 ? 'online' : 'offline'
    };
  },

  normalizeChartData: (energyData: any, period: string): NormalizedChartData[] => {
    if (!energyData) return [];
    
    let dataArray: any[] = [];
    
    if (energyData.values && Array.isArray(energyData.values)) {
      // SolarEdge API format
      dataArray = energyData.values;
    } else if (Array.isArray(energyData)) {
      // Direct array format
      dataArray = energyData;
    } else {
      // Single object or unknown format
      return [];
    }
    
    return dataArray.map((item: any) => ({
      date: item.date || item.time || 'N/A',
      energy: parseFloat(item.value || item.energy || 0) / 1000, // Convert Wh to kWh
      power: item.power ? parseFloat(item.power) : undefined,
      time: item.time || item.date
    })).filter(item => item.energy > 0);
  }
};

export const sungrowDataAdapter = {
  normalizeOverview: (sungrowData: any): NormalizedPlantData => {
    if (!sungrowData) {
      return {
        currentPower: 0,
        dailyEnergy: 0,
        monthlyEnergy: 0,
        totalEnergy: 0,
        efficiency: 0,
        lastUpdate: new Date().toISOString(),
        status: 'offline'
      };
    }

    return {
      currentPower: parseFloat(sungrowData.p83022 || 0), // Already in kW
      dailyEnergy: parseFloat(sungrowData.p83025 || 0), // kWh
      monthlyEnergy: parseFloat(sungrowData.p83030 || 0) / 1000, // Convert to MWh
      totalEnergy: parseFloat(sungrowData.p83106 || 0) / 1000000, // Convert to MWh
      efficiency: sungrowData.p83022 > 0 ? 95 : 0, // Estimated efficiency
      lastUpdate: new Date().toISOString(),
      status: sungrowData.p83022 > 0 ? 'online' : 'offline'
    };
  },

  normalizeChartData: (sungrowData: any[], period: string): NormalizedChartData[] => {
    if (!sungrowData || !Array.isArray(sungrowData)) return [];

    return sungrowData.map(item => ({
      date: item.time_str || item.date || 'N/A',
      energy: parseFloat(item.energy_yield || item.energy || 0),
      time: item.time_str
    })).filter(item => item.energy > 0);
  }
};
