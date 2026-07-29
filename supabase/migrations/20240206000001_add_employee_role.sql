-- Atualizar a constraint de role na tabela users para incluir 'employee'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'operator', 'master_operator', 'employee'));

-- Atualizar o valor default para 'employee' se desejar, ou manter 'operator'
-- ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'employee';
