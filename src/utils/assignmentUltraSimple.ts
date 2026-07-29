import { supabase } from '../lib/supabase';

// Função para criar assignment sem depender de RPC ou RLS
// Versão ultra-simples para desenvolvimento
export const createAssignmentUltraSimple = async (assignmentData: any) => {
  try {
    console.log('=== Criando assignment (modo ultra-simples) ===');
    console.log('Dados recebidos:', assignmentData);
    
    // Remover campos que podem causar problemas
    const cleanData = {
      user_id: assignmentData.user_id,
      device_ids: assignmentData.device_ids,
      assignment_date: assignmentData.assignment_date,
      term_accepted: false,
      accepted_at: null,
    };
    
    console.log('Dados limpos:', cleanData);
    
    // Tentar inserção direta sem select
    const { data, error } = await supabase
      .from('assignments')
      .insert([cleanData]) as any; // Forçar tipo any para evitar problemas de tipagem
    
    if (error) {
      console.error('Erro na inserção:', error);
      console.error('Código:', error.code);
      console.error('Mensagem:', error.message);
      console.error('Detalhes:', error.details);
      return { data: null, error };
    }
    
    console.log('Inserção bem-sucedida:', data);
    
    // Buscar o registro recém-criado
    if (data && Array.isArray(data) && data.length > 0) {
      return { data: data[0], error: null };
    }
    
    // Se não retornou dados, buscar o último assignment criado para este usuário
    const { data: lastAssignment, error: lastError } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', cleanData.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (lastError) {
      console.error('Erro ao buscar último assignment:', lastError);
      return { data: null, error: lastError };
    }
    
    console.log('Assignment encontrado:', lastAssignment);
    return { data: lastAssignment, error: null };
    
  } catch (error) {
    console.error('Erro catastrófico:', error);
    return { 
      data: null, 
      error: { 
        message: 'Erro inesperado ao criar assignment',
        details: error 
      } 
    };
  }
};

// Função para testar se o RLS está desabilitado
export const testRLSStatus = async () => {
  try {
    console.log('=== Testando status do RLS ===');
    
    // Tentar uma query simples
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Erro ao testar RLS:', error);
      return false;
    }
    
    console.log('RLS testado com sucesso, dados:', data);
    return true;
    
  } catch (error) {
    console.error('Erro ao testar RLS:', error);
    return false;
  }
};