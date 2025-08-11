
-- 1) Garantir RLS e limitar colunas atualizáveis por usuários autenticados
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Mantenha as permissões de coluna estritas (apenas status e acknowledged_by).
-- Repetir REVOKE/GRANT é idempotente e seguro.
REVOKE UPDATE ON public.alerts FROM anon;
REVOKE UPDATE ON public.alerts FROM authenticated;
GRANT UPDATE (status, acknowledged_by) ON public.alerts TO authenticated;

-- 2) Políticas RLS seguras
-- Remover política prévia para recriá-la de forma explícita e complementar
DROP POLICY IF EXISTS "Users can acknowledge alerts" ON public.alerts;

-- Permitir reconhecer: status -> 'acknowledged' e acknowledged_by = auth.uid()
CREATE POLICY "Users can acknowledge alerts"
ON public.alerts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  status = 'acknowledged'::text
  AND acknowledged_by = auth.uid()
);

-- Permitir resolver apenas se o usuário foi quem reconheceu o alerta
-- Observação: como o GRANT limita as colunas, a aplicação só muda status/acknowledged_by.
CREATE POLICY "Users can resolve own acknowledged alerts"
ON public.alerts
FOR UPDATE
TO authenticated
USING (acknowledged_by = auth.uid())
WITH CHECK (
  status = 'resolved'::text
);

-- Permitir que admins atualizem status (acknowledged/resolved) em qualquer alerta
-- Requer que exista a função get_user_role(uuid) retornando 'super_admin'/'admin' etc.
CREATE POLICY "Admins can update alert status"
ON public.alerts
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) IN ('super_admin','admin'))
WITH CHECK (
  status IN ('acknowledged','resolved')
);

-- 3) Índices para filtros e ordenação
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON public.alerts (timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_filters ON public.alerts (plant_id, status, severity, timestamp);

-- 4) Realtime robusto
ALTER TABLE public.alerts REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
EXCEPTION
  WHEN undefined_object THEN
    -- Publicação não existe (ambiente local antigo) - ignore
    NULL;
  WHEN duplicate_object THEN
    -- Tabela já está na publicação - ignore
    NULL;
END $$;
