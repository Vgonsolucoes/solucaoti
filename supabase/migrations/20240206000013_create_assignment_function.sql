-- Criar função RPC para criar assignments com permissões elevadas
-- Isso resolve problemas de RLS para usuários autenticados

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
  -- Inserir o assignment
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

-- Dar permissão para usuários autenticados executarem a função
GRANT EXECUTE ON FUNCTION public.create_assignment TO anon;
GRANT EXECUTE ON FUNCTION public.create_assignment TO authenticated;