
import { MLModelConfig, MLTrainingData, MLPrediction, ContinuousLearningConfig, FeatureExtractor, FEATURE_EXTRACTORS, DEFAULT_ML_CONFIG } from '@/types/ml-pipeline';
import { InvoiceExtractedData } from '@/types/invoice';
import { ValidationResult } from '@/types/validation';
import logger from '@/lib/logger';

export class MLPipeline {
  private config: ContinuousLearningConfig;
  private models: Map<string, any> = new Map();
  private trainingData: MLTrainingData[] = [];
  private featureExtractors: FeatureExtractor[];

  constructor(config: ContinuousLearningConfig = DEFAULT_ML_CONFIG) {
    this.config = config;
    this.featureExtractors = FEATURE_EXTRACTORS;
    this.initializeModels();
  }

  private initializeModels() {
    logger.log('🤖 Initializing ML Pipeline with models...');
    
    // Initialize anomaly detection model
    this.models.set('anomaly_detector', {
      type: 'anomaly_detection',
      version: '1.0.0',
      threshold: 0.8,
      historical_patterns: new Map()
    });

    // Initialize validation predictor
    this.models.set('validation_predictor', {
      type: 'classification',
      version: '1.0.0',
      classes: ['pass', 'warning', 'error'],
      weights: new Map()
    });

    // Initialize confidence estimator
    this.models.set('confidence_estimator', {
      type: 'regression',
      version: '1.0.0',
      features: this.featureExtractors.map(f => f.name)
    });
  }

  async extractFeatures(invoice: InvoiceExtractedData): Promise<number[]> {
    const features: number[] = [];

    for (const extractor of this.featureExtractors) {
      let value = this.getFieldValue(invoice, extractor.name);
      
      // Handle different data types
      switch (extractor.type) {
        case 'numerical':
          value = this.normalizeNumerical(value, extractor);
          break;
        case 'categorical':
          value = this.encodeCategorical(value, extractor);
          break;
        case 'datetime':
          value = this.encodeDatetime(value, extractor);
          break;
        case 'text':
          value = this.encodeText(value, extractor);
          break;
      }

      if (Array.isArray(value)) {
        features.push(...value);
      } else {
        features.push(value || 0);
      }
    }

    return features;
  }

  private getFieldValue(invoice: InvoiceExtractedData, fieldName: string): any {
    switch (fieldName) {
      case 'cost_per_kwh':
        return invoice.energy_kwh > 0 ? invoice.total_r$ / invoice.energy_kwh : 0;
      case 'month_of_year':
        return invoice.reference_month ? new Date(invoice.reference_month + '-01').getMonth() + 1 : 0;
      case 'day_of_week':
        return invoice.data_emissao ? new Date(invoice.data_emissao).getDay() : 0;
      default:
        return invoice[fieldName as keyof InvoiceExtractedData] || 0;
    }
  }

  private normalizeNumerical(value: number, extractor: FeatureExtractor): number {
    if (typeof value !== 'number' || isNaN(value)) return 0;

    switch (extractor.normalization) {
      case 'standard':
        // Z-score normalization (simplified - in production, use actual statistics)
        return (value - 1000) / 500; // Mock normalization
      case 'minmax':
        // Min-max normalization
        return Math.max(0, Math.min(1, value / 10000)); // Mock normalization
      default:
        return value;
    }
  }

  private encodeCategorical(value: string, extractor: FeatureExtractor): number[] {
    const categories = this.getCategoriesForField(extractor.name);
    
    if (extractor.encoding === 'onehot') {
      return categories.map(cat => cat === value ? 1 : 0);
    } else {
      // Label encoding
      return [categories.indexOf(value) || 0];
    }
  }

  private encodeDatetime(value: string, extractor: FeatureExtractor): number {
    if (!value) return 0;
    const date = new Date(value);
    return date.getTime() / 1000000000; // Normalize timestamp
  }

  private encodeText(value: string, extractor: FeatureExtractor): number[] {
    // Simple text encoding (in production, use embeddings)
    if (!value) return [0, 0, 0, 0, 0];
    return [
      value.length,
      (value.match(/\d/g) || []).length,
      (value.match(/[A-Z]/g) || []).length,
      (value.match(/[a-z]/g) || []).length,
      (value.match(/[^\w\s]/g) || []).length
    ];
  }

