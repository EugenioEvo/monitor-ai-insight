// Plant Audit Types - 2-4% Quick Wins

export interface PlantAudit {
  id: string;
  plant_id: string;
  audit_date: string;
  period_analyzed: {
    start: string;
    end: string;
  };
  
  overall_status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  total_recoverable_generation_kwh: number;
  total_recoverable_value_brl: number;
  recoverable_percent: number; // % de ganho potencial vs geração atual
  
  findings: AuditFinding[];
  recommendations: AuditRecommendation[];
  
  created_at: string;
  created_by?: string;
}

export interface AuditFinding {
  id: string;
  category: 'soiling' | 'mismatch' | 'mppt' | 'clipping' | 'outage' | 'degradation' | 'shading' | 'thermal' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  title: string;
  description: string;
  
  // Impacto quantificado
  estimated_loss_kwh_year: number;
  estimated_loss_brl_year: number;
  loss_percent: number; // % da geração total
  
  // Evidências
  evidence: {
    type: 'chart' | 'metric' | 'comparison' | 'iv_curve' | 'thermal_image';
    data: any;
    description: string;
  }[];
  
  // Causas prováveis
  probable_root_causes: string[];
  confidence: number; // 0-1
  
  // Temporal
  first_detected?: string;
  frequency?: 'constant' | 'intermittent' | 'seasonal';
  
  affected_components?: string[];
}

export interface AuditRecommendation {
  id: string;
  finding_id: string;
  priority: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  
  action: string;
  description: string;
  
  // ROI
  estimated_cost_brl?: number;
  estimated_annual_benefit_brl: number;
  payback_months?: number;
  
  // Implementação
  implementation_time_hours?: number;
  required_resources?: string[];
  requires_specialist: boolean;
  
  // Ganho esperado
  expected_generation_increase_kwh_year: number;
  expected_increase_percent: number;
  
  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  
  created_at: string;
  completed_at?: string;
  notes?: string;
}

// Análises específicas
export interface SoilingAnalysis {
  average_soiling_loss_percent: number;
  estimated_cleaning_interval_days: number;
  days_since_last_cleaning?: number;
  
  seasonal_pattern: {
    month: number;
    avg_loss_percent: number;
  }[];
  
  recommended_cleaning_frequency_days: number;
  annual_cost_of_soiling_brl: number;
  optimal_cleaning_cost_brl?: number;
}

export interface MismatchAnalysis {
  total_mismatch_loss_percent: number;
  
  string_level_mismatch: {
    string_id: string;
    string_name: string;
    mismatch_percent: number;
    compared_to_avg: number;
    probable_causes: string[];
  }[];
  
  module_level_issues?: {
    affected_modules: number;
    estimated_defective_modules: number;
    recommended_action: string;
  };
  
  annual_cost_of_mismatch_brl: number;
}

export interface MPPTAnalysis {
  inverters_with_issues: {
    inverter_id: string;
    inverter_name: string;
    mppt_inputs: {
      mppt_number: number;
      tracking_efficiency: number; // %
      loss_vs_ideal: number;
      status: 'optimal' | 'degraded' | 'failing';
    }[];
    overall_tracking_efficiency: number;
  }[];
  
  average_tracking_efficiency: number;
  estimated_loss_kwh_year: number;
  
  recommendations: string[];
}

export interface ClippingAnalysis {
  total_clipped_energy_kwh_year: number;
  total_clipped_value_brl_year: number;
  clipping_hours_per_year: number;
  
  inverters_clipping: {
    inverter_id: string;
    inverter_name: string;
    clipping_hours: number;
    clipped_energy_kwh: number;
    oversizing_ratio: number; // DC/AC ratio
  }[];
  
  is_recoverable: boolean;
  recommended_actions: string[];
}

export interface PerformanceRatioAnalysis {
  current_pr: number;
  target_pr: number;
  gap_percent: number;
  
  pr_by_category: {
    category: string;
    actual: number;
    target: number;
    loss: number;
  }[];
  
  pr_trend: {
    month: string;
    pr: number;
    weather_normalized_pr: number;
  }[];
  
  degradation_rate_percent_year: number;
  expected_degradation: number;
  excess_degradation?: number;
}

// Executive Summary para PDF
export interface AuditExecutiveSummary {
  plant_name: string;
  audit_date: string;
  period: string;
  
  current_performance: {
    actual_generation_kwh: number;
    expected_generation_kwh: number;
    performance_ratio: number;
    capacity_factor: number;
  };
  
  key_findings: {
    total_issues_found: number;
    critical_issues: number;
    high_priority_issues: number;
  };
  
  quick_wins: {
    total_recoverable_kwh_year: number;
    total_recoverable_brl_year: number;
    recoverable_percent: number; // 2-4%
    
    breakdown: {
      category: string;
      kwh_year: number;
      brl_year: number;
      percent: number;
    }[];
  };
  
  recommendations_summary: {
    immediate_actions: number;
    short_term_actions: number;
    total_estimated_cost_brl: number;
    total_annual_benefit_brl: number;
    average_payback_months: number;
  };
  
  next_steps: string[];
}
