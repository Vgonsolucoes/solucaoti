import nodemailer from 'nodemailer';
import { getSMTPConfig, getAcceptanceText, replaceTemplateVariables } from './emailConfig';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface AssignmentEmailData {
  employeeName: string;
  employeeEmail: string;
  deviceList: string[];
  assignmentDate: string;
  operatorName: string;
  acceptanceLink: string;
}

// Função para criar o transporte SMTP
function createSMTPTransporter() {
  const config = getSMTPConfig();
  
  console.log('🔧 Criando transporte SMTP com config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    fromEmail: config.fromEmail
  });
  
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // true para 465 (SSL), false para outras portas
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false, // Aceitar certificados autoassinados
      // Configurações adicionais para SSL
      minVersion: 'TLSv1.2'
    },
    // Timeout para evitar travamentos
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });
}

// Função genérica para enviar email
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    console.log('📧 Preparando envio de email para:', options.to);
    const transporter = createSMTPTransporter();
    const config = getSMTPConfig();
    
    const mailOptions = {
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    console.log('📧 Enviando email com opções:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado com sucesso:', info.messageId);
    return true;
    
  } catch (error) {
    console.error('❌ Erro detalhado ao enviar email:', error);
    console.error('❌ Tipo do erro:', typeof error);
    console.error('❌ Propriedades do erro:', Object.keys(error as any));
    if (error instanceof Error) {
      console.error('❌ Mensagem:', error.message);
      console.error('❌ Stack:', error.stack);
    }
    return false;
  }
}

// Função para enviar email de aceite de vinculação
export async function sendAssignmentAcceptanceEmail(
  data: AssignmentEmailData
): Promise<boolean> {
  try {
    const config = getSMTPConfig();
    const templateText = getAcceptanceText();
    
    // Preparar a lista de equipamentos
    const deviceList = data.deviceList.map(device => `- ${device}`).join('\n');
    
    // Substituir variáveis no texto
    const emailText = replaceTemplateVariables(templateText, {
      employee_name: data.employeeName,
      employee_email: data.employeeEmail,
      device_list: deviceList,
      assignment_date: data.assignmentDate,
      operator_name: data.operatorName,
      acceptance_link: data.acceptanceLink
    });

    // Criar versão HTML do email
    const emailHtml = `
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
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; font-size: 12px; color: #666; }
          .highlight { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Solução Equipamentos - Termo de Aceite</h2>
          </div>
          <div class="content">
            ${emailText.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.acceptanceLink}" class="button">CLIQUE AQUI PARA ACEITAR</a>
            </div>
            
            <div class="highlight">
              <strong>Importante:</strong> Este link expira em 24 horas. Após este período, será necessário solicitar um novo termo de aceite.
            </div>
          </div>
          <div class="footer">
            <p>Este é um email automático. Por favor, não responda a este email.</p>
            <p>Se você não solicitou este termo de aceite, ignore este email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendEmail({
      to: data.employeeEmail,
      subject: 'Termo de Aceite - Solução Equipamentos',
      text: emailText,
      html: emailHtml
    });
    
  } catch (error) {
    console.error('❌ Erro ao enviar email de aceite:', error);
    return false;
  }
}

// Função para testar a conexão SMTP
export async function testSMTPConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testando conexão SMTP...');
    const transporter = createSMTPTransporter();
    await transporter.verify();
    console.log('✅ Conexão SMTP testada com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro detalhado na conexão SMTP:', error);
    if (error instanceof Error) {
      console.error('❌ Mensagem de erro:', error.message);
    }
    return false;
  }
}

export async function sendTestEmail(to: string): Promise<boolean> {
  const subject = 'Teste SMTP - Solução Equipamentos';
  const text =
    'Este é um email de teste enviado pelo sistema de Controle de Acervo de TI.\n\n' +
    'Se você recebeu esta mensagem, as configurações de SMTP estão funcionando corretamente.';
  const html =
    '<div style="font-family: Arial, sans-serif; line-height: 1.6;">' +
    '<h2>Teste SMTP</h2>' +
    '<p>Este é um email de teste enviado pelo sistema de <strong>Controle de Acervo de TI</strong>.</p>' +
    '<p>Se você recebeu esta mensagem, as configurações de SMTP estão funcionando corretamente.</p>' +
    '</div>';
  return await sendEmail({ to, subject, text, html });
}

// Função para enviar email de notificação ao operador
export async function sendOperatorNotification(
  operatorEmail: string,
  employeeName: string,
  acceptanceStatus: 'accepted' | 'rejected'
): Promise<boolean> {
  const subject = acceptanceStatus === 'accepted' 
    ? '✅ Aceite de Vinculação Confirmado'
    : '❌ Vinculação Recusada';
    
  const text = acceptanceStatus === 'accepted'
    ? `O funcionário ${employeeName} aceitou os termos da vinculação. Você pode agora confirmar a vinculação no sistema.`
    : `O funcionário ${employeeName} recusou os termos da vinculação. Por favor, entre em contato para verificar o motivo.`;

  return await sendEmail({
    to: operatorEmail,
    subject: subject,
    text: text
  });
}
