import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DigitalTwinConfig {
  id: string;
  plant_id: string;
  layout: {
    module_count: number;
    module_wp: number;
    tilt_angle: number;
    azimuth: number;
  };
  losses: {
    soiling: number;
    shading: number;
    mismatch: number;
    wiring: number;
    connections: number;
    lid: number;
    temperature_coefficient: number;
    annual_degradation: number;
    grid_availability: number;
    system_availability: number;
  };
  performance_ratio_target: number;
  environmental_context: {
    altitude_m: number;
    albedo: number;
    soiling_seasonal?: Array<{ month: number; factor: number }>;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, plant_id, config_id, timestamp, weather_data } = await req.json();

    console.log('Digital Twin Calculator:', { action, plant_id, config_id });

    if (action === 'calculate_baseline') {
      // Buscar configuração do digital twin
      const { data: config, error: configError } = await supabase
        .from('digital_twin_configs')
        .select('*')
        .eq('plant_id', plant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (configError || !config) {
        throw new Error('Digital Twin config not found for plant');
      }

      const twinConfig = config as DigitalTwinConfig;

      // Calcular baseline hora-a-hora
      const baseline = calculateHourlyBaseline(
        twinConfig,
        timestamp || new Date().toISOString(),
        weather_data
      );

      // Salvar baseline forecast
      const { error: insertError } = await supabase
        .from('baseline_forecasts')
        .upsert({
          plant_id,
          config_id: config.id,
          timestamp: baseline.timestamp,
          expected_generation_kwh: baseline.expected_generation_kwh,
          confidence_lower: baseline.confidence_interval.lower,
          confidence_upper: baseline.confidence_interval.upper,
          poa_irradiance: baseline.factors.poa_irradiance,
          ambient_temp: baseline.factors.ambient_temp,
          cell_temp_estimated: baseline.factors.cell_temp_estimated,
          soiling_factor: baseline.factors.soiling_factor,
          shading_factor: baseline.factors.shading_factor,
          system_efficiency: baseline.factors.system_efficiency,
          metadata: baseline.metadata,
        });

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true, baseline }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'calculate_performance_gap') {
      // Buscar baseline esperado
      const { data: baseline, error: baselineError } = await supabase
        .from('baseline_forecasts')
        .select('*')
        .eq('plant_id', plant_id)
        .eq('timestamp', timestamp)
        .single();

      if (baselineError || !baseline) {
        throw new Error('Baseline forecast not found for timestamp');
      }

      // Buscar geração real
      const { data: readings, error: readingsError } = await supabase
        .from('readings')
        .select('energy_kwh')
        .eq('plant_id', plant_id)
        .eq('timestamp', timestamp);

      if (readingsError) throw readingsError;

      const actual_kwh = readings?.reduce((sum, r) => sum + Number(r.energy_kwh), 0) || 0;
      const expected_kwh = Number(baseline.expected_generation_kwh);
      const gap_kwh = actual_kwh - expected_kwh;
      const gap_percent = expected_kwh > 0 ? (gap_kwh / expected_kwh) * 100 : 0;

      // Root Cause Analysis simplificado
      const probable_causes = analyzeRootCause(gap_percent, baseline);

      // Estimar perda financeira (R$ 0.50/kWh médio)
      const estimated_loss_brl = gap_kwh < 0 ? Math.abs(gap_kwh) * 0.5 : 0;

      // Salvar performance gap
      const { error: gapError } = await supabase
        .from('performance_gaps')
        .upsert({
          plant_id,
          timestamp,
          actual_kwh,
          expected_kwh,
          gap_kwh,
          gap_percent,
          probable_causes,
          estimated_loss_brl,
          alert_triggered: Math.abs(gap_percent) > 15, // Trigger alert se gap > 15%
        });

      if (gapError) throw gapError;

      return new Response(
        JSON.stringify({
          success: true,
          gap: { actual_kwh, expected_kwh, gap_kwh, gap_percent, probable_causes },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in digital-twin-calculator:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Funções auxiliares
function calculateHourlyBaseline(
  config: DigitalTwinConfig,
  timestamp: string,
  weather?: any
): any {
  const date = new Date(timestamp);
  const hour = date.getHours();
  const month = date.getMonth() + 1;

  // Potência nominal da planta (kWp)
  const nominalPower = (config.layout.module_count * config.layout.module_wp) / 1000;

  // POA irradiance estimada (simplificado - deveria vir de weather_data)
  const poa_irradiance = weather?.irradiance || estimateIrradiance(hour, month);

  // Temperatura ambiente (simplificado)
  const ambient_temp = weather?.temperature || 25;

  // Temperatura da célula (Tamb + (NOCT-20)/800 * POA)
  const cell_temp_estimated = ambient_temp + ((45 - 20) / 800) * poa_irradiance;

  // Fator de soiling sazonal
  const soiling_factor =
    config.environmental_context.soiling_seasonal?.find((s) => s.month === month)?.factor || 0.95;

  // Fator de sombreamento (simplificado)
  const shading_factor = 1 - config.losses.shading / 100;

  // Perdas por temperatura
  const temp_loss = config.losses.temperature_coefficient * (cell_temp_estimated - 25);

  // Eficiência do sistema
  const system_efficiency =
    (1 - config.losses.soiling / 100) *
    soiling_factor *
    shading_factor *
    (1 - config.losses.mismatch / 100) *
    (1 - config.losses.wiring / 100) *
    (1 - config.losses.connections / 100) *
    (1 - config.losses.lid / 100) *
    (1 + temp_loss / 100) *
    (config.losses.grid_availability / 100) *
    (config.losses.system_availability / 100);

  // Geração esperada (kWh)
  const expected_generation_kwh = (nominalPower * poa_irradiance * system_efficiency) / 1000;

  // Intervalo de confiança (±10%)
  const confidence_lower = expected_generation_kwh * 0.9;
  const confidence_upper = expected_generation_kwh * 1.1;

  return {
    timestamp,
    expected_generation_kwh,
    confidence_interval: { lower: confidence_lower, upper: confidence_upper },
    factors: {
      poa_irradiance,
      ambient_temp,
      cell_temp_estimated,
      soiling_factor,
      shading_factor,
      system_efficiency,
    },
    metadata: {
      model_version: '1.0',
      last_calibration: config.calibration_date || new Date().toISOString(),
    },
  };
}

function estimateIrradiance(hour: number, month: number): number {
  // Curva simplificada de irradiância (W/m²)
  // Pico ao meio-dia, zero à noite
  if (hour < 6 || hour > 18) return 0;
  
  const solarNoon = 12;
  const hourFromNoon = Math.abs(hour - solarNoon);
  const maxIrradiance = 1000; // W/m²
  
  // Curva senoidal
  const irradiance = maxIrradiance * Math.cos((hourFromNoon / 6) * Math.PI / 2);
  
  return Math.max(0, irradiance);
}

function analyzeRootCause(gap_percent: number, baseline: any): any[] {
  const causes: any[] = [];

  if (gap_percent < -20) {
    // Underperformance severa
    causes.push({
      cause: 'Soiling ou sombreamento anormal',
      confidence: 0.7,
      estimated_impact_kwh: Math.abs(gap_percent) * baseline.expected_generation_kwh / 100,
    });
    causes.push({
      cause: 'Falha de equipamento (inversor/string)',
      confidence: 0.5,
      estimated_impact_kwh: Math.abs(gap_percent) * baseline.expected_generation_kwh / 100 * 0.5,
    });
  } else if (gap_percent < -10) {
    causes.push({
      cause: 'Soiling acima do esperado',
      confidence: 0.6,
      estimated_impact_kwh: Math.abs(gap_percent) * baseline.expected_generation_kwh / 100,
    });
  } else if (gap_percent > 10) {
    causes.push({
      cause: 'Irradiância acima do previsto',
      confidence: 0.8,
      estimated_impact_kwh: 0,
    });
  }

  return causes;
}
