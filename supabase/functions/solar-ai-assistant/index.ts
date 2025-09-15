import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  plantId?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { message, plantId, conversationHistory = [] }: ChatRequest = await req.json();

    // Buscar dados contextuais da planta se especificada
    let contextData = '';
    if (plantId) {
      // Buscar dados da planta
      const { data: plant } = await supabase
        .from('plants')
        .select('*')
        .eq('id', plantId)
        .single();

      // Buscar alertas ativos
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('plant_id', plantId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(5);

      // Buscar últimas leituras de performance
      const { data: readings } = await supabase
        .from('readings')
        .select('*')
        .eq('plant_id', plantId)
        .order('timestamp', { ascending: false })
        .limit(10);

      contextData = `
DADOS DA USINA:
- Nome: ${plant?.name || 'N/A'}
- Capacidade: ${plant?.capacity_kwp || 0} kWp
- Status: ${plant?.status || 'N/A'}
- Concessionária: ${plant?.concessionaria || 'N/A'}

ALERTAS ATIVOS: ${alerts?.length || 0} alertas
${alerts?.map(a => `- ${a.type}: ${a.message} (${a.severity})`).join('\n') || 'Nenhum alerta ativo'}

ÚLTIMAS LEITURAS:
${readings?.slice(0, 3).map(r => `- ${r.timestamp}: ${r.energy_kwh} kWh, ${r.power_w} W`).join('\n') || 'Nenhuma leitura disponível'}
`;
    }

    const systemPrompt = `Você é um assistente especializado em energia solar no Brasil. Suas especialidades são:

1. ANÁLISE DE PERFORMANCE: Interprete dados de geração, compare com expectativas, identifique tendências
2. EXPLICAÇÃO DE ALERTAS: Detalhe causas possíveis e soluções para alertas técnicos
3. COMPLIANCE BRASILEIRO: Conhecimento das regulamentações (REN 482/2012, Lei 14.300/2022, REN 687/2015)

COMANDOS ESPECIAIS:
- /performance: Análise detalhada de performance
- /alerts: Explicação de alertas ativos
- /compliance: Verificação de conformidade regulatória

REGULAMENTAÇÕES IMPORTANTES:
- REN 482/2012: Sistema de Compensação de Energia Elétrica
- Lei 14.300/2022: Marco Legal da Geração Distribuída
- REN 687/2015: Revisão do sistema de compensação
- Resolução 1000/2021: Procedimentos de conexão

SEMPRE:
- Seja preciso e técnico, mas didático
- Use dados fornecidos para análises específicas
- Cite regulamentações quando relevante
- Forneça recomendações práticas
- Mantenha foco em performance, alertas e compliance

${contextData ? `CONTEXTO DA CONVERSA:\n${contextData}` : ''}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // Manter apenas últimas 6 mensagens
      { role: 'user', content: message }
    ];

    console.log('Enviando para OpenAI:', { messagesCount: messages.length, plantId });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Resposta gerada com sucesso');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      plantContext: !!plantId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no solar-ai-assistant:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallbackResponse: 'Desculpe, ocorreu um erro técnico. Tente novamente em alguns instantes.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});