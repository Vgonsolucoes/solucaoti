// Script de teste para verificar RLS no navegador
// Execute no console do navegador (F12) quando estiver logado

async function testarRLS() {
  console.log('=== TESTE RLS NO NAVEGADOR ===');
  
  try {
    // Pegar cliente Supabase do window
    const supabase = window.supabase || (window as any).supabase;
    
    if (!supabase) {
      console.error('Supabase não encontrado no window');
      return;
    }
    
    // Testar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Não autenticado:', authError?.message);
      return;
    }
    
    console.log('✅ Autenticado:', user.email);
    
    // Testar SELECT
    console.log('\n--- Testando SELECT ---');
    const { data: selectData, error: selectError } = await supabase
      .from('assignments')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('❌ SELECT falhou:', selectError);
    } else {
      console.log('✅ SELECT OK, encontrado:', selectData?.length || 0);
    }
    
    // Testar INSERT com dados mínimos
    console.log('\n--- Testando INSERT ---');
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
      console.error('❌ INSERT falhou:', insertError);
      console.error('Código:', insertError.code);
      console.error('Mensagem:', insertError.message);
      
      if (insertError.code === '42501') {
        console.warn('🔒 RLS está bloqueando! Execute o script SQL fix_rls_comprehensive.sql');
        
        // Tentar RPC como fallback
        console.log('\n--- Tentando RPC fallback ---');
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('create_assignment', testData);
        
        if (rpcError) {
          console.error('❌ RPC também falhou:', rpcError);
        } else {
          console.log('✅ RPC funcionou!', rpcData);
          
          // Limpar teste
          if (rpcData?.id) {
            await supabase.from('assignments').delete().eq('id', rpcData.id);
            console.log('✅ Teste RPC limpo');
          }
        }
      }
    } else {
      console.log('✅ INSERT OK! ID:', insertData.id);
      
      // Limpar teste
      await supabase.from('assignments').delete().eq('id', insertData.id);
      console.log('✅ Teste limpo');
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
  
  console.log('\n=== FIM DO TESTE ===');
}

// Executar teste
testarRLS();