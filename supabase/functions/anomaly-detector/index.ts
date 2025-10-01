import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectionConfig {
  statistical_enabled: boolean;
  ml_enabled: boolean;
  digital_twin_enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high'; // Thresholds para cada nível
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, plant_id, timestamp, period_hours, config } = await req.json();

    console.log('Anomaly Detector:', { action, plant_id, period_hours });

    if (action === 'detect_anomalies') {
      const detectionConfig: DetectionConfig = config || {
        statistical_enabled: true,
        ml_enabled: false, // ML desabilitado por padrão (requer treino)
        digital_twin_enabled: true,
        sensitivity: 'medium',
      };

      const anomalies: any[] = [];

      // 1. DETECÇÃO ESTATÍSTICA (Z-Score + IQR)
      if (detectionConfig.statistical_enabled) {
        const statAnomalies = await detectStatisticalAnomalies(
          supabase,
          plant_id,
          period_hours || 168, // 7 dias default
          detectionConfig.sensitivity
        );
        anomalies.push(...statAnomalies);
      }

      // 2. DETECÇÃO VIA DIGITAL TWIN (Gap Analysis)
      if (detectionConfig.digital_twin_enabled) {
        const dtAnomalies = await detectDigitalTwinAnomalies(
          supabase,
          plant_id,
          period_hours || 24
        );
        anomalies.push(...dtAnomalies);
      }

      // 3. DETECÇÃO DE DATA GAPS
      const dataGapAnomalies = await detectDataGaps(supabase, plant_id, period_hours || 24);
      anomalies.push(...dataGapAnomalies);

      // Salvar anomalias no banco
      if (anomalies.length > 0) {
        const { error: insertError } = await supabase.from('anomalies').upsert(
          anomalies.map((a) => ({
            plant_id: a.plant_id,
            timestamp: a.timestamp,
            anomaly_type: a.anomaly_type,
            severity: a.severity,
            confidence: a.confidence,
            detected_by: a.detected_by,
            metric_affected: a.metric_affected,
            expected_value: a.expected_value,
            actual_value: a.actual_value,
            deviation_percent: a.deviation_percent,
            metadata: a.metadata,
          })),
          { onConflict: 'plant_id,timestamp,anomaly_type,metric_affected' }
        );

        if (insertError) {
          console.error('Error saving anomalies:', insertError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          anomalies_detected: anomalies.length,
          anomalies,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'analyze_root_cause') {
      const { anomaly_id } = await req.json();

      // Buscar anomalia
      const { data: anomaly, error: anomalyError } = await supabase
        .from('anomalies')
        .select('*')
        .eq('id', anomaly_id)
        .single();

      if (anomalyError || !anomaly) {
        throw new Error('Anomaly not found');
      }

      // Executar RCA
      const rca = await performRootCauseAnalysis(supabase, anomaly);

      // Salvar RCA
      const { data: rcaRecord, error: rcaError } = await supabase
        .from('root_cause_analysis')
        .insert({
          anomaly_id,
          plant_id: anomaly.plant_id,
          probable_causes: rca.probable_causes,
          dependency_graph: rca.dependency_graph,
          recommended_actions: rca.recommended_actions,
        })
        .select()
        .single();

      if (rcaError) throw rcaError;

      // Atualizar anomalia com link para RCA
      await supabase
        .from('anomalies')
        .update({ root_cause_id: rcaRecord.id })
        .eq('id', anomaly_id);

      return new Response(
        JSON.stringify({ success: true, rca: rcaRecord }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in anomaly-detector:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ========== FUNÇÕES DE DETECÇÃO ==========

async function detectStatisticalAnomalies(
  supabase: any,
  plantId: string,
  periodHours: number,
  sensitivity: string
): Promise<any[]> {
  const startTime = new Date(Date.now() - periodHours * 3600 * 1000).toISOString();

  // Buscar readings
  const { data: readings, error } = await supabase
    .from('readings')
    .select('timestamp, power_w, energy_kwh')
    .eq('plant_id', plantId)
    .gte('timestamp', startTime)
    .order('timestamp', { ascending: true });

  if (error || !readings || readings.length === 0) {
    return [];
  }

  const anomalies: any[] = [];

  // Calcular estatísticas
  const powerValues = readings.map((r: any) => Number(r.power_w)).filter((v: number) => v > 0);
  const mean = powerValues.reduce((a: number, b: number) => a + b, 0) / powerValues.length;
  const stdDev = Math.sqrt(
    powerValues.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) /
      powerValues.length
  );

  // Thresholds baseados em sensibilidade
  const zScoreThreshold = sensitivity === 'high' ? 2.5 : sensitivity === 'medium' ? 3 : 3.5;

  // Detectar anomalias via Z-Score
  for (const reading of readings) {
    const power = Number(reading.power_w);
    if (power === 0) continue;

    const zScore = Math.abs((power - mean) / stdDev);

    if (zScore > zScoreThreshold) {
      const deviation = ((power - mean) / mean) * 100;
      const severity =
        zScore > 4 ? 'critical' : zScore > 3.5 ? 'high' : zScore > 3 ? 'medium' : 'low';

      anomalies.push({
        plant_id: plantId,
        timestamp: reading.timestamp,
        anomaly_type: power < mean ? 'generation_drop' : 'unexpected_spike',
        severity,
        confidence: Math.min(zScore / 5, 1), // Normalizar para 0-1
        detected_by: 'statistical',
        metric_affected: 'power',
        expected_value: mean,
        actual_value: power,
        deviation_percent: deviation,
        metadata: { z_score: zScore, method: 'z_score' },
      });
    }
  }

  return anomalies;
}

async function detectDigitalTwinAnomalies(
  supabase: any,
  plantId: string,
  periodHours: number
): Promise<any[]> {
  const startTime = new Date(Date.now() - periodHours * 3600 * 1000).toISOString();

  // Buscar performance gaps
  const { data: gaps, error } = await supabase
    .from('performance_gaps')
    .select('*')
    .eq('plant_id', plantId)
    .gte('timestamp', startTime)
    .order('timestamp', { ascending: false });

  if (error || !gaps || gaps.length === 0) {
    return [];
  }

  const anomalies: any[] = [];

  for (const gap of gaps) {
    const gapPercent = Number(gap.gap_percent);

    // Gaps significativos (> 10%) são anomalias
    if (Math.abs(gapPercent) > 10) {
      const severity =
        Math.abs(gapPercent) > 30
          ? 'critical'
          : Math.abs(gapPercent) > 20
          ? 'high'
          : Math.abs(gapPercent) > 15
          ? 'medium'
          : 'low';

      anomalies.push({
        plant_id: plantId,
        timestamp: gap.timestamp,
        anomaly_type: gapPercent < 0 ? 'underperformance' : 'overperformance',
        severity,
        confidence: 0.85, // Alta confiança no Digital Twin
        detected_by: 'digital_twin',
        metric_affected: 'energy',
        expected_value: Number(gap.expected_kwh),
        actual_value: Number(gap.actual_kwh),
        deviation_percent: gapPercent,
        metadata: {
          gap_kwh: Number(gap.gap_kwh),
          probable_causes: gap.probable_causes,
        },
      });
    }
  }

  return anomalies;
}

async function detectDataGaps(supabase: any, plantId: string, periodHours: number): Promise<any[]> {
  const startTime = new Date(Date.now() - periodHours * 3600 * 1000).toISOString();

  const { data: readings, error } = await supabase
    .from('readings')
    .select('timestamp')
    .eq('plant_id', plantId)
    .gte('timestamp', startTime)
    .order('timestamp', { ascending: true });

  if (error || !readings || readings.length < 2) {
    return [];
  }

  const anomalies: any[] = [];
  const expectedIntervalMinutes = 15; // Intervalo esperado entre readings

  for (let i = 1; i < readings.length; i++) {
    const prevTime = new Date(readings[i - 1].timestamp).getTime();
    const currTime = new Date(readings[i].timestamp).getTime();
    const gapMinutes = (currTime - prevTime) / (1000 * 60);

    // Gap maior que 30 minutos é considerado anomalia
    if (gapMinutes > expectedIntervalMinutes * 2) {
      anomalies.push({
        plant_id: plantId,
        timestamp: readings[i].timestamp,
        anomaly_type: 'data_gap',
        severity: gapMinutes > 120 ? 'high' : gapMinutes > 60 ? 'medium' : 'low',
        confidence: 1.0,
        detected_by: 'statistical',
        metric_affected: 'availability',
        expected_value: expectedIntervalMinutes,
        actual_value: gapMinutes,
        deviation_percent: ((gapMinutes - expectedIntervalMinutes) / expectedIntervalMinutes) * 100,
        metadata: { gap_minutes: gapMinutes },
      });
    }
  }

  return anomalies;
}

async function performRootCauseAnalysis(supabase: any, anomaly: any): Promise<any> {
  const probableCauses: any[] = [];
  const recommendedActions: any[] = [];

  // Análise baseada no tipo de anomalia
  switch (anomaly.anomaly_type) {
    case 'generation_drop':
      probableCauses.push(
        {
          cause: 'Soiling (sujeira nos módulos)',
          confidence: 0.7,
          evidence: 'Queda gradual de geração sem eventos climáticos',
          estimated_impact_kwh: Math.abs(anomaly.expected_value - anomaly.actual_value),
        },
        {
          cause: 'Sombreamento anormal',
          confidence: 0.5,
          evidence: 'Horário específico do dia',
          estimated_impact_kwh: Math.abs(anomaly.expected_value - anomaly.actual_value) * 0.6,
        },
        {
          cause: 'Degradação de módulos',
          confidence: 0.3,
          evidence: 'Queda persistente ao longo do tempo',
          estimated_impact_kwh: Math.abs(anomaly.expected_value - anomaly.actual_value) * 0.4,
        }
      );

      recommendedActions.push(
        {
          action: 'Inspeção visual dos módulos',
          priority: 'high',
          estimated_time_hours: 2,
          estimated_cost_brl: 300,
        },
        {
          action: 'Limpeza dos módulos',
          priority: 'medium',
          estimated_time_hours: 4,
          estimated_cost_brl: 800,
        }
      );
      break;

    case 'underperformance':
      probableCauses.push(
        {
          cause: 'Inversor operando abaixo da capacidade',
          confidence: 0.6,
          evidence: 'Gap consistente entre esperado e real',
          estimated_impact_kwh: Math.abs(anomaly.expected_value - anomaly.actual_value),
        },
        {
          cause: 'String desconectada ou com falha',
          confidence: 0.5,
          evidence: 'Queda abrupta de geração',
          estimated_impact_kwh: Math.abs(anomaly.expected_value - anomaly.actual_value) * 0.7,
        }
      );

      recommendedActions.push(
        {
          action: 'Verificar status e alarmes do inversor',
          priority: 'critical',
          estimated_time_hours: 1,
          estimated_cost_brl: 150,
        },
        {
          action: 'Testar strings com multímetro/thermal camera',
          priority: 'high',
          estimated_time_hours: 3,
          estimated_cost_brl: 500,
        }
      );
      break;

    case 'data_gap':
      probableCauses.push({
        cause: 'Falha de comunicação do sistema de monitoramento',
        confidence: 0.8,
        evidence: 'Ausência de dados por período',
        estimated_impact_kwh: 0,
      });

      recommendedActions.push({
        action: 'Verificar conectividade e logger',
        priority: 'medium',
        estimated_time_hours: 1,
        estimated_cost_brl: 200,
      });
      break;

    case 'offline':
      probableCauses.push(
        {
          cause: 'Disjuntor desligado ou falha de rede elétrica',
          confidence: 0.7,
          evidence: 'Geração zero durante horário de sol',
          estimated_impact_kwh: anomaly.expected_value || 0,
        },
        {
          cause: 'Inversor desligado por proteção',
          confidence: 0.6,
          evidence: 'Sistema não responde',
          estimated_impact_kwh: anomaly.expected_value || 0,
        }
      );

      recommendedActions.push({
        action: 'Verificar sistema elétrico e inversor urgentemente',
        priority: 'critical',
        estimated_time_hours: 2,
        estimated_cost_brl: 400,
      });
      break;
  }

  // Dependency graph simplificado (pode ser expandido)
  const dependencyGraph = {
    nodes: [
      { id: 'modules', type: 'component' },
      { id: 'strings', type: 'component' },
      { id: 'inverter', type: 'component' },
      { id: 'grid', type: 'external' },
    ],
    edges: [
      { from: 'modules', to: 'strings' },
      { from: 'strings', to: 'inverter' },
      { from: 'inverter', to: 'grid' },
    ],
  };

  return {
    probable_causes: probableCauses,
    recommended_actions: recommendedActions,
    dependency_graph: dependencyGraph,
  };
}
