const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 8089;
const HOST = process.env.HOST || '0.0.0.0';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const APP_URL = process.env.APP_URL || '';
const DATABASE_URL = process.env.DATABASE_URL;

app.use(express.json({ limit: '1mb' }));

// Configurar multer para upload de arquivos
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    const type = (file.mimetype || '').toLowerCase();
    const ok = 
      type === 'text/csv' ||
      name.endsWith('.csv') ||
      type === 'application/vnd.ms-excel' ||
      type === 'application/octet-stream' ||
      type === 'text/plain';
    cb(ok ? null : new Error('Apenas arquivos CSV são permitidos'), ok);
  }
});

function createTransporter(cfg) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: Number(cfg.port),
    secure: !!cfg.secure,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
}

function getSupabase() {
  if (!SUPABASE_URL || (!SUPABASE_ANON_KEY && !SUPABASE_SERVICE_ROLE)) {
    throw new Error('Supabase env vars not set');
  }
  const key = SUPABASE_SERVICE_ROLE || SUPABASE_ANON_KEY;
  return createClient(SUPABASE_URL, key);
}

function replaceTemplateVariables(text, variables) {
  let result = String(text || '');
  Object.keys(variables || {}).forEach((key) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(variables[key] ?? ''));
  });
  return result;
}

function textToHtml(text) {
  const escaped = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

let pgPool = null;
function getPg() {
  if (!DATABASE_URL) return null;
  if (pgPool) return pgPool;
  pgPool = new Pool({ connectionString: DATABASE_URL });
  return pgPool;
}

app.post('/api/test-smtp', async (req, res) => {
  try {
    const { smtpConfig } = req.body || {};
    if (!smtpConfig || !smtpConfig.host || !smtpConfig.port) {
      return res.status(400).json({ ok: false, error: 'Configuração SMTP incompleta' });
    }
    const transporter = createTransporter(smtpConfig);
    await transporter.verify();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' });
  }
});

app.post('/api/send-test-email', async (req, res) => {
  try {
    const { smtpConfig, to } = req.body || {};
    if (!smtpConfig || !to) {
      return res.status(400).json({ ok: false, error: 'Parâmetros inválidos' });
    }
    const transporter = createTransporter(smtpConfig);
    const fromName = smtpConfig.fromName || 'Solução Equipamentos';
    const fromEmail = smtpConfig.fromEmail || smtpConfig.user;
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: 'Teste SMTP - Solução Equipamentos',
      text:
        'Este é um e-mail de teste enviado pelo servidor.\n\n' +
        'Se você recebeu esta mensagem, as configurações SMTP estão funcionando corretamente.',
      html:
        '<div style="font-family: Arial, sans-serif; line-height:1.6">' +
        '<h2>Teste SMTP</h2>' +
        '<p>Este é um e-mail de teste enviado pelo <strong>servidor</strong>.</p>' +
        '<p>Se você recebeu esta mensagem, as configurações SMTP estão funcionando corretamente.</p>' +
        '</div>',
    });
    return res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' });
  }
});

