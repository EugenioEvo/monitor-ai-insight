-- Harden access to credentials and tokens
-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.sungrow_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_credentials ENABLE ROW LEVEL SECURITY;

-- Sungrow tokens: remove user-self-access and restrict to admins only
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.sungrow_tokens;

-- Admin-only policies for sungrow_tokens
CREATE POLICY "Admins can view sungrow tokens"
ON public.sungrow_tokens
FOR SELECT
TO authenticated
USING (public.get_user_role(auth.uid()) IN ('super_admin','admin'));

CREATE POLICY "Admins can insert sungrow tokens"
ON public.sungrow_tokens
FOR INSERT
TO authenticated
WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin','admin'));

CREATE POLICY "Admins can update sungrow tokens"
ON public.sungrow_tokens
FOR UPDATE
TO authenticated
USING (public.get_user_role(auth.uid()) IN ('super_admin','admin'))
WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin','admin'));

CREATE POLICY "Admins can delete sungrow tokens"
ON public.sungrow_tokens
FOR DELETE
TO authenticated
USING (public.get_user_role(auth.uid()) IN ('super_admin','admin'));

-- plant_credentials already restricted to admins per existing policies; no change needed.
