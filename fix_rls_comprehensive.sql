-- Script SQL para verificar e corrigir RLS no Supabase
-- Execute este script diretamente no Supabase SQL Editor

-- 1. Verificar status atual do RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN 'RLS ATIVADO'
        ELSE 'RLS DESABILITADO'
    END as status_rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('assignments', 'users', 'devices', 'assignment_approval_tokens')
ORDER BY tablename;

-- 2. Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('assignments', 'users', 'devices', 'assignment_approval_tokens')
ORDER BY tablename, policyname;

-- 3. DESABILITAR RLS COMPLETAMENTE (execute se quiser desabilitar)
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_approval_tokens DISABLE ROW LEVEL SECURITY;

-- 4. Garantir permissões totais
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 5. Verificar se a função RPC existe
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'create_assignment';

-- 6. Recriar a função RPC se necessário
CREATE OR REPLACE FUNCTION public.create_assignment(
  p_user_id UUID,
  p_device_ids UUID[],
  p_assignment_date DATE,
  p_term_accepted BOOLEAN DEFAULT false,
  p_accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  device_ids UUID[],
  assignment_date DATE,
  term_accepted BOOLEAN,
  accepted_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.assignments (
    user_id,
    device_ids,
    assignment_date,
    term_accepted,
    accepted_at,
    ip_address
  )
  VALUES (
    p_user_id,
    p_device_ids,
    p_assignment_date,
    p_term_accepted,
    p_accepted_at,
    p_ip_address
  )
  RETURNING 
    assignments.id,
    assignments.user_id,
    assignments.device_ids,
    assignments.assignment_date,
    assignments.term_accepted,
    assignments.accepted_at,
    assignments.ip_address,
    assignments.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Garantir permissões na função
GRANT EXECUTE ON FUNCTION public.create_assignment TO anon;
GRANT EXECUTE ON FUNCTION public.create_assignment TO authenticated;

-- 8. Limpar cache do Supabase (forçar atualização)
NOTIFY pgrst, 'reload schema';

-- 9. Verificar resultado final
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN 'RLS ATIVADO'
        ELSE 'RLS DESABILITADO'
    END as status_rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('assignments', 'users', 'devices', 'assignment_approval_tokens')
ORDER BY tablename;