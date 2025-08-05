-- Criar job automático para sincronização a cada 30 minutos
SELECT cron.schedule(
  'sync-plants-automatic',
  '*/30 * * * *', -- A cada 30 minutos
  $$
  SELECT
    net.http_post(
        url:='https://znsctgihxeuhjqcofgsi.supabase.co/functions/v1/scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpuc2N0Z2loeGV1aGpxY29mZ3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyMTI0NTEsImV4cCI6MjA2NTc4ODQ1MX0.WhS2sUvEtUCyIWxSEKn8BsZI3T2rp-lhplo0Jh9c-ww"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Ativar sincronização automática para plantas existentes
UPDATE plants 
SET sync_enabled = true 
WHERE monitoring_system IN ('solaredge', 'sungrow') 
AND api_credentials IS NOT NULL;