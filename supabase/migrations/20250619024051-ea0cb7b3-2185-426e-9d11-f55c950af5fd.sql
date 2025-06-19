
-- Create a table for application configuration
CREATE TABLE public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default OCR engine configuration
INSERT INTO public.app_config (key, value) VALUES ('ocr_engine', 'openai');

-- Add trigger to update the updated_at timestamp
CREATE TRIGGER update_app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow reading configuration (public read access)
CREATE POLICY "Allow public read access to app config"
  ON public.app_config
  FOR SELECT
  TO public
  USING (true);

-- Create policy to allow admin users to update configuration
-- Note: This assumes you have a user roles system in place
CREATE POLICY "Allow authenticated users to update app config"
  ON public.app_config
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
