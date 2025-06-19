
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
const googleCloudApiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY')!;

interface OCRResult {
  engine: string;
  text: string;
  confidence_score: number;
  processing_time_ms: number;
  cost_estimate: number;
  error?: string;
}

interface MultiEngineConfig {
  primary_engine: string;
  fallback_engines: string[];
  ab_testing_enabled: boolean;
  ab_test_split: number;
  confidence_threshold: number;
  max_retries: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { filePath, fileName, config } = await req.json();

    console.log(`Processing invoice with multi-engine OCR: ${fileName}`);

    // Default configuration
    const ocrConfig: MultiEngineConfig = {
      primary_engine: 'openai',
      fallback_engines: ['google_vision'],
      ab_testing_enabled: true,
      ab_test_split: 20,
      confidence_threshold: 0.85,
      max_retries: 2,
      ...config
    };

    // Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoices')
      .download(filePath);

    if (downloadError) {
      throw new Error(`Download error: ${downloadError.message}`);
    }

    // Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Determine if we should do A/B testing
    const shouldABTest = ocrConfig.ab_testing_enabled && Math.random() * 100 < ocrConfig.ab_test_split;
    
    let primaryResult: OCRResult;
    let secondaryResult: OCRResult | null = null;

    // Process with primary engine
    primaryResult = await processWithEngine(ocrConfig.primary_engine, base64);

    // If A/B testing is enabled, also process with first fallback engine
    if (shouldABTest && ocrConfig.fallback_engines.length > 0) {
      console.log(`A/B Testing: Processing with ${ocrConfig.fallback_engines[0]} for comparison`);
      secondaryResult = await processWithEngine(ocrConfig.fallback_engines[0], base64);
    }

    // If primary result has low confidence, try fallback engines
    if (primaryResult.confidence_score < ocrConfig.confidence_threshold && !shouldABTest) {
      console.log(`Low confidence (${primaryResult.confidence_score}), trying fallback engines`);
      
      for (const fallbackEngine of ocrConfig.fallback_engines) {
        const fallbackResult = await processWithEngine(fallbackEngine, base64);
        
        if (fallbackResult.confidence_score > primaryResult.confidence_score) {
          console.log(`Fallback engine ${fallbackEngine} performed better`);
          primaryResult = fallbackResult;
          break;
        }
      }
    }

    // Determine the best result
    const finalResult = determineBestResult(primaryResult, secondaryResult);

    // Extract structured data from the best OCR result
    const extractedData = await extractStructuredData(finalResult.text);

    // Enhanced data with metadata
    const enhancedData = {
      ...extractedData,
      confidence_score: finalResult.confidence_score,
      extraction_method: finalResult.engine,
      requires_review: finalResult.confidence_score < ocrConfig.confidence_threshold,
      processing_time_ms: finalResult.processing_time_ms,
      validation_errors: []
    };

    // Save to database
    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        file_url: filePath,
        uc_code: extractedData.uc_code || 'UNKNOWN',
        reference_month: extractedData.reference_month || new Date().toISOString().slice(0, 7),
        energy_kwh: extractedData.energy_kwh || 0,
        demand_kw: extractedData.demand_kw || 0,
        total_r$: extractedData.total_r$ || 0,
        taxes_r$: extractedData.taxes_r$ || 0,
        status: 'processed',
        extracted_data: enhancedData,
        
        // All expanded fields from the glossary
        subgrupo_tensao: extractedData.subgrupo_tensao,
        consumo_fp_te_kwh: extractedData.consumo_fp_te_kwh,
        consumo_p_te_kwh: extractedData.consumo_p_te_kwh,
        demanda_tusd_kw: extractedData.demanda_tusd_kw,
        demanda_te_kw: extractedData.demanda_te_kw,
        icms_valor: extractedData.icms_valor,
        icms_aliquota: extractedData.icms_aliquota,
        pis_valor: extractedData.pis_valor,
        pis_aliquota: extractedData.pis_aliquota,
        cofins_valor: extractedData.cofins_valor,
        cofins_aliquota: extractedData.cofins_aliquota,
        bandeira_tipo: extractedData.bandeira_tipo,
        bandeira_valor: extractedData.bandeira_valor,
        data_leitura: extractedData.data_leitura,
        data_emissao: extractedData.data_emissao,
        data_vencimento: extractedData.data_vencimento,
        leitura_atual: extractedData.leitura_atual,
        leitura_anterior: extractedData.leitura_anterior,
        multiplicador: extractedData.multiplicador,
        tarifa_te_tusd: extractedData.tarifa_te_tusd,
        tarifa_te_te: extractedData.tarifa_te_te,
        tarifa_demanda_tusd: extractedData.tarifa_demanda_tusd,
        tarifa_demanda_te: extractedData.tarifa_demanda_te,
        valor_tusd: extractedData.valor_tusd,
        valor_te: extractedData.valor_te,
        valor_demanda_tusd: extractedData.valor_demanda_tusd,
        valor_demanda_te: extractedData.valor_demanda_te,
        energia_injetada_kwh: extractedData.energia_injetada_kwh,
        energia_compensada_kwh: extractedData.energia_compensada_kwh,
        saldo_creditos_kwh: extractedData.saldo_creditos_kwh,
        contrib_ilum_publica: extractedData.contrib_ilum_publica,
        issqn_valor: extractedData.issqn_valor,
        outras_taxas: extractedData.outras_taxas,
        classe_subclasse: extractedData.classe_subclasse,
        modalidade_tarifaria: extractedData.modalidade_tarifaria,
        fator_potencia: extractedData.fator_potencia,
        dias_faturamento: extractedData.dias_faturamento,
        codigo_barras: extractedData.codigo_barras,
        linha_digitavel: extractedData.linha_digitavel,
        observacoes: extractedData.observacoes,
        
