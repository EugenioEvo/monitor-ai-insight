-- PHASE 1: CRITICAL RLS POLICY FIXES

-- Fix invoices table - only allow access through proper customer relationships
DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view invoices for their customer units" ON public.invoices;
DROP POLICY IF EXISTS "Users can view invoices for their plants" ON public.invoices;
DROP POLICY IF EXISTS "Users can view invoices via customer unit relationship" ON public.invoices;

-- Create secure invoice policies
CREATE POLICY "Super admins can manage all invoices"
ON public.invoices FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'super_admin')
WITH CHECK (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Admins can view all invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "Users can only view invoices for their customer units"
ON public.invoices FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customer_units cu
    JOIN customers c ON c.id = cu.customer_id
    JOIN profiles p ON p.email = c.email
    WHERE cu.uc_code = invoices.uc_code
    AND p.id = auth.uid()
  )
);

-- Fix customers table - restrict to admins only
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Only admins can view customers" ON public.customers;

CREATE POLICY "Only super admins can manage customers"
ON public.customers FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'super_admin')
WITH CHECK (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Admins can view customers"
ON public.customers FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- Fix plant_credentials table - super admin only
DROP POLICY IF EXISTS "Admins can view plant credentials" ON public.plant_credentials;
DROP POLICY IF EXISTS "Super admins can manage plant credentials" ON public.plant_credentials;

CREATE POLICY "Only super admins can access plant credentials"
ON public.plant_credentials FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'super_admin')
WITH CHECK (get_user_role(auth.uid()) = 'super_admin');

-- Fix sungrow_tokens - user specific access only
DROP POLICY IF EXISTS "Admins can delete sungrow tokens" ON public.sungrow_tokens;
DROP POLICY IF EXISTS "Admins can insert sungrow tokens" ON public.sungrow_tokens;
DROP POLICY IF EXISTS "Admins can update sungrow tokens" ON public.sungrow_tokens;
DROP POLICY IF EXISTS "Admins can view sungrow tokens" ON public.sungrow_tokens;

CREATE POLICY "Users can manage their own sungrow tokens"
ON public.sungrow_tokens FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can manage all sungrow tokens"
ON public.sungrow_tokens FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'super_admin')
WITH CHECK (get_user_role(auth.uid()) = 'super_admin');

-- Fix system_health_logs - admin access only
DROP POLICY IF EXISTS "Admins can view system health" ON public.system_health_logs;
DROP POLICY IF EXISTS "System can insert health logs" ON public.system_health_logs;

CREATE POLICY "Only admins can view system health logs"
ON public.system_health_logs FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "System can insert health logs"
ON public.system_health_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add security audit table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text,
  record_id text,
  ip_address inet,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only super admins can view audit logs"
ON public.security_audit_logs FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "System can insert audit logs"
ON public.security_audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON public.security_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_action ON public.security_audit_logs(action);

-- Update updated_at trigger for audit logs
CREATE TRIGGER update_security_audit_logs_updated_at
    BEFORE UPDATE ON public.security_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();