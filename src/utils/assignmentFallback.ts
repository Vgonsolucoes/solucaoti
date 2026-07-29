import { supabase } from '../lib/supabase';

// Função auxiliar para criar assignment com tratamento de erro
export const createAssignmentWithFallback = async (assignmentData: any) => {
  try {
    // Tentativa 1: Inserir com o campo status
    const { data, error } = await supabase
      .from('assignments')
      .insert([assignmentData])
      .select()
      .single();
    
    if (!error) {
      return { data, error: null };
    }
    
    // Se o erro for relacionado à coluna status, tentar sem o campo
    if (error.message?.includes('status') || error.message?.includes('Could not find')) {
      console.warn('Coluna status não encontrada, criando assignment sem status...');
      
      // Remover status do objeto
      const { status, ...dataWithoutStatus } = assignmentData;
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('assignments')
        .insert([dataWithoutStatus])
        .select()
        .single();
      
      return { data: fallbackData, error: fallbackError };
    }
    
    return { data: null, error };
    
  } catch (error) {
    console.error('Erro ao criar assignment:', error);
    return { data: null, error };
  }
};

// Função para verificar se a coluna status existe
export const checkStatusColumnExists = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select('status')
      .limit(1);
    
    return !error;
  } catch (error) {
    console.error('Erro ao verificar coluna status:', error);
    return false;
  }
};