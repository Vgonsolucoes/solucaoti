import { supabase } from '../lib/supabase';

// Função para criar assignment sem depender da coluna status
// Usa apenas o campo term_accepted que já existe na tabela
export const createAssignmentSimple = async (assignmentData: any) => {
  try {
    // Preparar dados apenas com campos que existem com certeza
    const simpleAssignmentData = {
      user_id: assignmentData.user_id,
      device_ids: assignmentData.device_ids,
      assignment_date: assignmentData.assignment_date,
      term_accepted: false, // Sempre false para novas vinculações
      accepted_at: null,
      ip_address: assignmentData.ip_address || null,
    };

    console.log('Criando assignment com dados:', simpleAssignmentData);

    const { data, error } = await supabase
      .from('assignments')
      .insert([simpleAssignmentData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar assignment:', error);
      console.error('Detalhes do erro:', error.message);
      console.error('Dados enviados:', simpleAssignmentData);
      return { data: null, error };
    }

    console.log('Assignment criado com sucesso:', data);
    return { data, error: null };
    
  } catch (error) {
    console.error('Erro inesperado ao criar assignment:', error);
    return { data: null, error };
  }
};

// Função para atualizar o status usando term_accepted como referência
export const updateAssignmentStatus = async (assignmentId: string, accepted: boolean) => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .update({
        term_accepted: accepted,
        accepted_at: accepted ? new Date().toISOString() : null,
      })
      .eq('id', assignmentId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Erro ao atualizar status do assignment:', error);
    return { data: null, error };
  }
};

// Função para buscar assignments com base em term_accepted
export const getAssignmentsByStatus = async (status: 'pending' | 'approved' | 'rejected') => {
  try {
    let termAcceptedValue;
    switch (status) {
      case 'pending':
        termAcceptedValue = false;
        break;
      case 'approved':
        termAcceptedValue = true;
        break;
      default:
        termAcceptedValue = false;
    }

    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('term_accepted', termAcceptedValue)
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (error) {
    console.error('Erro ao buscar assignments por status:', error);
    return { data: null, error };
  }
};