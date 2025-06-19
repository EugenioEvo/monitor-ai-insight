
-- Expandir tabela invoices com todos os campos do glossário conforme blueprint
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS subgrupo_tensao TEXT,
ADD COLUMN IF NOT EXISTS consumo_fp_te_kwh NUMERIC(12,3),
ADD COLUMN IF NOT EXISTS consumo_p_te_kwh NUMERIC(12,3),
ADD COLUMN IF NOT EXISTS demanda_tusd_kw NUMERIC(10,3),
ADD COLUMN IF NOT EXISTS demanda_te_kw NUMERIC(10,3),
ADD COLUMN IF NOT EXISTS icms_valor NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS icms_aliquota NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS pis_valor NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS pis_aliquota NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS cofins_valor NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS cofins_aliquota NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS bandeira_tipo TEXT,
ADD COLUMN IF NOT EXISTS bandeira_valor NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS data_leitura DATE,
ADD COLUMN IF NOT EXISTS data_emissao DATE,
ADD COLUMN IF NOT EXISTS data_vencimento DATE,
ADD COLUMN IF NOT EXISTS leitura_atual NUMERIC(12,3),
ADD COLUMN IF NOT EXISTS leitura_anterior NUMERIC(12,3),
ADD COLUMN IF NOT EXISTS multiplicador NUMERIC(8,3),
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS extraction_method TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS tarifa_te_tusd NUMERIC(10,4),
ADD COLUMN IF NOT EXISTS tarifa_te_te NUMERIC(10,4),
ADD COLUMN IF NOT EXISTS tarifa_demanda_tusd NUMERIC(10,4),
ADD COLUMN IF NOT EXISTS tarifa_demanda_te NUMERIC(10,4),
ADD COLUMN IF NOT EXISTS valor_tusd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS valor_te NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS valor_demanda_tusd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS valor_demanda_te NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS energia_injetada_kwh NUMERIC(12,3),
ADD COLUMN IF NOT EXISTS energia_compensada_kwh NUMERIC(12,3),
ADD COLUMN IF NOT EXISTS saldo_creditos_kwh NUMERIC(12,3),
ADD COLUMN IF NOT EXISTS contrib_ilum_publica NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS issqn_valor NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS outras_taxas NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS classe_subclasse TEXT,
ADD COLUMN IF NOT EXISTS modalidade_tarifaria TEXT,
ADD COLUMN IF NOT EXISTS fator_potencia NUMERIC(4,3),
ADD COLUMN IF NOT EXISTS dias_faturamento INTEGER,
ADD COLUMN IF NOT EXISTS historico_consumo JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS codigo_barras TEXT,
ADD COLUMN IF NOT EXISTS linha_digitavel TEXT;

-- Adicionar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_invoices_uc_code_month ON public.invoices(uc_code, reference_month);
CREATE INDEX IF NOT EXISTS idx_invoices_confidence_score ON public.invoices(confidence_score);
CREATE INDEX IF NOT EXISTS idx_invoices_requires_review ON public.invoices(requires_review);
CREATE INDEX IF NOT EXISTS idx_invoices_extraction_method ON public.invoices(extraction_method);
CREATE INDEX IF NOT EXISTS idx_invoices_data_emissao ON public.invoices(data_emissao);

-- Adicionar constraint para confidence_score entre 0 e 1
ALTER TABLE public.invoices 
ADD CONSTRAINT check_confidence_score 
CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));

-- Adicionar constraint para extraction_method
ALTER TABLE public.invoices 
ADD CONSTRAINT check_extraction_method 
CHECK (extraction_method IN ('openai', 'google_vision', 'tesseract', 'hybrid'));

-- Adicionar trigger para validar datas
CREATE OR REPLACE FUNCTION validate_invoice_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que data_leitura <= data_emissao <= data_vencimento
    IF NEW.data_leitura IS NOT NULL AND NEW.data_emissao IS NOT NULL THEN
        IF NEW.data_leitura > NEW.data_emissao THEN
            RAISE EXCEPTION 'Data de leitura não pode ser posterior à data de emissão';
        END IF;
    END IF;
    
    IF NEW.data_emissao IS NOT NULL AND NEW.data_vencimento IS NOT NULL THEN
        IF NEW.data_emissao > NEW.data_vencimento THEN
            RAISE EXCEPTION 'Data de emissão não pode ser posterior à data de vencimento';
        END IF;
    END IF;
    
    -- Validar que data_emissao não é futura
    IF NEW.data_emissao IS NOT NULL AND NEW.data_emissao > CURRENT_DATE THEN
        RAISE EXCEPTION 'Data de emissão não pode ser futura';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_invoice_dates_trigger
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION validate_invoice_dates();

-- Comentários nas colunas para documentação
COMMENT ON COLUMN public.invoices.subgrupo_tensao IS 'Subgrupo de tensão (A1, A2, A3, A4, AS, B1, B2, B3, B4a, B4b)';
COMMENT ON COLUMN public.invoices.consumo_fp_te_kwh IS 'Consumo Fora de Ponta TE em kWh';
COMMENT ON COLUMN public.invoices.consumo_p_te_kwh IS 'Consumo Ponta TE em kWh';
COMMENT ON COLUMN public.invoices.demanda_tusd_kw IS 'Demanda TUSD em kW';
COMMENT ON COLUMN public.invoices.demanda_te_kw IS 'Demanda TE em kW';
COMMENT ON COLUMN public.invoices.confidence_score IS 'Score de confiança da extração (0-1)';
COMMENT ON COLUMN public.invoices.extraction_method IS 'Método de extração utilizado';
COMMENT ON COLUMN public.invoices.requires_review IS 'Indica se a fatura requer revisão manual';
COMMENT ON COLUMN public.invoices.validation_errors IS 'Array de erros de validação encontrados';
