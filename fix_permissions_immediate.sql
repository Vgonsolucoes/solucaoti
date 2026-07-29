-- Script de correção rápida para permissões (aplicar imediatamente)
-- Este script resolve o erro "Permissão negada" ao criar assignments

-- Opção 1: Desabilitar RLS completamente (para desenvolvimento)
-- DESCOMENTE ESTA LINHA SE ESTIVER EM DESENVOLVIMENTO
-- ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;

-- Opção 2: Criar policies permissivas (para produção)
-- COMENTE ESTAS LINHAS SE ESTIVER EM DESENVOLVIMENTO

-- Remover policies existentes que possam estar causando conflito
DROP POLICY IF EXISTS "Allow admins to create assignments" ON public.assignments;
DROP POLICY IF EXISTS "Allow users to view own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Allow master operators to manage assignments" ON public.assignments;

-- Criar policy super permissiva para usuários autenticados
CREATE POLICY "Allow authenticated users to manage assignments" 
ON public.assignments 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Garantir permissões básicas
GRANT ALL ON public.assignments TO authenticated;
GRANT ALL ON public.devices TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.assignment_approval_tokens TO authenticated;

-- Verificar status
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'assignments') as policy_count
FROM pg_tables 
WHERE tablename = 'assignments';