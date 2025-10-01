// Digital Twin Types - Modelo executável da planta

export interface DigitalTwinConfig {
  id: string;
  plant_id: string;
  version: string;
  created_at: string;
  updated_at: string;
  
  // Configuração física
  layout: PlantLayout;
  strings: StringConfig[];
  inverters: InverterConfig[];
  trackers?: TrackerConfig[];
  
  // Perdas e eficiência
  losses: LossesConfig;
  performance_ratio_target: number; // PR alvo (%)
  
  // Contexto ambiental
  environmental_context: EnvironmentalContext;
  
  // Metadados
  baseline_model: BaselineModel;
  calibration_date?: string;
  validation_metrics?: ValidationMetrics;
}

export interface PlantLayout {
  total_area_m2: number;
  module_count: number;
  module_wp: number; // Potência de cada módulo
  tilt_angle: number; // Inclinação (graus)
  azimuth: number; // Azimute (graus, 0=Norte, 90=Leste, 180=Sul, 270=Oeste)
  ground_coverage_ratio: number; // GCR
  tracker_type?: 'fixed' | 'single_axis' | 'dual_axis';
}

export interface StringConfig {
  id: string;
  name: string;
  inverter_id: string;
  mppt_input: number;
  module_count: number;
  configuration: string; // e.g., "2x12" (série x paralelo)
  orientation: {
    tilt: number;
    azimuth: number;
  };
  shading_profile?: ShadingProfile;
}

export interface InverterConfig {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  rated_power_kw: number;
  efficiency_curve: EfficiencyCurve;
  mppt_count: number;
  connection_type: 'grid' | 'hybrid';
  location?: {
    x: number;
    y: number;
    zone?: string;
  };
}

export interface TrackerConfig {
  id: string;
  name: string;
  type: 'single_axis' | 'dual_axis';
  backtracking_enabled: boolean;
  max_angle: number;
  strings_attached: string[];
}

export interface LossesConfig {
  // Perdas fixas (%)
  soiling: number; // Sujidade
  shading: number; // Sombreamento
  mismatch: number; // Descasamento
  wiring: number; // Cabeamento
  connections: number; // Conexões
  lid: number; // Light-Induced Degradation
  
  // Perdas variáveis (função de condições)
  temperature_coefficient: number; // %/°C
  irradiance_threshold: number; // W/m² mínimo
  
  // Degradação anual
  annual_degradation: number; // %/ano
  
  // Disponibilidade
  grid_availability: number; // %
  system_availability: number; // %
}

export interface EnvironmentalContext {
  // Meteo reference
  weather_station_id?: string;
  
  // Soiling model
  soiling_seasonal: {
    month: number;
    factor: number; // 0-1, quanto maior, mais limpo
  }[];
  last_cleaning_date?: string;
  cleaning_frequency_days?: number;
  
  // Shading
  shading_profile?: {
    hour: number;
    month: number;
    loss_factor: number; // 0-1
  }[];
  
  // Local conditions
  altitude_m: number;
  albedo: number; // Refletividade do solo (0-1)
}

export interface EfficiencyCurve {
  // Curva de eficiência do inversor (potência DC vs eficiência)
  points: {
    dc_power_ratio: number; // 0-1 (% da potência nominal)
    efficiency: number; // 0-1
  }[];
}

export interface ShadingProfile {
  // Perfil de sombreamento ao longo do dia/ano
  data: {
    hour: number;
    month: number;
    loss_percent: number;
  }[];
}

export interface BaselineModel {
  model_type: 'pvlib' | 'regression' | 'hybrid';
  parameters: Record<string, any>;
  
  // Últimas calibrações
  last_training_date?: string;
  training_period_days?: number;
  
  // Performance
  r2_score?: number;
  mae_kwh?: number;
  mape_percent?: number;
}

export interface ValidationMetrics {
  validation_period: {
    start: string;
    end: string;
  };
  actual_vs_expected: {
    correlation: number;
    bias_percent: number;
    rmse_kwh: number;
  };
  pr_comparison: {
    actual_pr: number;
    target_pr: number;
    gap_percent: number;
  };
}

// Baseline dinâmico hora-a-hora
export interface BaselineForecast {
  timestamp: string;
  expected_generation_kwh: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  factors: {
    poa_irradiance: number; // POA = Plane of Array (W/m²)
    ambient_temp: number;
    cell_temp_estimated: number;
    soiling_factor: number;
    shading_factor: number;
    system_efficiency: number;
  };
  metadata: {
    model_version: string;
    last_calibration: string;
  };
}

// Performance Gap Analysis
export interface PerformanceGap {
  timestamp: string;
  actual_kwh: number;
  expected_kwh: number;
  gap_kwh: number;
  gap_percent: number;
  
  // Root cause analysis
  probable_causes: {
    cause: string;
    confidence: number; // 0-1
    estimated_impact_kwh: number;
  }[];
  
  // Financial impact
  estimated_loss_brl?: number;
  
  // Alert triggered?
  alert_triggered: boolean;
  alert_id?: string;
}

// PR dinâmico
export interface DynamicPR {
  timestamp: string;
  actual_pr: number;
  target_pr: number;
  weather_corrected_pr: number;
  
  // Breakdown por componente
  pr_breakdown: {
    component: string;
    efficiency: number;
    loss_factor: number;
  }[];
}
