// Data Quality & Health Types

export interface DataQualityScore {
  source_id: string;
  source_name: string;
  source_type: 'inverter' | 'meter' | 'weather' | 'scada' | 'api';
  
  overall_score: number; // 0-100
  timestamp: string;
  
  metrics: {
    completeness: DataCompletenessMetric;
    timeliness: DataTimelinessMetric;
    accuracy: DataAccuracyMetric;
    consistency: DataConsistencyMetric;
  };
  
  issues: DataQualityIssue[];
  auto_corrections_applied: AutoCorrection[];
}

export interface DataCompletenessMetric {
  score: number; // 0-100
  expected_points: number;
  actual_points: number;
  missing_points: number;
  
  // Gaps de dados
  gaps: {
    start: string;
    end: string;
    duration_minutes: number;
  }[];
  
  // Taxa de completude por período
  hourly_completeness: number;
  daily_completeness: number;
  weekly_completeness: number;
}

export interface DataTimelinessMetric {
  score: number; // 0-100
  average_latency_seconds: number;
  max_latency_seconds: number;
  
  // Delays significativos
  significant_delays: {
    timestamp: string;
    expected_at: string;
    received_at: string;
    delay_seconds: number;
  }[];
  
  last_update: string;
  is_live: boolean;
}

export interface DataAccuracyMetric {
  score: number; // 0-100
  
  // Outliers detectados
  outliers_count: number;
  outliers: {
    timestamp: string;
    value: number;
    expected_range: [number, number];
    field: string;
  }[];
  
  // Valores fisicamente impossíveis
  impossible_values: {
    timestamp: string;
    value: number;
    reason: string;
    field: string;
  }[];
  
  // Comparação com meteo
  meteo_correlation?: number; // -1 a 1
}

export interface DataConsistencyMetric {
  score: number; // 0-100
  
  // Inconsistências entre fontes
  cross_source_issues: {
    timestamp: string;
    source_a: string;
    source_b: string;
    field: string;
    value_a: number;
    value_b: number;
    deviation_percent: number;
  }[];
  
  // Unidades incorretas
  unit_mismatches: {
    field: string;
    expected_unit: string;
    detected_unit: string;
    confidence: number;
  }[];
  
  // Mudanças abruptas
  sudden_changes: {
    timestamp: string;
    field: string;
    previous_value: number;
    current_value: number;
    change_rate: number;
  }[];
}

export interface DataQualityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'completeness' | 'timeliness' | 'accuracy' | 'consistency';
  
  title: string;
  description: string;
  
  affected_period: {
    start: string;
    end: string;
  };
  
  affected_metrics: string[];
  estimated_impact: string;
  
  recommendation: string;
  auto_correctable: boolean;
  corrected: boolean;
  
  first_detected: string;
  last_seen: string;
  occurrence_count: number;
}

export interface AutoCorrection {
  timestamp: string;
  field: string;
  original_value: any;
  corrected_value: any;
  method: 'forward_fill' | 'interpolation' | 'meteo_reconciliation' | 'manual_rule';
  confidence: number;
  
  reasoning: string;
}

// Health Check consolidado
export interface SystemDataHealth {
  plant_id: string;
  overall_health: 'healthy' | 'degraded' | 'critical' | 'unknown';
  overall_score: number; // 0-100
  
  last_check: string;
  
  sources: DataQualityScore[];
  
  summary: {
    total_sources: number;
    healthy_sources: number;
    degraded_sources: number;
    critical_sources: number;
    
    avg_completeness: number;
    avg_timeliness: number;
    avg_accuracy: number;
    avg_consistency: number;
  };
  
  recommendations: string[];
  critical_issues: DataQualityIssue[];
}

// Reconciliação de dados
export interface DataReconciliation {
  timestamp: string;
  field: string;
  
  sources: {
    source_id: string;
    value: number;
    confidence: number;
  }[];
  
  reconciled_value: number;
  method: 'weighted_average' | 'best_source' | 'meteo_based' | 'model_based';
  confidence: number;
  
  notes?: string;
}

// Alertas de qualidade de dados
export interface DataQualityAlert {
  id: string;
  plant_id: string;
  source_id: string;
  
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'acknowledged' | 'resolved';
  
  title: string;
  description: string;
  
  detected_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  
  impact_assessment: {
    affected_systems: string[];
    data_loss_percent: number;
    estimated_generation_impact_kwh?: number;
  };
  
  recommended_actions: string[];
}
