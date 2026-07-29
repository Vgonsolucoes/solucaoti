import nodemailer from 'nodemailer';

const to = process.argv[2] || 'stivinicius@msn.com';

// Prefer environment variables; fallback to project defaults
const SMTP_HOST = process.env.VITE_SMTP_HOST || 'mail.uaihost.com';
const SMTP_PORT = Number(process.env.VITE_SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.VITE_SMTP_SECURE || 'true') === 'true';
const SMTP_USER = process.env.VITE_SMTP_USER || 'send@uaihost.com';
const SMTP_PASS = process.env.VITE_SMTP_PASS || 'Vsi@#$2018';
const FROM_EMAIL = process.env.VITE_EMAIL_FROM || 'no-reply@sesolucao.com.br';
const FROM_NAME = process.env.VITE_EMAIL_FROM_NAME || 'Aceite Solução Equipamentos';

try {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  await transporter.verify();

  const info = await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject: 'Teste SMTP - Solução Equipamentos',
    text:
      'Este é um email de teste enviado pelo sistema de Controle de Acervo de TI.\n\n' +
      'Se você recebeu esta mensagem, as configurações de SMTP estão funcionando corretamente.',
    html:
      '<div style="font-family: Arial, sans-serif; line-height: 1.6;">' +
      '<h2>Teste SMTP</h2>' +
      '<p>Este é um email de teste enviado pelo sistema de <strong>Controle de Acervo de TI</strong>.</p>' +
      '<p>Se você recebeu esta mensagem, as configurações de SMTP estão funcionando corretamente.</p>' +
      '</div>',
  });

  console.log('✅ Email de teste enviado com sucesso:', info.messageId);
} catch (err) {
  console.error('❌ Falha ao enviar email de teste.');
  if (err && err.message) console.error('Mensagem:', err.message);
  process.exit(1);
}

