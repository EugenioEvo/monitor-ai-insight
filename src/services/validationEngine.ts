
import { ValidationRule, ValidationResult, ValidationEngineConfig, BusinessRuleContext, VALIDATION_RULES } from '@/types/validation';
import { InvoiceExtractedData } from '@/types/invoice';
import logger from '@/lib/logger';

export class ValidationEngine {
  private config: ValidationEngineConfig;
  private rules: ValidationRule[];

  constructor(config: ValidationEngineConfig) {
    this.config = config;
    this.rules = VALIDATION_RULES.filter(rule => 
      config.enabled_rules.includes(rule.id) && rule.enabled
    );
  }

  async validateInvoice(
    invoice: InvoiceExtractedData, 
    context?: BusinessRuleContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    logger.log(`🔍 Validation Engine: Validating invoice with ${this.rules.length} rules`);

    for (const rule of this.rules) {
      try {
        const result = await this.executeRule(rule, invoice, context);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        logger.error(`Error executing rule ${rule.id}:`, error);
        results.push({
          rule_id: rule.id,
          passed: false,
          confidence: 0,
          error_type: 'validation_error',
          message: `Erro interno na validação: ${error.message}`,
          severity: 'error'
        });
      }
    }

    // Calculate overall validation score
    const overallScore = this.calculateOverallScore(results);
    logger.log(`📊 Validation completed. Overall score: ${(overallScore * 100).toFixed(1)}%`);

    return results;
  }

  private async executeRule(
    rule: ValidationRule, 
    invoice: InvoiceExtractedData, 
    context?: BusinessRuleContext
  ): Promise<ValidationResult | null> {
    switch (rule.id) {
      case 'mandatory-fields':
        return this.validateMandatoryFields(rule, invoice);
      
      case 'date-consistency':
        return this.validateDateConsistency(rule, invoice);
      
      case 'arithmetic-validation':
        return this.validateArithmetic(rule, invoice);
      
      case 'energy-consumption-anomaly':
        return this.detectConsumptionAnomaly(rule, invoice, context);
      
      case 'cost-per-kwh-anomaly':
        return this.detectCostAnomaly(rule, invoice, context);
      
      case 'tributary-validation':
        return this.validateTributary(rule, invoice);
      
      case 'bandeira-validation':
        return this.validateBandeira(rule, invoice);
      
      default:
        return null;
    }
  }

  private validateMandatoryFields(rule: ValidationRule, invoice: InvoiceExtractedData): ValidationResult | null {
    const mandatoryFields = ['uc_code', 'reference_month', 'energy_kwh', 'total_r$'];
    const missingFields = mandatoryFields.filter(field => !invoice[field as keyof InvoiceExtractedData]);

    if (missingFields.length > 0) {
      return {
        rule_id: rule.id,
        passed: false,
        confidence: 1.0,
        field_name: missingFields.join(', '),
        error_type: 'missing_mandatory_field',
        message: `Campos obrigatórios ausentes: ${missingFields.join(', ')}`,
        severity: rule.severity,
        suggested_fix: 'Verificar extração OCR e qualidade da imagem'
      };
    }

    return null;
  }

  private validateDateConsistency(rule: ValidationRule, invoice: InvoiceExtractedData): ValidationResult | null {
    const { data_leitura, data_emissao, data_vencimento } = invoice;

    if (!data_leitura || !data_emissao || !data_vencimento) {
      return null; // Skip if dates are missing
    }

    const leitura = new Date(data_leitura);
    const emissao = new Date(data_emissao);
    const vencimento = new Date(data_vencimento);

    if (leitura > emissao) {
      return {
        rule_id: rule.id,
        passed: false,
        confidence: 1.0,
        field_name: 'data_leitura, data_emissao',
        error_type: 'date_inconsistency',
        message: 'Data de leitura posterior à data de emissão',
        severity: rule.severity,
        suggested_fix: 'Verificar extração das datas na fatura'
      };
    }

    if (emissao > vencimento) {
      return {
        rule_id: rule.id,
        passed: false,
        confidence: 1.0,
        field_name: 'data_emissao, data_vencimento',
        error_type: 'date_inconsistency',
        message: 'Data de emissão posterior à data de vencimento',
        severity: rule.severity,
        suggested_fix: 'Verificar extração das datas na fatura'
      };
    }

    return null;
  }

