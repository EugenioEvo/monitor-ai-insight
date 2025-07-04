-- Garantir RLS ativo em todas as tabelas críticas

-- 1. Plants: Já tem RLS, melhorar políticas
DROP POLICY IF EXISTS "Authenticated users can view plants" ON public.plants;
CREATE POLICY "Authenticated users can view plants" 
ON public.plants
FOR SELECT
TO authenticated
USING (true);

-- 2. Beneficiaries: Melhorar política de inserção
DROP POLICY IF EXISTS "Admins can manage beneficiaries" ON public.beneficiaries;
CREATE POLICY "Admins can manage beneficiaries" 
ON public.beneficiaries
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin']))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin']));

-- 3. Readings: Adicionar política para authenticated users
CREATE POLICY "Authenticated users can view readings"
ON public.readings
FOR SELECT
TO authenticated
USING (true);

-- 4. Sync Logs: Melhorar políticas
CREATE POLICY "Authenticated users can view sync logs"
ON public.sync_logs
FOR SELECT
TO authenticated
USING (true);

-- 5. Customers: Garantir que só admins podem gerenciar
-- (Já existe, mas vamos confirmar)

-- 6. Customer Units: Adicionar RLS se não existir
ALTER TABLE public.customer_units ENABLE ROW LEVEL SECURITY;

-- 7. Customer Metrics: RLS já existe

-- 8. Invoices: RLS já existe

-- 9. Profiles: Verificar política de inserção automática
-- Permitir inserção automática via trigger
CREATE POLICY "Allow profile creation via trigger"
ON public.profiles
FOR INSERT
TO service_role
WITH CHECK (true);

-- 10. Monitoring Configs: Já tem RLS adequado

-- 11. App Config: Políticas já adequadas