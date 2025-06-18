
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { filePath, fileName } = await req.json();

    console.log(`Processing invoice: ${fileName}`);

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

    // Extract data using OpenAI Vision
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `Você é um especialista em extrair dados de faturas de energia elétrica brasileiras. 
            Extraia os seguintes campos obrigatórios:
            - uc_code: Código da unidade consumidora
            - reference_month: Mês de referência (formato YYYY-MM)
            - energy_kWh: Consumo de energia em kWh
            - demand_kW: Demanda em kW  
            - total_R$: Valor total em reais
            - taxes_R$: Valor dos tributos em reais
            
            Retorne APENAS um JSON válido com estes campos.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia os dados desta fatura de energia:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      }),
    });

    const aiResult = await openAIResponse.json();
    const extractedData = JSON.parse(aiResult.choices[0].message.content);

    // Save to database
    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        file_url: filePath,
        uc_code: extractedData.uc_code,
        reference_month: extractedData.reference_month,
        energy_kWh: extractedData.energy_kWh,
        demand_kW: extractedData.demand_kW,
        total_R$: extractedData.total_R$,
        taxes_R$: extractedData.taxes_R$,
        status: 'processed',
        extracted_data: extractedData
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Insert error: ${insertError.message}`);
    }

    console.log(`Invoice processed successfully: ${invoice.id}`);

    return new Response(JSON.stringify({
      success: true,
      invoice_id: invoice.id,
      extracted_data: extractedData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in invoice-reader:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
