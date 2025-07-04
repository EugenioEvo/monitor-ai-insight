-- 1. Tabela de Alertas
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_alerts_plant_id ON public.alerts(plant_id);
CREATE INDEX idx_alerts_status ON public.alerts(status);
CREATE INDEX idx_alerts_severity ON public.alerts(severity);
CREATE INDEX idx_alerts_timestamp ON public.alerts(timestamp DESC);

-- 2. Tabela de Tickets O&M
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_parts', 'completed', 'cancelled')),
  type TEXT NOT NULL DEFAULT 'maintenance' CHECK (type IN ('maintenance', 'repair', 'inspection', 'upgrade')),
  assigned_to TEXT,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_hours INTEGER,
  actual_hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_tickets_plant_id ON public.tickets(plant_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);
CREATE INDEX idx_tickets_due_date ON public.tickets(due_date);

-- 3. Histórico de Tickets
CREATE TABLE public.ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_ticket_history_ticket_id ON public.ticket_history(ticket_id);
CREATE INDEX idx_ticket_history_changed_at ON public.ticket_history(changed_at DESC);

-- 4. Habilitar RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para Alerts
CREATE POLICY "Authenticated users can view alerts"
ON public.alerts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert alerts"
ON public.alerts
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Authenticated users can update alerts"
ON public.alerts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Políticas RLS para Tickets
CREATE POLICY "Authenticated users can view tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. Políticas RLS para Ticket History
CREATE POLICY "Authenticated users can view ticket history"
ON public.ticket_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert ticket history"
ON public.ticket_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 8. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON public.alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();