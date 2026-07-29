-- Políticas RLS para importação de dispositivos (apenas administradores)

-- Remover políticas existentes que permitem qualquer usuário autenticado gerenciar dispositivos
DROP POLICY IF EXISTS "Authenticated users can manage devices" ON public.devices;
DROP POLICY IF EXISTS "Authenticated users can update device status" ON public.devices;

-- Criar política para visualização (todos podem ver)
CREATE POLICY "Anyone can view devices" ON public.devices FOR SELECT USING (true);

-- Criar política para inserção (apenas administradores)
CREATE POLICY "Only admins can insert devices" ON public.devices FOR INSERT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'master_operator')
  )
);

-- Criar política para atualização (apenas administradores)
CREATE POLICY "Only admins can update devices" ON public.devices FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'master_operator')
  )
);

-- Criar política para exclusão (apenas administradores)
CREATE POLICY "Only admins can delete devices" ON public.devices FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'master_operator')
  )
);

-- Criar tabela de logs de importação
CREATE TABLE IF NOT EXISTS public.import_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  import_type VARCHAR(50) NOT NULL DEFAULT 'devices_csv',
  imported_count INTEGER NOT NULL DEFAULT 0,
  total_rows INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar políticas RLS para a tabela de logs
CREATE POLICY "Anyone can view import logs" ON public.import_logs FOR SELECT USING (true);

CREATE POLICY "Only admins can insert import logs" ON public.import_logs FOR INSERT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'master_operator')
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_import_logs_user_id ON public.import_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON public.import_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_logs_type ON public.import_logs(import_type);

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas RLS para importação de dispositivos configuradas com sucesso!';
    RAISE NOTICE '✅ Tabela de logs de importação criada com índices de performance!';
END $$;