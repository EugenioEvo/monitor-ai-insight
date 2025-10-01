-- Tabela de análise de causa raiz (RCA) - criar primeiro
CREATE TABLE IF NOT EXISTS public.root_cause_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  probable_causes JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{cause, confidence, evidence, estimated_impact}]
  dependency_graph JSONB, -- Grafo de dependências entre equipamentos/subsistemas
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{action, priority, estimated_time, estimated_cost}]
  investigation_status TEXT NOT NULL DEFAULT 'pending' CHECK (investigation_status IN ('pending', 'in_progress', 'completed')),
  resolution_summary TEXT,
  actual_cause TEXT,
  lessons_learned TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de anomalias detectadas
CREATE TABLE IF NOT EXISTS public.anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  anomaly_type TEXT NOT NULL, -- 'generation_drop', 'efficiency_drop', 'offline', 'underperformance', 'data_gap'
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence NUMERIC NOT NULL DEFAULT 0.0 CHECK (confidence >= 0 AND confidence <= 1),
  detected_by TEXT NOT NULL, -- 'statistical', 'ml_isolation_forest', 'ml_autoencoder', 'digital_twin'
  metric_affected TEXT NOT NULL, -- 'power', 'energy', 'pr', 'availability'
  expected_value NUMERIC,
  actual_value NUMERIC,
  deviation_percent NUMERIC,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive')),
  root_cause_id UUID REFERENCES public.root_cause_analysis(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_anomaly UNIQUE (plant_id, timestamp, anomaly_type, metric_affected)
);

-- Agora adicionar a foreign key reversa
ALTER TABLE public.root_cause_analysis 
ADD COLUMN IF NOT EXISTS anomaly_id UUID REFERENCES public.anomalies(id) ON DELETE CASCADE;

-- Índices para performance
CREATE INDEX idx_anomalies_plant_timestamp ON public.anomalies(plant_id, timestamp DESC);
CREATE INDEX idx_anomalies_status ON public.anomalies(status) WHERE status = 'active';
CREATE INDEX idx_anomalies_severity ON public.anomalies(severity) WHERE severity IN ('high', 'critical');
CREATE INDEX idx_rca_anomaly ON public.root_cause_analysis(anomaly_id);
CREATE INDEX idx_rca_plant ON public.root_cause_analysis(plant_id);
CREATE INDEX idx_rca_status ON public.root_cause_analysis(investigation_status) WHERE investigation_status != 'completed';

-- RLS Policies
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.root_cause_analysis ENABLE ROW LEVEL SECURITY;

-- Policies para anomalies
CREATE POLICY "Users can view anomalies for accessible plants"
  ON public.anomalies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plants p
      JOIN public.customers c ON c.id = p.customer_id
      JOIN public.profiles pr ON pr.email = c.email
      WHERE p.id = anomalies.plant_id AND pr.id = auth.uid()
    )
    OR get_user_role(auth.uid()) IN ('super_admin', 'admin')
  );

CREATE POLICY "System can manage anomalies"
  ON public.anomalies FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can update anomaly status"
  ON public.anomalies FOR UPDATE
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'))
  WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Policies para root_cause_analysis
CREATE POLICY "Users can view RCA for accessible plants"
  ON public.root_cause_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plants p
      JOIN public.customers c ON c.id = p.customer_id
      JOIN public.profiles pr ON pr.email = c.email
      WHERE p.id = root_cause_analysis.plant_id AND pr.id = auth.uid()
    )
    OR get_user_role(auth.uid()) IN ('super_admin', 'admin')
  );

CREATE POLICY "System can manage RCA"
  ON public.root_cause_analysis FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can update RCA"
  ON public.root_cause_analysis FOR UPDATE
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'))
  WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Comentários das tabelas
COMMENT ON TABLE public.anomalies IS 'Tabela de anomalias detectadas por diferentes métodos (estatístico, ML, Digital Twin)';
COMMENT ON TABLE public.root_cause_analysis IS 'Análise de causa raiz para anomalias detectadas com grafo de dependências';
COMMENT ON COLUMN public.anomalies.detected_by IS 'Método que detectou a anomalia: statistical, ml_isolation_forest, ml_autoencoder, digital_twin';
COMMENT ON COLUMN public.root_cause_analysis.dependency_graph IS 'Grafo de dependências entre equipamentos para análise de propagação de falhas';