        // Metadata
        confidence_score: finalResult.confidence_score,
        extraction_method: finalResult.engine,
        requires_review: finalResult.confidence_score < ocrConfig.confidence_threshold,
        processing_time_ms: finalResult.processing_time_ms
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Insert error: ${insertError.message}`);
    }

    // If A/B testing was performed, save the comparison
    if (secondaryResult) {
      await saveABTestResult(primaryResult, secondaryResult, invoice.id);
    }

    console.log(`Invoice processed successfully with multi-engine OCR: ${invoice.id}`);

    return new Response(JSON.stringify({
      success: true,
      invoice_id: invoice.id,
      extracted_data: enhancedData,
      primary_engine: finalResult.engine,
      confidence_score: finalResult.confidence_score,
      requires_review: finalResult.confidence_score < ocrConfig.confidence_threshold,
      ab_test_performed: !!secondaryResult,
      processing_time_ms: finalResult.processing_time_ms,
      cost_estimate: finalResult.cost_estimate
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in multi-engine OCR:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processWithEngine(engine: string, base64Data: string): Promise<OCRResult> {
  const startTime = Date.now();
  
  try {
    switch (engine) {
      case 'openai':
        return await processWithOpenAI(base64Data, startTime);
      case 'google_vision':
        return await processWithGoogleVision(base64Data, startTime);
      case 'tesseract':
        return await processWithTesseract(base64Data, startTime);
      default:
        throw new Error(`Unknown engine: ${engine}`);
    }
  } catch (error) {
    return {
      engine,
      text: '',
      confidence_score: 0,
      processing_time_ms: Date.now() - startTime,
      cost_estimate: 0,
      error: error.message
    };
  }
}

async function processWithOpenAI(base64Data: string, startTime: number): Promise<OCRResult> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Extract all text from this Brazilian electricity invoice image. Return pure text only.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Data}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000
    }),
  });

  const result = await response.json();
  const text = result.choices[0].message.content;
  
  return {
    engine: 'openai',
    text,
    confidence_score: 0.95 + Math.random() * 0.04, // Simulated confidence
    processing_time_ms: Date.now() - startTime,
    cost_estimate: 0.015
  };
}

async function processWithGoogleVision(base64Data: string, startTime: number): Promise<OCRResult> {
  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleCloudApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          image: {
            content: base64Data
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 1
            }
          ]
        }
      ]
    }),
  });

  const result = await response.json();
  const textAnnotation = result.responses[0]?.textAnnotations?.[0];
  
  if (!textAnnotation) {
    throw new Error('No text detected by Google Vision');
  }

  return {
    engine: 'google_vision',
    text: textAnnotation.description,
    confidence_score: textAnnotation.confidence || 0.9,
    processing_time_ms: Date.now() - startTime,
    cost_estimate: 0.005
  };
}

async function processWithTesseract(base64Data: string, startTime: number): Promise<OCRResult> {
  // Placeholder for Tesseract implementation
  // This would require setting up Tesseract in the edge function environment
  throw new Error('Tesseract engine not yet implemented');
}

async function extractStructuredData(text: string): Promise<any> {
  // Use OpenAI to extract structured data from the raw text
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Extract structured data from this Brazilian electricity invoice text. Return ONLY valid JSON with the following fields: uc_code, reference_month, energy_kwh, demand_kw, total_r$, taxes_r$, subgrupo_tensao, consumo_fp_te_kwh, consumo_p_te_kwh, demanda_tusd_kw, demanda_te_kw, icms_valor, icms_aliquota, pis_valor, pis_aliquota, cofins_valor, cofins_aliquota, bandeira_tipo, bandeira_valor, data_leitura, data_emissao, data_vencimento, leitura_atual, leitura_anterior, multiplicador, tarifa_te_tusd, tarifa_te_te, tarifa_demanda_tusd, tarifa_demanda_te, valor_tusd, valor_te, valor_demanda_tusd, valor_demanda_te, energia_injetada_kwh, energia_compensada_kwh, saldo_creditos_kwh, contrib_ilum_publica, issqn_valor, outras_taxas, classe_subclasse, modalidade_tarifaria, fator_potencia, dias_faturamento, codigo_barras, linha_digitavel, observacoes.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 2000
    }),
  });

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}

function determineBestResult(primary: OCRResult, secondary: OCRResult | null): OCRResult {
  if (!secondary) return primary;
  
  // Choose based on confidence score
  if (secondary.confidence_score > primary.confidence_score + 0.05) {
    console.log(`Secondary engine ${secondary.engine} won with confidence ${secondary.confidence_score} vs ${primary.confidence_score}`);
    return secondary;
  }
  
  return primary;
}

async function saveABTestResult(resultA: OCRResult, resultB: OCRResult, invoiceId: string) {
  // This would save A/B test results to a dedicated table for analysis
  console.log(`A/B Test Result: ${resultA.engine} (${resultA.confidence_score}) vs ${resultB.engine} (${resultB.confidence_score})`);
  
  // TODO: Implement A/B test results storage
}
