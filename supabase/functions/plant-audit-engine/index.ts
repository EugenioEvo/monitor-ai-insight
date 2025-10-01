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

    const { action, plant_id, period_days } = await req.json();

    console.log('Plant Audit Engine:', { action, plant_id, period_days });

    if (action === 'run_audit') {
      const days = period_days || 30;
      const period_end = new Date();
      const period_start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      console.log('Running audit for plant:', plant_id, 'Period:', period_start, 'to', period_end);

      // 1. Buscar performance gaps do período
      const { data: gaps, error: gapsError } = await supabase
        .from('performance_gaps')
        .select('*')
        .eq('plant_id', plant_id)
        .gte('timestamp', period_start.toISOString())
        .lte('timestamp', period_end.toISOString())
        .order('timestamp', { ascending: true });

      if (gapsError) throw gapsError;

      if (!gaps || gaps.length === 0) {
        throw new Error('Não há dados de performance gaps para análise');
      }

      // 2. Calcular métricas agregadas
      const actual_generation_kwh = gaps.reduce((sum, g) => sum + Number(g.actual_kwh), 0);
      const expected_generation_kwh = gaps.reduce((sum, g) => sum + Number(g.expected_kwh), 0);
      const gap_kwh = actual_generation_kwh - expected_generation_kwh;
      const gap_percent = expected_generation_kwh > 0 ? (gap_kwh / expected_generation_kwh) * 100 : 0;

      console.log('Audit metrics:', {
        actual_generation_kwh,
        expected_generation_kwh,
        gap_kwh,
        gap_percent,
      });

      // 3. Detectar findings (causas de perdas)
      const findings = detectFindings(gaps);

      // 4. Estimar geração recuperável (2-4% como prometido pela Quadrical)
      const recoverable_generation_kwh = Math.abs(gap_kwh) * 0.03; // Média de 3%
      const recoverable_value_brl = recoverable_generation_kwh * 0.5; // R$ 0.50/kWh
      const confidence_percent = 75; // Confiança média

      // 5. Criar auditoria
      const { data: audit, error: auditError } = await supabase
        .from('plant_audits')
        .insert({
          plant_id,
          audit_date: new Date().toISOString(),
          period_start: period_start.toISOString(),
          period_end: period_end.toISOString(),
          status: 'completed',
          actual_generation_kwh,
          expected_generation_kwh,
          gap_kwh,
          gap_percent,
          recoverable_generation_kwh,
          recoverable_value_brl,
          confidence_percent,
          executive_summary: {
            total_findings: findings.length,
            critical_findings: findings.filter((f) => f.severity === 'critical').length,
            quick_wins: findings.slice(0, 3).map((f) => f.title),
          },
        })
        .select()
        .single();

      if (auditError) throw auditError;

      console.log('Audit created:', audit.id);

      // 6. Inserir findings
      const findingsToInsert = findings.map((f) => ({
        audit_id: audit.id,
        category: f.category,
        severity: f.severity,
        title: f.title,
        description: f.description,
        estimated_impact_kwh: f.estimated_impact_kwh,
        estimated_impact_brl: f.estimated_impact_brl,
        evidence: f.evidence,
        probable_causes: f.probable_causes,
        detailed_analysis: f.detailed_analysis,
      }));

      const { data: insertedFindings, error: findingsError } = await supabase
        .from('audit_findings')
        .insert(findingsToInsert)
        .select();

      if (findingsError) throw findingsError;

      console.log('Findings inserted:', insertedFindings.length);

      // 7. Gerar recomendações para cada finding
      const recommendations: any[] = [];
      for (const finding of insertedFindings) {
        const recs = generateRecommendations(finding);
        recommendations.push(...recs.map((r) => ({ ...r, audit_id: audit.id, finding_id: finding.id })));
      }

      const { data: insertedRecs, error: recsError } = await supabase
        .from('audit_recommendations')
        .insert(recommendations)
        .select();

      if (recsError) throw recsError;

      console.log('Recommendations inserted:', insertedRecs.length);

      return new Response(
        JSON.stringify({
          success: true,
          audit: {
            ...audit,
            findings: insertedFindings,
            recommendations: insertedRecs,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in plant-audit-engine:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function detectFindings(gaps: any[]): any[] {
  const findings: any[] = [];

  // Agrupar gaps por causa predominante
  const causeGroups = new Map<string, any[]>();

  gaps.forEach((gap) => {
    if (gap.probable_causes && Array.isArray(gap.probable_causes)) {
      gap.probable_causes.forEach((cause: any) => {
        const key = cause.cause;
        if (!causeGroups.has(key)) {
          causeGroups.set(key, []);
        }
        causeGroups.get(key)!.push({ ...gap, cause });
      });
    }
  });

  // Converter causas em findings
  causeGroups.forEach((gapsWithCause, causeName) => {
    const total_impact_kwh = gapsWithCause.reduce(
      (sum, g) => sum + (g.cause.estimated_impact_kwh || 0),
      0
    );
    const occurrences = gapsWithCause.length;

    let category = 'other';
    let severity = 'low';

    // Mapear causa para categoria
    if (causeName.toLowerCase().includes('soiling') || causeName.toLowerCase().includes('sujidade')) {
      category = 'soiling';
      severity = total_impact_kwh > 100 ? 'high' : 'medium';
    } else if (causeName.toLowerCase().includes('sombreamento') || causeName.toLowerCase().includes('shading')) {
      category = 'shading';
      severity = 'medium';
    } else if (causeName.toLowerCase().includes('inversor') || causeName.toLowerCase().includes('equipamento')) {
      category = 'inverter';
      severity = total_impact_kwh > 200 ? 'critical' : 'high';
    } else if (causeName.toLowerCase().includes('mismatch')) {
      category = 'mismatch';
      severity = 'medium';
    }

    findings.push({
      category,
      severity,
      title: causeName,
      description: `Detectado ${occurrences} ocorrências de ${causeName} com impacto total estimado de ${total_impact_kwh.toFixed(
        1
      )} kWh`,
      estimated_impact_kwh: total_impact_kwh,
      estimated_impact_brl: total_impact_kwh * 0.5,
      evidence: [
        {
          type: 'performance_gap',
          count: occurrences,
          avg_gap_percent: gapsWithCause.reduce((sum, g) => sum + Math.abs(g.gap_percent), 0) / occurrences,
        },
      ],
      probable_causes: [
        {
          cause: causeName,
          confidence: 0.7,
          supporting_data: `${occurrences} ocorrências detectadas`,
        },
      ],
      detailed_analysis: {
        trend: 'consistent',
        frequency: occurrences,
        avg_impact_per_occurrence: total_impact_kwh / occurrences,
      },
    });
  });

  // Ordenar por impacto (maior primeiro)
  findings.sort((a, b) => b.estimated_impact_kwh - a.estimated_impact_kwh);

  return findings;
}

function generateRecommendations(finding: any): any[] {
  const recommendations: any[] = [];

  // Mapear categoria para ações recomendadas
  switch (finding.category) {
    case 'soiling':
      recommendations.push({
        priority: 'short_term',
        action_type: 'cleaning',
        action_title: 'Limpeza de Módulos',
        action_description:
          'Realizar limpeza completa dos módulos fotovoltaicos. Recomenda-se limpeza com água desmineralizada e escovas macias.',
        estimated_cost_brl: 500,
        estimated_benefit_kwh_year: finding.estimated_impact_kwh * 12, // Extrapolando para ano
        estimated_benefit_brl_year: finding.estimated_impact_brl * 12,
        payback_months: (500 / (finding.estimated_impact_brl * 12)) * 12,
        roi_percent: ((finding.estimated_impact_brl * 12 - 500) / 500) * 100,
        implementation_details: {
          duration_hours: 4,
          team_size: 2,
          safety_requirements: ['EPI completo', 'Trabalho em altura', 'Desligamento do sistema'],
        },
      });

      recommendations.push({
        priority: 'medium_term',
        action_type: 'monitoring',
        action_title: 'Sistema de Monitoramento de Soiling',
        action_description:
          'Instalar sensores de soiling para monitorar acúmulo de sujeira e otimizar frequência de limpeza.',
        estimated_cost_brl: 3000,
        estimated_benefit_kwh_year: finding.estimated_impact_kwh * 15, // 15x se otimizar limpezas
        estimated_benefit_brl_year: finding.estimated_impact_brl * 15,
        payback_months: (3000 / (finding.estimated_impact_brl * 15)) * 12,
        roi_percent: ((finding.estimated_impact_brl * 15 - 3000) / 3000) * 100,
        implementation_details: {
          equipment: ['Sensores de soiling', 'Gateway de comunicação'],
          installation_time: '1 dia',
        },
      });
      break;

    case 'inverter':
      recommendations.push({
        priority: 'immediate',
        action_type: 'maintenance',
        action_title: 'Manutenção/Substituição de Inversor',
        action_description:
          'Realizar inspeção detalhada do inversor. Se necessário, substituir componentes ou equipamento completo.',
        estimated_cost_brl: 2000,
        estimated_benefit_kwh_year: finding.estimated_impact_kwh * 12,
        estimated_benefit_brl_year: finding.estimated_impact_brl * 12,
        payback_months: (2000 / (finding.estimated_impact_brl * 12)) * 12,
        roi_percent: ((finding.estimated_impact_brl * 12 - 2000) / 2000) * 100,
        implementation_details: {
          steps: [
            'Desligar sistema',
            'Inspeção visual e testes',
            'Substituição se necessário',
            'Comissionamento',
          ],
          downtime_hours: 8,
        },
      });
      break;

    case 'mismatch':
      recommendations.push({
        priority: 'medium_term',
        action_type: 'reconfiguration',
        action_title: 'Reconfiguração de Strings',
        action_description:
          'Rebalancear strings para minimizar descasamento. Verificar conexões e orientação dos módulos.',
        estimated_cost_brl: 1000,
        estimated_benefit_kwh_year: finding.estimated_impact_kwh * 12,
        estimated_benefit_brl_year: finding.estimated_impact_brl * 12,
        payback_months: (1000 / (finding.estimated_impact_brl * 12)) * 12,
        roi_percent: ((finding.estimated_impact_brl * 12 - 1000) / 1000) * 100,
        implementation_details: {
          analysis_required: true,
          expected_improvement: '3-5%',
        },
      });
      break;

    default:
      recommendations.push({
        priority: 'long_term',
        action_type: 'monitoring',
        action_title: 'Monitoramento Contínuo',
        action_description: 'Manter monitoramento detalhado para identificar padrões e causas raiz.',
        estimated_cost_brl: 0,
        estimated_benefit_kwh_year: finding.estimated_impact_kwh * 2,
        estimated_benefit_brl_year: finding.estimated_impact_brl * 2,
        payback_months: 0,
        roi_percent: 100,
        implementation_details: {
          requires_digital_twin: true,
        },
      });
  }

  return recommendations;
}
