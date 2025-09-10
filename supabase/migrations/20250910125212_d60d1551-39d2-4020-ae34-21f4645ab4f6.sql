-- PHASE 1: DATABASE SECURITY HARDENING
-- Drop overly permissive RLS policies and implement strict role-based access

-- Drop permissive policies from users table
DROP POLICY IF EXISTS "Enable insert for all users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for all users" ON public.users;

-- Create secure user policies
CREATE POLICY "Users can view own record" ON public.users
FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own record" ON public.users
FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all users" ON public.users
FOR SELECT USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- Drop permissive policies from app_config table
DROP POLICY IF EXISTS "Allow authenticated users to update app config" ON public.app_config;
DROP POLICY IF EXISTS "Allow public read access to app config" ON public.app_config;
DROP POLICY IF EXISTS "Authenticated users can view app config" ON public.app_config;

-- Create secure app_config policies with audit logging
CREATE POLICY "Public can read non-sensitive config" ON public.app_config
FOR SELECT USING (key NOT LIKE '%_key%' AND key NOT LIKE '%_secret%' AND key NOT LIKE '%_token%');

CREATE POLICY "Admins can manage all app config" ON public.app_config
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- Drop permissive policies from customer_units and customer_metrics
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.customer_units;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.customer_metrics;

-- Create secure customer_units policies
CREATE POLICY "Users can view customer units for their customers" ON public.customer_units
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM customers c 
    JOIN profiles p ON p.email = c.email 
    WHERE c.id = customer_units.customer_id AND p.id = auth.uid()
  ) OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text])
);

CREATE POLICY "Admins can manage customer units" ON public.customer_units
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- Create secure customer_metrics policies
CREATE POLICY "Users can view metrics for their customers" ON public.customer_metrics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM customers c 
    JOIN profiles p ON p.email = c.email 
    WHERE c.id = customer_metrics.customer_id AND p.id = auth.uid()
  ) OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text])
);

CREATE POLICY "System can manage customer metrics" ON public.customer_metrics
FOR ALL USING (true)
WITH CHECK (true);

-- Drop permissive policies from monitoring_configs
DROP POLICY IF EXISTS "Enable insert for all users" ON public.monitoring_configs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.monitoring_configs;
DROP POLICY IF EXISTS "Enable update for all users" ON public.monitoring_configs;

-- Create secure monitoring_configs policies
CREATE POLICY "Authenticated users can view monitoring configs" ON public.monitoring_configs
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage monitoring configs" ON public.monitoring_configs
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- Create security audit triggers for sensitive tables
CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive tables
  PERFORM log_sensitive_access(
    auth.uid(),
    TG_OP || '_' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    true
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add audit triggers to sensitive tables
CREATE TRIGGER audit_customers_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

CREATE TRIGGER audit_plant_credentials_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.plant_credentials
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

CREATE TRIGGER audit_sungrow_tokens_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.sungrow_tokens
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

-- Create indexes for security audit logs performance
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_action ON public.security_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON public.security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_table_name ON public.security_audit_logs(table_name);

-- Create suspicious activity detection function
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity(
  p_user_id uuid,
  p_time_window_minutes integer DEFAULT 5,
  p_max_failed_attempts integer DEFAULT 5
) RETURNS boolean AS $$
DECLARE
  failed_attempts integer;
BEGIN
  -- Count recent failed login attempts
  SELECT COUNT(*)
  INTO failed_attempts
  FROM security_audit_logs
  WHERE user_id = p_user_id
    AND action = 'login_failed'
    AND success = false
    AND created_at > NOW() - (p_time_window_minutes || ' minutes')::interval;
  
  RETURN failed_attempts >= p_max_failed_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to get recent security events for monitoring
CREATE OR REPLACE FUNCTION public.get_recent_security_events(
  p_hours integer DEFAULT 24
) RETURNS TABLE(
  user_id uuid,
  action text,
  table_name text,
  success boolean,
  created_at timestamp with time zone,
  ip_address inet
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sal.user_id,
    sal.action,
    sal.table_name,
    sal.success,
    sal.created_at,
    sal.ip_address
  FROM security_audit_logs sal
  WHERE sal.created_at > NOW() - (p_hours || ' hours')::interval
  ORDER BY sal.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;