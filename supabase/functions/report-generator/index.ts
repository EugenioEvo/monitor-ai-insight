import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json().catch(() => ({}));
    const { action = 'generate_monthly_report', report_type = 'monthly', plant_id } = requestBody;

    if (action === 'generate_monthly_report') {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      let plantsQuery = supabaseClient
        .from('plants')
        .select('id, name, capacity_kwp, status');
      
      if (plant_id) {
        plantsQuery = plantsQuery.eq('id', plant_id);
      }

      const { data: plants, error: plantsError } = await plantsQuery;

      if (plantsError) {
        throw new Error(`Error fetching plants: ${plantsError.message}`);
      }

      const reports = [];

      for (const plant of plants || []) {
        // Buscar leituras do mês passado
        const { data: readings, error: readingsError } = await supabaseClient
          .from('readings')
          .select('power_w, energy_kwh, timestamp')
          .eq('plant_id', plant.id)
          .gte('timestamp', lastMonth.toISOString())
          .lt('timestamp', thisMonth.toISOString())
          .order('timestamp', { ascending: true });

        if (readingsError) {
          console.error(`Error fetching readings for plant ${plant.id}:`, readingsError);
          continue;
        }

        // Buscar alertas do mês passado
        const { data: alerts, error: alertsError } = await supabaseClient
          .from('alerts')
          .select('type, severity, timestamp')
          .eq('plant_id', plant.id)
          .gte('timestamp', lastMonth.toISOString())
          .lt('timestamp', thisMonth.toISOString());

        // Buscar tickets do mês passado
        const { data: tickets, error: ticketsError } = await supabaseClient
          .from('tickets')
          .select('type, priority, status, opened_at, closed_at')
          .eq('plant_id', plant.id)
          .gte('opened_at', lastMonth.toISOString())
          .lt('opened_at', thisMonth.toISOString());

        // Calcular métricas
        const totalEnergy = readings?.reduce((sum, r) => sum + r.energy_kwh, 0) || 0;
        const avgPower = readings?.length ? readings.reduce((sum, r) => sum + r.power_w, 0) / readings.length : 0;
        const maxPower = readings?.length ? Math.max(...readings.map(r => r.power_w)) : 0;
        
        // Calcular performance (energia vs capacidade instalada)
        const daysInMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        const theoreticalMaxEnergy = plant.capacity_kwp * 24 * daysInMonth; // kWh teórico máximo
        const performance = theoreticalMaxEnergy > 0 ? (totalEnergy / theoreticalMaxEnergy) * 100 : 0;

        // Análise de disponibilidade
        const expectedDataPoints = daysInMonth * 24 * 4; // Assumindo leitura a cada 15 min
        const actualDataPoints = readings?.length || 0;
        const availability = (actualDataPoints / expectedDataPoints) * 100;

        // Análise de alertas
        const criticalAlerts = alerts?.filter(a => a.severity === 'critical').length || 0;
        const highAlerts = alerts?.filter(a => a.severity === 'high').length || 0;
        const totalAlerts = alerts?.length || 0;

        // Análise de tickets
        const openTickets = tickets?.filter(t => t.status === 'open').length || 0;
        const closedTickets = tickets?.filter(t => t.status === 'closed').length || 0;
        const totalTickets = tickets?.length || 0;

        // Calcular tempo médio de resolução de tickets
        const resolvedTickets = tickets?.filter(t => t.closed_at) || [];
        const avgResolutionTime = resolvedTickets.length > 0 
          ? resolvedTickets.reduce((sum, t) => {
              const opened = new Date(t.opened_at);
              const closed = new Date(t.closed_at);
              return sum + (closed.getTime() - opened.getTime());
            }, 0) / resolvedTickets.length / (1000 * 60 * 60) // em horas
          : 0;

        const report = {
          report_type: 'monthly',
          plant_id: plant.id,
          period_start: lastMonth.toISOString(),
          period_end: thisMonth.toISOString(),
          report_data: {
            plant_info: {
              name: plant.name,
              capacity_kwp: plant.capacity_kwp,
              status: plant.status
            },
            energy_metrics: {
              total_energy_kwh: Math.round(totalEnergy * 100) / 100,
              avg_power_w: Math.round(avgPower),
              max_power_w: maxPower,
              performance_percentage: Math.round(performance * 100) / 100,
              availability_percentage: Math.round(availability * 100) / 100
            },
            operational_metrics: {
              total_alerts: totalAlerts,
              critical_alerts: criticalAlerts,
              high_alerts: highAlerts,
              total_tickets: totalTickets,
              open_tickets: openTickets,
              closed_tickets: closedTickets,
              avg_resolution_time_hours: Math.round(avgResolutionTime * 100) / 100
            },
            summary: {
              data_points_collected: actualDataPoints,
              expected_data_points: expectedDataPoints,
              month: lastMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
              generated_at: now.toISOString()
            }
          },
          generated_at: now.toISOString()
        };

        reports.push(report);
      }

      // Salvar relatórios
      if (reports.length > 0) {
        const { error: reportsError } = await supabaseClient
          .from('automated_reports')
          .insert(reports);

        if (reportsError) {
          console.error('Error saving reports:', reportsError);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        reports_generated: reports.length,
        period: `${lastMonth.toLocaleDateString('pt-BR')} - ${thisMonth.toLocaleDateString('pt-BR')}`,
        message: 'Monthly reports generated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_reports') {
      const { plant_id, report_type = 'monthly', limit = 10 } = requestBody;
      
      let query = supabaseClient
        .from('automated_reports')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(limit);

      if (plant_id) {
        query = query.eq('plant_id', plant_id);
      }
      
      if (report_type) {
        query = query.eq('report_type', report_type);
      }

      const { data: reports, error } = await query;

      if (error) {
        throw new Error(`Error fetching reports: ${error.message}`);
      }

      return new Response(JSON.stringify({
        success: true,
        reports: reports || [],
        count: reports?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in report-generator:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});