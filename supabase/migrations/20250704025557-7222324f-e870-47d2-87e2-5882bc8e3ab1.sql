-- Atualizar uma planta existente para usar Sungrow (apenas para teste)
UPDATE plants SET 
  monitoring_system = 'sungrow',
  api_credentials = jsonb_build_object(
    'username', 'test@sungrow.com',
    'password', 'test123', 
    'appkey', 'test_app_key',
    'accessKey', 'test_access_key',
    'plantId', '123456',
    'baseUrl', 'https://gateway.isolarcloud.com.hk'
  ),
  api_site_id = '123456',
  sync_enabled = true
WHERE id = '82d35b16-350d-4723-ab6b-7b3efe36a6dc';