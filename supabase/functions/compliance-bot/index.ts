
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
    const { plant_id, trigger_type = 'new_plant' } = await req.json();

    console.log(`Starting compliance analysis for plant: ${plant_id}, trigger: ${trigger_type}`);

    // Get plant details
    const { data: plant, error: plantError } = await supabase
      .from('plants')
      .select('*')
      .eq('id', plant_id)
      .single();

    if (plantError) {
      throw new Error(`Plant query error: ${plantError.message}`);
    }

    // Get beneficiaries for the plant
    const { data: beneficiaries, error: beneficiariesError } = await supabase
      .from('beneficiaries')
      .select('*')
      .eq('plant_id', plant_id);

    if (beneficiariesError) {
      throw new Error(`Beneficiaries query error: ${beneficiariesError.message}`);
    }

    // Use AI to validate compliance requirements
    const complianceAnalysis = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `Você é um especialista em conformidade regulatória para energia solar no Brasil (ANEEL).
            Analise a planta e beneficiários conforme REN 482/2012 e atualizações.
            
            Verifique:
            1. Alocação de percentuais (soma deve ser ≤100%)
            2. Distância geográfica (mesmo estado/concessionária)
            3. Documentação CNPJ válida
            4. Capacidade dentro dos limites regulamentares
            
            Responda com JSON:
            {
              "compliant": boolean,
              "issues": ["lista de problemas"],
              "severity": "low|medium|high|critical",
              "recommendations": ["lista de recomendações"],
              "report_summary": "resumo executivo"
            }`
          },
          {
            role: 'user',
            content: `PLANTA:
            Nome: ${plant.name}
            Localização: ${plant.lat}, ${plant.lng}
            Capacidade: ${plant.capacity_kWp} kWp
            Concessionária: ${plant.concessionaria}
            Status: ${plant.status}
            Data início: ${plant.start_date}
            
            BENEFICIÁRIOS:
            ${beneficiaries.map(b => 
              `- ${b.name} (${b.cnpj}) - UC: ${b.uc_code} - ${b.allocation_percent}%`
            ).join('\n')}`
          }
        ],
        max_tokens: 1000
      }),
    });

    const aiResult = await complianceAnalysis.json();
    const analysis = JSON.parse(aiResult.choices[0].message.content);

    // Create compliance alert if issues found
    if (!analysis.compliant) {
      const { error: alertError } = await supabase
        .from('alerts')
        .insert({
          plant_id: plant_id,
          severity: analysis.severity,
          type: 'compliance',
          message: `Problemas de conformidade detectados: ${analysis.issues.join(', ')}`
        });

      if (alertError) {
        console.error('Alert creation error:', alertError);
      }
    }

    // Generate PDF report summary (simplified - in production would use a PDF library)
    const reportData = {
      plant_name: plant.name,
      analysis_date: new Date().toISOString(),
      compliant: analysis.compliant,
      issues: analysis.issues,
      recommendations: analysis.recommendations,
      summary: analysis.report_summary
    };

    console.log(`Compliance analysis completed for plant ${plant.name}`);
    console.log(`Compliant: ${analysis.compliant}, Issues: ${analysis.issues.length}`);

    return new Response(JSON.stringify({
      success: true,
      plant_id: plant_id,
      compliance_result: analysis,
      report_data: reportData,
      alert_created: !analysis.compliant
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compliance-bot:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