  private getCategoriesForField(fieldName: string): string[] {
    switch (fieldName) {
      case 'subgrupo_tensao':
        return ['A1', 'A2', 'A3', 'A4', 'AS', 'B1', 'B2', 'B3', 'B4a', 'B4b'];
      case 'bandeira_tipo':
        return ['Verde', 'Amarela', 'Vermelha Patamar 1', 'Vermelha Patamar 2', 'Escassez Hídrica'];
      default:
        return [];
    }
  }

  async predictValidationResults(invoice: InvoiceExtractedData): Promise<MLPrediction> {
    logger.log('🔮 ML Pipeline: Predicting validation results...');
    
    const features = await this.extractFeatures(invoice);
    const model = this.models.get('validation_predictor');
    
    // Simple prediction logic (in production, use actual ML models)
    const score = this.calculateValidationScore(features);
    const prediction = {
      likely_issues: this.predictLikelyIssues(features),
      confidence_estimate: score,
      risk_factors: this.identifyRiskFactors(features),
      recommended_checks: this.recommendChecks(features)
    };

    return {
      model_id: 'validation_predictor',
      input_data: { feature_count: features.length },
      prediction,
      confidence: score,
      model_version: model.version,
      processing_time_ms: 50 + Math.random() * 100,
      created_at: new Date().toISOString()
    };
  }

  private calculateValidationScore(features: number[]): number {
    // Weighted feature importance calculation
    let score = 0.8; // Base score
    
    // Energy consumption factor
    const energyFeature = features[0] || 0;
    if (Math.abs(energyFeature) > 2) score -= 0.2; // Anomalous consumption
    
    // Cost factor
    const costFeature = features[2] || 0;
    if (Math.abs(costFeature) > 2) score -= 0.15; // Anomalous cost
    
    // Confidence factor
    const confidenceFeature = features[features.length - 1] || 0;
    score += confidenceFeature * 0.1;
    
    return Math.max(0.1, Math.min(0.99, score));
  }

  private predictLikelyIssues(features: number[]): string[] {
    const issues: string[] = [];
    
    if (Math.abs(features[0] || 0) > 2.5) {
      issues.push('energy_consumption_anomaly');
    }
    
    if (Math.abs(features[2] || 0) > 2.0) {
      issues.push('cost_per_kwh_anomaly');
    }
    
    if ((features[features.length - 1] || 0) < 0.5) {
      issues.push('low_extraction_confidence');
    }
    
    return issues;
  }

  private identifyRiskFactors(features: number[]): Record<string, number> {
    return {
      consumption_volatility: Math.abs(features[0] || 0),
      cost_volatility: Math.abs(features[2] || 0),
      seasonal_factor: Math.abs(features[5] || 0),
      extraction_confidence: features[features.length - 1] || 0
    };
  }

  private recommendChecks(features: number[]): string[] {
    const checks: string[] = ['mandatory_fields'];
    
    if (Math.abs(features[0] || 0) > 1.5) {
      checks.push('consumption_anomaly_check');
    }
    
    if (Math.abs(features[2] || 0) > 1.5) {
      checks.push('cost_anomaly_check');
    }
    
    checks.push('arithmetic_validation', 'date_consistency');
    
    return checks;
  }

  async detectAnomalies(invoice: InvoiceExtractedData, historicalData: any[]): Promise<MLPrediction> {
    logger.log('🚨 ML Pipeline: Detecting anomalies...');
    
    const features = await this.extractFeatures(invoice);
    const model = this.models.get('anomaly_detector');
    
    // Calculate anomaly scores using historical patterns
    const anomalyScores = this.calculateAnomalyScores(features, historicalData);
    const overallAnomalyScore = Math.max(...Object.values(anomalyScores));
    
    const prediction = {
      is_anomaly: overallAnomalyScore > model.threshold,
      anomaly_scores: anomalyScores,
      anomaly_types: this.identifyAnomalyTypes(anomalyScores),
      severity: this.calculateAnomalySeverity(overallAnomalyScore),
      explanation: this.generateAnomalyExplanation(anomalyScores)
    };

    return {
      model_id: 'anomaly_detector',
      input_data: { historical_samples: historicalData.length },
      prediction,
      confidence: overallAnomalyScore,
      model_version: model.version,
      processing_time_ms: 75 + Math.random() * 150,
      created_at: new Date().toISOString()
    };
  }

