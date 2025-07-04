-- Habilitar RLS em tabelas que ainda não têm
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Política para readings (dados de plantas)
CREATE POLICY "Users can insert readings for authenticated plants"
ON public.readings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.plants 
    WHERE plants.id = readings.plant_id
  )
);

-- Política para sync_logs
CREATE POLICY "System can insert sync logs"
ON public.sync_logs
FOR INSERT
WITH CHECK (true);

-- Adicionar coluna user_id na tabela readings se necessário para RLS por usuário
-- (opcional, para controle mais granular no futuro)