
// Tipos específicos para o sistema de OCR e IA de faturas

export interface InvoiceExtractedData {
  // Dados básicos da fatura
  uc_code: string;
  reference_month: string;
  energy_kwh: number;
  demand_kw: number;
  total_r$: number;
  taxes_r$: number;
  
  // Dados expandidos do blueprint
  subgrupo_tensao?: string;
  consumo_fp_te_kwh?: number;
  consumo_p_te_kwh?: number;
  demanda_tusd_kw?: number;
  demanda_te_kw?: number;
  
  // Tributos detalhados
  icms_valor?: number;
  icms_aliquota?: number;
  pis_valor?: number;
  cofins_valor?: number;
  
  // Bandeira tarifária
  bandeira_tipo?: string;
  bandeira_valor?: number;
  
  // Datas importantes
  data_leitura?: string;
  data_emissao?: string;
  data_vencimento?: string;
  
  // Medições
  leitura_atual?: number;
  leitura_anterior?: number;
  multiplicador?: number;
  
  // Metadados de confiança
  confidence_score?: number;
  extraction_method?: 'openai' | 'google_vision' | 'tesseract';
  requires_review?: boolean;
  validation_errors?: string[];
}

export interface InvoiceProcessingStatus {
  id: string;
  status: 'uploaded' | 'processing' | 'extracted' | 'validated' | 'reviewed' | 'completed' | 'error';
  progress: number;
  current_step?: string;
  error_message?: string;
  confidence_score?: number;
  requires_review?: boolean;
  processing_time_ms?: number;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  rule_type: 'field_check' | 'cross_validation' | 'business_logic';
  enabled: boolean;
  severity: 'warning' | 'error';
}

export interface ValidationError {
  rule_id: string;
  field_name: string;
  error_type: string;
  message: string;
  severity: 'warning' | 'error';
  suggested_fix?: string;
}
