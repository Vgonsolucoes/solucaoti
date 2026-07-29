import nodemailer from 'nodemailer';

const to = process.argv[2] || 'financeiro@vgon.com.br';

const SMTP_HOST = process.env.VITE_SMTP_HOST || 'mail.uaihost.com';
const SMTP_PORT = Number(process.env.VITE_SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.VITE_SMTP_SECURE || 'true') === 'true';
const SMTP_USER = process.env.VITE_SMTP_USER || 'send@uaihost.com';
const SMTP_PASS = process.env.VITE_SMTP_PASS || 'Vsi@#$2018';
const FROM_EMAIL = process.env.VITE_EMAIL_FROM || 'no-reply@sesolucao.com.br';
const FROM_NAME = process.env.VITE_EMAIL_FROM_NAME || 'Aceite Solução Equipamentos';

const employeeName = 'Funcionário Teste';
const employeeEmail = to;
const devices = ['Notebook Dell (S/N: ABC123)', 'Mouse Logitech (S/N: XYZ987)'];
const assignmentDate = new Date().toLocaleDateString('pt-BR');
const operatorName = 'Operador de Teste';
const acceptanceLink = (process.env.APP_URL || 'http://217.216.82.52:8082') + '/accept-assignment/TEST';

const text = `Prezado(a) ${employeeName},

Você está recebendo este e-mail para confirmar o aceite dos equipamentos da Solução Equipamentos.

Detalhes da Vinculação:
- Funcionário: ${employeeName} (${employeeEmail})
- Equipamentos:
${devices.map(d => `  - ${d}`).join('\n')}
- Data da Vinculação: ${assignmentDate}
- Operador Responsável: ${operatorName}

Para confirmar o aceite, clique no link abaixo:
${acceptanceLink}

Este link expira em 24 horas.

Atenciosamente,
Equipe Solução Equipamentos`;

const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Termo de Aceite - Solução Equipamentos</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
      .content { background: white; padding: 20px; border-radius: 8px; }
      .button { display: inline-block; padding: 12px 24px; background: #2eafa4; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      .footer { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; font-size: 12px; color: #666; }
      ul { padding-left: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>Solução Equipamentos - Termo de Aceite (Teste)</h2>
      </div>
      <div class="content">
        <p>Prezado(a) <strong>${employeeName}</strong>,</p>
        <p>Você está recebendo este e-mail para confirmar o aceite dos equipamentos da <strong>Solução Equipamentos</strong>.</p>
        <p><strong>Detalhes da Vinculação:</strong></p>
        <ul>
          <li><strong>Funcionário:</strong> ${employeeName} (${employeeEmail})</li>
          <li><strong>Equipamentos:</strong>
            <ul>
              ${devices.map(d => `<li>${d}</li>`).join('')}
            </ul>
          </li>
          <li><strong>Data da Vinculação:</strong> ${assignmentDate}</li>
          <li><strong>Operador Responsável:</strong> ${operatorName}</li>
        </ul>
        <div style="text-align: center;">
          <a href="${acceptanceLink}" class="button">CLIQUE AQUI PARA ACEITAR</a>
        </div>
        <p><em>Este link expira em 24 horas.</em></p>
      </div>
      <div class="footer">
        <p>Este é um e-mail de <strong>teste</strong> enviado pelo sistema de Controle de Acervo de TI.</p>
      </div>
    </div>
  </body>
  </html>
`;

async function run() {
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject: 'Teste - Termo de Aceite | Solução Equipamentos',
      text,
      html
    });
    console.log('✅ Email de aceite (teste) enviado:', info.messageId);
  } catch (err) {
    console.error('❌ Falha ao enviar email de aceite (teste):', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();

