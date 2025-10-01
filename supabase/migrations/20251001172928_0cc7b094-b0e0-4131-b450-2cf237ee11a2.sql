-- =====================================================
-- DIGITAL TWIN & ANALYTICS TABLES
-- =====================================================

-- Digital Twin Configurations
CREATE TABLE IF NOT EXISTS public.digital_twin_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT '1.0',
  
  -- Physical Layout
  layout JSONB NOT NULL, -- PlantLayout interface
  strings JSONB NOT NULL DEFAULT '[]'::jsonb, -- StringConfig[]
  inverters JSONB NOT NULL DEFAULT '[]'::jsonb, -- InverterConfig[]
  trackers JSONB DEFAULT NULL, -- TrackerConfig[]
  
  -- Losses and Efficiency
  losses JSONB NOT NULL, -- LossesConfig interface
  performance_ratio_target NUMERIC NOT NULL DEFAULT 80.0, -- PR target (%)
  
  -- Environmental Context
  environmental_context JSONB NOT NULL, -- EnvironmentalContext interface
  
  -- Baseline Model
  baseline_model JSONB NOT NULL, -- BaselineModel interface
  calibration_date TIMESTAMPTZ,
  validation_metrics JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(plant_id, version)
);

-- Baseline Forecasts (hora-a-hora)
CREATE TABLE IF NOT EXISTS public.baseline_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES public.digital_twin_configs(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  
  expected_generation_kwh NUMERIC NOT NULL,
  confidence_lower NUMERIC NOT NULL,
  confidence_upper NUMERIC NOT NULL,
  
  -- Factors
  poa_irradiance NUMERIC, -- W/m²
  ambient_temp NUMERIC,
  cell_temp_estimated NUMERIC,
  soiling_factor NUMERIC,
  shading_factor NUMERIC,
  system_efficiency NUMERIC,
  
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(plant_id, timestamp)
);

-- Performance Gaps
CREATE TABLE IF NOT EXISTS public.performance_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  
  actual_kwh NUMERIC NOT NULL,
  expected_kwh NUMERIC NOT NULL,
  gap_kwh NUMERIC NOT NULL,
  gap_percent NUMERIC NOT NULL,
  
  -- Root Cause Analysis
  probable_causes JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Financial Impact
  estimated_loss_brl NUMERIC,
  
  -- Alert
  alert_triggered BOOLEAN NOT NULL DEFAULT false,
  alert_id UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(plant_id, timestamp)
);

-- Data Quality Logs
CREATE TABLE IF NOT EXISTS public.data_quality_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE,
  data_source TEXT NOT NULL, -- 'solaredge', 'sungrow', 'meters', 'meteo'
  
  -- Quality Scores
  overall_score NUMERIC NOT NULL DEFAULT 100.0,
  completeness_score NUMERIC NOT NULL DEFAULT 100.0,
  timeliness_score NUMERIC NOT NULL DEFAULT 100.0,
  accuracy_score NUMERIC NOT NULL DEFAULT 100.0,
  consistency_score NUMERIC NOT NULL DEFAULT 100.0,
  
  -- Metrics Detail
  completeness_metrics JSONB,
  timeliness_metrics JSONB,
  accuracy_metrics JSONB,
  consistency_metrics JSONB,
  
  -- Issues & Corrections
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  auto_corrections JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plant Audits
CREATE TABLE IF NOT EXISTS public.plant_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  audit_date TIMESTAMPTZ NOT NULL,
  
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'completed', -- 'in_progress', 'completed', 'archived'
  
  -- Generation Metrics
  actual_generation_kwh NUMERIC NOT NULL,
  expected_generation_kwh NUMERIC NOT NULL,
  gap_kwh NUMERIC NOT NULL,
  gap_percent NUMERIC NOT NULL,
  
  -- Recoverable Value
  recoverable_generation_kwh NUMERIC NOT NULL DEFAULT 0,
  recoverable_value_brl NUMERIC NOT NULL DEFAULT 0,
  confidence_percent NUMERIC NOT NULL DEFAULT 0,
  
  -- Summary
  executive_summary JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Findings
