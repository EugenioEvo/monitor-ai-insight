-- Criar tabela de histórico de manutenções por equipamento
CREATE TABLE IF NOT EXISTS equipment_maintenance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  equipment_name TEXT,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'predictive')),
  performed_at TIMESTAMPTZ NOT NULL,
  performed_by TEXT,
  duration_hours NUMERIC,
  parts_used JSONB DEFAULT '[]'::jsonb,
  cost_brl NUMERIC DEFAULT 0,
  notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de scores de manutenção preditiva
CREATE TABLE IF NOT EXISTS predictive_maintenance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  equipment_name TEXT,
  prediction_date TIMESTAMPTZ NOT NULL,
  failure_probability NUMERIC CHECK (failure_probability BETWEEN 0 AND 1),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  predicted_failure_date TIMESTAMPTZ,
  recommended_action TEXT,
  confidence_percent NUMERIC,
  factors JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_equipment_history_plant ON equipment_maintenance_history(plant_id);
CREATE INDEX idx_equipment_history_equipment ON equipment_maintenance_history(equipment_id);
CREATE INDEX idx_equipment_history_date ON equipment_maintenance_history(performed_at DESC);
CREATE INDEX idx_predictive_scores_plant ON predictive_maintenance_scores(plant_id);
CREATE INDEX idx_predictive_scores_risk ON predictive_maintenance_scores(risk_level);
CREATE INDEX idx_predictive_scores_date ON predictive_maintenance_scores(prediction_date DESC);

-- RLS Policies
ALTER TABLE equipment_maintenance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_maintenance_scores ENABLE ROW LEVEL SECURITY;

-- Políticas para equipment_maintenance_history
CREATE POLICY "Users can view maintenance history"
  ON equipment_maintenance_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage maintenance history"
  ON equipment_maintenance_history FOR ALL
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
  WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "System can manage maintenance history"
  ON equipment_maintenance_history FOR ALL
  WITH CHECK (true);

-- Políticas para predictive_maintenance_scores
CREATE POLICY "Users can view predictive scores"
  ON predictive_maintenance_scores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage predictive scores"
  ON predictive_maintenance_scores FOR ALL
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_equipment_history_updated_at
  BEFORE UPDATE ON equipment_maintenance_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE equipment_maintenance_history IS 'Histórico completo de manutenções realizadas por equipamento';
COMMENT ON TABLE predictive_maintenance_scores IS 'Scores de predição de falhas calculados por ML';