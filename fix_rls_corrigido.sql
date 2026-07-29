-- SCRIPT CORRIGIDO - Resolve erro de tabela inexistente
-- Primeiro verifica quais tabelas existem e cria apenas as necessárias

-- Verificar e criar tabela de aprovação se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                  WHERE table_schema = 'public' 
                  AND table_name = 'assignment_approval_tokens') THEN
        
        CREATE TABLE public.assignment_approval_tokens (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
            token VARCHAR(255) UNIQUE NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            used_at TIMESTAMP WITH TIME ZONE
        );
        
        RAISE NOTICE '✅ Tabela assignment_approval_tokens criada';
    ELSE
        RAISE NOTICE '✅ Tabela assignment_approval_tokens já existe';
    END IF;
END $$;

-- Verificar e criar tabela de devices se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                  WHERE table_schema = 'public' 
                  AND table_name = 'devices') THEN
        
        CREATE TABLE public.devices (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            model VARCHAR(255),
            serial_number VARCHAR(255) UNIQUE,
            status VARCHAR(50) DEFAULT 'available',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '✅ Tabela devices criada';
    ELSE
        RAISE NOTICE '✅ Tabela devices já existe';
    END IF;
END $$;

-- Verificar e criar tabela de users se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                  WHERE table_schema = 'public' 
                  AND table_name = 'users') THEN
        
        CREATE TABLE public.users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'employee',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '✅ Tabela users criada';
    ELSE
        RAISE NOTICE '✅ Tabela users já existe';
    END IF;
END $$;

-- Verificar e criar tabela de assignments se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                  WHERE table_schema = 'public' 
                  AND table_name = 'assignments') THEN
        
        CREATE TABLE public.assignments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            device_ids UUID[],
            assignment_date DATE DEFAULT CURRENT_DATE,
            term_accepted BOOLEAN DEFAULT false,
            accepted_at TIMESTAMP WITH TIME ZONE,
            ip_address INET,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '✅ Tabela assignments criada';
    ELSE
        RAISE NOTICE '✅ Tabela assignments já existe';
    END IF;
END $$;

-- AGORA SIM: Desabilitar RLS em todas as tabelas
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_approval_tokens DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes
DO $$
DECLARE
    policy RECORD;
BEGIN
    FOR policy IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', policy.policyname, policy.schemaname, policy.tablename);
    END LOOP;
END $$;

-- Criar função definitiva que ignora RLS
CREATE OR REPLACE FUNCTION public.insert_assignment_no_rls(
  p_user_id UUID,
  p_device_ids UUID[] DEFAULT ARRAY[]::uuid[]
)
RETURNS UUID AS $$
DECLARE
  new_assignment_id UUID;
BEGIN
  INSERT INTO public.assignments (user_id, device_ids, assignment_date, term_accepted, accepted_at, ip_address)
  VALUES (p_user_id, p_device_ids, CURRENT_DATE, false, NULL, NULL)
  RETURNING id INTO new_assignment_id;
  RETURN new_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissões completas
GRANT ALL ON public.assignments TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.devices TO authenticated;
GRANT ALL ON public.assignment_approval_tokens TO authenticated;

GRANT EXECUTE ON FUNCTION public.insert_assignment_no_rls(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_assignment_no_rls(UUID, UUID[]) TO anon;

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '🎉 RLS DESABILITADO COMPLETAMENTE! Teste agora no sistema.';
END $$;