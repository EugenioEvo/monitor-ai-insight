import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, plant_id, data_source, period_hours } = await req.json();

    console.log('Data Quality Monitor:', { action, plant_id, data_source, period_hours });

    if (action === 'analyze_quality') {
      const hours = period_hours || 24;
      const period_start = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const period_end = new Date().toISOString();

      // Buscar dados do período
      let query = supabase
        .from('readings')
        .select('*')
        .gte('timestamp', period_start)
        .lte('timestamp', period_end)
        .order('timestamp', { ascending: true });

      if (plant_id) {
        query = query.eq('plant_id', plant_id);
      }

      const { data: readings, error: readingsError } = await query;

      if (readingsError) throw readingsError;

      // Analisar qualidade dos dados
      const quality = analyzeDataQuality(readings || [], period_start, period_end, hours);

      // Salvar log de qualidade
      const { error: insertError } = await supabase.from('data_quality_logs').insert({
        plant_id: plant_id || null,
        data_source: data_source || 'readings',
        overall_score: quality.overall_score,
        completeness_score: quality.completeness_score,
        timeliness_score: quality.timeliness_score,
        accuracy_score: quality.accuracy_score,
        consistency_score: quality.consistency_score,
        completeness_metrics: quality.completeness_metrics,
        timeliness_metrics: quality.timeliness_metrics,
        accuracy_metrics: quality.accuracy_metrics,
        consistency_metrics: quality.consistency_metrics,
        issues: quality.issues,
        auto_corrections: quality.auto_corrections,
        period_start,
        period_end,
      });

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true, quality }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_system_health') {
      // Buscar últimos logs de qualidade por fonte
      const { data: logs, error: logsError } = await supabase
        .from('data_quality_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Agregar por fonte
      const sourceHealth = new Map<string, any>();

      logs?.forEach((log) => {
        const source = log.data_source;
        if (!sourceHealth.has(source) || log.created_at > sourceHealth.get(source).timestamp) {
          sourceHealth.set(source, {
            source,
            overall_score: log.overall_score,
            status:
              log.overall_score >= 90
                ? 'healthy'
                : log.overall_score >= 70
                ? 'degraded'
                : 'critical',
            last_check: log.created_at,
            issues_count: (log.issues as any[])?.length || 0,
          });
        }
      });

      const system_health = {
        overall_status: calculateOverallStatus(Array.from(sourceHealth.values())),
        sources: Array.from(sourceHealth.values()),
        last_updated: new Date().toISOString(),
      };

      return new Response(JSON.stringify({ success: true, system_health }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in data-quality-monitor:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzeDataQuality(readings: any[], period_start: string, period_end: string, expected_hours: number): any {
  const issues: any[] = [];
  const auto_corrections: any[] = [];

  // 1. COMPLETENESS - Verificar buracos nos dados
  const expected_points = expected_hours * 4; // Esperando dados a cada 15min
  const actual_points = readings.length;
  const completeness_rate = actual_points / expected_points;
  const completeness_score = completeness_rate * 100;

  if (completeness_rate < 0.95) {
    issues.push({
      category: 'completeness',
      severity: completeness_rate < 0.8 ? 'high' : 'medium',
      description: `Taxa de completude: ${(completeness_rate * 100).toFixed(1)}%`,
      affected_period: { start: period_start, end: period_end },
      impact: 'Dados faltantes podem afetar análises e baselines',
    });
  }

  // 2. TIMELINESS - Verificar latência
  const now = Date.now();
  const latest_reading = readings[readings.length - 1];
  const latency_minutes = latest_reading
    ? (now - new Date(latest_reading.timestamp).getTime()) / 60000
    : 999;

  const timeliness_score = latency_minutes < 30 ? 100 : latency_minutes < 60 ? 80 : 50;

  if (latency_minutes > 30) {
    issues.push({
      category: 'timeliness',
      severity: latency_minutes > 120 ? 'high' : 'medium',
      description: `Latência de ${latency_minutes.toFixed(0)} minutos`,
      affected_period: { start: latest_reading?.timestamp || period_end, end: new Date().toISOString() },
      impact: 'Dados desatualizados podem atrasar alertas e decisões',
    });
  }

  // 3. ACCURACY - Detectar outliers e valores impossíveis
  let accuracy_issues = 0;
  readings.forEach((r) => {
    // Valores negativos
    if (r.power_w < 0 || r.energy_kwh < 0) {
      accuracy_issues++;
      issues.push({
        category: 'accuracy',
        severity: 'high',
        description: `Valor negativo detectado: power=${r.power_w}W, energy=${r.energy_kwh}kWh`,
        affected_period: { start: r.timestamp, end: r.timestamp },
        impact: 'Valores impossíveis distorcem cálculos',
      });
    }

    // Valores fisicamente impossíveis (> capacidade da planta * 1.2)
    if (r.power_w > 100000) {
      // Simplificado: 100kW
      accuracy_issues++;
      issues.push({
        category: 'accuracy',
        severity: 'medium',
        description: `Valor suspeito: power=${r.power_w}W excede capacidade esperada`,
        affected_period: { start: r.timestamp, end: r.timestamp },
        impact: 'Outliers podem afetar médias e análises',
      });
    }
  });

  const accuracy_score = Math.max(0, 100 - (accuracy_issues / actual_points) * 100);

  // 4. CONSISTENCY - Verificar mudanças bruscas
  let consistency_issues = 0;
  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1];
    const curr = readings[i];

    const power_change_percent = prev.power_w > 0 ? Math.abs((curr.power_w - prev.power_w) / prev.power_w) : 0;

    // Mudança > 50% entre leituras consecutivas (possível falha)
    if (power_change_percent > 0.5 && prev.power_w > 1000) {
      consistency_issues++;
      if (consistency_issues <= 3) {
        // Limitar quantidade de issues
        issues.push({
          category: 'consistency',
          severity: 'low',
          description: `Mudança brusca: ${prev.power_w}W → ${curr.power_w}W (${(power_change_percent * 100).toFixed(0)}%)`,
          affected_period: { start: prev.timestamp, end: curr.timestamp },
          impact: 'Mudanças bruscas podem indicar falhas de comunicação',
        });
      }
    }
  }

  const consistency_score = Math.max(0, 100 - (consistency_issues / actual_points) * 100);

  // Overall score (média ponderada)
  const overall_score =
    completeness_score * 0.3 +
    timeliness_score * 0.25 +
    accuracy_score * 0.25 +
    consistency_score * 0.2;

  return {
    overall_score: Math.round(overall_score),
    completeness_score: Math.round(completeness_score),
    timeliness_score: Math.round(timeliness_score),
    accuracy_score: Math.round(accuracy_score),
    consistency_score: Math.round(consistency_score),
    completeness_metrics: {
      expected_points,
      actual_points,
      missing_points: expected_points - actual_points,
      completeness_rate,
    },
    timeliness_metrics: {
      latest_timestamp: latest_reading?.timestamp,
      latency_minutes,
    },
    accuracy_metrics: {
      outliers_detected: accuracy_issues,
    },
    consistency_metrics: {
      sudden_changes_detected: consistency_issues,
    },
    issues,
    auto_corrections,
  };
}

function calculateOverallStatus(sources: any[]): string {
  if (sources.length === 0) return 'unknown';

  const avg_score = sources.reduce((sum, s) => sum + s.overall_score, 0) / sources.length;

  if (avg_score >= 90) return 'healthy';
  if (avg_score >= 70) return 'degraded';
  return 'critical';
}
