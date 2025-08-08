-- Extend sungrow_tokens for OAuth per-user and optional per-plant storage
ALTER TABLE public.sungrow_tokens
  ADD COLUMN IF NOT EXISTS plant_id uuid,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'sungrow',
  ADD COLUMN IF NOT EXISTS token_type text,
  ADD COLUMN IF NOT EXISTS scope text;

-- Ensure uniqueness to avoid duplicates per user/provider/plant
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sungrow_tokens_user_provider_plant
ON public.sungrow_tokens (user_id, provider, plant_id);

-- Keep updated_at fresh on updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sungrow_tokens_updated_at'
  ) THEN
    CREATE TRIGGER trg_sungrow_tokens_updated_at
    BEFORE UPDATE ON public.sungrow_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;