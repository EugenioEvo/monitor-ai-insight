
-- Extensão da tabela plants para suportar integrações de monitoramento
ALTER TABLE public.plants ADD COLUMN monitoring_system TEXT DEFAULT 'manual' CHECK (monitoring_system IN ('manual', 'solaredge', 'sungrow'));
ALTER TABLE public.plants ADD COLUMN api_site_id TEXT;
ALTER TABLE public.plants ADD COLUMN api_credentials JSONB;
ALTER TABLE public.plants ADD COLUMN sync_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.plants ADD COLUMN last_sync TIMESTAMP WITH TIME ZONE;

-- Criar tabela para configurações de monitoramento
CREATE TABLE public.monitoring_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE NOT NULL,
  system_type TEXT NOT NULL CHECK (system_type IN ('solaredge', 'sungrow')),
  config_data JSONB NOT NULL,
  sync_interval_minutes INTEGER DEFAULT 15,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para logs de sincronização
CREATE TABLE public.sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE NOT NULL,
  system_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'warning')),
  message TEXT,
  data_points_synced INTEGER DEFAULT 0,
  sync_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies para as novas tabelas
ALTER TABLE public.monitoring_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.monitoring_configs FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.monitoring_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.monitoring_configs FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.sync_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.sync_logs FOR INSERT WITH CHECK (true);
