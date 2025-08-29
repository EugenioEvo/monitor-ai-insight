import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricsSummary {
  totalGeneration: number;
  totalConsumption: number;
  openTickets: number;
  openAlerts: number;
  activePlants: number;
  period: string;
}

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

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'today';

    // Calcular data de início baseado no período
    let startDate: string;
    const now = new Date();
    
    switch (period) {
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        startDate = weekStart.toISOString();
        break;
      case 'month':
        const monthStart = new Date(now);
        monthStart.setDate(1);
        startDate = monthStart.toISOString();
        break;
      case 'today':
      default:
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        startDate = dayStart.toISOString();
        break;
    }

    console.log(`Fetching metrics for period: ${period}, startDate: ${startDate}`);

    // Executar queries em paralelo para melhor performance
    const [
      generationResult,
      consumptionResult,
      ticketsResult,
      alertsResult,
      plantsResult
    ] = await Promise.allSettled([
      // Total de geração no período
      supabase
        .from('readings')
        .select('energy_kwh')
        .gte('timestamp', startDate)
        .not('energy_kwh', 'is', null),

      // Consumo estimado (baseado em faturas ou cálculo)
      supabase
        .from('invoices')
        .select('energy_kwh')
        .gte('created_at', startDate)
        .not('energy_kwh', 'is', null),

      // Tickets abertos
      supabase
        .from('tickets')
        .select('id', { count: 'exact' })
        .in('status', ['open', 'in_progress']),

      // Alertas não resolvidos
      supabase
        .from('alerts')
        .select('id', { count: 'exact' })
        .in('status', ['open', 'acknowledged']),

      // Plantas ativas
      supabase
        .from('plants')
        .select('id', { count: 'exact' })
        .eq('status', 'active')
    ]);

    // Processar resultados
    let totalGeneration = 0;
    let totalConsumption = 0;
    let openTickets = 0;
    let openAlerts = 0;
    let activePlants = 0;

    if (generationResult.status === 'fulfilled' && generationResult.value.data) {
      totalGeneration = generationResult.value.data
        .reduce((sum, reading) => sum + (reading.energy_kwh || 0), 0);
    }

    if (consumptionResult.status === 'fulfilled' && consumptionResult.value.data) {
      totalConsumption = consumptionResult.value.data
        .reduce((sum, invoice) => sum + (invoice.energy_kwh || 0), 0);
    }

    if (ticketsResult.status === 'fulfilled') {
      openTickets = ticketsResult.value.count || 0;
    }

    if (alertsResult.status === 'fulfilled') {
      openAlerts = alertsResult.value.count || 0;
    }

    if (plantsResult.status === 'fulfilled') {
      activePlants = plantsResult.value.count || 0;
    }

    const summary: MetricsSummary = {
      totalGeneration: Math.round(totalGeneration * 100) / 100, // 2 decimais
      totalConsumption: Math.round(totalConsumption * 100) / 100,
      openTickets,
      openAlerts,
      activePlants,
      period
    };

    console.log('Metrics summary calculated:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in metrics-summary function:', error);
    
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