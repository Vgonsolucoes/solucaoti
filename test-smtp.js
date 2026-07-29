const { testSMTPConnection } = require('./dist/assets/emailService-DnWhAMrZ.js');

async function testarEmail() {
  console.log('🧪 Testando conexão SMTP...');
  const resultado = await testSMTPConnection();
  console.log('✅ Resultado do teste:', resultado);
  process.exit(0);
}

testarEmail();