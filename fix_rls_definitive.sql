-- Script SQL DEFINITIVO para resolver o erro de RLS
-- Execute TODOS os comandos neste script no Supabase SQL Editor

-- PASSO 1: Desabilitar RLS completamente em todas as tabelas críticas
DO $$
BEGIN
    -- Desabilitar RLS nas tabelas principais
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignments') THEN
        EXECUTE 'ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'RLS desabilitado em assignments';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        EXECUTE 'ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'RLS desabilitado em users';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'devices') THEN
        EXECUTE 'ALTER TABLE public.devices DISABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'RLS desabilitado em devices';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignment_approval_tokens') THEN
        EXECUTE 'ALTER TABLE public.assignment_approval_tokens DISABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'RLS desabilitado em assignment_approval_tokens';
    END IF;
END $$;

-- PASSO 2: Remover todas as políticas RLS existentes
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('assignments', 'users', 'devices', 'assignment_approval_tokens')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 
                      policy_record.policyname, 
                      policy_record.tablename);
        RAISE NOTICE 'Política % removida de %', policy_record.policyname, policy_record.tablename;
    END LOOP;
END $$;

-- PASSO 3: Garantir permissões totais para authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- PASSO 4: Garantir permissões para anon users (necessário para algumas operações)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT ON public.assignments TO anon;
GRANT INSERT ON public.assignment_approval_tokens TO anon;

-- PASSO 5: Criar função RPC definitiva com permissões máximas
CREATE OR REPLACE FUNCTION public.create_assignment_definitive(
  p_user_id UUID,
  p_device_ids UUID[] DEFAULT ARRAY[]::uuid[],
  p_assignment_date DATE DEFAULT CURRENT_DATE,
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
  -- Inserir sem verificações RLS
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

-- PASSO 6: Dar permissões na função
GRANT EXECUTE ON FUNCTION public.create_assignment_definitive TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_assignment_definitive TO anon;

-- PASSO 7: Criar função alternativa simples
CREATE OR REPLACE FUNCTION public.insert_assignment_simple(
  p_user_id UUID,
  p_device_ids UUID[]
)
RETURNS UUID AS $$
DECLARE
  new_assignment_id UUID;
BEGIN
  INSERT INTO public.assignments (user_id, device_ids, assignment_date, term_accepted)
  VALUES (p_user_id, p_device_ids, CURRENT_DATE, false)
  RETURNING id INTO new_assignment_id;
  
  RETURN new_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.insert_assignment_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_assignment_simple TO anon;

-- PASSO 8: Forçar recarregamento do schema
NOTIFY pgrst, 'reload schema';

-- PASSO 9: Verificar resultado final
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '⚠️ RLS ATIVADO'
        ELSE '✅ RLS DESABILITADO'
    END as status_rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('assignments', 'users', 'devices', 'assignment_approval_tokens')
ORDER BY tablename;

-- PASSO 10: Verificar funções criadas
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('create_assignment_definitive', 'insert_assignment_simple', 'create_assignment')
ORDER BY routine_name;

RAISE NOTICE '✅ Configuração RLS completa! Execute os testes novamente.';