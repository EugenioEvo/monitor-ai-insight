import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTicketRequest {
  plant_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'maintenance' | 'repair' | 'inspection' | 'upgrade';
  assigned_to?: string;
  due_date?: string;
  estimated_hours?: number;
}

const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const VALID_TYPES = ['maintenance', 'repair', 'inspection', 'upgrade'];

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

    const ticketData: CreateTicketRequest = await req.json();

    // Validação dos campos obrigatórios
    if (!ticketData.plant_id || !ticketData.title || !ticketData.description) {
      return new Response(
        JSON.stringify({ error: 'plant_id, title and description are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar priority e type
    if (!VALID_PRIORITIES.includes(ticketData.priority)) {
      return new Response(
        JSON.stringify({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_TYPES.includes(ticketData.type)) {
      return new Response(
        JSON.stringify({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se a planta existe
    const { data: plant, error: plantError } = await supabase
      .from('plants')
      .select('id, name')
      .eq('id', ticketData.plant_id)
      .single();

    if (plantError || !plant) {
      return new Response(
        JSON.stringify({ error: 'Plant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating ticket for plant ${plant.name}`, ticketData);

    // Criar ticket
    const { data: newTicket, error: createError } = await supabase
      .from('tickets')
      .insert([{
        ...ticketData,
        status: 'open',
        opened_at: new Date().toISOString()
      }])
      .select(`
        *,
        plants!inner(name, capacity_kwp)
      `)
      .single();

    if (createError) {
      throw new Error(`Failed to create ticket: ${createError.message}`);
    }

    // Registrar histórico de criação
    const { error: historyError } = await supabase
      .from('ticket_history')
      .insert([{
        ticket_id: newTicket.id,
        field_changed: 'status',
        old_value: null,
        new_value: 'open',
        changed_by: user.email || user.id,
        notes: 'Ticket criado'
      }]);

    if (historyError) {
      console.error('Failed to insert ticket creation history:', historyError);
      // Não falhar a operação por causa do histórico
    }

    // Se prioridade é crítica, criar alerta automático
    if (ticketData.priority === 'critical') {
      const { error: alertError } = await supabase
        .from('alerts')
        .insert([{
          plant_id: ticketData.plant_id,
          type: 'critical_maintenance',
          severity: 'critical',
          message: `Ticket crítico criado: ${ticketData.title}`,
          status: 'open'
        }]);

      if (alertError) {
        console.error('Failed to create critical alert:', alertError);
      }
    }

    console.log(`Ticket ${newTicket.id} created successfully for plant ${plant.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        ticket: newTicket,
        message: 'Ticket created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-ticket function:', error);
    
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