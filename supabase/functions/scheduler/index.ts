
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
    
    console.log('Scheduler: Checking for high priority alerts...');

    // Get alerts with P1 or P2 priority that haven't been processed
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select(`
        *,
        plants (name, lat, lng, concessionaria)
      `)
      .in('severity', ['high', 'critical'])
      .is('acknowledged_by', null)
      .order('created_at', { ascending: true });

    if (alertsError) {
      throw new Error(`Alerts query error: ${alertsError.message}`);
    }

    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No high priority alerts to process'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const processedTickets = [];

    for (const alert of alerts) {
      // Map severity to priority
      const priority = alert.severity === 'critical' ? 'P1' : 'P2';
      
      // Use AI to suggest ticket details and schedule
      const ticketSuggestion = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `Você é um coordenador de O&M para plantas solares.
              Com base no alerta, crie um ticket detalhado e sugira cronograma.
              
              Responda com JSON:
              {
                "description": "descrição detalhada do problema e ações necessárias",
                "suggested_date": "YYYY-MM-DD (data sugerida para atendimento)",
                "estimated_duration": "tempo estimado em horas",
                "required_skills": ["competências necessárias"],
                "urgency_reason": "justificativa da urgência",
                "whatsapp_message": "mensagem resumida para WhatsApp"
              }`
            },
            {
              role: 'user',
              content: `ALERTA:
              Tipo: ${alert.type}
              Severidade: ${alert.severity}
              Mensagem: ${alert.message}
              Planta: ${alert.plants?.name}
              Localização: ${alert.plants?.lat}, ${alert.plants?.lng}
              Concessionária: ${alert.plants?.concessionaria}
              Data do alerta: ${alert.created_at}`
            }
          ],
          max_tokens: 800
        }),
      });

      const aiResult = await ticketSuggestion.json();
      const suggestion = JSON.parse(aiResult.choices[0].message.content);

      // Create ticket in database
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          plant_id: alert.plant_id,
          priority: priority,
          description: suggestion.description,
          type: alert.type,
          status: 'open'
        })
        .select()
        .single();

      if (ticketError) {
        console.error(`Ticket creation error for alert ${alert.id}:`, ticketError);
        continue;
      }

      // Mark alert as acknowledged
      await supabase
        .from('alerts')
        .update({ acknowledged_by: 'scheduler_bot' })
        .eq('id', alert.id);

      // Log the WhatsApp message that would be sent
      console.log(`WhatsApp notification for ticket ${ticket.id}:`);
      console.log(suggestion.whatsapp_message);

      processedTickets.push({
        ticket_id: ticket.id,
        alert_id: alert.id,
        priority: priority,
        plant_name: alert.plants?.name,
        suggested_date: suggestion.suggested_date,
        whatsapp_message: suggestion.whatsapp_message
      });
    }

    console.log(`Scheduler: Processed ${processedTickets.length} alerts into tickets`);

    return new Response(JSON.stringify({
      success: true,
      alerts_processed: alerts.length,
      tickets_created: processedTickets.length,
      tickets: processedTickets
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scheduler:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
