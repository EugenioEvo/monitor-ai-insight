-- Fix critical security vulnerability in invoices table
-- Remove overly permissive policy that allows all authenticated users to view all invoices
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;

-- Create restrictive policies for invoice access
-- Policy 1: Users can view invoices for their own customer units
CREATE POLICY "Users can view invoices for their customer units" 
ON public.invoices 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.customer_units cu
    JOIN public.customers c ON cu.customer_id = c.id
    JOIN public.profiles p ON p.email = c.email
    WHERE cu.uc_code = invoices.uc_code
    AND p.id = auth.uid()
  )
);

-- Policy 2: Users can view invoices for plants they own (via consumer unit code)
CREATE POLICY "Users can view invoices for their plants" 
ON public.invoices 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.plants pl
    JOIN public.customers c ON pl.customer_id = c.id
    JOIN public.profiles p ON p.email = c.email
    WHERE pl.consumer_unit_code = invoices.uc_code
    AND p.id = auth.uid()
  )
);

-- Policy 3: Users can view invoices linked directly to their customer units via foreign key
CREATE POLICY "Users can view invoices via customer unit relationship" 
ON public.invoices 
FOR SELECT 
USING (
  customer_unit_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.customer_units cu
    JOIN public.customers c ON cu.customer_id = c.id  
    JOIN public.profiles p ON p.email = c.email
    WHERE cu.id = invoices.customer_unit_id
    AND p.id = auth.uid()
  )
);