-- Atualizar a função hybrid-invoice-ocr para salvar dados completos e conectar com beneficiários

-- Primeiro, vamos ajustar a tabela invoices para ter todos os campos necessários
-- que já existem conforme a estrutura fornecida

-- Criar tabela para salvar análises das faturas
CREATE TABLE IF NOT EXISTS invoice_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  analysis_report JSONB NOT NULL,
  chat_report TEXT,
  ai_insights JSONB,
  anomalies_detected JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoice_analyses ENABLE ROW LEVEL SECURITY;

-- Policies for invoice_analyses
CREATE POLICY "Authenticated users can view invoice analyses"
ON invoice_analyses FOR SELECT
USING (true);

CREATE POLICY "System can manage invoice analyses"
ON invoice_analyses FOR ALL
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_invoice_analyses_updated_at
  BEFORE UPDATE ON invoice_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_invoice_analyses_invoice_id ON invoice_analyses(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_uc_code ON invoices(uc_code);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_uc_code ON beneficiaries(uc_code);