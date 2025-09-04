-- Create Edge Functions for system monitoring
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update RLS policies for better security
-- Enable RLS on all sensitive tables
ALTER TABLE public.sungrow_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_credentials ENABLE ROW LEVEL SECURITY;

-- Add more restrictive policies for credentials
DROP POLICY IF EXISTS "Admins can manage plant credentials" ON public.plant_credentials;
CREATE POLICY "Super admins can manage plant credentials" 
ON public.plant_credentials
FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin')
WITH CHECK (get_user_role(auth.uid()) = 'super_admin');

-- Create system health monitoring table
CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'error')),
  metrics JSONB NOT NULL DEFAULT '{}',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system health" 
ON public.system_health_logs
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "System can insert health logs" 
ON public.system_health_logs
FOR INSERT
WITH CHECK (true);