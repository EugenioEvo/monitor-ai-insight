
-- Conceder super admin ao usuário eugenio@grupoevolight.com.br
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'eugenio@grupoevolight.com.br';

-- Verificar se a alteração foi aplicada
SELECT id, email, full_name, role 
FROM public.profiles 
WHERE email = 'eugenio@grupoevolight.com.br';
