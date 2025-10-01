export interface Anomaly {
  id: string;
  plant_id: string;
  timestamp: string;
  anomaly_type: 'generation_drop' | 'efficiency_drop' | 'offline' | 'underperformance' | 'data_gap' | 'unexpected_spike' | 'overperformance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  detected_by: 'statistical' | 'ml_isolation_forest' | 'ml_autoencoder' | 'digital_twin';
  metric_affected: 'power' | 'energy' | 'pr' | 'availability';
  expected_value?: number;
  actual_value?: number;
  deviation_percent?: number;
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  root_cause_id?: string;
  metadata?: {
    z_score?: number;
    gap_kwh?: number;
    gap_minutes?: number;
    method?: string;
    probable_causes?: any[];
  };
  created_at: string;
  resolved_at?: string;
}

export interface ProbableCause {
  cause: string;
  confidence: number; // 0-1
  evidence: string;
  estimated_impact_kwh: number;
}

export interface RecommendedAction {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_time_hours: number;
  estimated_cost_brl: number;
}

export interface DependencyGraph {
  nodes: Array<{
    id: string;
    type: 'component' | 'subsystem' | 'external';
    status?: 'healthy' | 'degraded' | 'failed';
  }>;
  edges: Array<{
    from: string;
    to: string;
    relationship?: 'depends_on' | 'affects' | 'cascades_to';
  }>;
}

export interface RootCauseAnalysis {
  id: string;
  anomaly_id: string;
  plant_id: string;
  probable_causes: ProbableCause[];
  dependency_graph?: DependencyGraph;
  recommended_actions: RecommendedAction[];
  investigation_status: 'pending' | 'in_progress' | 'completed';
  resolution_summary?: string;
  actual_cause?: string;
  lessons_learned?: string;
  created_at: string;
  completed_at?: string;
}

export interface AnomalyDetectionConfig {
  statistical_enabled: boolean;
  ml_enabled: boolean;
  digital_twin_enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
}

export interface AnomalyStats {
  total: number;
  active: number;
  critical: number;
  high: number;
  byType: Record<string, number>;
  byDetector: Record<string, number>;
}
