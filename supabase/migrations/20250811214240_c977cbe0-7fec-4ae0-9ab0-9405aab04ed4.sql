-- Allow authenticated users to acknowledge alerts safely
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Restrict column updates: only allow status and acknowledged_by to authenticated users
REVOKE UPDATE ON public.alerts FROM anon;
REVOKE UPDATE ON public.alerts FROM authenticated;
GRANT UPDATE (status, acknowledged_by) ON public.alerts TO authenticated;

-- Create a precise RLS policy for acknowledging alerts
DROP POLICY IF EXISTS "Users can acknowledge alerts" ON public.alerts;
CREATE POLICY "Users can acknowledge alerts"
ON public.alerts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  status = 'acknowledged'::text
  AND acknowledged_by = auth.uid()
);
