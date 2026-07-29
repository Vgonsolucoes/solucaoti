-- Forçar atualização do schema cache do Supabase
-- Isso resolve problemas de "Could not find the column in schema cache"

-- 1. Limpar cache de schema
NOTIFY pgrst, 'reload schema';

-- 2. Verificar se a coluna status existe na tabela assignments
DO $$
DECLARE
    column_exists boolean;
BEGIN
    -- Verificar existência da coluna
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'assignments' 
        AND column_name = 'status'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE '✓ Coluna status existe na tabela assignments';
    ELSE
        RAISE WARNING '✗ Coluna status NÃO existe na tabela assignments';
        
        -- Adicionar a coluna se não existir
        ALTER TABLE public.assignments 
        ADD COLUMN status VARCHAR(50) DEFAULT 'pending_approval';
        
        RAISE NOTICE '✓ Coluna status adicionada com sucesso';
    END IF;
    
    -- Verificar estrutura completa
    RAISE NOTICE 'Estrutura da tabela assignments:';
    FOR col IN SELECT column_name, data_type, is_nullable, column_default 
               FROM information_schema.columns 
               WHERE table_name = 'assignments' 
               ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - %: % (%, default: %)', 
            col.column_name, col.data_type, col.is_nullable, col.column_default;
    END LOOP;
END $$;

-- 3. Recarregar configurações do PostgREST
SELECT pg_notify('pgrst', 'reload config');

-- 4. Verificar se há policies que possam estar bloqueando
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'assignments';