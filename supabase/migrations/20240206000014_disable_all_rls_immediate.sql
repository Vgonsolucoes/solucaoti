-- Solução imediata: Desabilitar RLS completamente para desenvolvimento
-- ESTE SCRIPT DEVE SER EXECUTADO IMEDIATAMENTE NO SUPABASE

-- Desabilitar RLS em todas as tabelas principais
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_approval_tokens DISABLE ROW LEVEL SECURITY;

-- Garantir permissões totais para usuários autenticados
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Garantir permissões para anon também (para testes)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Verificar status final
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = pt.tablename) as policy_count
FROM pg_tables pt
WHERE tablename IN ('assignments', 'users', 'devices', 'assignment_approval_tokens')
ORDER BY tablename;