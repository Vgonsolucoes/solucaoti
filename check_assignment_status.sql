-- Verificar estrutura da tabela assignments
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM 
    information_schema.columns
WHERE 
    table_name = 'assignments'
ORDER BY 
    ordinal_position;

-- Verificar se a coluna status existe especificamente
SELECT 
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'assignments' 
        AND column_name = 'status'
    ) as status_column_exists;

-- Verificar constraints da tabela
SELECT 
    constraint_name,
    constraint_type
FROM 
    information_schema.table_constraints
WHERE 
    table_name = 'assignments';

-- Verificar valores únicos na coluna status (se existir)
SELECT status, COUNT(*) as count
FROM assignments
GROUP BY status
ORDER BY count DESC;