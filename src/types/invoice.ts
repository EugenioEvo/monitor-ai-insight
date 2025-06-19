
// Tipos específicos para o sistema de OCR e IA de faturas

export interface InvoiceExtractedData {
  // Dados básicos da fatura (existentes)
  uc_code: string;
  reference_month: string;
  energy_kwh: number;
  demand_kw: number;
  total_r$: number;
  taxes_r$: number;
  
  // Dados expandidos do blueprint - Consumo detalhado
  subgrupo_tensao?: string;
  consumo_fp_te_kwh?: number;
  consumo_p_te_kwh?: number;
  demanda_tusd_kw?: number;
  demanda_te_kw?: number;
  
  // Tributos detalhados
  icms_valor?: number;
  icms_aliquota?: number;
  pis_valor?: number;
  pis_aliquota?: number;
  cofins_valor?: number;
  cofins_aliquota?: number;
  
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
  
  // Tarifas aplicadas
  tarifa_te_tusd?: number;
  tarifa_te_te?: number;
  tarifa_demanda_tusd?: number;
  tarifa_demanda_te?: number;
  
  // Valores calculados
  valor_tusd?: number;
  valor_te?: number;
  valor_demanda_tusd?: number;
  valor_demanda_te?: number;
  
  // Compensação de energia
  energia_injetada_kwh?: number;
  energia_compensada_kwh?: number;
  saldo_creditos_kwh?: number;
  
  // Taxas adicionais
  contrib_ilum_publica?: number;
  issqn_valor?: number;
  outras_taxas?: number;
  
  // Classificação e modalidade
  classe_subclasse?: string;
  modalidade_tarifaria?: string;
  fator_potencia?: number;
  dias_faturamento?: number;
  
  // Informações complementares
  historico_consumo?: any[];
  observacoes?: string;
  codigo_barras?: string;
  linha_digitavel?: string;
  
  // Metadados de confiança
  confidence_score?: number;
  extraction_method?: 'openai' | 'google_vision' | 'tesseract' | 'hybrid';
  requires_review?: boolean;
  validation_errors?: string[];
  processing_time_ms?: number;
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
  severity: 'warning' | 'error' | 'critical';
}

export interface ValidationError {
  rule_id: string;
  field_name: string;
  error_type: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  suggested_fix?: string;
}

// Enums para validação
export const SubgrupoTensao = {
  A1: 'A1',
  A2: 'A2', 
  A3: 'A3',
  A4: 'A4',
  AS: 'AS',
  B1: 'B1',
  B2: 'B2',
  B3: 'B3',
  B4A: 'B4a',
  B4B: 'B4b'
} as const;

export const ExtractionMethod = {
  OPENAI: 'openai',
  GOOGLE_VISION: 'google_vision',
  TESSERACT: 'tesseract',
  HYBRID: 'hybrid'
} as const;

export const BandeiraTipo = {
  VERDE: 'Verde',
  AMARELA: 'Amarela',
  VERMELHA_1: 'Vermelha Patamar 1',
  VERMELHA_2: 'Vermelha Patamar 2',
  ESCASSEZ: 'Escassez Hídrica'
} as const;