CREATE TABLE IF NOT EXISTS public.audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.plant_audits(id) ON DELETE CASCADE,
  
  category TEXT NOT NULL, -- 'soiling', 'mismatch', 'mppt', 'clipping', 'degradation', 'outage', 'curtailment', 'inverter', 'communication'
  severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  estimated_impact_kwh NUMERIC NOT NULL DEFAULT 0,
  estimated_impact_brl NUMERIC NOT NULL DEFAULT 0,
  
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  probable_causes JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  detailed_analysis JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Recommendations
CREATE TABLE IF NOT EXISTS public.audit_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.plant_audits(id) ON DELETE CASCADE,
  finding_id UUID NOT NULL REFERENCES public.audit_findings(id) ON DELETE CASCADE,
  
  priority TEXT NOT NULL, -- 'immediate', 'short_term', 'medium_term', 'long_term'
  
  action_type TEXT NOT NULL, -- 'cleaning', 'maintenance', 'replacement', 'reconfiguration', 'monitoring'
  action_title TEXT NOT NULL,
  action_description TEXT NOT NULL,
  
  estimated_cost_brl NUMERIC NOT NULL DEFAULT 0,
  estimated_benefit_kwh_year NUMERIC NOT NULL DEFAULT 0,
  estimated_benefit_brl_year NUMERIC NOT NULL DEFAULT 0,
  payback_months NUMERIC,
  roi_percent NUMERIC,
  
  implementation_details JSONB,
  
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'in_progress', 'completed', 'rejected'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_digital_twin_configs_plant ON public.digital_twin_configs(plant_id);
CREATE INDEX IF NOT EXISTS idx_baseline_forecasts_plant_timestamp ON public.baseline_forecasts(plant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_gaps_plant_timestamp ON public.performance_gaps(plant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_gaps_alert ON public.performance_gaps(alert_triggered, plant_id) WHERE alert_triggered = true;
CREATE INDEX IF NOT EXISTS idx_data_quality_logs_plant_source ON public.data_quality_logs(plant_id, data_source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plant_audits_plant_date ON public.plant_audits(plant_id, audit_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_findings_audit ON public.audit_findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_recommendations_audit ON public.audit_recommendations(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_recommendations_finding ON public.audit_recommendations(finding_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.digital_twin_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baseline_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_quality_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_recommendations ENABLE ROW LEVEL SECURITY;

-- Digital Twin Configs
CREATE POLICY "Admins can manage digital twin configs"
  ON public.digital_twin_configs FOR ALL
  USING (get_user_role(auth.uid()) = ANY(ARRAY['super_admin', 'admin']))
  WITH CHECK (get_user_role(auth.uid()) = ANY(ARRAY['super_admin', 'admin']));

CREATE POLICY "Users can view digital twin configs"
  ON public.digital_twin_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Baseline Forecasts
CREATE POLICY "System can manage baseline forecasts"
  ON public.baseline_forecasts FOR ALL
  WITH CHECK (true);

CREATE POLICY "Users can view baseline forecasts"
  ON public.baseline_forecasts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Performance Gaps
CREATE POLICY "System can manage performance gaps"
  ON public.performance_gaps FOR ALL
  WITH CHECK (true);

CREATE POLICY "Users can view performance gaps"
  ON public.performance_gaps FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Data Quality Logs
CREATE POLICY "System can insert data quality logs"
  ON public.data_quality_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view data quality logs"
  ON public.data_quality_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Plant Audits
CREATE POLICY "System can manage plant audits"
  ON public.plant_audits FOR ALL
  WITH CHECK (true);

CREATE POLICY "Users can view plant audits"
  ON public.plant_audits FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Audit Findings
CREATE POLICY "System can manage audit findings"
  ON public.audit_findings FOR ALL
  WITH CHECK (true);

CREATE POLICY "Users can view audit findings"
  ON public.audit_findings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Audit Recommendations
CREATE POLICY "Admins can manage recommendations"
  ON public.audit_recommendations FOR ALL
  USING (get_user_role(auth.uid()) = ANY(ARRAY['super_admin', 'admin']))
  WITH CHECK (get_user_role(auth.uid()) = ANY(ARRAY['super_admin', 'admin']));

CREATE POLICY "Users can view recommendations"
  ON public.audit_recommendations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_digital_twin_configs_updated_at
  BEFORE UPDATE ON public.digital_twin_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plant_audits_updated_at
  BEFORE UPDATE ON public.plant_audits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audit_recommendations_updated_at
  BEFORE UPDATE ON public.audit_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();