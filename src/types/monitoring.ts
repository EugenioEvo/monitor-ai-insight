
export interface MonitoringConfig {
  id: string;
  plant_id: string;
  system_type: 'solaredge' | 'sungrow';
  config_data: any;
  sync_interval_minutes: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  plant_id: string;
  system_type: string;
  status: 'success' | 'error' | 'warning';
  message?: string;
  data_points_synced: number;
  sync_duration_ms?: number;
  created_at: string;
}

// Enhanced interfaces with new capabilities
export interface SolarEdgeConfig {
  apiKey: string;
  siteId: string;
  username?: string;
  password?: string;
  [key: string]: any;
}

export interface SungrowConfig {
  username: string;
  password: string;
  appkey: string;
  accessKey: string;
  plantId?: string; // Optional for plant discovery
  baseUrl?: string;
  [key: string]: any;
}

export interface MonitoringSystemStatus {
  connected: boolean;
  lastSync?: string;
  lastError?: string;
  totalDataPoints: number;
  cacheStatus?: {
    hitRate: number;
    totalRequests: number;
    cacheSize: number;
  };
  rateLimitStatus?: {
    currentDelay: number;
    isLimited: boolean;
    nextResetTime?: string;
  };
}

// New interfaces for enhanced monitoring
export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  deviceSn: string;
  deviceModel: string;
  status: 'online' | 'offline' | 'maintenance';
  lastUpdate: string;
}

export interface StationKpi {
  currentPower: number; // kW
  dailyEnergy: number; // kWh
  monthlyEnergy: number; // kWh
  totalEnergy: number; // kWh
  co2Reduction: number; // kg
  revenue: number; // currency
  efficiency: number; // %
  timestamp: string;
}

export interface DeviceRealtimeData {
  deviceSn: string;
  deviceType: string;
  timestamp: string;
  parameters: {
    [key: string]: {
      value: number;
      unit: string;
      label: string;
    };
  };
}

export interface ApiMetrics {
  reqSerialNum: string;
  endpoint: string;
  duration: number;
  rowCount: number;
  resultCode: number;
  timestamp: string;
  cached: boolean;
}

export interface EnhancedPlantData {
  basicInfo: {
    plantId: string;
    plantName: string;
    capacity: number;
    location: string;
    status: string;
    timezone: string;
  };
  realtimeKpis: StationKpi;
  devices: DeviceInfo[];
  energyHistory: {
    period: 'day' | 'month' | 'year';
    data: {
      timestamp: string;
      energy: number;
      power?: number;
    }[];
  };
  systemHealth: {
    uptime: number;
    errorRate: number;
    lastMaintenance: string;
  };
}
