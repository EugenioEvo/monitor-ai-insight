
/**
 * Types específicos para Sungrow API
 * Definições completas e type-safe para todas as operações
 */

export interface SungrowConfig {
  authMode: 'direct' | 'oauth2';
  username?: string;
  password?: string;
  appkey: string;
  accessKey?: string;
  plantId?: string;
  baseUrl?: string;
  // OAuth2 specific fields
  authorizationCode?: string;
  redirectUri?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  authorizedPlants?: string[];
}

export interface SungrowAuthResponse {
  result_code: string;
  result_msg: string;
  token?: string;
  expire_time?: number;
}

export interface SungrowOAuth2Response {
  req_serial_num: string;
  result_code: string;
  result_msg: string;
  result_data?: {
    access_token: string;
    token_type: string;
    refresh_token: string;
    expires_in: number;
    auth_ps_list: string[];
    auth_user: number;
  };
}

export interface SungrowStationRealKpi {
  result_code: string;
  result_msg: string;
  result_data: {
    p83022: number; // Potência atual (kW)
    p83025: number; // Energia hoje (kWh)
    p83106: number; // Temperatura do inversor (°C)
    p83097: number; // Irradiação (W/m²)
    p83080: number; // Tensão DC (V)
    p83081: number; // Corrente DC (A)
    p83074: number; // Frequência AC (Hz)
    p83075: number; // Tensão AC (V)
    p83076: number; // Corrente AC (A)
    efficiency?: number; // Eficiência (%)
    co2_reduce?: number; // CO2 evitado (kg)
  };
}

export interface SungrowStationList {
  result_code: string;
  result_msg: string;
  result_data: {
    page_list: SungrowStation[];
    page_count: number;
    page_size: number;
    page_no: number;
    total_count: number;
  };
}

export interface SungrowStation {
  ps_id: number;
  ps_name: string;
  ps_capacity_kw: string;
  ps_location: string;
  ps_status: number;
  ps_status_text: string;
  ps_latitude: string;
  ps_longitude: string;
  create_date: string;
  ps_type: number;
  ps_type_text: string;
}

export interface SungrowEnergyData {
  result_code: string;
  result_msg: string;
  result_data: {
    list: SungrowEnergyPoint[];
  };
}

export interface SungrowEnergyPoint {
  time: string;
  power: number;
  energy: number;
  irradiation?: number;
  temperature?: number;
}

export interface SungrowDeviceList {
  result_code: string;
  result_msg: string;
  result_data: {
    list: SungrowDevice[];
  };
}

export interface SungrowDevice {
  device_id: number;
  device_name: string;
  device_type: number;
  device_type_text: string;
  device_code: string;
  device_status: number;
  device_status_text: string;
  nominal_power: number;
  install_date: string;
  last_update_time: string;
}

export interface SungrowDeviceRealTimeData {
  result_code: string;
  result_msg: string;
  result_data: {
    list: SungrowDeviceData[];
  };
}

export interface SungrowDeviceData {
  device_id: number;
  device_name: string;
  data_list: SungrowDataPoint[];
}

export interface SungrowDataPoint {
  key: string;
  value: string;
  unit: string;
  description?: string;
}

// Configurações específicas do Sungrow
export interface SungrowEndpoints {
  login: string;
  deviceList: string;
  stationRealKpi: string;
  stationEnergy: string;
  deviceRealTimeData: string;
  stationList: string;
}

export const SUNGROW_DEFAULT_CONFIG = {
  baseUrl: 'https://gateway.isolarcloud.com.hk',
  endpoints: {
    login: '/openapi/login',
    deviceList: '/openapi/getDeviceList',
    stationRealKpi: '/openapi/getStationRealKpi',
    stationEnergy: '/openapi/getStationEnergy',
    deviceRealTimeData: '/openapi/getDeviceRealTimeData',
    stationList: '/openapi/getStationList'
  } as SungrowEndpoints,
  timeout: 45000,
  retryAttempts: 3,
  minRequestInterval: 350,
  tokenTtlMinutes: 55
};

// Códigos de erro da Sungrow API
export const SUNGROW_ERROR_CODES: Record<string, string> = {
  '1': 'Sucesso',
  '0': 'Falha geral',
  '401': 'Não autorizado - Token inválido',
  '403': 'Acesso negado',
  '500': 'Erro interno do servidor',
  '1001': 'Parâmetros inválidos',
  '1002': 'Token expirado',
  '1003': 'Usuário não encontrado',
  '1004': 'Senha incorreta',
  '1005': 'Conta bloqueada',
  '1006': 'Limite de sessões excedido'
};

// Type guards para validação
export const isSungrowAuthResponse = (obj: any): obj is SungrowAuthResponse => {
  return obj && typeof obj.result_code === 'string' && typeof obj.result_msg === 'string';
};

export const isSungrowStationRealKpi = (obj: any): obj is SungrowStationRealKpi => {
  return obj && 
    typeof obj.result_code === 'string' && 
    obj.result_data && 
    typeof obj.result_data.p83022 === 'number';
};

export const isSungrowStationList = (obj: any): obj is SungrowStationList => {
  return obj && 
    typeof obj.result_code === 'string' && 
    obj.result_data && 
    Array.isArray(obj.result_data.page_list);
};

// Utilitários de conversão
export const normalizeSungrowStation = (station: SungrowStation) => ({
  id: station.ps_id.toString(),
  ps_id: station.ps_id,
  name: station.ps_name,
  capacity: parseFloat(station.ps_capacity_kw) || 0,
  location: station.ps_location,
  status: station.ps_status_text || 'Unknown',
  installationDate: station.create_date,
  latitude: parseFloat(station.ps_latitude) || 0,
  longitude: parseFloat(station.ps_longitude) || 0,
  type: station.ps_type_text || 'Solar'
});

export const normalizeSungrowKpi = (kpi: SungrowStationRealKpi['result_data']) => ({
  currentPower: kpi.p83022 || 0,
  dailyEnergy: kpi.p83025 || 0,
  temperature: kpi.p83106,
  irradiation: kpi.p83097,
  dcVoltage: kpi.p83080,
  dcCurrent: kpi.p83081,
  acFrequency: kpi.p83074,
  acVoltage: kpi.p83075,
  acCurrent: kpi.p83076,
  efficiency: kpi.efficiency,
  co2Reduction: kpi.co2_reduce
});

// Validadores de configuração
export const validateSungrowConfig = (config: Partial<SungrowConfig>): config is SungrowConfig => {
  if (!config.appkey) return false;
  
  if (config.authMode === 'oauth2') {
    return Boolean(
      config.authorizationCode || config.accessToken
    );
  }
  
  // Modo direct (padrão)
  return Boolean(
    config.username &&
    config.password &&
    config.accessKey
  );
};

export const validateSungrowPlantConfig = (config: Partial<SungrowConfig>): boolean => {
  return validateSungrowConfig(config) && Boolean(config.plantId);
};

// Type guard para OAuth2 response
export const isSungrowOAuth2Response = (obj: any): obj is SungrowOAuth2Response => {
  return obj && 
    typeof obj.result_code === 'string' && 
    typeof obj.result_msg === 'string' &&
    typeof obj.req_serial_num === 'string';
};
