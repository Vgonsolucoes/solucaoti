-- Migration alternativa: Desabilitar RLS para desenvolvimento
-- Isso resolve imediatamente o problema de permissão
-- Use apenas em desenvolvimento! Para produção, use policies apropriadas

-- Desabilitar RLS na tabela assignments
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS em outras tabelas relacionadas que podem estar causando problemas
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_approval_tokens DISABLE ROW LEVEL SECURITY;

-- Garantir que os usuários tenham permissões básicas
GRANT ALL ON public.assignments TO anon;
GRANT ALL ON public.assignments TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.devices TO anon;
GRANT ALL ON public.devices TO authenticated;
GRANT ALL ON public.assignment_approval_tokens TO anon;
GRANT ALL ON public.assignment_approval_tokens TO authenticated;