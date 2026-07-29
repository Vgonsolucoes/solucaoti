-- Verificar se RLS está habilitado na tabela assignments
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'assignments';

-- Verificar estrutura da tabela assignments
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'assignments'
ORDER BY ordinal_position;