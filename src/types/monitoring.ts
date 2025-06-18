
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

// Interfaces compatíveis com Json type (index signature added)
export interface SolarEdgeConfig {
  apiKey: string;
  siteId: string;
  username?: string;
  password?: string;
  [key: string]: any; // Index signature para compatibilidade com Json
}

export interface SungrowConfig {
  username: string;
  password: string;
  appkey: string;
  plantId: string;
  baseUrl?: string;
  [key: string]: any; // Index signature para compatibilidade com Json
}

export interface MonitoringSystemStatus {
  connected: boolean;
  lastSync?: string;
  lastError?: string;
  totalDataPoints: number;
}
