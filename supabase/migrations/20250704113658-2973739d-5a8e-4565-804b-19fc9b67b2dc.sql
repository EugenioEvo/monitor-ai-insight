-- 1. Melhorar tabela alerts existente (adicionar colunas que faltam)
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Adicionar constraints separadamente
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%alerts%status%'
  ) THEN
    ALTER TABLE public.alerts 
    ADD CONSTRAINT alerts_status_check 
    CHECK (status IN ('open', 'acknowledged', 'resolved'));
  END IF;
END $$;

-- Corrigir tipo da coluna acknowledged_by para UUID se necessário
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'acknowledged_by' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.alerts 
    ALTER COLUMN acknowledged_by TYPE UUID USING acknowledged_by::UUID;
  END IF;
END $$;

-- Índices para alerts se não existirem
CREATE INDEX IF NOT EXISTS idx_alerts_plant_id ON public.alerts(plant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON public.alerts(timestamp DESC);

-- 2. Criar tabela ticket_history
CREATE TABLE IF NOT EXISTS public.ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON public.ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_changed_at ON public.ticket_history(changed_at DESC);

-- 3. Melhorar tabela tickets existente
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'maintenance',
ADD COLUMN IF NOT EXISTS assigned_to TEXT,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_hours INTEGER,
ADD COLUMN IF NOT EXISTS actual_hours INTEGER,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- Melhorar índices em tickets
CREATE INDEX IF NOT EXISTS idx_tickets_plant_id ON public.tickets(plant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_due_date ON public.tickets(due_date);

-- 4. Habilitar RLS
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para Ticket History (sem IF NOT EXISTS)
DROP POLICY IF EXISTS "Authenticated users can view ticket history" ON public.ticket_history;
CREATE POLICY "Authenticated users can view ticket history"
ON public.ticket_history
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "System can insert ticket history" ON public.ticket_history;
CREATE POLICY "System can insert ticket history"
ON public.ticket_history
FOR INSERT
TO authenticated
WITH CHECK (true);