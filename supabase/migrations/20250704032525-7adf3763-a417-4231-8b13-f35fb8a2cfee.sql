-- Melhorar RLS sem conflitos de políticas existentes

-- 1. Plants: Já tem política adequada, pular

-- 2. Beneficiaries: Melhorar política (dropar primeira)
DROP POLICY IF EXISTS "Admins can manage beneficiaries" ON public.beneficiaries;
CREATE POLICY "Admins can manage beneficiaries" 
ON public.beneficiaries
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin']))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin']));

-- 3. Customer Units: Garantir RLS ativo
ALTER TABLE public.customer_units ENABLE ROW LEVEL SECURITY;

-- 4. Profiles: Política para inserção automática via trigger
CREATE POLICY "Allow profile creation via trigger"
ON public.profiles
FOR INSERT
TO service_role
WITH CHECK (true);

-- 5. Adicionar unique constraint em profiles para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique ON public.profiles(id);

-- 6. Verificar se tabela users tem RLS (parece ser redundante com profiles)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;