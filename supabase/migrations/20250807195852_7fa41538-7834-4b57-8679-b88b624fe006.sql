
-- 1) Deduplicar readings por (plant_id, timestamp) antes de criar índice único
WITH ranked AS (
  SELECT
    id,
    plant_id,
    "timestamp",
    ROW_NUMBER() OVER (PARTITION BY plant_id, "timestamp" ORDER BY id) AS rn
  FROM public.readings
)
DELETE FROM public.readings r
USING ranked
WHERE r.id = ranked.id
  AND ranked.rn > 1;

-- 2) Índice único para suportar upsert do conector SolarEdge
CREATE UNIQUE INDEX IF NOT EXISTS readings_plant_timestamp_uidx
  ON public.readings (plant_id, "timestamp");

-- 3) Índices para melhorar consultas do dashboard
CREATE INDEX IF NOT EXISTS alerts_plant_timestamp_idx
  ON public.alerts (plant_id, "timestamp");

CREATE INDEX IF NOT EXISTS sync_logs_plant_created_idx
  ON public.sync_logs (plant_id, created_at);

-- 4) Preparar tabelas para Realtime: REPLICA IDENTITY FULL
ALTER TABLE public.readings REPLICA IDENTITY FULL;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
ALTER TABLE public.sync_logs REPLICA IDENTITY FULL;
ALTER TABLE public.plants REPLICA IDENTITY FULL;

-- 5) Adicionar tabelas à publicação supabase_realtime (idempotente)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.readings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.plants;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
