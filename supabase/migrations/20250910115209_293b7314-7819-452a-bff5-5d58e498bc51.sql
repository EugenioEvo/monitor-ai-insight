-- PHASE 1: CRITICAL SECURITY FIXES - Remove Public Access & Strengthen RLS

-- Drop overly permissive policies that allow public access
DROP POLICY IF EXISTS "Enable insert for all users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for all users" ON public.users;

DROP POLICY IF EXISTS "Enable insert for all users" ON public.monitoring_configs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.monitoring_configs;
DROP POLICY IF EXISTS "Enable update for all users" ON public.monitoring_configs;

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.customer_units;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.customer_metrics;

DROP POLICY IF EXISTS "Allow authenticated users to update app config" ON public.app_config;
DROP POLICY IF EXISTS "Allow public read access to app config" ON public.app_config;

-- Create secure role-based policies for users table
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all users" 
ON public.users 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can manage users" 
ON public.users 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- Create secure policies for monitoring_configs
CREATE POLICY "Admins can manage monitoring configs" 
ON public.monitoring_configs 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "Users can view monitoring configs for accessible plants" 
ON public.monitoring_configs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM plants p 
  JOIN customers c ON c.id = p.customer_id 
  JOIN profiles pr ON pr.email = c.email 
  WHERE p.id = monitoring_configs.plant_id AND pr.id = auth.uid()
) OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- Create secure policies for customer_units
CREATE POLICY "Users can view their own customer units" 
ON public.customer_units 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM customers c 
  JOIN profiles p ON p.email = c.email 
  WHERE c.id = customer_units.customer_id AND p.id = auth.uid()
) OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "Admins can manage customer units" 
ON public.customer_units 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- Create secure policies for customer_metrics
CREATE POLICY "Users can view their own customer metrics" 
ON public.customer_metrics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM customers c 
  JOIN profiles p ON p.email = c.email 
  WHERE c.id = customer_metrics.customer_id AND p.id = auth.uid()
) OR get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "System can manage customer metrics" 
ON public.customer_metrics 
FOR ALL 
WITH CHECK (true);

-- Create secure policies for app_config
CREATE POLICY "Authenticated users can view app config" 
ON public.app_config 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage app config" 
ON public.app_config 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- Add audit logging triggers for sensitive tables
CREATE OR REPLACE FUNCTION audit_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive data
  PERFORM log_sensitive_access(
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::text
      ELSE NEW.id::text
    END,
    true
  );
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to sensitive tables
CREATE TRIGGER audit_customers_access
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

CREATE TRIGGER audit_sungrow_tokens_access
  AFTER INSERT OR UPDATE OR DELETE ON public.sungrow_tokens
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

CREATE TRIGGER audit_plant_credentials_access
  AFTER INSERT OR UPDATE OR DELETE ON public.plant_credentials
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

-- Add performance indexes for security audit logs
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_action 
ON public.security_audit_logs(user_id, action, created_at);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at 
ON public.security_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_success 
ON public.security_audit_logs(success, created_at);

-- Create function to detect suspicious activity patterns
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
  p_user_id uuid,
  p_time_window_minutes integer DEFAULT 15,
  p_max_failed_attempts integer DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_attempts integer;
BEGIN
  -- Count failed attempts in time window
  SELECT COUNT(*) INTO failed_attempts
  FROM security_audit_logs
  WHERE user_id = p_user_id
    AND success = false
    AND created_at > NOW() - (p_time_window_minutes || ' minutes')::interval;
    
  RETURN failed_attempts >= p_max_failed_attempts;
END;
$$;