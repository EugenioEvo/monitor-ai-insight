
export interface OCREngine {
  name: 'openai' | 'google_vision' | 'tesseract';
  priority: number;
  enabled: boolean;
  cost_per_page: number;
  avg_accuracy: number;
  avg_processing_time_ms: number;
}

export interface OCRResult {
  engine: string;
  text: string;
  confidence_score: number;
  processing_time_ms: number;
  cost_estimate: number;
  bounding_boxes?: BoundingBox[];
  error?: string;
}

export interface BoundingBox {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MultiEngineOCRConfig {
  primary_engine: 'openai' | 'google_vision' | 'tesseract';
  fallback_engines: ('openai' | 'google_vision' | 'tesseract')[];
  ab_testing_enabled: boolean;
  ab_test_split: number; // percentage for engine A vs B
  confidence_threshold: number;
  max_retries: number;
  timeout_ms: number;
}

export interface ABTestResult {
  test_id: string;
  engine_a: string;
  engine_b: string;
  file_id: string;
  result_a: OCRResult;
  result_b: OCRResult;
  winner: 'a' | 'b' | 'tie';
  criteria: string;
  timestamp: string;
}

export const DEFAULT_OCR_CONFIG: MultiEngineOCRConfig = {
  primary_engine: 'openai',
  fallback_engines: ['google_vision', 'tesseract'],
  ab_testing_enabled: true,
  ab_test_split: 20, // 20% for A/B testing
  confidence_threshold: 0.85,
  max_retries: 2,
  timeout_ms: 30000
};

export const OCR_ENGINES: OCREngine[] = [
  {
    name: 'openai',
    priority: 1,
    enabled: true,
    cost_per_page: 0.015,
    avg_accuracy: 0.985,
    avg_processing_time_ms: 3500
  },
  {
    name: 'google_vision',
    priority: 2,
    enabled: true,
    cost_per_page: 0.005,
    avg_accuracy: 0.975,
    avg_processing_time_ms: 2000
  },
  {
    name: 'tesseract',
    priority: 3,
    enabled: false, // Disabled for now, will be implemented in future
    cost_per_page: 0.001,
    avg_accuracy: 0.89,
    avg_processing_time_ms: 1500
  }
];
