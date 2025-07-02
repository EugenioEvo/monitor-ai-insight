/**
 * Tipos específicos para APIs externas - eliminando uso de 'any'
 */

// Tipos para Sungrow API
export interface SungrowStationKpi {
  currentPower: number;
  dailyEnergy: number;
  monthlyEnergy: number;
  totalEnergy: number;
  co2Reduction: number;
  revenue: number;
  efficiency: number;
  timestamp: string;
}

export interface SungrowDevice {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  deviceSn: string;
  deviceModel: string;
  status: 'online' | 'offline' | 'maintenance';
  lastUpdate: string;
}

export interface SungrowEnergyData {
  timestamp: string;
  energy: number;
  power?: number;
}

export interface SungrowRealtimeData {
  deviceSn: string;
  deviceType: string;
  timestamp: string;
  parameters: Record<string, {
    value: number;
    unit: string;
    label: string;
  }>;
}

export interface SungrowApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  dataPointsSynced?: number;
}

// Tipos para SolarEdge API
export interface SolarEdgeOverview {
  currentPower: {
    power: number;
    unit: string;
  };
  lastDayData: {
    energy: number;
    unit: string;
  };
  lastMonthData: {
    energy: number;
    unit: string;
  };
  lastYearData: {
    energy: number;
    unit: string;
  };
  lifeTimeData: {
    energy: number;
    unit: string;
  };
}

export interface SolarEdgeEnergyData {
  timeUnit: string;
  unit: string;
  values: Array<{
    date: string;
    value: number;
  }>;
}

// Tipos para Chart Data
export interface ChartDataPoint {
  timestamp: string;
  energy: number;
  power?: number;
  date?: string;
  value?: number;
}

export interface ProcessedChartData extends ChartDataPoint {
  formattedDate?: string;
  normalizedValue?: number;
}

// Tipos para Invoice Processing
export interface OcrResult {
  success: boolean;
  data: InvoiceExtractedData;
  confidence?: number;
  processingTime?: number;
  method: 'openai' | 'google_vision' | 'tesseract';
}

export interface FileUploadResult {
  file: File;
  result: OcrResult | null;
  error?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

// Tipos para ML Pipeline
export interface MLModelStatus {
  model_name: string;
  version: string;
  accuracy: number;
  last_trained: string;
  status: 'active' | 'training' | 'inactive';
}

export interface MLFeedback {
  field: string;
  expected_value: unknown;
  actual_value: unknown;
  confidence: number;
  notes?: string;
}

// Tipos para Sync Operations
export interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  dataPointsSynced?: number;
  duration?: number;
  timestamp: string;
}

export interface SyncLogEntry {
  id: string;
  plant_id: string;
  system_type: string;
  status: 'success' | 'error' | 'warning';
  message?: string;
  data_points_synced: number;
  sync_duration_ms?: number;
  created_at: string;
}

// Type Guards para validação runtime
export const isSungrowApiResponse = (data: unknown): data is SungrowApiResponse => {
  return typeof data === 'object' && data !== null && 'success' in data;
};

export const isChartDataPoint = (data: unknown): data is ChartDataPoint => {
  return typeof data === 'object' && 
         data !== null && 
         'timestamp' in data && 
         'energy' in data;
};

export const isFileUploadResult = (data: unknown): data is FileUploadResult => {
  return typeof data === 'object' && 
         data !== null && 
         'file' in data && 
         'status' in data;
};

// Imports necessários
import type { InvoiceExtractedData } from './invoice';