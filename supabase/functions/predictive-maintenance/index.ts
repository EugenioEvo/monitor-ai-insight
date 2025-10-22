import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MaintenanceHistory {
  equipment_id: string;
  equipment_type: string;
  maintenance_type: string;
  performed_at: string;
  duration_hours: number;
  cost_brl: number;
}

interface AnomalyData {
  equipment_id: string;
  severity: string;
  metric_affected: string;
  timestamp: string;
  deviation_percent: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { plant_id, equipment_id } = await req.json();
    
    console.log('[Predictive Maintenance] Starting analysis', { plant_id, equipment_id });

    // 1. Buscar histórico de manutenções
    let historyQuery = supabase
      .from('equipment_maintenance_history')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(50);

    if (plant_id) historyQuery = historyQuery.eq('plant_id', plant_id);
    if (equipment_id) historyQuery = historyQuery.eq('equipment_id', equipment_id);

    const { data: maintenanceHistory, error: historyError } = await historyQuery;
    
    if (historyError) {
      console.error('[Predictive Maintenance] History error:', historyError);
    }

    // 2. Buscar anomalias recentes
    let anomaliesQuery = supabase
      .from('anomalies')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(100);

    if (plant_id) anomaliesQuery = anomaliesQuery.eq('plant_id', plant_id);

    const { data: anomalies, error: anomaliesError } = await anomaliesQuery;
    
    if (anomaliesError) {
      console.error('[Predictive Maintenance] Anomalies error:', anomaliesError);
    }

    // 3. Buscar dados de equipamentos da planta
    const { data: plants, error: plantsError } = await supabase
      .from('plants')
      .select('id, name, capacity, monitoring_type')
      .eq('id', plant_id || '');

    if (plantsError) {
      console.error('[Predictive Maintenance] Plants error:', plantsError);
    }

    // 4. Preparar dados para análise de IA
    const analysisContext = {
      plant_info: plants?.[0] || null,
      maintenance_history: (maintenanceHistory || []).map((m: MaintenanceHistory) => ({
        equipment: m.equipment_id,
        type: m.equipment_type,
        maintenance_type: m.maintenance_type,
        date: m.performed_at,
        duration: m.duration_hours,
        cost: m.cost_brl
      })),
      recent_anomalies: (anomalies || []).map((a: AnomalyData) => ({
        equipment: a.equipment_id || 'unknown',
        severity: a.severity,
        metric: a.metric_affected,
        date: a.timestamp,
        deviation: a.deviation_percent
      })),
      analysis_date: new Date().toISOString()
    };

    // 5. Calcular scores básicos (heurística)
    const equipmentScores = new Map<string, any>();

    // Processar histórico de manutenções
    (maintenanceHistory || []).forEach((m: MaintenanceHistory) => {
      const key = `${m.equipment_type}_${m.equipment_id}`;
      if (!equipmentScores.has(key)) {
        equipmentScores.set(key, {
          equipment_id: m.equipment_id,
          equipment_type: m.equipment_type,
          total_maintenances: 0,
          corrective_maintenances: 0,
          last_maintenance: null,
          avg_cost: 0,
          total_cost: 0,
          anomaly_count: 0
        });
      }
      
      const score = equipmentScores.get(key);
      score.total_maintenances++;
      if (m.maintenance_type === 'corrective') score.corrective_maintenances++;
      if (!score.last_maintenance || new Date(m.performed_at) > new Date(score.last_maintenance)) {
        score.last_maintenance = m.performed_at;
      }
      score.total_cost += m.cost_brl || 0;
    });

    // Processar anomalias
    (anomalies || []).forEach((a: AnomalyData) => {
      const eqId = a.equipment_id || 'unknown';
      for (const [key, score] of equipmentScores.entries()) {
        if (key.includes(eqId) || eqId.includes(score.equipment_id)) {
          score.anomaly_count++;
        }
      }
    });

    // 6. Calcular probabilidades de falha usando IA
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const predictions: any[] = [];

