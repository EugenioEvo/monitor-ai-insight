
export interface MLModelConfig {
  model_id: string;
  name: string;
  type: 'classification' | 'regression' | 'anomaly_detection' | 'nlp';
  version: string;
  framework: 'tensorflow' | 'pytorch' | 'scikit-learn' | 'transformers';
  enabled: boolean;
  auto_retrain: boolean;
  performance_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface MLTrainingData {
  id: string;
  invoice_id: string;
  feature_vector: number[];
  ground_truth: any;
  validation_results: any[];
  human_feedback?: any;
  confidence_score: number;
  created_at: string;
  used_for_training: boolean;
}

export interface MLModelPerformance {
  model_id: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  validation_loss: number;
  training_samples: number;
  evaluation_date: string;
  confusion_matrix?: number[][];
  feature_importance?: Record<string, number>;
}

export interface MLPrediction {
  model_id: string;
  input_data: any;
  prediction: any;
  confidence: number;
  model_version: string;
  processing_time_ms: number;
  created_at: string;
}

export interface ContinuousLearningConfig {
  enabled: boolean;
  retrain_threshold: number;
  min_samples_for_retrain: number;
  validation_split: number;
  auto_deploy: boolean;
  performance_degradation_threshold: number;
  feedback_weight: number;
}

export interface FeatureExtractor {
  name: string;
  type: 'numerical' | 'categorical' | 'text' | 'datetime';
  importance: number;
  normalization?: 'standard' | 'minmax' | 'none';
  encoding?: 'onehot' | 'label' | 'embedding';
}

export interface MLPipelineState {
  status: 'idle' | 'training' | 'evaluating' | 'deploying' | 'error';
  current_model_version: string;
  last_training_date: string;
  next_scheduled_training?: string;
  performance_metrics: MLModelPerformance;
  training_queue_size: number;
  error_message?: string;
}

export const DEFAULT_ML_CONFIG: ContinuousLearningConfig = {
  enabled: true,
  retrain_threshold: 0.1,
  min_samples_for_retrain: 100,
  validation_split: 0.2,
  auto_deploy: false,
  performance_degradation_threshold: 0.05,
  feedback_weight: 1.5
};

export const FEATURE_EXTRACTORS: FeatureExtractor[] = [
  { name: 'energy_kwh', type: 'numerical', importance: 0.95, normalization: 'standard' },
  { name: 'total_r$', type: 'numerical', importance: 0.90, normalization: 'standard' },
  { name: 'cost_per_kwh', type: 'numerical', importance: 0.85, normalization: 'standard' },
  { name: 'subgrupo_tensao', type: 'categorical', importance: 0.75, encoding: 'onehot' },
  { name: 'bandeira_tipo', type: 'categorical', importance: 0.60, encoding: 'onehot' },
  { name: 'month_of_year', type: 'numerical', importance: 0.40, normalization: 'none' },
  { name: 'day_of_week', type: 'numerical', importance: 0.20, normalization: 'none' },
  { name: 'icms_aliquota', type: 'numerical', importance: 0.55, normalization: 'standard' },
  { name: 'confidence_score', type: 'numerical', importance: 0.80, normalization: 'standard' }
];
