-- Create system metrics table for performance monitoring
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  metric_data JSONB NOT NULL,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system backups table
CREATE TABLE IF NOT EXISTS public.system_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_id TEXT NOT NULL UNIQUE,
  backup_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'creating',
  size_mb NUMERIC NOT NULL DEFAULT 0,
  tables_included TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB,
  table_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system restore logs table
CREATE TABLE IF NOT EXISTS public.system_restore_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restore_id TEXT NOT NULL,
  backup_id TEXT NOT NULL,
  status TEXT NOT NULL,
  tables_restored JSONB,
  errors JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create smart alerts table for ML-powered alerts
CREATE TABLE IF NOT EXISTS public.smart_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  plant_id UUID,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  conditions JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics trends table
CREATE TABLE IF NOT EXISTS public.analytics_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID,
  metric_type TEXT NOT NULL,
  period TEXT NOT NULL,
  trend_data JSONB NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create metrics cache table
CREATE TABLE IF NOT EXISTS public.metrics_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  cache_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create automated reports table
CREATE TABLE IF NOT EXISTS public.automated_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  plant_id UUID,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  report_data JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_restore_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system tables
CREATE POLICY "Authenticated users can view system metrics" 
ON public.system_metrics FOR SELECT 
USING (true);

CREATE POLICY "System can insert metrics" 
ON public.system_metrics FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage backups" 
ON public.system_backups FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "Authenticated users can view backups" 
ON public.system_backups FOR SELECT 
USING (true);

CREATE POLICY "System can manage restore logs" 
ON public.system_restore_logs FOR ALL 
WITH CHECK (true);

CREATE POLICY "Authenticated users can view restore logs" 
ON public.system_restore_logs FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can view smart alerts" 
ON public.smart_alerts FOR SELECT 
USING (true);

CREATE POLICY "System can manage smart alerts" 
ON public.smart_alerts FOR ALL 
WITH CHECK (true);

CREATE POLICY "Authenticated users can view analytics trends" 
ON public.analytics_trends FOR SELECT 
USING (true);

CREATE POLICY "System can manage analytics trends" 
ON public.analytics_trends FOR ALL 
WITH CHECK (true);

CREATE POLICY "Authenticated users can view metrics cache" 
ON public.metrics_cache FOR SELECT 
USING (true);

CREATE POLICY "System can manage metrics cache" 
ON public.metrics_cache FOR ALL 
WITH CHECK (true);

CREATE POLICY "Authenticated users can view automated reports" 
ON public.automated_reports FOR SELECT 
USING (true);

CREATE POLICY "System can manage automated reports" 
ON public.automated_reports FOR ALL 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_type_collected ON public.system_metrics(metric_type, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_plant_status ON public.smart_alerts(plant_id, status);
CREATE INDEX IF NOT EXISTS idx_analytics_trends_plant_period ON public.analytics_trends(plant_id, period);
CREATE INDEX IF NOT EXISTS idx_metrics_cache_key_expires ON public.metrics_cache(cache_key, expires_at);
CREATE INDEX IF NOT EXISTS idx_automated_reports_type_plant ON public.automated_reports(report_type, plant_id);

-- Create updated_at trigger for backup table
CREATE TRIGGER update_system_backups_updated_at
  BEFORE UPDATE ON public.system_backups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for metrics cache
CREATE TRIGGER update_metrics_cache_updated_at
  BEFORE UPDATE ON public.metrics_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();