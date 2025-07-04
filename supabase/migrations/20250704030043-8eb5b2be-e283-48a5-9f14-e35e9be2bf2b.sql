-- Reverter a planta de volta para SolarEdge
UPDATE plants SET 
  monitoring_system = 'solaredge',
  api_credentials = jsonb_build_object(
    'apiKey', '7B5Y58NKOTZTU7TKB3VSKRQGUYWYHRZV',
    'password', 'Wegen*12345',
    'siteId', '',
    'username', 'eugenio@grupoevolight.com.br'
  ),
  api_site_id = '4325192',
  sync_enabled = true
WHERE id = '82d35b16-350d-4723-ab6b-7b3efe36a6dc';