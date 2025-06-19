
-- Atualizar o papel de um usuário para super_admin
-- Substitua 'usuario@email.com' pelo email do usuário que você quer tornar super admin
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'usuario@email.com';

-- Ou se você souber o ID do usuário, pode usar:
-- UPDATE public.profiles 
-- SET role = 'super_admin' 
-- WHERE id = 'uuid-do-usuario';

-- Para verificar se a alteração foi aplicada:
SELECT id, email, full_name, role 
FROM public.profiles 
WHERE role = 'super_admin';
