/**
 * Tipos para Operação e Manutenção (O&M)
 */

export interface OMMetrics {
  // KPIs Operacionais
  mtbf_hours: number; // Mean Time Between Failures
  mttr_hours: number; // Mean Time To Repair
  availability_percent: number; // Disponibilidade
  sla_compliance_percent: number; // Compliance com SLA
  om_cost_brl: number; // Custos de O&M
  cost_per_kwh: number; // Custo por kWh
  
  // Contadores
  active_plants: number;
  total_tickets_open: number;
  total_tickets_closed: number;
  critical_alerts: number;
  pending_maintenance: number;
  
  // Performance
  performance_ratio: number;
  energy_generated_kwh: number;
  expected_energy_kwh: number;
  
  // Tendências
  trend_mtbf: 'up' | 'down' | 'stable';
  trend_availability: 'up' | 'down' | 'stable';
  trend_cost: 'up' | 'down' | 'stable';
  
  period: string;
}

export interface PlantOMStatus {
  plant_id: string;
  plant_name: string;
  status: 'operational' | 'warning' | 'maintenance' | 'critical' | 'offline';
  availability_percent: number;
  last_maintenance: string;
  next_maintenance: string;
  open_tickets: number;
  critical_alerts: number;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface OMEvent {
  id: string;
  timestamp: string;
  type: 'ticket' | 'alert' | 'anomaly' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  plant_id: string;
  plant_name: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
}

export interface UpcomingMaintenance {
  id: string;
  plant_id: string;
  plant_name: string;
  maintenance_type: 'preventive' | 'corrective' | 'predictive';
  scheduled_date: string;
  estimated_duration_hours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  required_parts?: string[];
  assigned_to?: string;
  status: 'scheduled' | 'overdue' | 'in_progress' | 'completed';
}

export interface FailurePrediction {
  equipment_id: string;
  equipment_type: string;
  plant_id: string;
  plant_name: string;
  failure_probability: number; // 0-1
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  predicted_failure_date: string;
  recommended_action: string;
  confidence_percent: number;
}
