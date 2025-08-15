-- Fix critical security vulnerability in customers table
-- Remove overly permissive policy that allows any authenticated user to read sensitive customer data

-- First, drop the insecure policy that allows all authenticated users to view customers
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;

-- The existing admin policy already allows super_admin and admin roles to manage customers
-- This is secure and appropriate for the business logic

-- Add a more restrictive policy for viewing customers that only allows admin roles
CREATE POLICY "Only admins can view customers" 
ON public.customers 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- Ensure the admin management policy covers all operations (INSERT, UPDATE, DELETE)
-- The existing policy should handle this, but let's verify it's comprehensive
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;

CREATE POLICY "Admins can manage customers"
ON public.customers
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));