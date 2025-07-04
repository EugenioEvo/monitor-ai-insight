import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateTicketRequest {
  ticketId: string;
  updates: {
    status?: string;
    priority?: string;
    assigned_to?: string;
    description?: string;
    title?: string;
    due_date?: string;
    estimated_hours?: number;
    actual_hours?: number;
  };
  notes?: string;
}

const VALID_STATUSES = ['open', 'in_progress', 'waiting_parts', 'completed', 'cancelled'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

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

    const { ticketId, updates, notes }: UpdateTicketRequest = await req.json();

    if (!ticketId) {
      return new Response(
        JSON.stringify({ error: 'Ticket ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Updating ticket ${ticketId}`, { updates, notes });

    // Buscar ticket atual para comparação
    const { data: currentTicket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchError || !currentTicket) {
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar status e prioridade se fornecidos
    if (updates.status && !VALID_STATUSES.includes(updates.status)) {
      return new Response(
        JSON.stringify({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (updates.priority && !VALID_PRIORITIES.includes(updates.priority)) {
      return new Response(
        JSON.stringify({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar dados para atualização
    const updateData: any = { ...updates };

    // Se status mudou para 'completed', definir closed_at
    if (updates.status === 'completed' && currentTicket.status !== 'completed') {
      updateData.closed_at = new Date().toISOString();
    }

    // Se status saiu de 'completed', limpar closed_at
    if (updates.status && updates.status !== 'completed' && currentTicket.status === 'completed') {
      updateData.closed_at = null;
    }

    // Atualizar ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update ticket: ${updateError.message}`);
    }

    // Registrar histórico das mudanças
    const historyEntries = [];

    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = currentTicket[field];
      
      // Só registrar se houve mudança real
      if (oldValue !== newValue) {
        historyEntries.push({
          ticket_id: ticketId,
          field_changed: field,
          old_value: oldValue?.toString() || null,
          new_value: newValue?.toString() || null,
          changed_by: user.email || user.id,
          notes: notes || null
        });
      }
    }

    // Inserir entradas de histórico se houver mudanças
    if (historyEntries.length > 0) {
      const { error: historyError } = await supabase
        .from('ticket_history')
        .insert(historyEntries);

      if (historyError) {
        console.error('Failed to insert ticket history:', historyError);
        // Não falhar a operação por causa do histórico
      }
    }

    // Se ticket foi fechado, verificar se há alertas relacionados para resolver
    if (updates.status === 'completed') {
      const { error: alertsError } = await supabase
        .from('alerts')
        .update({ 
          status: 'resolved',
          updated_at: new Date().toISOString()
        })
        .eq('plant_id', currentTicket.plant_id)
        .eq('type', 'maintenance_overdue')
        .eq('status', 'open');

      if (alertsError) {
        console.error('Failed to resolve related alerts:', alertsError);
      }
    }

    console.log(`Ticket ${ticketId} updated successfully. History entries: ${historyEntries.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        ticket: updatedTicket,
        historyEntries: historyEntries.length,
        message: 'Ticket updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-ticket-status function:', error);
    
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