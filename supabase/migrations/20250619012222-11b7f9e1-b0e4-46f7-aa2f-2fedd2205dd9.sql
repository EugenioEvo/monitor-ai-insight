
-- Adicionar novos campos na tabela plants para configurações
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS owner_document TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS initial_investment NUMERIC(12,2);
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS project_assumptions JSONB;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS generator_address_street TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS generator_address_number TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS generator_address_complement TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS generator_address_neighborhood TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS generator_address_city TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS generator_address_state TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS generator_address_zip_code TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS consumer_unit_code TEXT;

-- Adicionar trigger para atualizar updated_at quando houver mudanças
DROP TRIGGER IF EXISTS update_plants_updated_at ON public.plants;
CREATE TRIGGER update_plants_updated_at
    BEFORE UPDATE ON public.plants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
