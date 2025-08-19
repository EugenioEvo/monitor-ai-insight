import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const googleApiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!googleApiKey) {
      console.error('Google API key not configured');
      return new Response(
        JSON.stringify({ error: 'Google Vision API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openaiApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { base64Images, fileName, isPdf } = await req.json();

    if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No base64 images provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting hybrid OCR process for:', fileName, `(${base64Images.length} ${isPdf ? 'pages' : 'images'})`);
    const startTime = Date.now();

    // Fase 1: Google Vision OCR para extração de texto de todas as páginas
    console.log('Phase 1: Google Vision OCR extraction...');
    const visionStartTime = Date.now();
    
    let allExtractedTexts: string[] = [];
    let totalVisionConfidence = 0;
    
    // Process each image/page
    for (let i = 0; i < base64Images.length; i++) {
      console.log(`Processing ${isPdf ? 'page' : 'image'} ${i + 1} of ${base64Images.length}`);
      
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Images[i] },
              features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
            }]
          })
        }
      );

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error(`Google Vision API error for ${isPdf ? 'page' : 'image'} ${i + 1}:`, errorText);
        continue; // Skip this page but continue with others
      }

      const visionData = await visionResponse.json();
      
      if (visionData.responses?.[0]?.textAnnotations?.[0]?.description) {
        const pageText = visionData.responses[0].textAnnotations[0].description;
        const pageConfidence = visionData.responses[0].textAnnotations[0].confidence || 0.9;
        
        allExtractedTexts.push(`--- ${isPdf ? `PÁGINA ${i + 1}` : `IMAGEM ${i + 1}`} ---\n${pageText}`);
        totalVisionConfidence += pageConfidence;
        
        console.log(`${isPdf ? 'Page' : 'Image'} ${i + 1}: ${pageText.length} characters extracted`);
      } else {
        console.log(`No text detected in ${isPdf ? 'page' : 'image'} ${i + 1}`);
      }
    }
    
    if (allExtractedTexts.length === 0) {
      console.log('No text detected in any page/image');
      return new Response(
        JSON.stringify({ error: 'No text detected in any page/image' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedText = allExtractedTexts.join('\n\n');
    const visionConfidence = totalVisionConfidence / allExtractedTexts.length;
    const visionProcessingTime = Date.now() - visionStartTime;

    console.log('Google Vision OCR completed in', visionProcessingTime, 'ms');
    console.log(`Processed ${allExtractedTexts.length} ${isPdf ? 'pages' : 'images'}, total text length:`, extractedText.length, 'characters');

    // Fase 2: ChatGPT para análise e estruturação dos dados
    console.log('Phase 2: ChatGPT analysis...');
    const gptStartTime = Date.now();

    const analysisPrompt = `
Analise o seguinte texto extraído de uma fatura de energia elétrica brasileira ${isPdf && allExtractedTexts.length > 1 ? `(${allExtractedTexts.length} páginas)` : ''} e extraia TODOS os dados possíveis em formato JSON estruturado.

TEXTO EXTRAÍDO DE ${isPdf && allExtractedTexts.length > 1 ? `${allExtractedTexts.length} PÁGINAS` : 'FATURA'}:
${extractedText}

${isPdf && allExtractedTexts.length > 1 ? 'IMPORTANTE: O texto acima contém múltiplas páginas da mesma fatura. Consolide todas as informações das páginas para extrair os dados da fatura completa.' : ''}

Extraia os seguintes campos (todos os que conseguir encontrar):
- Informações básicas (UC, referência, data emissão, data vencimento)
- Consumo de energia (kWh)
- Demanda (kW)
- Valores monetários (R$)
- Impostos e taxas
- Bandeira tarifária
- Histórico de consumo
- Dados do cliente
- Informações da distribuidora
- Leituras do medidor
- Tarifas aplicadas

Responda APENAS com um JSON válido, sem texto adicional:

{
  "uc": "string",
  "referencia": "YYYY-MM",
  "data_emissao": "YYYY-MM-DD",
  "data_vencimento": "YYYY-MM-DD",
  "data_leitura": "YYYY-MM-DD",
  "consumo_kwh": number,
  "demanda_kw": number,
  "valor_total": number,
  "valor_energia": number,
  "valor_tusd": number,
  "valor_te": number,
  "icms": number,
  "pis_cofins": number,
  "bandeira_tipo": "string",
  "bandeira_valor": number,
  "historico_consumo": [{"mes": "YYYY-MM", "consumo": number}],
  "cliente_nome": "string",
  "cliente_endereco": "string",
  "distribuidora": "string",
  "leitura_anterior": number,
  "leitura_atual": number,
  "tarifa_energia": number,
  "tarifa_tusd": number,
  "confidence_score": number
}`;

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de faturas de energia elétrica brasileiras. Extraia dados estruturados com máxima precisão.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_completion_tokens: 2000
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'ChatGPT analysis failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gptData = await gptResponse.json();
    const gptProcessingTime = Date.now() - gptStartTime;
    const totalProcessingTime = Date.now() - startTime;

    console.log('ChatGPT analysis completed in', gptProcessingTime, 'ms');

    let structuredData;
    try {
      const gptContent = gptData.choices[0].message.content;
      console.log('ChatGPT response:', gptContent.substring(0, 200) + '...');
      
      // Extrair JSON do conteúdo (caso venha com texto adicional)
      const jsonMatch = gptContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : gptContent;
      
      structuredData = JSON.parse(jsonString);
      
      // Adicionar metadados do processamento
      structuredData.processing_metadata = {
        vision_confidence: visionConfidence,
        vision_processing_time_ms: visionProcessingTime,
        gpt_processing_time_ms: gptProcessingTime,
        total_processing_time_ms: totalProcessingTime,
        extracted_text_length: extractedText.length,
        pages_processed: allExtractedTexts.length,
        processing_engine: 'hybrid_google_vision_chatgpt',
        timestamp: new Date().toISOString()
      };

    } catch (parseError) {
      console.error('Error parsing ChatGPT JSON response:', parseError);
      console.error('ChatGPT raw response:', gptData.choices[0].message.content);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse ChatGPT response', 
          details: parseError.message,
          raw_response: gptData.choices[0].message.content 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Salvar no Supabase (opcional)
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase.from('invoices').insert({
          file_name: fileName,
          extracted_data: structuredData,
          raw_text: extractedText,
          processing_engine: 'hybrid_google_vision_chatgpt',
          confidence_score: visionConfidence,
          processing_time_ms: totalProcessingTime,
          created_at: new Date().toISOString()
        });

        console.log('Invoice data saved to Supabase');
      } catch (supabaseError) {
        console.error('Error saving to Supabase:', supabaseError);
        // Não falhar se o Supabase der erro, continuar com a resposta
      }
    }

    console.log('Hybrid OCR process completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        structured_data: structuredData,
        raw_text: extractedText,
        pages_processed: allExtractedTexts.length,
        processing_stats: {
          vision_confidence: visionConfidence,
          vision_processing_time_ms: visionProcessingTime,
          gpt_processing_time_ms: gptProcessingTime,
          total_processing_time_ms: totalProcessingTime,
          text_length: extractedText.length,
          pages_processed: allExtractedTexts.length
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in hybrid invoice OCR:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});