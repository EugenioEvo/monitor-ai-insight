-- TARGETED SECURITY FIX - Remove specific overly permissive policies
-- Fix only the policies that need to be changed

-- 1. Fix sync_logs table - Remove public access, keep admin access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sync_logs;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.sync_logs;

-- Add admin-only read policy if it doesn't exist
DROP POLICY IF EXISTS "Admins can view sync logs" ON public.sync_logs;
CREATE POLICY "Admins can view sync logs" ON public.sync_logs
  FOR SELECT 
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- 2. Fix system_metrics table - Restrict to admins only
DROP POLICY IF EXISTS "Authenticated users can view system metrics" ON public.system_metrics;
CREATE POLICY "Admins can view system metrics" ON public.system_metrics
  FOR SELECT 
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- 3. Fix invoice_analyses table - User-specific access
DROP POLICY IF EXISTS "Authenticated users can view invoice analyses" ON public.invoice_analyses;
CREATE POLICY "Users can view analyses for accessible invoices" ON public.invoice_analyses
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.customer_units cu ON cu.uc_code = i.uc_code
      JOIN public.customers c ON c.id = cu.customer_id
      JOIN public.profiles p ON p.email = c.email
      WHERE i.id = invoice_analyses.invoice_id 
      AND p.id = auth.uid()
    )
    OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text])
  );

-- 4. Fix automated_reports table - User-specific access
DROP POLICY IF EXISTS "Authenticated users can view automated reports" ON public.automated_reports;
CREATE POLICY "Users can view reports for accessible plants" ON public.automated_reports
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.plants p
      JOIN public.customers c ON c.id = p.customer_id  
      JOIN public.profiles pr ON pr.email = c.email
      WHERE p.id = automated_reports.plant_id 
      AND pr.id = auth.uid()
    )
    OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text])
  );

-- 5. Fix smart_alerts table - User-specific access  
DROP POLICY IF EXISTS "Authenticated users can view smart alerts" ON public.smart_alerts;
CREATE POLICY "Users can view alerts for accessible plants" ON public.smart_alerts
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.plants p
      JOIN public.customers c ON c.id = p.customer_id  
      JOIN public.profiles pr ON pr.email = c.email
      WHERE p.id = smart_alerts.plant_id 
      AND pr.id = auth.uid()
    )
    OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text])
  );

-- 6. Add performance indexes for security monitoring
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_action 
  ON public.security_audit_logs(user_id, action, created_at);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip_time 
  ON public.security_audit_logs(ip_address, created_at);

-- 7. Create security logging function
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_user_id uuid,
  p_action text,
  p_table_name text,
  p_record_id text DEFAULT NULL,
  p_success boolean DEFAULT true
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.security_audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    success,
    created_at
  ) VALUES (
    p_user_id,
    p_action,
    p_table_name,
    p_record_id,
    p_success,
    NOW()
  );
EXCEPTION WHEN OTHERS THEN
  -- Silently fail to avoid blocking operations
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;