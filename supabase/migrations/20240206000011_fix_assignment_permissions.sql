-- Migration para corrigir RLS policies da tabela assignments
-- Isso resolve o erro de permissão negada ao criar vinculações

-- Desabilitar RLS temporariamente para permitir testes (OPÇÃO 1 - para desenvolvimento)
-- ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;

-- OU habilitar RLS com policies apropriadas (OPÇÃO 2 - para produção)

-- 1. Habilitar RLS se não estiver habilitado
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- 2. Remover policies existentes que possam estar causando conflito
DROP POLICY IF EXISTS "Allow admins to create assignments" ON public.assignments;
DROP POLICY IF EXISTS "Allow users to view own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Allow master operators to manage assignments" ON public.assignments;

-- 3. Criar policy para permitir admins e master operators criarem assignments
CREATE POLICY "Allow admins and master operators to create assignments" 
ON public.assignments 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.email = auth.email() 
    AND users.role IN ('admin', 'master_operator')
  )
);

-- 4. Criar policy para permitir visualização de assignments próprios
CREATE POLICY "Allow users to view own assignments" 
ON public.assignments 
FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.email = auth.email() 
    AND users.role IN ('admin', 'master_operator')
  )
);

-- 5. Criar policy para permitir admins gerenciarem todos os assignments
CREATE POLICY "Allow admins to manage all assignments" 
ON public.assignments 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.email = auth.email() 
    AND users.role = 'admin'
  )
);