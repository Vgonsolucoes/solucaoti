import nodemailer from 'nodemailer';

const SMTP_HOST = import.meta.env.VITE_SMTP_HOST;
const SMTP_PORT = parseInt(import.meta.env.VITE_SMTP_PORT || '587');
const SMTP_SECURE = import.meta.env.VITE_SMTP_SECURE === 'true';
const SMTP_USER = import.meta.env.VITE_SMTP_USER;
const SMTP_PASS = import.meta.env.VITE_SMTP_PASS;
const EMAIL_FROM = import.meta.env.VITE_EMAIL_FROM;
const APP_URL = import.meta.env.VITE_APP_URL;

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Verify transporter configuration
transporter.verify((error) => {
  if (error) {
    console.error('SMTP configuration error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const mailOptions = {
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const sendAssignmentApprovalEmail = async (
  to: string,
  userName: string,
  devices: Array<{ name: string; serial_number: string }>,
  approvalToken: string
): Promise<void> => {
  const approvalUrl = `${APP_URL}/approve-assignment?token=${approvalToken}`;
  
  const subject = 'Aprovação de Vinculação de Equipamentos - Solução Equipamentos';
  
  const text = `
Olá ${userName},

Você recebeu uma vinculação de equipamentos da Solução Equipamentos.

Equipamentos vinculados:
${devices.map(d => `- ${d.name} (S/N: ${d.serial_number})`).join('\n')}

Para confirmar o recebimento e aceitar os termos de responsabilidade, clique no link abaixo:
${approvalUrl}

Este link expira em 24 horas.

Atenciosamente,
Equipe Solução Equipamentos
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2eafa4; color: white; padding: 20px; text-align: center;">
        <h1>Solução Equipamentos</h1>
        <h2>Aprovação de Vinculação</h2>
      </div>
      
      <div style="padding: 20px; background-color: #f9f9f9;">
        <p>Olá <strong>${userName}</strong>,</p>
        
        <p>Você recebeu uma vinculação de equipamentos da <strong>Solução Equipamentos</strong>.</p>
        
        <h3>Equipamentos vinculados:</h3>
        <ul>
          ${devices.map(d => `<li><strong>${d.name}</strong> (S/N: ${d.serial_number})</li>`).join('')}
        </ul>
        
        <div style="background-color: #e8f5f3; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Para confirmar o recebimento e aceitar os termos de responsabilidade, clique no botão abaixo:</strong></p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${approvalUrl}" 
               style="background-color: #2eafa4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Aceitar Vinculação
            </a>
          </div>
          
          <p style="font-size: 12px; color: #666;">
            Ou copie e cole este link no navegador: <br>
            <code>${approvalUrl}</code>
          </p>
        </div>
        
        <p><strong>Importante:</strong> Este link expira em 24 horas.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        
        <p style="font-size: 14px; color: #666;">
          Atenciosamente,<br>
          <strong>Equipe Solução Equipamentos</strong>
        </p>
      </div>
    </div>
  `;

  await sendEmail({ to, subject, text, html });
};

export const sendAssignmentConfirmedEmail = async (
  to: string,
  userName: string,
  devices: Array<{ name: string; serial_number: string }>
): Promise<void> => {
  const subject = 'Vinculação Confirmada - Solução Equipamentos';
  
  const text = `
Olá ${userName},

Sua vinculação de equipamentos foi confirmada com sucesso!

Equipamentos confirmados:
${devices.map(d => `- ${d.name} (S/N: ${d.serial_number})`).join('\n')}

Você já pode retirar os equipamentos.

Atenciosamente,
Equipe Solução Equipamentos
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2eafa4; color: white; padding: 20px; text-align: center;">
        <h1>Solução Equipamentos</h1>
        <h2>Vinculação Confirmada</h2>
      </div>
      
      <div style="padding: 20px; background-color: #f9f9f9;">
        <p>Olá <strong>${userName}</strong>,</p>
        
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #c3e6cb;">
          <p style="color: #155724; margin: 0;">
            <strong>✓ Sua vinculação de equipamentos foi confirmada com sucesso!</strong>
          </p>
        </div>
        
        <h3>Equipamentos confirmados:</h3>
        <ul>
          ${devices.map(d => `<li><strong>${d.name}</strong> (S/N: ${d.serial_number})</li>`).join('')}
        </ul>
        
        <p><strong>Você já pode retirar os equipamentos.</strong></p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        
        <p style="font-size: 14px; color: #666;">
          Atenciosamente,<br>
          <strong>Equipe Solução Equipamentos</strong>
        </p>
      </div>
    </div>
  `;

  await sendEmail({ to, subject, text, html });
};