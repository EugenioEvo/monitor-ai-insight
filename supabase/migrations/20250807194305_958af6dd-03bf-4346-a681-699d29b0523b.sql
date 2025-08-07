-- Fix linter: Set secure search_path for functions
ALTER FUNCTION public.get_user_role(user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.validate_invoice_dates() SET search_path = 'public';