    for (const [key, score] of equipmentScores.entries()) {
      // Calcular score básico (0-1)
      const maintenanceFrequency = score.total_maintenances / 12; // assumindo 12 meses de histórico
      const correctiveRatio = score.total_maintenances > 0 
        ? score.corrective_maintenances / score.total_maintenances 
        : 0;
      const anomalyImpact = Math.min(score.anomaly_count / 10, 1);
      
      // Calcular dias desde última manutenção
      const daysSinceLastMaintenance = score.last_maintenance 
        ? (Date.now() - new Date(score.last_maintenance).getTime()) / (1000 * 60 * 60 * 24)
        : 365;
      
      const timeImpact = Math.min(daysSinceLastMaintenance / 180, 1); // 180 dias = 100%

      // Score ponderado
      const baseFailureProbability = (
        maintenanceFrequency * 0.3 +
        correctiveRatio * 0.3 +
        anomalyImpact * 0.2 +
        timeImpact * 0.2
      );

      // Chamar IA apenas para equipamentos com risco médio ou alto
      if (baseFailureProbability > 0.3) {
        try {
          const aiPrompt = `Você é um especialista em manutenção preditiva de sistemas solares fotovoltaicos.

Analise os dados do seguinte equipamento e forneça uma previsão de falha:

Equipamento: ${score.equipment_type} (ID: ${score.equipment_id})
Manutenções totais: ${score.total_maintenances}
Manutenções corretivas: ${score.corrective_maintenances}
Anomalias detectadas (30 dias): ${score.anomaly_count}
Dias desde última manutenção: ${Math.round(daysSinceLastMaintenance)}
Score inicial de probabilidade: ${(baseFailureProbability * 100).toFixed(1)}%

Com base nesses dados, forneça:
1. Probabilidade ajustada de falha nos próximos 30 dias (0.0 a 1.0)
2. Nível de risco (low, medium, high, critical)
3. Data estimada de falha (formato: YYYY-MM-DD)
4. Ação recomendada (máximo 200 caracteres)
5. Fatores principais que contribuem para o risco
6. Confiança na previsão (0-100%)`;

          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: 'Você é um especialista em manutenção preditiva. Responda de forma objetiva e técnica.'
                },
                {
                  role: 'user',
                  content: aiPrompt
                }
              ],
              tools: [{
                type: 'function',
                function: {
                  name: 'predict_failure',
                  description: 'Predição de falha de equipamento',
                  parameters: {
                    type: 'object',
                    properties: {
                      failure_probability: {
                        type: 'number',
                        description: 'Probabilidade de falha (0.0 a 1.0)'
                      },
                      risk_level: {
                        type: 'string',
                        enum: ['low', 'medium', 'high', 'critical']
                      },
                      predicted_failure_date: {
                        type: 'string',
                        description: 'Data estimada de falha (YYYY-MM-DD)'
                      },
                      recommended_action: {
                        type: 'string',
                        description: 'Ação recomendada'
                      },
                      key_factors: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Fatores principais de risco'
                      },
                      confidence_percent: {
                        type: 'number',
                        description: 'Confiança na previsão (0-100)'
                      }
                    },
                    required: ['failure_probability', 'risk_level', 'recommended_action', 'confidence_percent']
                  }
                }
              }],
              tool_choice: { type: 'function', function: { name: 'predict_failure' } }
            })
          });

          if (!aiResponse.ok) {
            console.error('[Predictive Maintenance] AI error:', await aiResponse.text());
            throw new Error(`AI API error: ${aiResponse.status}`);
          }

          const aiResult = await aiResponse.json();
          const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
          
          if (toolCall) {
            const prediction = JSON.parse(toolCall.function.arguments);
            
            // Salvar no banco
            const { error: insertError } = await supabase
              .from('predictive_maintenance_scores')
              .insert({
                plant_id: plant_id,
                equipment_id: score.equipment_id,
                equipment_type: score.equipment_type,
                prediction_date: new Date().toISOString(),
                failure_probability: prediction.failure_probability,
                risk_level: prediction.risk_level,
                predicted_failure_date: prediction.predicted_failure_date || null,
                recommended_action: prediction.recommended_action,
                confidence_percent: prediction.confidence_percent,
                factors: {
                  key_factors: prediction.key_factors || [],
                  maintenance_frequency: maintenanceFrequency,
                  corrective_ratio: correctiveRatio,
                  anomaly_count: score.anomaly_count,
                  days_since_maintenance: Math.round(daysSinceLastMaintenance)
                }
              });

            if (insertError) {
              console.error('[Predictive Maintenance] Insert error:', insertError);
            }

            predictions.push({
              equipment_id: score.equipment_id,
              equipment_type: score.equipment_type,
              ...prediction,
              plant_id: plant_id
            });
          }
        } catch (error) {
          console.error('[Predictive Maintenance] AI prediction error:', error);
          // Continuar com a próxima predição
        }
      }
    }

    console.log('[Predictive Maintenance] Analysis complete', { 
      total_equipment: equipmentScores.size,
      predictions: predictions.length 
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysis_context: {
          total_equipment_analyzed: equipmentScores.size,
          maintenance_records: maintenanceHistory?.length || 0,
          anomalies_found: anomalies?.length || 0
        },
        predictions: predictions,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[Predictive Maintenance] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Check edge function logs for more information'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
