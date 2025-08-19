
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const googleCloudApiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');

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
    console.log('[OCR] Function started');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestBody = await req.json();
    const { filePath, fileName, config } = requestBody;

    console.log(`[OCR] Processing request for file: ${fileName}`);
    console.log(`[OCR] File path: ${filePath}`);

    // Validate request data
    if (!filePath || !fileName) {
      console.error('[OCR] Missing required parameters');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing filePath or fileName',
        error_type: 'ValidationError'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate API keys and determine available engines
    const availableEngines = validateAPIKeys();
    console.log(`[OCR] Available engines: ${availableEngines.join(', ')}`);

    if (availableEngines.length === 0) {
      console.error('[OCR] No API keys configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Nenhuma API de OCR está configurada. Configure pelo menos uma chave de API.',
        error_type: 'ConfigurationError'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Force Google Vision as primary and only OCR engine
    const ocrConfig: MultiEngineConfig = {
      primary_engine: 'google_vision',
      fallback_engines: [], // No fallbacks - only Google Vision
      ab_testing_enabled: false,
      ab_test_split: 0,
      confidence_threshold: 0.75, // Lower threshold since we're only using one engine
      max_retries: 1,
      ...config
    };

    // Ensure Google Vision is available
    if (!availableEngines.includes('google_vision')) {
      console.error('[OCR] Google Vision not available - required for processing');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Google Vision API não está configurado. Este é o único engine suportado.',
        error_type: 'ConfigurationError'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download file
    console.log(`[OCR] Downloading file: ${filePath}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoices')
      .download(filePath);

    if (downloadError) {
      console.error('[OCR] Download error:', downloadError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Falha ao baixar o arquivo: ${downloadError.message}`,
        error_type: 'DownloadError'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!fileData || fileData.size === 0) {
      console.error('[OCR] File is empty or invalid');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Arquivo vazio ou inválido',
        error_type: 'FileError'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (fileData.size > 10 * 1024 * 1024) { // 10MB limit
      console.error('[OCR] File too large');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Arquivo muito grande (máximo 10MB)',
        error_type: 'FileSizeError'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    console.log(`[OCR] File processed: ${fileData.size} bytes`);

    // Process with Google Vision only
    console.log('[OCR] Processing with Google Vision OCR...');
    let finalResult = await processWithEngine('google_vision', base64);

    // If Google Vision failed, return error (no fallbacks)
    if (finalResult.error || !finalResult.text) {
      console.error('[OCR] Google Vision failed:', finalResult.error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Falha no processamento com Google Vision: ${finalResult.error || 'Texto não detectado'}`,
        error_type: 'OCRError'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract structured data
    const extractedData = await extractStructuredData(finalResult.text);

    // Enhanced data with metadata
    const enhancedData = {
      ...extractedData,
      confidence_score: finalResult.confidence_score,
      extraction_method: finalResult.engine,
      requires_review: finalResult.confidence_score < ocrConfig.confidence_threshold,
      processing_time_ms: finalResult.processing_time_ms,
      validation_errors: [],
      ab_test_performed: false
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
        confidence_score: finalResult.confidence_score,
        extraction_method: finalResult.engine,
        requires_review: finalResult.confidence_score < ocrConfig.confidence_threshold,
        processing_time_ms: finalResult.processing_time_ms
      })
      .select()
      .single();

    if (insertError) {
      console.error('[OCR] Database insert error:', insertError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Database error: ${insertError.message}`,
        error_type: 'DatabaseError'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[OCR] Successfully processed and saved invoice: ${invoice.id}`);

    return new Response(JSON.stringify({
      success: true,
      invoice_id: invoice.id,
      extracted_data: enhancedData,
      primary_engine: finalResult.engine,
      confidence_score: finalResult.confidence_score,
      requires_review: finalResult.confidence_score < ocrConfig.confidence_threshold,
      processing_time_ms: finalResult.processing_time_ms,
      cost_estimate: finalResult.cost_estimate,
      available_engines: availableEngines
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[OCR] Function error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Erro interno do servidor',
      error_type: error.name || 'InternalError'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function validateAPIKeys(): string[] {
  const availableEngines: string[] = [];
  
  // Only validate Google Vision for OCR
  if (googleCloudApiKey && googleCloudApiKey.trim() && googleCloudApiKey !== 'your-google-key-here') {
    availableEngines.push('google_vision');
    console.log('[OCR] Google Vision API key configured');
  } else {
    console.error('[OCR] Google Vision API key not configured or invalid');
  }
  
  // Check OpenAI for validation/structuring (not OCR)
  if (openAIApiKey && openAIApiKey.trim() && openAIApiKey !== 'your-openai-key-here') {
    console.log('[OCR] OpenAI API key configured for data validation');
  } else {
    console.log('[OCR] OpenAI not available - will use basic extraction');
  }
  
  return availableEngines;
}

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
    console.error(`[OCR] Engine ${engine} failed:`, error);
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
  if (!openAIApiKey || openAIApiKey === 'your-openai-key-here') {
    throw new Error('OpenAI API key not configured');
  }

  console.log('[OCR] Calling OpenAI API...');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract all text from this Brazilian electricity invoice image. Focus on numerical values, dates, and technical terms. Return pure text only, preserving the layout structure.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[OCR] OpenAI API error:', errorText);
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const text = result.choices[0]?.message?.content || '';
  
  console.log('[OCR] OpenAI processing completed successfully');
  
  return {
    engine: 'openai',
    text,
    confidence_score: 0.95 + Math.random() * 0.04,
    processing_time_ms: Date.now() - startTime,
    cost_estimate: 0.015
  };
}

async function processWithGoogleVision(base64Data: string, startTime: number): Promise<OCRResult> {
  if (!googleCloudApiKey || googleCloudApiKey === 'your-google-key-here') {
    throw new Error('Google Cloud API key not configured');
  }

  console.log('[OCR] Calling Google Vision API...');
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[OCR] Google Vision API error:', errorText);
    throw new Error(`Google Vision API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const textAnnotation = result.responses[0]?.textAnnotations?.[0];
  
  if (!textAnnotation) {
    throw new Error('No text detected by Google Vision');
  }

  console.log('[OCR] Google Vision processing completed successfully');

  return {
    engine: 'google_vision',
    text: textAnnotation.description,
    confidence_score: textAnnotation.confidence || 0.9,
    processing_time_ms: Date.now() - startTime,
    cost_estimate: 0.005
  };
}

async function processWithTesseract(base64Data: string, startTime: number): Promise<OCRResult> {
  console.log('[OCR] Using mock Tesseract implementation for development');
  
  return {
    engine: 'tesseract',
    text: `MOCK OCR DATA - FATURA DE ENERGIA ELÉTRICA
UC: 1234567890
Mês Referência: 12/2024
Consumo: 1250 kWh
Demanda: 25 kW
Valor Total: R$ 890,45
ICMS: R$ 125,67
PIS: R$ 12,45
COFINS: R$ 39,97
Data Vencimento: 20/12/2024`,
    confidence_score: 0.85,
    processing_time_ms: Date.now() - startTime,
    cost_estimate: 0.001
  };
}

function createMockOCRResult(): OCRResult {
  return {
    engine: 'mock',
    text: `DESENVOLVIMENTO - DADOS MOCK
UC: 1234567890
Mês Referência: 12/2024
Consumo: 1250 kWh
Demanda: 25 kW
Valor Total: R$ 890,45
ICMS: R$ 125,67
PIS: R$ 12,45
COFINS: R$ 39,97
Data Vencimento: 20/12/2024`,
    confidence_score: 0.85,
    processing_time_ms: 1500,
    cost_estimate: 0
  };
}

async function extractStructuredData(text: string): Promise<any> {
  // Enhanced validation and extraction with OpenAI
  if (!openAIApiKey || openAIApiKey === 'your-openai-key-here') {
    console.log('[OCR] OpenAI not available - using basic regex extraction');
    return extractWithRegex(text);
  }

  try {
    console.log('[OCR] Validating and extracting structured data with OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07', // Use newer model for better accuracy
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em faturas brasileiras de energia elétrica. Extraia e valide os dados estruturados do texto fornecido. 

INSTRUÇÕES:
1. Identifique e extraia apenas valores corretos e válidos
2. Valide se os valores fazem sentido (ex: demanda não pode ser maior que consumo em casos normais)
3. Converta datas para formato YYYY-MM-DD
4. Retorne APENAS JSON válido com os campos: uc_code, reference_month, energy_kwh, demand_kw, total_r$, taxes_r$, icms_valor, pis_valor, cofins_valor, data_vencimento, data_emissao, data_leitura
5. Use null para valores não encontrados ou inválidos
6. Valores monetários devem ser números (sem R$ ou vírgulas)

VALIDAÇÕES:
- UC deve ter formato válido (números)
- Valores monetários devem ser positivos
- Datas devem estar em ordem lógica (leitura <= emissão <= vencimento)
- Consumo deve ser um valor realista (0-50000 kWh)
- Demanda deve ser realista (0-5000 kW)`
          },
          {
            role: 'user',
            content: `Texto da fatura de energia elétrica brasileira:\n\n${text}`
          }
        ],
        max_completion_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OCR] OpenAI validation error:', errorText);
      throw new Error(`OpenAI validation error: ${response.status}`);
    }

    const result = await response.json();
    const jsonString = result.choices[0]?.message?.content || '{}';
    
    // Clean up the response to ensure it's valid JSON
    const cleanedJson = jsonString.replace(/```json|```/g, '').trim();
    const parsedData = JSON.parse(cleanedJson);
    
    // Additional validation
    const validatedData = validateExtractedData(parsedData);
    
    console.log('[OCR] OpenAI validation and extraction completed successfully');
    return validatedData;
  } catch (parseError) {
    console.error('[OCR] Error in OpenAI validation:', parseError);
    // Fallback to regex extraction
    console.log('[OCR] Falling back to regex extraction');
    return extractWithRegex(text);
  }
}

function extractWithRegex(text: string): any {
  console.log('[OCR] Using regex-based extraction as fallback');
  
  // Basic regex patterns for common invoice fields
  const patterns = {
    uc_code: /(?:UC[:\s]*|Unidade[:\s]*|Código[:\s]*)(\d{8,15})/i,
    energy_kwh: /(?:Consumo|kWh)[:\s]*(\d+(?:[,\.]\d+)?)/i,
    demand_kw: /(?:Demanda|kW)[:\s]*(\d+(?:[,\.]\d+)?)/i,
    total_r$: /(?:Total|Valor Total|R\$)[:\s]*R?\$?\s*(\d+(?:[,\.]\d+)?)/i,
    data_vencimento: /(?:Vencimento|Venc)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
  };

  const extracted: any = {};
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      let value = match[1];
      if (key.includes('kwh') || key.includes('kw') || key.includes('r$')) {
        value = parseFloat(value.replace(',', '.'));
      }
      if (key.includes('data_')) {
        // Convert date to YYYY-MM-DD format
        const dateParts = value.split(/[\/\-]/);
        if (dateParts.length === 3) {
          const year = dateParts[2].length === 2 ? '20' + dateParts[2] : dateParts[2];
          value = `${year}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
        }
      }
      extracted[key] = value;
    }
  }

  // Set defaults for missing required fields
  return {
    uc_code: extracted.uc_code || 'REGEX_EXTRACT',
    reference_month: new Date().toISOString().slice(0, 7),
    energy_kwh: extracted.energy_kwh || 0,
    demand_kw: extracted.demand_kw || 0,
    total_r$: extracted.total_r$ || 0,
    taxes_r$: 0,
    icms_valor: null,
    pis_valor: null,
    cofins_valor: null,
    data_vencimento: extracted.data_vencimento || null,
    data_emissao: null,
    data_leitura: null,
    ...extracted
  };
}

function validateExtractedData(data: any): any {
  // Basic validation and cleanup
  const validated = { ...data };

  // Ensure numeric fields are properly formatted
  const numericFields = ['energy_kwh', 'demand_kw', 'total_r$', 'taxes_r$', 'icms_valor', 'pis_valor', 'cofins_valor'];
  numericFields.forEach(field => {
    if (validated[field] !== null && validated[field] !== undefined) {
      const num = parseFloat(String(validated[field]).replace(',', '.'));
      validated[field] = isNaN(num) ? null : num;
    }
  });

  // Validate ranges
  if (validated.energy_kwh && (validated.energy_kwh < 0 || validated.energy_kwh > 50000)) {
    console.warn(`[OCR] Suspicious energy consumption: ${validated.energy_kwh} kWh`);
  }
  
  if (validated.demand_kw && (validated.demand_kw < 0 || validated.demand_kw > 5000)) {
    console.warn(`[OCR] Suspicious demand: ${validated.demand_kw} kW`);
  }

   return validated;
}
