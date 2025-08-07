-- Performance and realtime enhancements for alerts and smart_alerts

-- 1) Indexes to speed up filtering and sorting
CREATE INDEX IF NOT EXISTS idx_alerts_plant_timestamp ON public.alerts (plant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts (status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts (severity);

CREATE INDEX IF NOT EXISTS idx_smart_alerts_plant_triggered_at ON public.smart_alerts (plant_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_status ON public.smart_alerts (status);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_severity ON public.smart_alerts (severity);

-- 2) Ensure full row data is available for realtime payloads
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
ALTER TABLE public.smart_alerts REPLICA IDENTITY FULL;

-- 3) Add tables to the supabase_realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'smart_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.smart_alerts;
  END IF;
END
$$;