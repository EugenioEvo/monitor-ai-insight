
export interface Plant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity_kwp: number; // Mudança: usar capacity_kwp para ser compatível com o banco
  concessionaria: string;
  start_date: string;
  status: 'active' | 'pending_fix' | 'maintenance';
  monitoring_system?: 'manual' | 'solaredge' | 'sungrow';
  api_site_id?: string;
  api_credentials?: any;
  sync_enabled?: boolean;
  last_sync?: string;
  customer_id?: string; // Nova propriedade
}

export interface Beneficiary {
  id: string;
  plant_id: string;
  uc_code: string;
  cnpj: string;
  name: string;
  allocation_percent: number;
}

export interface Invoice {
  id: string;
  file_url: string;
  uc_code: string;
  reference_month: string;
  energy_kwh: number; // Usar snake_case para corresponder ao banco
  demand_kw: number; // Usar snake_case para corresponder ao banco
  total_r$: number; // Usar snake_case para corresponder ao banco
  taxes_r$: number; // Usar snake_case para corresponder ao banco
  status: 'pending' | 'processed' | 'error';
  extracted_data?: any;
  customer_unit_id?: string; // Nova propriedade
}

export interface Reading {
  id: string;
  plant_id: string;
  timestamp: string;
  power_w: number; // Usar snake_case para corresponder ao banco
  energy_kwh: number; // Usar snake_case para corresponder ao banco
}

export interface Ticket {
  id: string;
  plant_id: string;
  priority: 'P1' | 'P2' | 'P3';
  opened_at: string;
  status: 'open' | 'in_progress' | 'resolved';
  assigned_to?: string;
  description: string;
  type: 'maintenance' | 'performance' | 'compliance';
}

export interface Savings {
  id: string;
  beneficiary_id: string;
  month: string;
  credits_kWh: number;
  savings_R$: number;
}

export interface Alert {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  plant_id: string;
  acknowledged_by?: string;
  type: 'performance' | 'compliance' | 'maintenance';
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'plant_admin' | 'analyst' | 'technician' | 'viewer';
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  birth_date: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip_code?: string;
  created_at: string;
  updated_at: string;
}

// Novos tipos para as novas estruturas
export interface CustomerUnit {
  id: string;
  customer_id: string;
  uc_code: string;
  unit_name?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerMetrics {
  id: string;
  customer_id: string;
  month: string;
  total_generation_kwh: number;
  total_consumption_kwh: number;
  total_savings_r$: number;
  energy_balance_kwh: number;
  calculated_at?: string;
  created_at: string;
  updated_at: string;
}
