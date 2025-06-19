
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  rule_type: 'field_check' | 'cross_validation' | 'business_logic' | 'anomaly_detection';
  category: 'obrigatorio' | 'consistencia' | 'anomalia' | 'tributario';
  enabled: boolean;
  severity: 'warning' | 'error' | 'critical';
  threshold?: number;
  parameters?: Record<string, any>;
}

export interface ValidationResult {
  rule_id: string;
  passed: boolean;
  confidence: number;
  field_name?: string;
  error_type: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  suggested_fix?: string;
  anomaly_score?: number;
  historical_context?: string;
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  confidence_threshold: number;
  historical_window_months: number;
  outlier_detection_method: 'zscore' | 'iqr' | 'isolation_forest';
  seasonal_adjustment: boolean;
}

export interface ValidationEngineConfig {
  enabled_rules: string[];
  anomaly_detection: AnomalyDetectionConfig;
  auto_approve_threshold: number;
  require_review_threshold: number;
  strict_mode: boolean;
}

export interface BusinessRuleContext {
  historical_invoices: any[];
  customer_profile?: any;
  plant_profile?: any;
  seasonal_data?: any;
  market_benchmarks?: any;
}

export const DEFAULT_VALIDATION_CONFIG: ValidationEngineConfig = {
  enabled_rules: [
    'mandatory-fields',
    'date-consistency',
    'arithmetic-validation',
    'energy-consumption-anomaly',
    'cost-per-kwh-anomaly',
    'tributary-validation',
    'bandeira-validation'
  ],
  anomaly_detection: {
    enabled: true,
    confidence_threshold: 0.8,
    historical_window_months: 12,
    outlier_detection_method: 'zscore',
    seasonal_adjustment: true
  },
  auto_approve_threshold: 0.95,
  require_review_threshold: 0.7,
  strict_mode: false
};

export const VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'mandatory-fields',
    name: 'Campos Obrigatórios',
    description: 'Verifica se todos os campos obrigatórios estão presentes',
    rule_type: 'field_check',
    category: 'obrigatorio',
    enabled: true,
    severity: 'error'
  },
  {
    id: 'date-consistency',
    name: 'Consistência de Datas',
    description: 'Valida ordem lógica das datas (leitura ≤ emissão ≤ vencimento)',
    rule_type: 'cross_validation',
    category: 'consistencia',
    enabled: true,
    severity: 'error'
  },
  {
    id: 'arithmetic-validation',
    name: 'Validação Aritmética',
    description: 'Verifica cálculos e totalizações da fatura',
    rule_type: 'cross_validation',
    category: 'consistencia',
    enabled: true,
    severity: 'error'
  },
  {
    id: 'energy-consumption-anomaly',
    name: 'Anomalia de Consumo',
    description: 'Detecta consumo anômalo baseado no histórico',
    rule_type: 'anomaly_detection',
    category: 'anomalia',
    enabled: true,
    severity: 'warning',
    threshold: 2.5
  },
  {
    id: 'cost-per-kwh-anomaly',
    name: 'Anomalia de Custo por kWh',
    description: 'Detecta variações anômalas no custo unitário',
    rule_type: 'anomaly_detection',
    category: 'anomalia',
    enabled: true,
    severity: 'warning',
    threshold: 2.0
  },
  {
    id: 'tributary-validation',
    name: 'Validação Tributária',
    description: 'Verifica cálculos de ICMS, PIS, COFINS',
    rule_type: 'business_logic',
    category: 'tributario',
    enabled: true,
    severity: 'warning'
  },
  {
    id: 'bandeira-validation',
    name: 'Validação Bandeira Tarifária',
    description: 'Verifica aplicação correta da bandeira tarifária',
    rule_type: 'business_logic',
    category: 'tributario',
    enabled: true,
    severity: 'warning'
  }
];
