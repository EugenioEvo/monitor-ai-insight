
/**
 * Types específicos para SolarEdge API
 * Definições completas e type-safe para todas as operações
 */

export interface SolarEdgeConfig {
  apiKey: string;
  siteId: string;
  baseUrl?: string;
}

export interface SolarEdgeOverview {
  overview: {
    lastUpdateTime: string;
    lifeTimeData: {
      energy: number;
      revenue: number;
    };
    lastYearData: {
      energy: number;
      revenue: number;
    };
    lastMonthData: {
      energy: number;
      revenue: number;
    };
    lastDayData: {
      energy: number;
      revenue: number;
    };
    currentPower: {
      power: number;
    };
    measuredBy: string;
  };
}

export interface SolarEdgePowerDetails {
  powerDetails: {
    timeUnit: 'QUARTER_OF_AN_HOUR' | 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
    unit: 'W' | 'Wh';
    meters: SolarEdgeMeter[];
  };
}

export interface SolarEdgeMeter {
  type: 'Production' | 'Consumption' | 'SelfConsumption' | 'FeedIn' | 'Purchased';
  values: SolarEdgeValue[];
}

export interface SolarEdgeValue {
  date: string;
  value: number | null;
}

export interface SolarEdgeEnergyDetails {
  energyDetails: {
    timeUnit: 'QUARTER_OF_AN_HOUR' | 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
    unit: 'Wh';
    meters: SolarEdgeMeter[];
  };
}

export interface SolarEdgeInventory {
  Inventory: {
    inverters: SolarEdgeInverter[];
  };
}

export interface SolarEdgeInverter {
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  communicationMethod: string;
  connectedOptimizers: number;
}

export interface SolarEdgeSiteDetails {
  details: {
    id: number;
    name: string;
    accountId: number;
    status: 'Active' | 'Pending' | 'Disabled';
    peakPower: number;
    lastUpdateTime: string;
    currency: string;
    installationDate: string;
    ptoDate: string | null;
    notes: string;
    type: string;
    location: {
      country: string;
      state: string;
      city: string;
      address: string;
      address2: string;
      zip: string;
      timeZone: string;
      countryCode: string;
      stateCode: string;
    };
    alertQuantity: number;
    alertSeverity: 'NONE' | 'WARNING' | 'ALERT';
    uris: {
      SITE_IMAGE: string;
      DATA_PERIOD: string;
      DETAILS: string;
      OVERVIEW: string;
    };
    publicSettings: {
      isPublic: boolean;
    };
  };
}

// Configurações específicas do SolarEdge
export interface SolarEdgeEndpoints {
  overview: string;
  details: string;
  powerDetails: string;
  energyDetails: string;
  inventory: string;
}

export const SOLAREDGE_DEFAULT_CONFIG = {
  baseUrl: 'https://monitoringapi.solaredge.com',
  endpoints: {
    overview: '/site/{siteId}/overview',
    details: '/site/{siteId}/details',
    powerDetails: '/site/{siteId}/powerDetails',
    energyDetails: '/site/{siteId}/energyDetails',
    inventory: '/site/{siteId}/inventory'
  } as SolarEdgeEndpoints,
  timeout: 30000,
  retryAttempts: 3,
  rateLimitPerMinute: 300, // SolarEdge permite 300 req/min
  cacheMinutes: 15
};

// Códigos de erro comuns do SolarEdge
export const SOLAREDGE_ERROR_CODES: Record<string, string> = {
  '400': 'Bad Request - Parâmetros inválidos',
  '403': 'Forbidden - API key inválida ou sem permissão',
  '404': 'Not Found - Site não encontrado',
  '429': 'Too Many Requests - Rate limit excedido',
  '500': 'Internal Server Error - Erro no servidor SolarEdge'
};

// Type guards para validação
export const isSolarEdgeOverview = (obj: any): obj is SolarEdgeOverview => {
  return obj && 
    obj.overview && 
    obj.overview.currentPower && 
    typeof obj.overview.currentPower.power === 'number';
};

export const isSolarEdgePowerDetails = (obj: any): obj is SolarEdgePowerDetails => {
  return obj && 
    obj.powerDetails && 
    Array.isArray(obj.powerDetails.meters);
};

export const isSolarEdgeEnergyDetails = (obj: any): obj is SolarEdgeEnergyDetails => {
  return obj && 
    obj.energyDetails && 
    Array.isArray(obj.energyDetails.meters);
};

// Utilitários de conversão e normalização
export const normalizeSolarEdgeOverview = (overview: SolarEdgeOverview['overview']) => ({
  currentPower: overview.currentPower.power / 1000, // Converter W para kW
  dailyEnergy: overview.lastDayData.energy / 1000, // Converter Wh para kWh
  monthlyEnergy: overview.lastMonthData.energy / 1000,
  yearlyEnergy: overview.lastYearData.energy / 1000,
  lifetimeEnergy: overview.lifeTimeData.energy / 1000,
  lastUpdate: overview.lastUpdateTime,
  dailyRevenue: overview.lastDayData.revenue,
  monthlyRevenue: overview.lastMonthData.revenue,
  measuredBy: overview.measuredBy
});

export const normalizePowerDetails = (powerDetails: SolarEdgePowerDetails['powerDetails']) => {
  const productionMeter = powerDetails.meters.find(m => m.type === 'Production');
  if (!productionMeter) return [];

  return productionMeter.values.map(value => ({
    timestamp: value.date,
    power: value.value ? value.value / 1000 : 0, // Converter W para kW
    unit: 'kW'
  }));
};

export const normalizeEnergyDetails = (energyDetails: SolarEdgeEnergyDetails['energyDetails']) => {
  const productionMeter = energyDetails.meters.find(m => m.type === 'Production');
  if (!productionMeter) return [];

  return productionMeter.values.map(value => ({
    timestamp: value.date,
    energy: value.value ? value.value / 1000 : 0, // Converter Wh para kWh
    unit: 'kWh'
  }));
};

// Validadores de configuração
export const validateSolarEdgeConfig = (config: Partial<SolarEdgeConfig>): config is SolarEdgeConfig => {
  return Boolean(
    config.apiKey && 
    config.apiKey.length >= 20 &&
    config.siteId &&
    config.siteId.length >= 1
  );
};

// Utilitários para construção de URLs
export const buildSolarEdgeUrl = (
  endpoint: string, 
  siteId: string, 
  params: Record<string, string> = {},
  baseUrl: string = SOLAREDGE_DEFAULT_CONFIG.baseUrl
): string => {
  const url = `${baseUrl}${endpoint.replace('{siteId}', siteId)}`;
  const searchParams = new URLSearchParams(params);
  return `${url}?${searchParams.toString()}`;
};

// Formatadores de data para SolarEdge API
export const formatDateForSolarEdge = (date: Date): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const formatDateTimeForSolarEdge = (date: Date): string => {
  return date.toISOString().slice(0, 19); // YYYY-MM-DDTHH:mm:ss
};

// Períodos suportados pelo SolarEdge
export type SolarEdgeTimeUnit = 'QUARTER_OF_AN_HOUR' | 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export const getSolarEdgeTimeUnit = (period: 'DAY' | 'MONTH' | 'YEAR'): SolarEdgeTimeUnit => {
  switch (period) {
    case 'DAY':
      return 'QUARTER_OF_AN_HOUR';
    case 'MONTH':
      return 'DAY';
    case 'YEAR':
      return 'MONTH';
    default:
      return 'DAY';
  }
};
