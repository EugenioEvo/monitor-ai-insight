-- Performance indexes for reports and monitoring
CREATE INDEX IF NOT EXISTS idx_readings_plant_timestamp ON public.readings (plant_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_plant_timestamp ON public.alerts (plant_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_tickets_plant_opened_at ON public.tickets (plant_id, opened_at);
CREATE INDEX IF NOT EXISTS idx_tickets_plant_status ON public.tickets (plant_id, status);
CREATE INDEX IF NOT EXISTS idx_automated_reports_plant_type_generated ON public.automated_reports (plant_id, report_type, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_automated_reports_generated_at ON public.automated_reports (generated_at);
CREATE INDEX IF NOT EXISTS idx_plants_status ON public.plants (status);
