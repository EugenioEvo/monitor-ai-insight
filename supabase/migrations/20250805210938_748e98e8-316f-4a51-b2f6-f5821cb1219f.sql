-- Atualizar as constraints da tabela tickets para usar os valores corretos
ALTER TABLE tickets DROP CONSTRAINT tickets_priority_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_priority_check CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]));

ALTER TABLE tickets DROP CONSTRAINT tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'waiting_parts'::text, 'completed'::text, 'cancelled'::text]));

ALTER TABLE tickets DROP CONSTRAINT tickets_type_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_type_check CHECK (type = ANY (ARRAY['maintenance'::text, 'repair'::text, 'inspection'::text, 'upgrade'::text]));