app.post('/api/send-acceptance-email', async (req, res) => {
  try {
    const { smtpConfig, emailData, assignmentId, baseUrl, acceptanceText } = req.body || {};
    if (!smtpConfig || !emailData || !assignmentId) {
      return res.status(400).json({ ok: false, error: 'Parâmetros inválidos' });
    }
    const pool = getPg();
    const transporter = createTransporter(smtpConfig);
    const fromName = smtpConfig.fromName || 'Solução Equipamentos';
    const fromEmail = smtpConfig.fromEmail || smtpConfig.user;
    
    // Cria ou tenta criar token de aprovação
    async function createApprovalToken(assignmentId, userEmail) {
      if (pool) {
        const client = await pool.connect();
        try {
          const token = crypto.randomBytes(16).toString('hex');
          await client.query(
            `INSERT INTO public.assignment_approval_tokens (assignment_id, token, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
            [assignmentId, token]
          );
          return token;
        } finally {
          client.release();
        }
      }
      if (!SUPABASE_SERVICE_ROLE) {
        throw new Error('Configuração ausente: SUPABASE_SERVICE_ROLE não definido no servidor');
      }
      const supabase = getSupabase();
      const tokenValue = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('assignment_approval_tokens')
        .insert([{
          assignment_id: assignmentId,
          token: tokenValue,
          expires_at: expiresIso,
        }])
        .select('token')
        .single();
      if (error) {
        console.error('Supabase insert error (assignment_approval_tokens):', error);
        throw new Error('Falha ao criar token de aprovação: ' + (error.message || JSON.stringify(error)));
      }
      if (data?.token) return data.token;
      throw new Error('Falha ao criar token de aprovação: resposta sem token');
    }
    
    let token;
    try {
      token = await createApprovalToken(assignmentId, emailData.employeeEmail);
    } catch (e) {
      console.error('Error creating approval token:', e);
      throw e;
    }
    const origin = baseUrl || APP_URL || '';
    const approvalUrl = `${origin}/approve-assignment?token=${encodeURIComponent(token)}`;
    
    const deviceListText = (emailData.deviceList || []).map((d) => `- ${d}`).join('\n');
    const defaultTemplate =
`Prezado(a) {employee_name},

Você está recebendo este e-mail para confirmar o aceite dos equipamentos da Solução Equipamentos.

Detalhes da Vinculação:
- Funcionário: {employee_name} ({employee_email})
- Equipamentos:
{device_list}
- Data da Vinculação: {assignment_date}
- Operador Responsável: {operator_name}

Para confirmar o aceite, clique no link abaixo:
{acceptance_link}

Este link pode expirar em até 24 horas.`;
    const selectedTemplate = String(acceptanceText || '').trim() || defaultTemplate;
    const text = replaceTemplateVariables(selectedTemplate, {
      employee_name: emailData.employeeName || '',
      employee_email: emailData.employeeEmail || '',
      device_list: deviceListText,
      assignment_date: emailData.assignmentDate || '',
      operator_name: emailData.operatorName || '',
      acceptance_link: approvalUrl,
    });
    const textAsHtml = textToHtml(text);
    const html =
`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Termo de Aceite - Solução Equipamentos</title>
<style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#f8f9fa;padding:20px;border-radius:8px;margin-bottom:20px}.content{background:#fff;padding:20px;border-radius:8px}.button{display:inline-block;padding:12px 24px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;margin:20px 0}.footer{margin-top:30px;padding:20px;background:#f8f9fa;border-radius:8px;font-size:12px;color:#666}</style>
</head><body><div class="container">
  <div class="header"><h2>Solução Equipamentos - Termo de Aceite</h2></div>
  <div class="content">
    <p>${textAsHtml}</p>
    <div style="text-align:center;margin:30px 0;">
      <a class="button" href="${approvalUrl}">CLIQUE AQUI PARA ACEITAR</a>
    </div>
  </div>
  <div class="footer">
    <p>Este é um email automático. Por favor, não responda.</p>
  </div>
</div></body></html>`;
    
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: emailData.employeeEmail,
      subject: 'Termo de Aceite - Solução Equipamentos',
      text,
      html
    });
    return res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('send-acceptance-email failed:', err);
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' });
  }
});

app.post('/api/process-approval', async (req, res) => {
  try {
    const { token, action } = req.body || {};
    if (!token || !action) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }
    const pool = getPg();
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `SELECT * FROM public.assignment_approval_tokens WHERE token = $1 FOR UPDATE`,
          [token]
        );
        const row = rows[0];
        if (!row) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Token inválido' });
        }
        if (row.used_at) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Token já utilizado' });
        }
        if (new Date(row.expires_at) < new Date()) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Token expirado' });
        }
        const assignmentId = row.assignment_id;
        if (action === 'approve') {
          try {
            await client.query(
              `UPDATE public.assignments
               SET status='approved', term_accepted=true, accepted_at=NOW()
               WHERE id=$1`,
              [assignmentId]
            );
          } catch (e) {
            if (e && (e.code === '42703' || String(e.message).toLowerCase().includes('column') && String(e.message).toLowerCase().includes('status'))) {
              await client.query(
                `UPDATE public.assignments
                 SET term_accepted=true, accepted_at=NOW()
                 WHERE id=$1`,
                [assignmentId]
              );
            } else {
              throw e;
            }
          }
          const { rows: arows } = await client.query(
            `SELECT device_ids FROM public.assignments WHERE id=$1`,
            [assignmentId]
          );
          const deviceIds = arows[0]?.device_ids || [];
          if (deviceIds.length) {
            await client.query(
              `UPDATE public.devices SET status='assigned' WHERE id = ANY($1::uuid[])`,
              [deviceIds]
            );
          }
        } else {
          try {
            await client.query(
              `UPDATE public.assignments
               SET status='rejected', term_accepted=false
               WHERE id=$1`,
              [assignmentId]
            );
          } catch (e) {
            if (e && (e.code === '42703' || String(e.message).toLowerCase().includes('column') && String(e.message).toLowerCase().includes('status'))) {
              await client.query(
                `UPDATE public.assignments
                 SET term_accepted=false
                 WHERE id=$1`,
                [assignmentId]
              );
            } else {
              throw e;
            }
          }
          const { rows: arows } = await client.query(
            `SELECT device_ids FROM public.assignments WHERE id=$1`,
            [assignmentId]
          );
          const deviceIds = arows[0]?.device_ids || [];
          if (deviceIds.length) {
            await client.query(
              `UPDATE public.devices SET status='available' WHERE id = ANY($1::uuid[])`,
              [deviceIds]
            );
          }
        }
        await client.query(
          `UPDATE public.assignment_approval_tokens SET used_at=NOW() WHERE token=$1`,
          [token]
        );
        await client.query('COMMIT');
        return res.json({ success: true });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
    // Fallback: Supabase
    if (!SUPABASE_SERVICE_ROLE) {
      return res.status(500).json({ error: 'Configuração ausente: SUPABASE_SERVICE_ROLE não definido no servidor' });
    }
    const supabase = getSupabase();
    const { data: tokenData, error: tokenErr } = await supabase
      .from('assignment_approval_tokens')
      .select('*')
      .eq('token', token)
      .single();
    if (tokenErr || !tokenData) {
      return res.status(400).json({ error: 'Token inválido' });
    }
    if (tokenData.used_at) {
      return res.status(400).json({ error: 'Token já utilizado' });
    }
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token expirado' });
    }
    // Atualizações via Supabase (como antes)...
    let errUpdate = null;
    try {
      if (action === 'approve') {
        let { error } = await supabase
          .from('assignments')
          .update({ status: 'approved', term_accepted: true, accepted_at: new Date().toISOString() })
          .eq('id', tokenData.assignment_id);
        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (error.code === '42703' || (msg.includes('column') && msg.includes('status'))) {
            console.warn('Coluna status ausente em assignments; aplicando fallback sem status');
            const retry = await supabase
              .from('assignments')
              .update({ term_accepted: true, accepted_at: new Date().toISOString() })
              .eq('id', tokenData.assignment_id);
            if (retry.error) {
              console.error('Supabase update assignments (approve, fallback) error:', retry.error);
              throw retry.error;
            }
          } else {
            console.error('Supabase update assignments (approve) error:', error);
            throw error;
          }
        }
        const { data: a, error: selErr } = await supabase
          .from('assignments')
          .select('device_ids')
          .eq('id', tokenData.assignment_id).single();
        if (selErr) {
          console.error('Supabase select device_ids error:', selErr);
          throw selErr;
        }
        if (a?.device_ids?.length) {
          const { error: devErr } = await supabase
            .from('devices').update({ status: 'assigned' }).in('id', a.device_ids);
          if (devErr) {
            console.error('Supabase update devices (assigned) error:', devErr);
            throw devErr;
          }
        }
      } else {
        let { error } = await supabase
          .from('assignments')
          .update({ status: 'rejected', term_accepted: false })
          .eq('id', tokenData.assignment_id);
        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (error.code === '42703' || (msg.includes('column') && msg.includes('status'))) {
            console.warn('Coluna status ausente em assignments; aplicando fallback sem status (reject)');
            const retry = await supabase
              .from('assignments')
              .update({ term_accepted: false })
              .eq('id', tokenData.assignment_id);
            if (retry.error) {
              console.error('Supabase update assignments (reject, fallback) error:', retry.error);
              throw retry.error;
            }
          } else {
            console.error('Supabase update assignments (reject) error:', error);
            throw error;
          }
        }
        const { data: a, error: selErr } = await supabase
          .from('assignments')
          .select('device_ids')
          .eq('id', tokenData.assignment_id).single();
        if (selErr) {
          console.error('Supabase select device_ids error:', selErr);
          throw selErr;
        }
        if (a?.device_ids?.length) {
          const { error: devErr } = await supabase
            .from('devices').update({ status: 'available' }).in('id', a.device_ids);
          if (devErr) {
            console.error('Supabase update devices (available) error:', devErr);
            throw devErr;
          }
        }
      }
      const { error: usedErr } = await supabase
        .from('assignment_approval_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id);
      if (usedErr) {
        console.error('Supabase update token used_at error:', usedErr);
        throw usedErr;
      }
    } catch (e) {
      errUpdate = e;
    }
    if (errUpdate) {
      return res.status(500).json({ error: errUpdate.message || 'Erro ao processar aprovação' });
    }
    
    return res.json({ success: true });
  } catch (err) {
    console.error('process-approval failed:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Erro desconhecido' });
  }

});

app.post('/api/send-return-email', async (req, res) => {
  try {
    const { smtpConfig, emailData } = req.body || {};
    if (!smtpConfig || !emailData) {
      return res.status(400).json({ ok: false, error: 'Parâmetros inválidos' });
    }
    const transporter = createTransporter(smtpConfig);
    const fromName = smtpConfig.fromName || 'Solução Equipamentos';
    const fromEmail = smtpConfig.fromEmail || smtpConfig.user;
    
    const deviceListText = (emailData.deviceList || []).map((d) => `- ${d}`).join('\n');
    const text =
`Prezado(a) ${emailData.employeeName},

Registramos a devolução dos equipamentos abaixo:

${deviceListText}

Data da Devolução: ${emailData.returnDate}
Tipo de Registro: ${emailData.reportType}
Condição: ${emailData.condition}

${emailData.notes ? 'Observações: ' + emailData.notes : ''}

Atenciosamente,
Equipe Solução Equipamentos`;
    
    const deviceListHtml = (emailData.deviceList || [])
      .map((d) => `<li>${d}</li>`)
      .join('');
    const html =
`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Confirmação de Devolução - Solução Equipamentos</title>
<style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#f8f9fa;padding:20px;border-radius:8px;margin-bottom:20px}.content{background:#fff;padding:20px;border-radius:8px}.footer{margin-top:30px;padding:20px;background:#f8f9fa;border-radius:8px;font-size:12px;color:#666}</style>
</head><body><div class="container">
  <div class="header"><h2>Solução Equipamentos - Confirmação de Devolução</h2></div>
  <div class="content">
    <p>Prezado(a) <strong>${emailData.employeeName}</strong>,</p>
    <p>Registramos a devolução dos equipamentos abaixo:</p>
    <ul>${deviceListHtml}</ul>
    <p><strong>Data da Devolução:</strong> ${emailData.returnDate}</p>
    <p><strong>Tipo de Registro:</strong> ${emailData.reportType}</p>
    <p><strong>Condição:</strong> ${emailData.condition}</p>
    ${emailData.notes ? '<p><strong>Observações:</strong> ' + emailData.notes + '</p>' : ''}
  </div>
  <div class="footer">
    <p>Este é um e-mail automático. Por favor, não responda.</p>
  </div>
</div></body></html>`;
    
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: emailData.employeeEmail,
      subject: 'Confirmação de Devolução - Solução Equipamentos',
      text,
      html
    });
    return res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('send-return-email failed:', err);
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' });
  }
});

app.post('/api/create-return', async (req, res) => {
  try {
    const { assignment_id, inspection_checklist, condition, notes, report_type, device_ids } = req.body || {};
    if (!assignment_id || !report_type) {
      return res.status(400).json({ ok: false, error: 'Parâmetros inválidos' });
    }
    const pool = getPg();
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: arows } = await client.query(
          `SELECT device_ids FROM public.assignments WHERE id=$1`,
          [assignment_id]
        );
        const assignmentDeviceIds = arows[0]?.device_ids || [];
        const returnDeviceIds = Array.isArray(device_ids) && device_ids.length ? device_ids : assignmentDeviceIds;
        await client.query(
          `INSERT INTO public.returns (assignment_id, return_date, inspection_checklist, notes, report_type)
           VALUES ($1, CURRENT_DATE, $2::jsonb, $3, $4)`,
          [assignment_id, JSON.stringify(inspection_checklist || {}), notes || null, report_type]
        );
        if (returnDeviceIds.length) {
          const newStatus = condition === 'Avariado' ? 'damaged' : 'available';
          await client.query(
            `UPDATE public.devices SET status=$1 WHERE id = ANY($2::uuid[])`,
            [newStatus, returnDeviceIds]
          );
        }
        if (returnDeviceIds.length) {
          if (returnDeviceIds.length === assignmentDeviceIds.length) {
            await client.query(
              `UPDATE public.assignments SET device_ids = '{}'::uuid[] WHERE id=$1`,
              [assignment_id]
            );
          } else {
            await client.query(
              `UPDATE public.assignments
               SET device_ids = ARRAY(
                 SELECT unnest(device_ids)
                 EXCEPT SELECT unnest($2::uuid[])
               )
               WHERE id=$1`,
              [assignment_id, returnDeviceIds]
            );
          }
        }
        await client.query('COMMIT');
        return res.json({ ok: true });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } else {
      if (!SUPABASE_SERVICE_ROLE) {
        return res.status(500).json({ ok: false, error: 'Configuração ausente: SUPABASE_SERVICE_ROLE não definido no servidor' });
      }
      const supabase = getSupabase();
      const { data: assignment, error: aerr } = await supabase
        .from('assignments')
        .select('device_ids')
        .eq('id', assignment_id)
        .single();
      if (aerr) {
        return res.status(500).json({ ok: false, error: aerr.message || 'Erro ao consultar assignment' });
      }
      const assignmentDeviceIds = assignment?.device_ids || [];
      const returnDeviceIds = Array.isArray(device_ids) && device_ids.length ? device_ids : assignmentDeviceIds;
      const { error: rerr } = await supabase
        .from('returns')
        .insert([{
          assignment_id,
          return_date: new Date().toISOString().split('T')[0],
          inspection_checklist: inspection_checklist || {},
          notes: notes || null,
          report_type
        }]);
      if (rerr) {
        return res.status(500).json({ ok: false, error: rerr.message || 'Erro ao registrar devolução' });
      }
      if (returnDeviceIds.length) {
        const newStatus = condition === 'Avariado' ? 'damaged' : 'available';
        const { error: derr } = await supabase
          .from('devices')
          .update({ status: newStatus })
          .in('id', returnDeviceIds);
        if (derr) {
          return res.status(500).json({ ok: false, error: derr.message || 'Erro ao atualizar dispositivos' });
        }
      }
      if (returnDeviceIds.length) {
        const remaining =
          returnDeviceIds.length === assignmentDeviceIds.length
            ? []
            : assignmentDeviceIds.filter((id) => !returnDeviceIds.includes(id));
        const { error: uerr } = await supabase
          .from('assignments')
          .update({ device_ids: remaining })
          .eq('id', assignment_id);
        if (uerr) {
          return res.status(500).json({ ok: false, error: uerr.message || 'Erro ao atualizar vinculação' });
        }
      }
      return res.json({ ok: true });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' });
  }
});

app.post('/api/set-devices-status', async (req, res) => {
  try {
    const { deviceIds, status } = req.body || {};
    if (!Array.isArray(deviceIds) || !status) {
      return res.status(400).json({ ok: false, error: 'Parâmetros inválidos' });
    }
    const pool = getPg();
    if (pool) {
      const { rowCount } = await pool.query(
        `UPDATE public.devices SET status = $1 WHERE id = ANY($2::uuid[])`,
        [status, deviceIds]
      );
      return res.json({ ok: true, updated: rowCount });
    } else {
      if (!SUPABASE_SERVICE_ROLE) {
        return res.status(500).json({ ok: false, error: 'Configuração ausente: SUPABASE_SERVICE_ROLE não definido no servidor' });
      }
      const supabase = getSupabase();
      const { error } = await supabase
        .from('devices')
        .update({ status })
        .in('id', deviceIds);
      if (error) {
        return res.status(500).json({ ok: false, error: error.message || 'Erro ao atualizar dispositivos' });
      }
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' });
  }
});

// Endpoint para importação de dispositivos via CSV
app.post('/api/import-devices', upload.single('file'), async (req, res) => {
  try {
    const { userId } = req.body || {};
    
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Nenhum arquivo foi enviado' });
    }

    const file = req.file;
    const csvContent = file.buffer.toString('utf8');
    
    // Validar UTF-8
    try {
      Buffer.from(csvContent, 'utf8');
    } catch (e) {
      return res.status(400).json({ ok: false, error: 'O arquivo não está em formato UTF-8 válido' });
    }

    // Remover BOM se existir
    const cleanContent = csvContent.replace(/^\uFEFF/, '');
    
    // Separar em linhas
    const lines = cleanContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return res.status(400).json({ ok: false, error: 'O arquivo está vazio' });
    }

    // Normalização de headers
    function norm(h) {
      const s = (h || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return s.toLowerCase();
    }

    // Validar e processar header (case-insensitive e removendo acentos)
    const headerLine = lines[0].trim();
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const nHeaders = headers.map(norm);
    const idxByNorm = Object.fromEntries(nHeaders.map((h, i) => [h, i]));
    
    const expectedHeaders = [
      'numero_patrimonio', 'categoria', 'estado', 'numero_serie', 
      'part_number', 'marca', 'modelo', 'numero_nf', 'descricao', 'observacoes'
    ];

    // Verificar se todas as colunas obrigatórias existem
    const missingHeaders = expectedHeaders.filter(h => !nHeaders.includes(norm(h)));
    if (missingHeaders.length > 0) {
      return res.status(400).json({ 
        ok: false, 
        error: `Colunas obrigatórias faltando: ${missingHeaders.join(', ')}`,
        provided: headers
      });
    }

    const devices = [];
    const errors = [];
    let successfulImports = 0;
    let failedImports = 0;

    // Processar cada linha
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const rowData = {};
        
        // Preencher rowData por header normalizado
        headers.forEach((header, index) => {
          rowData[norm(header)] = values[index] || '';
        });

        // Preencher campos faltantes com string vazia
        expectedHeaders.forEach(header => {
          const key = norm(header);
          if (!(key in rowData)) {
            rowData[key] = '';
          }
        });

        // Validar campos obrigatórios
        if (!rowData['numero_patrimonio']?.trim()) {
          errors.push({ row: i + 1, message: 'Número do patrimônio é obrigatório' });
          failedImports++;
          continue;
        }

        if (!rowData['numero_serie']?.trim()) {
          errors.push({ row: i + 1, message: 'Número de série é obrigatório' });
          failedImports++;
          continue;
        }

        if (!rowData['part_number']?.trim()) {
          errors.push({ row: i + 1, message: 'Part number é obrigatório' });
          failedImports++;
          continue;
        }

        if (!rowData['modelo']?.trim()) {
          errors.push({ row: i + 1, message: 'Modelo é obrigatório' });
          failedImports++;
          continue;
        }

        // Criar objeto device
        const device = {
          code: rowData['numero_patrimonio'].trim(),
          name: rowData['modelo'].trim(),
          type: rowData['part_number'].trim(),
          brand: rowData['marca']?.trim() || null,
          category: rowData['categoria']?.trim() || null,
          serial_number: rowData['numero_serie'].trim(),
          asset_number: rowData['numero_patrimonio'].trim(),
          origin: 'Próprio',
          condition: rowData['estado']?.trim() || 'Novo',
          invoice_number: rowData['numero_nf']?.trim() || null,
          notes: [rowData['descricao'], rowData['observacoes'], rowData['localizacao_fisica']].filter(Boolean).join(' | ') || null,
          status: 'available'
        };

        devices.push(device);
      } catch (err) {
        errors.push({ row: i + 1, message: `Erro ao processar linha: ${err.message}` });
        failedImports++;
      }
    }

    if (devices.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Nenhum dispositivo válido para importar',
        errors: errors
      });
    }

    // Conectar ao banco de dados
    const supabase = getSupabase();
    
    // Verificar duplicatas
    const duplicates = [];
    const uniqueDevices = [];

    for (const device of devices) {
      let isDuplicate = false;
      let duplicateReason = '';

      try {
        // Verificar duplicata por código
        const { data: existingCode } = await supabase
          .from('devices')
          .select('id')
          .eq('code', device.code)
          .single();

        if (existingCode) {
          isDuplicate = true;
          duplicateReason = `Patrimônio ${device.code} já existe`;
        }

        // Verificar duplicata por número de série
        if (!isDuplicate) {
          const { data: existingSerial } = await supabase
            .from('devices')
            .select('id')
            .eq('serial_number', device.serial_number)
            .single();

          if (existingSerial) {
            isDuplicate = true;
            duplicateReason = `Número de série ${device.serial_number} já existe`;
          }
        }

        if (isDuplicate) {
          errors.push({ row: devices.indexOf(device) + 2, message: duplicateReason });
          failedImports++;
        } else {
          uniqueDevices.push(device);
        }
      } catch (err) {
        // Se houver erro na verificação, considerar como não duplicado
        uniqueDevices.push(device);
      }
    }

    if (uniqueDevices.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Todos os dispositivos são duplicados',
        errors: errors
      });
    }

    // Inserir dispositivos no banco
    const { data: insertedDevices, error: insertError } = await supabase
      .from('devices')
      .insert(uniqueDevices)
      .select();

    if (insertError) {
      return res.status(500).json({
        ok: false,
        error: `Erro ao inserir dispositivos: ${insertError.message}`,
        errors: errors
      });
    }

    successfulImports = insertedDevices.length;

    // Registrar log da importação
    try {
      await supabase.from('import_logs').insert({
        user_id: userId || 'system',
        imported_count: successfulImports,
        total_rows: devices.length,
        errors_count: failedImports,
        import_type: 'devices_csv',
        error_details: errors
      });
    } catch (logError) {
      console.error('Erro ao registrar log de importação:', logError);
    }

    return res.json({
      ok: true,
      totalRows: devices.length,
      successfulImports: successfulImports,
      failedImports: failedImports,
      errors: errors
    });

  } catch (err) {
    console.error('Erro na importação de dispositivos:', err);
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido na importação'
    });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
