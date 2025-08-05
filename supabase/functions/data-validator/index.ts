import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRule {
  field: string;
  type: 'required' | 'range' | 'format' | 'logical';
  params?: any;
  message: string;
}

interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidence: number;
}

const VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'energy_kwh',
    type: 'range',
    params: { min: 0, max: 10000 },
    message: 'Energia deve estar entre 0 e 10.000 kWh'
  },
  {
    field: 'total_r$',
    type: 'range',
    params: { min: 0, max: 50000 },
    message: 'Valor total deve estar entre R$ 0 e R$ 50.000'
  },
  {
    field: 'data_emissao',
    type: 'required',
    message: 'Data de emissão é obrigatória'
  },
  {
    field: 'uc_code',
    type: 'format',
    params: { pattern: /^\d{10,15}$/ },
    message: 'Código UC deve ter entre 10 e 15 dígitos'
  }
];

function validateData(data: any): DataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const rule of VALIDATION_RULES) {
    const value = data[rule.field];
    
    switch (rule.type) {
      case 'required':
        if (!value || value === '') {
          errors.push(rule.message);
        }
        break;
        
      case 'range':
        if (value !== null && value !== undefined) {
          const numValue = parseFloat(value);
          if (isNaN(numValue) || numValue < rule.params.min || numValue > rule.params.max) {
            errors.push(rule.message);
          }
        }
        break;
        
      case 'format':
        if (value && !rule.params.pattern.test(value)) {
          errors.push(rule.message);
        }
        break;
        
      case 'logical':
        // Validações lógicas customizadas
        if (rule.field === 'dates' && data.data_emissao && data.data_vencimento) {
          const emissao = new Date(data.data_emissao);
          const vencimento = new Date(data.data_vencimento);
          if (emissao > vencimento) {
            errors.push('Data de emissão não pode ser posterior ao vencimento');
          }
        }
        break;
    }
  }
  
  // Validações de anomalias
  if (data.energy_kwh && data.energy_kwh > 5000) {
    warnings.push('Consumo muito alto detectado - verificar');
  }
  
  if (data.total_r$ && data.energy_kwh && (data.total_r$ / data.energy_kwh) > 2) {
    warnings.push('Tarifa muito alta detectada - verificar');
  }
  
  // Calcular confiança baseada na quantidade de erros
  const confidence = Math.max(0, 100 - (errors.length * 20 + warnings.length * 10));
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    confidence
  };
}

async function processInvoiceData(supabase: any, invoiceId: string) {
  try {
    // Buscar dados da fatura
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Validar dados
    const validation = validateData(invoice);
    
    // Atualizar fatura com resultados da validação
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        validation_errors: validation.errors,
        confidence_score: validation.confidence,
        requires_review: !validation.isValid || validation.warnings.length > 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);
    
    if (updateError) throw updateError;
    
    // Criar alertas se necessário
    if (!validation.isValid) {
      await supabase.from('alerts').insert({
        type: 'data_validation',
        severity: 'high',
        message: `Erros de validação na fatura ${invoice.uc_code}`,
        plant_id: null, // Fatura não tem planta associada ainda
        status: 'open'
      });
    }
    
    if (validation.warnings.length > 0) {
      await supabase.from('alerts').insert({
        type: 'data_anomaly',
        severity: 'medium',
        message: `Anomalias detectadas na fatura ${invoice.uc_code}`,
        plant_id: null,
        status: 'open'
      });
    }
    
    return {
      success: true,
      validation,
      processed: true
    };
    
  } catch (error) {
    console.error('Erro no processamento da fatura:', error);
    return {
      success: false,
      error: error.message,
      processed: false
    };
  }
}

async function detectAnomalies(supabase: any) {
  try {
    // Detectar faturas com consumo anômalo
    const { data: anomalies } = await supabase
      .from('invoices')
      .select('id, uc_code, energy_kwh, total_r$, reference_month')
      .gt('energy_kwh', 5000)
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Detectar plantas sem dados recentes
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: staleData } = await supabase
      .from('plants')
      .select('id, name, last_sync')
      .eq('sync_enabled', true)
      .lt('last_sync', oneDayAgo);
    
    // Criar alertas para dados obsoletos
    for (const plant of staleData || []) {
      await supabase.from('alerts').insert({
        type: 'sync_failure',
        severity: 'medium',
        message: `Planta ${plant.name} sem sincronização há mais de 24h`,
        plant_id: plant.id,
        status: 'open'
      });
    }
    
    return {
      success: true,
      anomaliesDetected: (anomalies?.length || 0) + (staleData?.length || 0)
    };
    
  } catch (error) {
    console.error('Erro na detecção de anomalias:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, invoiceId } = await req.json();

    switch (action) {
      case 'validate_invoice':
        if (!invoiceId) {
          return new Response(
            JSON.stringify({ error: 'Invoice ID é obrigatório' }),
            { status: 400, headers: corsHeaders }
          );
        }
        
        const result = await processInvoiceData(supabase, invoiceId);
        return new Response(JSON.stringify(result), { 
          status: 200, 
          headers: corsHeaders 
        });
        
      case 'detect_anomalies':
        const anomalyResult = await detectAnomalies(supabase);
        return new Response(JSON.stringify(anomalyResult), { 
          status: 200, 
          headers: corsHeaders 
        });
        
      default:
        return new Response(
          JSON.stringify({ error: 'Ação não reconhecida' }),
          { status: 400, headers: corsHeaders }
        );
    }

  } catch (error) {
    console.error('Erro no data-validator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});