// Script para debugar o erro de RLS em assignments
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (ajuste com suas credenciais)
const supabaseUrl = 'https://sua-url.supabase.co';
const supabaseKey = 'sua-chave-anon';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRLS() {
  console.log('=== DEBUG RLS PARA ASSIGNMENTS ===\n');
  
  try {
    // 1. Verificar se usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Usuário não autenticado:', authError?.message);
      return;
    }
    
    console.log('✅ Usuário autenticado:', user.email);
    
    // 2. Verificar permissões do usuário
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single();
    
    if (profileError) {
      console.log('❌ Erro ao buscar perfil:', profileError.message);
    } else {
      console.log('✅ Perfil encontrado, role:', userProfile.role);
    }
    
    // 3. Testar SELECT na tabela assignments
    console.log('\n--- Testando SELECT em assignments ---');
    const { data: assignments, error: selectError } = await supabase
      .from('assignments')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.log('❌ SELECT falhou:', selectError.message);
      console.log('Código:', selectError.code);
      console.log('Detalhes:', selectError.details);
    } else {
      console.log('✅ SELECT funcionou, encontrado:', assignments?.length || 0, 'registros');
    }
    
    // 4. Testar INSERT com dados mínimos
    console.log('\n--- Testando INSERT em assignments ---');
    const testData = {
      user_id: user.id,
      device_ids: [],
      assignment_date: new Date().toISOString().split('T')[0],
      term_accepted: false,
      accepted_at: null
    };
    
    console.log('Dados de teste:', testData);
    
    const { data: insertData, error: insertError } = await supabase
      .from('assignments')
      .insert([testData])
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ INSERT falhou:', insertError.message);
      console.log('Código:', insertError.code);
      console.log('Detalhes:', insertError.details);
      
      if (insertError.code === '42501') {
        console.log('\n🔍 RLS está bloqueando o INSERT!');
        console.log('Solução: Execute o script fix_permissions_immediate.sql no Supabase');
      }
    } else {
      console.log('✅ INSERT funcionou! ID:', insertData.id);
      
      // Limpar teste
      await supabase.from('assignments').delete().eq('id', insertData.id);
      console.log('✅ Teste limpo');
    }
    
    // 5. Verificar políticas RLS
    console.log('\n--- Verificando políticas RLS ---');
    
    // Query para verificar se RLS está habilitado
    const rlsCheckQuery = `
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'assignments';
    `;
    
    console.log('Para verificar RLS manualmente, execute no Supabase:');
    console.log(rlsCheckQuery);
    
    console.log('\n=== FIM DO DEBUG ===');
    
  } catch (error) {
    console.error('Erro inesperado:', error);
  }
}

// Executar debug
debugRLS();