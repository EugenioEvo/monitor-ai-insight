
-- Criar tabelas principais do sistema
CREATE TABLE public.plants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  capacity_kWp DECIMAL(10,2) NOT NULL,
  concessionaria TEXT NOT NULL,
  start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_fix', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.beneficiaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE NOT NULL,
  uc_code TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  name TEXT NOT NULL,
  allocation_percent DECIMAL(5,2) NOT NULL CHECK (allocation_percent > 0 AND allocation_percent <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_url TEXT NOT NULL,
  uc_code TEXT NOT NULL,
  reference_month TEXT NOT NULL,
  energy_kWh DECIMAL(10,2) NOT NULL DEFAULT 0,
  demand_kW DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_R$ DECIMAL(12,2) NOT NULL DEFAULT 0,
  taxes_R$ DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'error')),
  extracted_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  power_W INTEGER NOT NULL DEFAULT 0,
  energy_kWh DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('P1', 'P2', 'P3')),
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  assigned_to TEXT,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('maintenance', 'performance', 'compliance')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.savings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  credits_kWh DECIMAL(10,2) NOT NULL DEFAULT 0,
  savings_R$ DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE NOT NULL,
  acknowledged_by TEXT,
  type TEXT NOT NULL CHECK (type IN ('performance', 'compliance', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'plant_admin', 'analyst', 'technician', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar bucket para armazenar faturas
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoices', 'invoices', false);

-- Políticas de RLS para as tabelas
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (permissivas para desenvolvimento)
CREATE POLICY "Enable read access for all users" ON public.plants FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.plants FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.plants FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.beneficiaries FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.beneficiaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.beneficiaries FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.invoices FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.readings FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.readings FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.tickets FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.savings FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.savings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.savings FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.alerts FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.users FOR UPDATE USING (true);

-- Política para o bucket de invoices
CREATE POLICY "Enable upload for all users" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invoices');
CREATE POLICY "Enable read access for all users" ON storage.objects FOR SELECT USING (bucket_id = 'invoices');

-- Inserir dados de exemplo
INSERT INTO public.plants (name, lat, lng, capacity_kWp, concessionaria, start_date, status) VALUES
('Usina Solar Nordeste', -8.047, -34.877, 150.5, 'Neoenergia Pernambuco', '2023-06-15', 'active'),
('Planta Solar Sul', -25.428, -49.273, 89.2, 'Copel', '2023-08-20', 'active');

INSERT INTO public.beneficiaries (plant_id, uc_code, cnpj, name, allocation_percent) VALUES
((SELECT id FROM public.plants WHERE name = 'Usina Solar Nordeste'), '1234567890', '12.345.678/0001-90', 'Empresa ABC Ltda', 60),
((SELECT id FROM public.plants WHERE name = 'Usina Solar Nordeste'), '0987654321', '98.765.432/0001-10', 'Indústria XYZ S.A.', 40);

INSERT INTO public.invoices (file_url, uc_code, reference_month, energy_kWh, demand_kW, total_R$, taxes_R$, status) VALUES
('/invoices/fatura_202412.pdf', '1234567890', '2024-12', 1250.5, 25.8, 890.45, 178.09, 'processed');

INSERT INTO public.alerts (severity, message, plant_id, type) VALUES
('medium', 'Performance 18% abaixo da meta - Usina Solar Nordeste', (SELECT id FROM public.plants WHERE name = 'Usina Solar Nordeste'), 'performance');
