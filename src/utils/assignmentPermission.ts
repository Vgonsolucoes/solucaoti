import { supabase } from '../lib/supabase';
import { createAssignmentSimple } from './assignmentSimple';

// Função auxiliar para criar assignment com tratamento de permissão
export const createAssignmentWithPermissionFix = async (assignmentData: any) => {
  try {
    console.log('Tentando criar assignment com dados:', assignmentData);
    
    // Tentativa 1: Usar a função simples normal
    const result = await createAssignmentSimple(assignmentData);
    
    if (result.error) {
      console.error('Erro na criação:', result.error);
      
      // Se for erro de permissão, tentar abordagem alternativa
      if (result.error.code === '42501' || result.error.message?.includes('permission')) {
        console.log('Erro de permissão detectado, tentando alternativa...');
        
        // Tentativa 2: Criar via RPC ou função do Supabase
        const { data, error } = await supabase
          .rpc('create_assignment', {
            p_user_id: assignmentData.user_id,
            p_device_ids: assignmentData.device_ids,
            p_assignment_date: assignmentData.assignment_date,
            p_term_accepted: assignmentData.term_accepted,
            p_accepted_at: assignmentData.accepted_at,
            p_ip_address: assignmentData.ip_address,
          });
        
        if (error) {
          console.error('Erro no RPC:', error);
          return { data: null, error };
        }
        
        return { data, error: null };
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Erro inesperado:', error);
    return { 
      data: null, 
      error: { 
        message: 'Erro inesperado ao criar assignment',
        details: error 
      } 
    };
  }
};

// Função para verificar e garantir permissões
export const ensurePermissions = async () => {
  try {
    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { 
        success: false, 
        error: 'Usuário não autenticado' 
      };
    }
    
    // Verificar se é admin ou master_operator
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single();
    
    if (profileError || !userProfile) {
      return { 
        success: false, 
        error: 'Perfil não encontrado' 
      };
    }
    
    const hasPermission = ['admin', 'master_operator'].includes(userProfile.role);
    
    return { 
      success: hasPermission, 
      role: userProfile.role,
      error: hasPermission ? null : 'Permissão insuficiente' 
    };
    
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    return { 
      success: false, 
      error: 'Erro ao verificar permissões' 
    };
  }
};