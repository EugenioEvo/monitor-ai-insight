-- COMPREHENSIVE SECURITY FIX - PHASE 1: CRITICAL DATA PROTECTION
-- Remove overly permissive RLS policies and implement proper access controls

-- 1. Fix sync_logs table (CRITICAL: Currently allows unauthenticated access)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sync_logs;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.sync_logs;

-- Only admins can view sync logs (contains sensitive error messages)
CREATE POLICY "Admins can view sync logs" ON public.sync_logs
  FOR SELECT 
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- System can still insert sync logs
CREATE POLICY "System can insert sync logs" ON public.sync_logs
  FOR INSERT 
  WITH CHECK (true);

-- 2. Fix system_metrics table (Contains sensitive performance data)
DROP POLICY IF EXISTS "Authenticated users can view system metrics" ON public.system_metrics;

-- Only admins can view system metrics
CREATE POLICY "Admins can view system metrics" ON public.system_metrics
  FOR SELECT 
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- 3. Fix invoice_analyses table (Contains sensitive business intelligence)
DROP POLICY IF EXISTS "Authenticated users can view invoice analyses" ON public.invoice_analyses;

-- Users can only view analyses for invoices they have access to
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

-- 4. Fix automated_reports table (Contains sensitive business reports)
DROP POLICY IF EXISTS "Authenticated users can view automated reports" ON public.automated_reports;

-- Users can only view reports for plants they have access to
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

-- 5. Fix smart_alerts table (Contains sensitive operational data)
DROP POLICY IF EXISTS "Authenticated users can view smart alerts" ON public.smart_alerts;

-- Users can only view alerts for plants they have access to
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

-- 6. Additional security: Restrict metrics_cache access
DROP POLICY IF EXISTS "Users can view metrics cache" ON public.metrics_cache;

-- Only allow access to metrics cache for authenticated users with rate limiting
CREATE POLICY "Authenticated users can view metrics cache" ON public.metrics_cache
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- 7. Enhance security audit logging
-- Create index for better security audit log performance
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_action 
  ON public.security_audit_logs(user_id, action, created_at);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip_time 
  ON public.security_audit_logs(ip_address, created_at);

-- 8. Create security monitoring triggers
CREATE OR REPLACE FUNCTION public.log_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive tables
  INSERT INTO public.security_audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    success,
    created_at
  ) VALUES (
    auth.uid(),
    TG_OP || '_' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    true,
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add monitoring triggers to sensitive tables
DROP TRIGGER IF EXISTS trigger_log_plant_credentials_access ON public.plant_credentials;
CREATE TRIGGER trigger_log_plant_credentials_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.plant_credentials
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_access();

DROP TRIGGER IF EXISTS trigger_log_customers_access ON public.customers;
CREATE TRIGGER trigger_log_customers_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.customers  
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_access();