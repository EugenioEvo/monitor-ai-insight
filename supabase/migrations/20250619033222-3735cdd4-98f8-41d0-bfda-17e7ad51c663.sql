
-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app_config table if it doesn't exist (for settings)
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- RLS Policies for app_config (admin only)
CREATE POLICY "Only admins can manage app config" ON public.app_config
  FOR ALL USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Replace permissive policies with user-based policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.customers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.plants;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.plants;
DROP POLICY IF EXISTS "Enable update for all users" ON public.plants;

-- New secure policies for customers
CREATE POLICY "Authenticated users can view customers" ON public.customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage customers" ON public.customers
  FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- New secure policies for plants
CREATE POLICY "Authenticated users can view plants" ON public.plants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage plants" ON public.plants
  FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Admins can update plants" ON public.plants
  FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Secure policies for invoices
DROP POLICY IF EXISTS "Enable read access for all users" ON public.invoices;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.invoices;
DROP POLICY IF EXISTS "Enable update for all users" ON public.invoices;

CREATE POLICY "Authenticated users can view invoices" ON public.invoices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage invoices" ON public.invoices
  FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Secure remaining tables
DROP POLICY IF EXISTS "Enable read access for all users" ON public.beneficiaries;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.beneficiaries;
DROP POLICY IF EXISTS "Enable update for all users" ON public.beneficiaries;

CREATE POLICY "Authenticated users can view beneficiaries" ON public.beneficiaries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage beneficiaries" ON public.beneficiaries
  FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Apply same pattern to other tables
DROP POLICY IF EXISTS "Enable read access for all users" ON public.readings;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.readings;

CREATE POLICY "Authenticated users can view readings" ON public.readings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert readings" ON public.readings
  FOR INSERT TO authenticated WITH CHECK (true);

-- Tickets, savings, alerts - similar pattern
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tickets;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.tickets;
DROP POLICY IF EXISTS "Enable update for all users" ON public.tickets;

CREATE POLICY "Authenticated users can view tickets" ON public.tickets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage tickets" ON public.tickets
  FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "Enable read access for all users" ON public.savings;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.savings;
DROP POLICY IF EXISTS "Enable update for all users" ON public.savings;

CREATE POLICY "Authenticated users can view savings" ON public.savings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can manage savings" ON public.savings
  FOR ALL TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON public.alerts;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.alerts;
DROP POLICY IF EXISTS "Enable update for all users" ON public.alerts;

CREATE POLICY "Authenticated users can view alerts" ON public.alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can manage alerts" ON public.alerts
  FOR ALL TO authenticated WITH CHECK (true);