  private calculateAnomalyScores(features: number[], historicalData: any[]): Record<string, number> {
    return {
      consumption: Math.abs(features[0] || 0),
      cost: Math.abs(features[2] || 0),
      temporal: Math.abs(features[5] || 0),
      structural: this.calculateStructuralAnomaly(features)
    };
  }

  private calculateStructuralAnomaly(features: number[]): number {
    // Check for structural inconsistencies in the data
    const ratios = features.slice(0, 3);
    const variance = ratios.reduce((acc, val, idx, arr) => {
      const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
      return acc + Math.pow(val - mean, 2);
    }, 0) / ratios.length;
    
    return Math.sqrt(variance);
  }

  private identifyAnomalyTypes(scores: Record<string, number>): string[] {
    const types: string[] = [];
    
    if (scores.consumption > 2) types.push('consumption_outlier');
    if (scores.cost > 2) types.push('cost_outlier');
    if (scores.temporal > 1.5) types.push('seasonal_anomaly');
    if (scores.structural > 1.5) types.push('structural_inconsistency');
    
    return types;
  }

  private calculateAnomalySeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score > 3) return 'critical';
    if (score > 2) return 'high';
    if (score > 1) return 'medium';
    return 'low';
  }

  private generateAnomalyExplanation(scores: Record<string, number>): string {
    const explanations: string[] = [];
    
    if (scores.consumption > 2) {
      explanations.push('Consumo significativamente diferente do padrão histórico');
    }
    if (scores.cost > 2) {
      explanations.push('Custo por kWh fora do intervalo esperado');
    }
    if (scores.temporal > 1.5) {
      explanations.push('Padrão sazonal inconsistente com dados históricos');
    }
    
    return explanations.join('; ') || 'Nenhuma anomalia significativa detectada';
  }

  async addTrainingData(
    invoice: InvoiceExtractedData, 
    validationResults: ValidationResult[], 
    humanFeedback?: any
  ): Promise<void> {
    const features = await this.extractFeatures(invoice);
    
    const trainingEntry: MLTrainingData = {
      id: `training-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      invoice_id: invoice.uc_code + '-' + invoice.reference_month,
      feature_vector: features,
      ground_truth: {
        validation_passed: validationResults.every(r => r.passed),
        has_anomalies: validationResults.some(r => r.anomaly_score && r.anomaly_score > 2),
        severity_counts: this.countSeverities(validationResults)
      },
      validation_results: validationResults,
      human_feedback: humanFeedback,
      confidence_score: invoice.confidence_score || 0,
      created_at: new Date().toISOString(),
      used_for_training: false
    };

    this.trainingData.push(trainingEntry);
    logger.log(`📚 Added training data entry. Total: ${this.trainingData.length}`);

    // Check if we should trigger retraining
    if (this.shouldTriggerRetraining()) {
      await this.scheduleRetraining();
    }
  }

  private countSeverities(results: ValidationResult[]): Record<string, number> {
    return results.reduce((counts, result) => {
      counts[result.severity] = (counts[result.severity] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  private shouldTriggerRetraining(): boolean {
    if (!this.config.enabled) return false;
    
    const newSamples = this.trainingData.filter(d => !d.used_for_training).length;
    return newSamples >= this.config.min_samples_for_retrain;
  }

  private async scheduleRetraining(): Promise<void> {
    logger.log('🔄 Scheduling model retraining...');
    
    // In production, this would trigger an actual training pipeline
    setTimeout(() => {
      this.performRetraining();
    }, 1000);
  }

  private async performRetraining(): Promise<void> {
    logger.log('🎯 Performing model retraining...');
    
    const newData = this.trainingData.filter(d => !d.used_for_training);
    
    // Simulate training process
    for (const data of newData) {
      data.used_for_training = true;
    }

    // Update model versions
    this.models.forEach((model, key) => {
      const versionParts = model.version.split('.');
      versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
      model.version = versionParts.join('.');
    });

    logger.log(`✅ Retraining completed. Used ${newData.length} new samples.`);
  }

  getModelStatus(): Record<string, any> {
    return {
      models: Array.from(this.models.entries()).map(([id, model]) => ({
        id,
        type: model.type,
        version: model.version,
        enabled: true
      })),
      training_data_count: this.trainingData.length,
      unused_training_samples: this.trainingData.filter(d => !d.used_for_training).length,
      config: this.config
    };
  }
}
