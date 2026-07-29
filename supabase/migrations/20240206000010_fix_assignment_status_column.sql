-- Migration alternativa para garantir que a coluna status exista
-- Esta migration usa um approach mais seguro para adicionar a coluna

DO $$
BEGIN
    -- Verificar se a coluna status existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assignments' AND column_name = 'status'
    ) THEN
        -- Adicionar a coluna status
        ALTER TABLE public.assignments 
        ADD COLUMN status VARCHAR(50) DEFAULT 'pending_approval';
        
        -- Atualizar registros existentes
        UPDATE public.assignments 
        SET status = CASE 
            WHEN term_accepted = true THEN 'approved'
            ELSE 'pending_approval'
        END
        WHERE status IS NULL;
        
        -- Criar índice para performance
        CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.assignments(status);
        
        -- Adicionar constraint de check se ainda não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.check_constraints 
            WHERE constraint_name = 'assignments_status_check'
        ) THEN
            ALTER TABLE public.assignments 
            ADD CONSTRAINT assignments_status_check 
            CHECK (status IN ('pending_approval', 'approved', 'rejected', 'pending'));
        END IF;
        
        RAISE NOTICE 'Coluna status adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna status já existe';
    END IF;
END $$;