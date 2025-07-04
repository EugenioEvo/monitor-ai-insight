import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRule {
  type: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: 'above' | 'below' | 'equals';
}

// Regras de alertas configuráveis
const ALERT_RULES: AlertRule[] = [
  {
    type: 'low_generation',
    threshold: 100, // kWh por dia
    severity: 'medium',
    condition: 'below'
  },
  {
    type: 'no_data',
    threshold: 30, // minutos sem dados
    severity: 'high',
    condition: 'above'
  },
  {
    type: 'high_temperature',
    threshold: 70, // °C (se tivermos dados de temperatura)
    severity: 'critical',
    condition: 'above'
  },
  {
    type: 'maintenance_overdue',
    threshold: 7, // dias após data prevista
    severity: 'high',
    condition: 'above'
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('Starting alert evaluation...');

    // Buscar todas as plantas ativas
    const { data: plants, error: plantsError } = await supabase
      .from('plants')
      .select('id, name, capacity_kwp, status')
      .eq('status', 'active');

    if (plantsError) {
      throw new Error(`Failed to fetch plants: ${plantsError.message}`);
    }

    const alertsToCreate = [];

    for (const plant of plants || []) {
      console.log(`Evaluating alerts for plant: ${plant.name} (${plant.id})`);

      // 1. Verificar baixa geração nas últimas 24h
      const { data: recentReadings } = await supabase
        .from('readings')
        .select('energy_kwh, timestamp')
        .eq('plant_id', plant.id)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false });

      if (recentReadings && recentReadings.length > 0) {
        const totalGeneration = recentReadings.reduce((sum, r) => sum + (r.energy_kwh || 0), 0);
        
        if (totalGeneration < ALERT_RULES[0].threshold) {
          // Verificar se já existe alerta similar ativo
          const { data: existingAlert } = await supabase
            .from('alerts')
            .select('id')
            .eq('plant_id', plant.id)
            .eq('type', 'low_generation')
            .in('status', ['open', 'acknowledged'])
            .single();

          if (!existingAlert) {
            alertsToCreate.push({
              plant_id: plant.id,
              type: 'low_generation',
              severity: 'medium',
              message: `Baixa geração detectada: ${totalGeneration.toFixed(2)} kWh nas últimas 24h (abaixo de ${ALERT_RULES[0].threshold} kWh)`,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // 2. Verificar ausência de dados
      const { data: latestReading } = await supabase
        .from('readings')
        .select('timestamp')
        .eq('plant_id', plant.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (latestReading) {
        const minutesSinceLastReading = (Date.now() - new Date(latestReading.timestamp).getTime()) / (1000 * 60);
        
        if (minutesSinceLastReading > 30) { // 30 minutos sem dados
          const { data: existingAlert } = await supabase
            .from('alerts')
            .select('id')
            .eq('plant_id', plant.id)
            .eq('type', 'no_data')
            .in('status', ['open', 'acknowledged'])
            .single();

          if (!existingAlert) {
            alertsToCreate.push({
              plant_id: plant.id,
              type: 'no_data',
              severity: 'high',
              message: `Sem dados há ${Math.round(minutesSinceLastReading)} minutos. Última leitura: ${new Date(latestReading.timestamp).toLocaleString('pt-BR')}`,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // 3. Verificar tickets O&M vencidos
      const { data: overdueTickets } = await supabase
        .from('tickets')
        .select('id, title, due_date')
        .eq('plant_id', plant.id)
        .in('status', ['open', 'in_progress'])
        .lt('due_date', new Date().toISOString());

      if (overdueTickets && overdueTickets.length > 0) {
        const { data: existingAlert } = await supabase
          .from('alerts')
          .select('id')
          .eq('plant_id', plant.id)
          .eq('type', 'maintenance_overdue')
          .in('status', ['open', 'acknowledged'])
          .single();

        if (!existingAlert) {
          alertsToCreate.push({
            plant_id: plant.id,
            type: 'maintenance_overdue',
            severity: 'high',
            message: `${overdueTickets.length} ticket(s) de manutenção vencido(s)`,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Inserir novos alertas
    if (alertsToCreate.length > 0) {
      const { data: newAlerts, error: insertError } = await supabase
        .from('alerts')
        .insert(alertsToCreate)
        .select();

      if (insertError) {
        throw new Error(`Failed to insert alerts: ${insertError.message}`);
      }

      console.log(`Created ${newAlerts?.length || 0} new alerts`);
    }

    // Resolver alertas que não são mais válidos
    const { data: openAlerts } = await supabase
      .from('alerts')
      .select('id, plant_id, type')
      .eq('status', 'open');

    const alertsToResolve = [];

    for (const alert of openAlerts || []) {
      let shouldResolve = false;

      if (alert.type === 'low_generation') {
        // Verificar se a geração voltou ao normal
        const { data: recentReadings } = await supabase
          .from('readings')
          .select('energy_kwh')
          .eq('plant_id', alert.plant_id)
          .gte('timestamp', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()); // últimas 2h

        if (recentReadings && recentReadings.length > 0) {
          const recentGeneration = recentReadings.reduce((sum, r) => sum + (r.energy_kwh || 0), 0);
          if (recentGeneration > 50) { // Geração normalizada
            shouldResolve = true;
          }
        }
      }

      if (alert.type === 'no_data') {
        // Verificar se voltaram a chegar dados
        const { data: latestReading } = await supabase
          .from('readings')
          .select('timestamp')
          .eq('plant_id', alert.plant_id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (latestReading) {
          const minutesSinceLastReading = (Date.now() - new Date(latestReading.timestamp).getTime()) / (1000 * 60);
          if (minutesSinceLastReading < 15) { // Dados voltaram
            shouldResolve = true;
          }
        }
      }

      if (shouldResolve) {
        alertsToResolve.push(alert.id);
      }
    }

    // Resolver alertas automaticamente
    if (alertsToResolve.length > 0) {
      const { error: resolveError } = await supabase
        .from('alerts')
        .update({ 
          status: 'resolved',
          updated_at: new Date().toISOString()
        })
        .in('id', alertsToResolve);

      if (resolveError) {
        console.error('Error resolving alerts:', resolveError);
      } else {
        console.log(`Auto-resolved ${alertsToResolve.length} alerts`);
      }
    }

    const summary = {
      plantsEvaluated: plants?.length || 0,
      newAlerts: alertsToCreate.length,
      resolvedAlerts: alertsToResolve.length,
      timestamp: new Date().toISOString()
    };

    console.log('Alert evaluation completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in evaluate-alerts function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});