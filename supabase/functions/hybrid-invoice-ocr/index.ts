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

    // Validar dados recebidos
    if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
      console.error('Invalid base64Images data:', { baseImagesExists: !!base64Images, isArray: Array.isArray(base64Images), length: base64Images?.length });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Dados de imagem inválidos. Forneça um array válido de imagens base64.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar que todas as imagens são strings válidas
    const invalidImages = base64Images.filter((img, index) => {
      if (typeof img !== 'string' || img.length === 0) {
        console.error(`Invalid image at index ${index}:`, { type: typeof img, length: img?.length });
        return true;
      }
      return false;
    });

    if (invalidImages.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `${invalidImages.length} imagem(ns) inválida(s) detectada(s)` 
        }),
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
        model: 'gpt-4o-mini',
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
        max_tokens: 2000
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
      let jsonString = jsonMatch ? jsonMatch[0] : gptContent;
      
      // Sanitização: remover cercas de código, vírgulas finais e resolver somas "a + b + c"
      jsonString = jsonString.replace(/```json|```/g, '');
      // Remover vírgulas finais antes de } ou ]
      jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
      // Resolver expressões aritméticas numéricas
      const sumExprRegex = /:\s*(-?\d+(?:\.\d+)?(?:\s*\+\s*-?\d+(?:\.\d+)?)+)\s*(,|\n|\r|\s*[}\]])/g;
      jsonString = jsonString.replace(sumExprRegex, (_m, expr, suffix) => {
        const sum = expr
          .split('+')
          .map((n) => parseFloat(n.trim()))
          .reduce((a, b) => a + b, 0);
        return `: ${Number.isFinite(sum) ? sum : 0}${suffix}`;
      });
      
      structuredData = JSON.parse(jsonString);
      
      // Adicionar metadados do processamento
      structuredData.processing_metadata = {
        vision_confidence: visionConfidence,
        vision_processing_time_ms: visionProcessingTime,
        gpt_processing_time_ms: gptProcessingTime,
        total_processing_time_ms: totalProcessingTime,
        extracted_text_length: extractedText.length,
        pages_processed: allExtractedTexts.length,
        processing_engine: 'multi_engine_ocr',
        timestamp: new Date().toISOString()
      };

    } catch (parseError) {
      console.error('Error parsing ChatGPT JSON response:', parseError);
      console.error('ChatGPT raw response:', gptData.choices[0].message.content);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse ChatGPT response', 
          details: (parseError as Error).message,
          raw_response: gptData.choices[0].message.content 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Salvar no Supabase e conectar com beneficiários
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Preparar dados da fatura
        const invoiceData = {
          file_url: fileName,
          uc_code: structuredData.uc || '',
          reference_month: structuredData.referencia || '',
          status: 'processed',
          energy_kwh: structuredData.consumo_kwh || 0,
          demand_kw: structuredData.demanda_kw || 0,
          total_r$: structuredData.valor_total || 0,
          taxes_r$: (structuredData.icms || 0) + (structuredData.pis_cofins || 0),
          extracted_data: structuredData,
          data_emissao: structuredData.data_emissao ? new Date(structuredData.data_emissao).toISOString().split('T')[0] : null,
          data_vencimento: structuredData.data_vencimento ? new Date(structuredData.data_vencimento).toISOString().split('T')[0] : null,
          data_leitura: structuredData.data_leitura ? new Date(structuredData.data_leitura).toISOString().split('T')[0] : null,
          leitura_atual: structuredData.leitura_atual || null,
          leitura_anterior: structuredData.leitura_anterior || null,
          confidence_score: visionConfidence,
          processing_time_ms: totalProcessingTime,
          extraction_method: 'multi_engine_ocr',
          valor_tusd: structuredData.valor_tusd || null,
          valor_te: structuredData.valor_te || null,
          icms_valor: structuredData.icms || null,
          pis_valor: structuredData.pis_cofins ? structuredData.pis_cofins / 2 : null,
          cofins_valor: structuredData.pis_cofins ? structuredData.pis_cofins / 2 : null,
          bandeira_tipo: structuredData.bandeira_tipo || null,
          bandeira_valor: structuredData.bandeira_valor || null,
          historico_consumo: structuredData.historico_consumo || [],
          tarifa_te_tusd: structuredData.tarifa_energia || null,
          tarifa_demanda_tusd: structuredData.tarifa_tusd || null
        };

        // Inserir fatura
        const { data: invoiceResult, error: invoiceError } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single();

        if (invoiceError) {
          console.error('Error inserting invoice:', invoiceError);
          throw invoiceError;
        }

        console.log('Invoice data saved to Supabase:', invoiceResult.id);

        // Buscar beneficiários com o mesmo UC
        const { data: beneficiaries, error: benefError } = await supabase
          .from('beneficiaries')
          .select('*')
          .eq('uc_code', structuredData.uc || '');

        if (!benefError && beneficiaries && beneficiaries.length > 0) {
          console.log(`Found ${beneficiaries.length} beneficiaries for UC ${structuredData.uc}`);
          
          // Atualizar customer_unit_id na fatura se houver beneficiários
          await supabase
            .from('invoices')
            .update({ customer_unit_id: beneficiaries[0].id })
            .eq('id', invoiceResult.id);
        }

        // Gerar análise inteligente da fatura
        const analysisPrompt = `
        Analise os dados extraídos desta fatura de energia elétrica e gere insights, anomalias e recomendações:

        Dados da Fatura:
        ${JSON.stringify(structuredData, null, 2)}

        Forneça uma análise em formato JSON com:
        1. Resumo executivo da fatura
        2. Anomalias detectadas (consumo fora do padrão, valores inconsistentes, etc.)
        3. Recomendações para otimização de custos
        4. Insights sobre padrão de consumo
        5. Alertas importantes

        Responda apenas com um JSON válido no formato:
        {
          "executive_summary": "string",
          "anomalies": [{"type": "string", "description": "string", "severity": "low|medium|high"}],
          "recommendations": [{"category": "string", "description": "string", "potential_savings": "string"}],
          "consumption_insights": "string",
          "important_alerts": ["string"],
          "cost_analysis": {"total_cost": number, "cost_breakdown": {}, "comparison_notes": "string"}
        }`;

        const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Você é um especialista em análise de faturas de energia elétrica. Forneça análises detalhadas e insights valiosos.' },
              { role: 'user', content: analysisPrompt }
            ],
            max_tokens: 1500
          }),
        });

        let aiInsights = null;
        let analysisReport = {
          processing_summary: {
            pages_processed: allExtractedTexts.length,
            processing_time_ms: totalProcessingTime,
            confidence_score: visionConfidence,
            extraction_method: 'multi_engine_ocr'
          },
          raw_data: structuredData
        };

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          try {
            const analysisContent = analysisData.choices[0].message.content;
            const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : analysisContent;
            aiInsights = JSON.parse(jsonString);
            
            analysisReport.ai_analysis = aiInsights;
            console.log('AI analysis generated successfully');
          } catch (parseError) {
            console.error('Error parsing AI analysis:', parseError);
            aiInsights = { error: 'Failed to parse AI analysis', raw_content: analysisData.choices[0].message.content };
          }
        }

        // Salvar análise da fatura
        const { error: analysisError } = await supabase
          .from('invoice_analyses')
          .insert({
            invoice_id: invoiceResult.id,
            analysis_report: analysisReport,
            chat_report: `Processamento híbrido concluído com sucesso.\n\nResumo:\n- ${allExtractedTexts.length} ${isPdf && allExtractedTexts.length > 1 ? 'páginas processadas' : 'imagem processada'}\n- Tempo total: ${totalProcessingTime}ms\n- Confiança OCR: ${(visionConfidence * 100).toFixed(1)}%\n- UC identificada: ${structuredData.uc || 'Não identificada'}\n- Valor total: R$ ${structuredData.valor_total || 'Não identificado'}\n\nBeneficiários encontrados: ${beneficiaries?.length || 0}`,
            ai_insights: aiInsights,
            anomalies_detected: aiInsights?.anomalies || [],
            recommendations: aiInsights?.recommendations || []
          });

        if (analysisError) {
          console.error('Error saving analysis:', analysisError);
        } else {
          console.log('Invoice analysis saved successfully');
        }

      } catch (supabaseError) {
        console.error('Error saving to Supabase:', supabaseError);
        // Não falhar se o Supabase der erro, continuar com a resposta
        return new Response(
          JSON.stringify({ 
            error: 'Database error', 
            details: supabaseError.message,
            extracted_data: structuredData
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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