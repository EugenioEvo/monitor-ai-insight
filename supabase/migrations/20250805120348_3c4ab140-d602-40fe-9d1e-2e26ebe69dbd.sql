-- Fase 3: Análise Avançada e Otimização de Performance
-- Criação de tabelas para analytics e cache

-- Tabela para análise de trends e padrões
CREATE TABLE IF NOT EXISTS public.analytics_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID,
  metric_type TEXT NOT NULL, -- 'energy', 'performance', 'weather', 'maintenance'
  period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
  trend_direction TEXT NOT NULL, -- 'increasing', 'decreasing', 'stable', 'volatile'
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  data_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  insights JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para cache de métricas calculadas
CREATE TABLE IF NOT EXISTS public.metrics_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  plant_id UUID,
  metric_type TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cached_data JSONB NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para alertas inteligentes
CREATE TABLE IF NOT EXISTS public.smart_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID,
  alert_type TEXT NOT NULL, -- 'performance_drop', 'anomaly_detected', 'maintenance_due', 'efficiency_decline'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  triggered_by JSONB NOT NULL, -- dados que causaram o alerta
  recommendations JSONB DEFAULT '[]'::jsonb,
  auto_resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'ignored'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para relatórios automáticos
CREATE TABLE IF NOT EXISTS public.automated_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL, -- 'daily_summary', 'weekly_performance', 'monthly_analytics', 'maintenance_schedule'
  plant_id UUID,
  recipient_emails TEXT[] DEFAULT '{}',
  schedule_cron TEXT NOT NULL, -- formato cron para agendamento
  last_generated TIMESTAMP WITH TIME ZONE,
  next_generation TIMESTAMP WITH TIME ZONE,
  template_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_data JSONB,
  generation_status TEXT DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
  error_message TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_analytics_trends_plant_date ON public.analytics_trends(plant_id, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_trends_metric_type ON public.analytics_trends(metric_type, period_type);
CREATE INDEX IF NOT EXISTS idx_metrics_cache_key ON public.metrics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_metrics_cache_expires ON public.metrics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_plant_status ON public.smart_alerts(plant_id, status, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_type_severity ON public.smart_alerts(alert_type, severity);
CREATE INDEX IF NOT EXISTS idx_automated_reports_next_gen ON public.automated_reports(next_generation, enabled);

-- RLS Policies
ALTER TABLE public.analytics_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_reports ENABLE ROW LEVEL SECURITY;

-- Analytics trends policies
CREATE POLICY "Users can view analytics trends" ON public.analytics_trends
  FOR SELECT USING (true);
CREATE POLICY "System can manage analytics trends" ON public.analytics_trends
  FOR ALL WITH CHECK (true);

-- Metrics cache policies
CREATE POLICY "Users can view metrics cache" ON public.metrics_cache
  FOR SELECT USING (true);
CREATE POLICY "System can manage metrics cache" ON public.metrics_cache
  FOR ALL WITH CHECK (true);

-- Smart alerts policies
CREATE POLICY "Users can view smart alerts" ON public.smart_alerts
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage smart alerts" ON public.smart_alerts
  FOR ALL USING (get_user_role(auth.uid()) = ANY(ARRAY['super_admin'::text, 'admin'::text]));

-- Automated reports policies
CREATE POLICY "Users can view automated reports" ON public.automated_reports
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage automated reports" ON public.automated_reports
  FOR ALL USING (get_user_role(auth.uid()) = ANY(ARRAY['super_admin'::text, 'admin'::text]));

-- Função para limpeza automática de cache expirado
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.metrics_cache 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO public.system_logs (event_type, message, metadata)
  VALUES ('cache_cleanup', 'Expired cache entries cleaned', 
          jsonb_build_object('deleted_count', deleted_count));
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular trends
CREATE OR REPLACE FUNCTION public.calculate_energy_trends(p_plant_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
  trend_data JSONB;
  daily_values NUMERIC[];
  avg_change NUMERIC;
  trend_direction TEXT;
  confidence NUMERIC;
BEGIN
  -- Buscar dados dos últimos N dias
  SELECT array_agg(daily_total ORDER BY reading_date)
  INTO daily_values
  FROM (
    SELECT 
      date_trunc('day', timestamp)::date as reading_date,
      sum(energy_kwh) as daily_total
    FROM public.readings 
    WHERE plant_id = p_plant_id 
      AND timestamp >= now() - (p_days || ' days')::interval
    GROUP BY date_trunc('day', timestamp)::date
  ) daily_energy;
  
  -- Calcular tendência
  IF array_length(daily_values, 1) >= 7 THEN
    -- Calcular média das mudanças diárias
    SELECT avg(change_percent) INTO avg_change
    FROM (
      SELECT 
        (daily_values[i] - daily_values[i-1]) / NULLIF(daily_values[i-1], 0) * 100 as change_percent
      FROM generate_subscripts(daily_values, 1) as i
      WHERE i > 1
    ) changes;
    
    -- Determinar direção da tendência
    IF avg_change > 5 THEN
      trend_direction := 'increasing';
      confidence := LEAST(95, abs(avg_change) * 2);
    ELSIF avg_change < -5 THEN
      trend_direction := 'decreasing';
      confidence := LEAST(95, abs(avg_change) * 2);
    ELSIF abs(avg_change) < 2 THEN
      trend_direction := 'stable';
      confidence := 85;
    ELSE
      trend_direction := 'volatile';
      confidence := 60;
    END IF;
    
    trend_data := jsonb_build_object(
      'trend_direction', trend_direction,
      'confidence_score', confidence,
      'average_change_percent', round(avg_change, 2),
      'data_points', array_length(daily_values, 1),
      'period_days', p_days
    );
  ELSE
    trend_data := jsonb_build_object(
      'trend_direction', 'insufficient_data',
      'confidence_score', 0,
      'data_points', COALESCE(array_length(daily_values, 1), 0)
    );
  END IF;
  
  RETURN trend_data;
END;
$$ LANGUAGE plpgsql;

-- Trigger para limpeza automática de cache a cada hora
SELECT cron.schedule(
  'cleanup-expired-cache',
  '0 * * * *', -- A cada hora
  $$SELECT public.cleanup_expired_cache();$$
);

-- Trigger para análise de trends diária
SELECT cron.schedule(
  'daily-trends-analysis',
  '0 6 * * *', -- Todo dia às 6h
  $$
  INSERT INTO public.analytics_trends (plant_id, metric_type, period_type, trend_direction, confidence_score, data_points)
  SELECT 
    p.id as plant_id,
    'energy' as metric_type,
    'daily' as period_type,
    (trend_data->>'trend_direction')::text,
    (trend_data->>'confidence_score')::numeric,
    trend_data
  FROM public.plants p
  CROSS JOIN LATERAL public.calculate_energy_trends(p.id, 30) as trend_data
  WHERE p.sync_enabled = true;
  $$
);