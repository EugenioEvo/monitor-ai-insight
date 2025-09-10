-- PHASE 1: CRITICAL SECURITY FIXES - Fix policy conflicts and strengthen RLS

-- Drop the conflicting policy first
DROP POLICY IF EXISTS "Only admins can manage app config" ON public.app_config;

-- Now create secure policies for app_config without conflicts
CREATE POLICY "Authenticated users can view app config" 
ON public.app_config 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage app config" 
ON public.app_config 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));