
-- Adicionar customer_id à tabela plants
ALTER TABLE public.plants ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX idx_plants_customer_id ON public.plants(customer_id);

-- Criar tabela para unidades consumidoras dos clientes
CREATE TABLE public.customer_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  uc_code TEXT NOT NULL,
  unit_name TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices
CREATE INDEX idx_customer_units_customer_id ON public.customer_units(customer_id);
CREATE INDEX idx_customer_units_uc_code ON public.customer_units(uc_code);
CREATE UNIQUE INDEX idx_customer_units_unique ON public.customer_units(customer_id, uc_code);

-- Adicionar customer_id à tabela invoices (via UC)
ALTER TABLE public.invoices ADD COLUMN customer_unit_id UUID REFERENCES public.customer_units(id) ON DELETE SET NULL;
CREATE INDEX idx_invoices_customer_unit_id ON public.invoices(customer_unit_id);

-- Habilitar RLS na nova tabela
ALTER TABLE public.customer_units ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para customer_units
CREATE POLICY "Allow all operations for authenticated users" 
  ON public.customer_units 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_customer_units_updated_at 
  BEFORE UPDATE ON public.customer_units 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Criar tabela para métricas consolidadas dos clientes (cache de performance)
CREATE TABLE public.customer_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL, -- formato YYYY-MM
  total_generation_kwh NUMERIC DEFAULT 0,
  total_consumption_kwh NUMERIC DEFAULT 0,
  total_savings_r$ NUMERIC DEFAULT 0,
  energy_balance_kwh NUMERIC DEFAULT 0, -- geração - consumo
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para customer_metrics
CREATE INDEX idx_customer_metrics_customer_id ON public.customer_metrics(customer_id);
CREATE INDEX idx_customer_metrics_month ON public.customer_metrics(month);
CREATE UNIQUE INDEX idx_customer_metrics_unique ON public.customer_metrics(customer_id, month);

-- RLS para customer_metrics
ALTER TABLE public.customer_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" 
  ON public.customer_metrics 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Trigger para customer_metrics
CREATE TRIGGER update_customer_metrics_updated_at 
  BEFORE UPDATE ON public.customer_metrics 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