  private validateArithmetic(rule: ValidationRule, invoice: InvoiceExtractedData): ValidationResult | null {
    const {
      total_r$,
      valor_tusd,
      valor_te,
      valor_demanda_tusd,
      valor_demanda_te,
      icms_valor,
      pis_valor,
      cofins_valor,
      bandeira_valor,
      contrib_ilum_publica,
      outras_taxas
    } = invoice;

    if (!total_r$) return null;

    // Calculate expected total
    const calculatedTotal = (valor_tusd || 0) + 
                           (valor_te || 0) + 
                           (valor_demanda_tusd || 0) + 
                           (valor_demanda_te || 0) +
                           (icms_valor || 0) +
                           (pis_valor || 0) +
                           (cofins_valor || 0) +
                           (bandeira_valor || 0) +
                           (contrib_ilum_publica || 0) +
                           (outras_taxas || 0);

    const difference = Math.abs(calculatedTotal - total_r$);
    const tolerance = total_r$ * 0.05; // 5% tolerance

    if (difference > tolerance) {
      return {
        rule_id: rule.id,
        passed: false,
        confidence: 0.9,
        field_name: 'total_r$',
        error_type: 'arithmetic_inconsistency',
        message: `Valor total informado (R$ ${total_r$.toFixed(2)}) difere do calculado (R$ ${calculatedTotal.toFixed(2)}) em R$ ${difference.toFixed(2)}`,
        severity: rule.severity,
        suggested_fix: 'Verificar extração dos componentes da fatura'
      };
    }

    return null;
  }

  private detectConsumptionAnomaly(
    rule: ValidationRule, 
    invoice: InvoiceExtractedData, 
    context?: BusinessRuleContext
  ): ValidationResult | null {
    if (!invoice.energy_kwh || !context?.historical_invoices) {
      return null;
    }

    const historical = context.historical_invoices
      .map(inv => inv.energy_kwh)
      .filter(val => val > 0);

    if (historical.length < 3) {
      return null; // Need at least 3 historical points
    }

    const { mean, stdDev } = this.calculateStatistics(historical);
    const zScore = Math.abs((invoice.energy_kwh - mean) / stdDev);
    const threshold = rule.threshold || 2.5;

    if (zScore > threshold) {
      const isHigh = invoice.energy_kwh > mean;
      return {
        rule_id: rule.id,
        passed: false,
        confidence: Math.min(zScore / 3, 1),
        field_name: 'energy_kwh',
        error_type: 'consumption_anomaly',
        message: `Consumo ${isHigh ? 'alto' : 'baixo'} detectado: ${invoice.energy_kwh} kWh (média histórica: ${mean.toFixed(0)} kWh)`,
        severity: rule.severity,
        anomaly_score: zScore,
        historical_context: `Baseado em ${historical.length} faturas anteriores`,
        suggested_fix: isHigh ? 'Verificar possível vazamento ou equipamento com defeito' : 'Verificar período de faturamento ou possível sub-medição'
      };
    }

    return null;
  }

  private detectCostAnomaly(
    rule: ValidationRule, 
    invoice: InvoiceExtractedData, 
    context?: BusinessRuleContext
  ): ValidationResult | null {
    if (!invoice.energy_kwh || !invoice.total_r$ || invoice.energy_kwh === 0) {
      return null;
    }

    const costPerKwh = invoice.total_r$ / invoice.energy_kwh;

    if (!context?.historical_invoices) {
      return null;
    }

    const historicalCosts = context.historical_invoices
      .filter(inv => inv.energy_kwh > 0 && inv.total_r$ > 0)
      .map(inv => inv.total_r$ / inv.energy_kwh);

    if (historicalCosts.length < 3) {
      return null;
    }

    const { mean, stdDev } = this.calculateStatistics(historicalCosts);
    const zScore = Math.abs((costPerKwh - mean) / stdDev);
    const threshold = rule.threshold || 2.0;

    if (zScore > threshold) {
      const isHigh = costPerKwh > mean;
      return {
        rule_id: rule.id,
        passed: false,
        confidence: Math.min(zScore / 3, 1),
        field_name: 'Custo por kWh',
        error_type: 'cost_anomaly',
        message: `Custo por kWh ${isHigh ? 'alto' : 'baixo'}: R$ ${costPerKwh.toFixed(3)}/kWh (média: R$ ${mean.toFixed(3)}/kWh)`,
        severity: rule.severity,
        anomaly_score: zScore,
        historical_context: `Baseado em ${historicalCosts.length} faturas anteriores`,
        suggested_fix: isHigh ? 'Verificar mudança de bandeira tarifária ou novo imposto' : 'Verificar desconto ou crédito aplicado'
      };
    }

    return null;
  }

