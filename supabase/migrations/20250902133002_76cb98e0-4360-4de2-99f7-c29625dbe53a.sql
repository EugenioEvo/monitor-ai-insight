-- Ensure update_updated_at_column function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add basic RLS policies for key dashboard tables if they don't exist

-- Ensure readings table has proper RLS policies
DO $$
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'readings' 
        AND policyname = 'Users can view all readings'
    ) THEN
        CREATE POLICY "Users can view all readings" 
        ON public.readings 
        FOR SELECT 
        USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- Ensure metrics_cache table has proper RLS policies  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'metrics_cache' 
        AND policyname = 'Users can view metrics cache'
    ) THEN
        CREATE POLICY "Users can view metrics cache"
        ON public.metrics_cache 
        FOR SELECT 
        USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- Ensure plants table has proper user access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'plants' 
        AND policyname = 'Users can view plants'
    ) THEN
        CREATE POLICY "Users can view plants"
        ON public.plants 
        FOR SELECT 
        USING (auth.uid() IS NOT NULL);
    END IF;
END $$;