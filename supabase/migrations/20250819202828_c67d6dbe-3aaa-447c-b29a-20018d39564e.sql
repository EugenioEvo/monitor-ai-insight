-- Enhanced Security for Plant Credentials

-- 1. Create audit log table for credential access
CREATE TABLE IF NOT EXISTS public.credential_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    plant_id UUID NOT NULL,
    access_type TEXT NOT NULL, -- 'view', 'update', 'delete'
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    failure_reason TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    session_id TEXT,
    CONSTRAINT valid_access_type CHECK (access_type IN ('view', 'update', 'delete', 'create'))
);

-- Enable RLS on audit logs
ALTER TABLE public.credential_access_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit logs
CREATE POLICY "Only admins can view credential access logs"
    ON public.credential_access_logs
    FOR SELECT
    USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "System can insert access logs"
    ON public.credential_access_logs
    FOR INSERT
    WITH CHECK (true);

-- 2. Add metadata columns to plant_credentials for enhanced security
ALTER TABLE public.plant_credentials 
ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_rotated TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS rotation_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_ips INET[],
ADD COLUMN IF NOT EXISTS access_restricted_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failed_access_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_level TEXT DEFAULT 'high' CHECK (security_level IN ('high', 'critical'));

-- 3. Create function to log credential access
CREATE OR REPLACE FUNCTION public.log_credential_access(
    p_user_id UUID,
    p_plant_id UUID,
    p_access_type TEXT,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_failure_reason TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.credential_access_logs (
        user_id, plant_id, access_type, ip_address, user_agent, 
        success, failure_reason, session_id
    ) VALUES (
        p_user_id, p_plant_id, p_access_type, p_ip_address::inet, 
        p_user_agent, p_success, p_failure_reason, p_session_id
    );
END;
$$;

-- 4. Create function to check if credential access is allowed
CREATE OR REPLACE FUNCTION public.is_credential_access_allowed(
    p_plant_id UUID,
    p_user_id UUID,
    p_ip_address TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    credentials_record RECORD;
    user_role TEXT;
BEGIN
    -- Get user role
    SELECT get_user_role(p_user_id) INTO user_role;
    
    -- Only admins can access credentials
    IF user_role NOT IN ('super_admin', 'admin') THEN
        RETURN false;
    END IF;
    
    -- Get credential record
    SELECT * FROM public.plant_credentials 
    WHERE plant_id = p_plant_id 
    INTO credentials_record;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if access is temporarily restricted
    IF credentials_record.access_restricted_until IS NOT NULL 
       AND credentials_record.access_restricted_until > now() THEN
        RETURN false;
    END IF;
    
    -- Check failed access count (lockout after 5 failures)
    IF credentials_record.failed_access_count >= 5 THEN
        RETURN false;
    END IF;
    
    -- Check IP restrictions if configured
    IF credentials_record.allowed_ips IS NOT NULL 
       AND array_length(credentials_record.allowed_ips, 1) > 0
       AND p_ip_address IS NOT NULL THEN
        IF NOT (p_ip_address::inet = ANY(credentials_record.allowed_ips)) THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
END;
$$;

-- 5. Create function to increment failed access attempts
CREATE OR REPLACE FUNCTION public.increment_failed_credential_access(
    p_plant_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.plant_credentials 
    SET 
        failed_access_count = failed_access_count + 1,
        access_restricted_until = CASE 
            WHEN failed_access_count >= 4 THEN now() + interval '1 hour'
            ELSE access_restricted_until
        END
    WHERE plant_id = p_plant_id;
END;
$$;

-- 6. Create function to reset failed access attempts (successful access)
CREATE OR REPLACE FUNCTION public.reset_failed_credential_access(
    p_plant_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.plant_credentials 
    SET 
        failed_access_count = 0,
        access_restricted_until = NULL
    WHERE plant_id = p_plant_id;
END;
$$;

-- 7. Create trigger to automatically update encryption timestamp
CREATE OR REPLACE FUNCTION public.update_credential_encryption_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update encryption timestamp when sensitive fields change
    IF OLD.password IS DISTINCT FROM NEW.password 
       OR OLD.appkey IS DISTINCT FROM NEW.appkey
       OR OLD.access_key IS DISTINCT FROM NEW.access_key THEN
        NEW.encrypted_at = now();
        NEW.last_rotated = now();
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_credential_encryption_timestamp_trigger
    BEFORE UPDATE ON public.plant_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_credential_encryption_timestamp();

-- 8. Create view for secure credential summary (non-sensitive data only)
CREATE OR REPLACE VIEW public.plant_credentials_summary AS
SELECT 
    id,
    plant_id,
    provider,
    created_at,
    updated_at,
    last_rotated,
    rotation_required,
    security_level,
    failed_access_count,
    CASE 
        WHEN access_restricted_until > now() THEN true
        ELSE false
    END as is_access_restricted,
    CASE 
        WHEN last_rotated < now() - interval '90 days' THEN true
        ELSE false
    END as needs_rotation,
    -- Mask sensitive fields
    CASE WHEN username IS NOT NULL THEN '[CONFIGURED]' ELSE NULL END as username_status,
    CASE WHEN password IS NOT NULL THEN '[CONFIGURED]' ELSE NULL END as password_status,
    CASE WHEN appkey IS NOT NULL THEN '[CONFIGURED]' ELSE NULL END as appkey_status,
    CASE WHEN access_key IS NOT NULL THEN '[CONFIGURED]' ELSE NULL END as access_key_status
FROM public.plant_credentials;

-- Create RLS policy for the summary view
CREATE POLICY "Authenticated users can view credential summary"
    ON public.plant_credentials_summary
    FOR SELECT
    USING (true);

-- 9. Add indices for performance
CREATE INDEX IF NOT EXISTS idx_credential_access_logs_plant_user 
    ON public.credential_access_logs(plant_id, user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_credential_access_logs_accessed_at 
    ON public.credential_access_logs(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_plant_credentials_security 
    ON public.plant_credentials(plant_id, security_level, access_restricted_until);

-- Enable realtime for audit logs
ALTER TABLE public.credential_access_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credential_access_logs;