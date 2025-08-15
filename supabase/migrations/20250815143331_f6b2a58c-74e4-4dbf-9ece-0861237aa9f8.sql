-- Limpar todas as credenciais salvas da Sungrow para forçar uso de credenciais frescas
DELETE FROM plant_credentials WHERE provider = 'sungrow';