  private validateTributary(rule: ValidationRule, invoice: InvoiceExtractedData): ValidationResult | null {
    const { icms_valor, icms_aliquota, pis_valor, pis_aliquota, cofins_valor, cofins_aliquota, total_r$ } = invoice;

    const results: string[] = [];

    // ICMS validation
    if (icms_valor && icms_aliquota && total_r$) {
      const expectedIcms = total_r$ * (icms_aliquota / 100);
      const difference = Math.abs(expectedIcms - icms_valor);
      if (difference > total_r$ * 0.01) { // 1% tolerance
        results.push(`ICMS: esperado R$ ${expectedIcms.toFixed(2)}, encontrado R$ ${icms_valor.toFixed(2)}`);
      }
    }

    // PIS validation
    if (pis_valor && pis_aliquota && total_r$) {
      const expectedPis = total_r$ * (pis_aliquota / 100);
      const difference = Math.abs(expectedPis - pis_valor);
      if (difference > total_r$ * 0.005) { // 0.5% tolerance
        results.push(`PIS: esperado R$ ${expectedPis.toFixed(2)}, encontrado R$ ${pis_valor.toFixed(2)}`);
      }
    }

    if (results.length > 0) {
      return {
        rule_id: rule.id,
        passed: false,
        confidence: 0.8,
        field_name: 'Tributos',
        error_type: 'tributary_inconsistency',
        message: `Inconsistência tributária: ${results.join('; ')}`,
        severity: rule.severity,
        suggested_fix: 'Verificar base de cálculo e alíquotas dos tributos'
      };
    }

    return null;
  }

  private validateBandeira(rule: ValidationRule, invoice: InvoiceExtractedData): ValidationResult | null {
    const { bandeira_tipo, bandeira_valor, energy_kwh } = invoice;

    if (!bandeira_tipo) return null;

    // Expected bandeira values (simplified logic)
    const expectedValues: Record<string, number> = {
      'Verde': 0,
      'Amarela': 0.01874, // R$/kWh
      'Vermelha Patamar 1': 0.03971,
      'Vermelha Patamar 2': 0.09492,
      'Escassez Hídrica': 0.14200
    };

    const expectedRate = expectedValues[bandeira_tipo];
    if (expectedRate !== undefined && energy_kwh) {
      const expectedValue = expectedRate * energy_kwh;
      const actualValue = bandeira_valor || 0;
      const tolerance = Math.max(expectedValue * 0.1, 1); // 10% or R$ 1

      if (Math.abs(expectedValue - actualValue) > tolerance) {
        return {
          rule_id: rule.id,
          passed: false,
          confidence: 0.7,
          field_name: 'bandeira_valor',
          error_type: 'bandeira_inconsistency',
          message: `Valor bandeira ${bandeira_tipo}: esperado R$ ${expectedValue.toFixed(2)}, encontrado R$ ${actualValue.toFixed(2)}`,
          severity: rule.severity,
          suggested_fix: 'Verificar aplicação correta da bandeira tarifária'
        };
      }
    }

    return null;
  }

  private calculateStatistics(values: number[]): { mean: number; stdDev: number } {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return { mean, stdDev };
  }

  private calculateOverallScore(results: ValidationResult[]): number {
    if (results.length === 0) return 1.0;

    const errorCount = results.filter(r => r.severity === 'error').length;
    const warningCount = results.filter(r => r.severity === 'warning').length;
    const criticalCount = results.filter(r => r.severity === 'critical').length;

    // Weighted scoring
    const totalDeductions = (criticalCount * 0.4) + (errorCount * 0.2) + (warningCount * 0.1);
    const score = Math.max(0, 1 - (totalDeductions / this.rules.length));

    return score;
  }

  getValidationStatus(results: ValidationResult[]): 'approved' | 'review_required' | 'rejected' {
    const score = this.calculateOverallScore(results);
    const hasErrors = results.some(r => r.severity === 'error' || r.severity === 'critical');

    if (hasErrors || score < this.config.require_review_threshold) {
      return score < 0.5 ? 'rejected' : 'review_required';
    }

    return score >= this.config.auto_approve_threshold ? 'approved' : 'review_required';
  }
}
