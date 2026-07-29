const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 8082;

app.use(express.json({ limit: '1mb' }));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

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
  const url = SUPABASE_URL;
  const key = SUPABASE_SERVICE_ROLE || SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Upload CSV (memória) até 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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
  },
});

// CSV parser simples com suporte a aspas
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cur);
        cur = '';
      } else if (ch === '\n') {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
      } else if (ch === '\r') {
        // ignore
      } else {
        cur += ch;
      }
    }
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function normalizeText(s) {
  if (!s) return '';
  return String(s).trim().normalize('NFKC');
}

function mapCsvToDevice(rowObj) {
  // Mapeia campos da planilha para os campos da tabela devices
  // Campos esperados do CSV:
  // numero_patrimonio, categoria, estado, numero_serie, part_number, marca, modelo, localizacao_fisica, numero_nf, descricao, observacoes
  const conditionMap = {
    'bom': 'Usado',
    'novo': 'Novo',
    'usado': 'Usado',
    'avariado': 'Avariado',
    'danificado': 'Avariado',
  };
  const conditionRaw = normalizeText(rowObj.estado || '').toLowerCase();
  const condition = conditionMap[conditionRaw] || 'Usado';

  return {
    code: normalizeText(rowObj.part_number || ''),
    name: normalizeText(rowObj.descricao || rowObj.modelo || 'Dispositivo'),
    type: 'Outro',
    brand: normalizeText(rowObj.marca || ''),
    category: normalizeText(rowObj.categoria || ''),
    serial_number: normalizeText(rowObj.numero_serie || ''),
    asset_number: normalizeText(rowObj.numero_patrimonio || ''),
    origin: 'Próprio',
    condition,
    invoice_number: normalizeText(rowObj.numero_nf || ''),
    notes: normalizeText([rowObj.localizacao_fisica, rowObj.observacoes].filter(Boolean).join(' | ')),
    status: 'available',
  };
}

function ensureLogsDir() {
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

app.get('/api/import-devices/template', (req, res) => {
  const headers = [
    'numero_patrimonio',
    'categoria',
    'estado',
    'numero_serie',
    'part_number',
    'marca',
    'modelo',
    'localizacao_fisica',
    'numero_nf',
    'descricao',
    'observacoes',
  ];
  const example = [
    'PAT-0001,Computadores,Novo,SN-ABC-123,P123-XYZ,Dell,Latitude 5440,"Sala 1, Armário A",NF-12345,Notebook corporativo,Sem observações',
    'PAT-0002,Periféricos,Usado,SN-DEF-456,P456-XYZ,Logitech,Mouse M720,"Escritório",NF-12346,Mouse sem fio,Com bateria',
  ];
  const csv = [headers.join(','), ...example].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="modelo_dispositivos.csv"');
  res.status(200).send(csv);
});

app.post('/api/import-devices', upload.single('file'), async (req, res) => {
  try {
    const mode = (req.body?.mode || 'ignore').toString(); // 'ignore' | 'update'
    const actor = req.body?.user || 'desconhecido';
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ ok: false, error: 'Arquivo CSV não enviado' });
    }
    const buf = req.file.buffer;
    const text = buf.toString('utf8');
    if (!text) {
      return res.status(400).json({ ok: false, error: 'Arquivo vazio ou encoding inválido (use UTF-8)' });
    }
    const rows = parseCSV(text);
    if (!rows.length) {
      return res.status(400).json({ ok: false, error: 'CSV sem conteúdo' });
    }
    const headers = rows[0].map(h => normalizeText(h).toLowerCase());
    const expected = [
      'numero_patrimonio',
      'categoria',
      'estado',
      'numero_serie',
      'part_number',
      'marca',
      'modelo',
      'localizacao_fisica',
      'numero_nf',
      'descricao',
      'observacoes',
    ];
    const missing = expected.filter(h => !headers.includes(h));
    if (missing.length) {
      return res.status(400).json({ ok: false, error: `Colunas obrigatórias faltando: ${missing.join(', ')}` });
    }
    const colIndex = Object.fromEntries(headers.map((h, i) => [h, i]));
    const dataRows = rows.slice(1).filter(r => r.length && r.some(c => (c || '').trim() !== ''));

    const items = dataRows.map((r, idx) => {
      const obj = Object.fromEntries(expected.map(h => [h, r[colIndex[h]] || '']));
      return { rowNumber: idx + 2, raw: obj, mapped: mapCsvToDevice(obj) };
    });

    // Validações básicas
    const errors = [];
    const toProcess = [];
    const seenKeys = new Set();
    for (const it of items) {
      const m = it.mapped;
      const key = (m.serial_number || m.asset_number || '')?.toLowerCase();
      if (!m.name || !(m.serial_number || m.asset_number)) {
        errors.push({ row: it.rowNumber, error: 'Faltando nome e/ou número de série/patrimônio' });
        continue;
      }
      if (key) {
        if (seenKeys.has(key)) {
          errors.push({ row: it.rowNumber, error: 'Duplicado no próprio arquivo (serial/patrimônio)' });
          continue;
        }
        seenKeys.add(key);
      }
      toProcess.push(m);
    }

    const supabase = getSupabase();
    const success = [];
    const failed = [...errors];

    if (!supabase) {
      return res.status(500).json({ ok: false, error: 'Supabase não configurado no servidor' });
    }

    // Buscar existentes por serial_number/asset_number
    const serials = toProcess.map(d => d.serial_number).filter(Boolean);
    const assets = toProcess.map(d => d.asset_number).filter(Boolean);
    let existing = [];
    if (serials.length) {
      const { data } = await supabase.from('devices').select('id,serial_number,asset_number').in('serial_number', serials);
      if (data) existing = existing.concat(data);
    }
    if (assets.length) {
      const { data } = await supabase.from('devices').select('id,serial_number,asset_number').in('asset_number', assets);
      if (data) existing = existing.concat(data);
    }
    const existMap = new Map();
    existing.forEach(d => {
      if (d.serial_number) existMap.set(`s:${d.serial_number.toLowerCase()}`, d);
      if (d.asset_number) existMap.set(`a:${d.asset_number.toLowerCase()}`, d);
    });

    for (const m of toProcess) {
      const keyS = m.serial_number ? `s:${m.serial_number.toLowerCase()}` : null;
      const keyA = m.asset_number ? `a:${m.asset_number.toLowerCase()}` : null;
      const found = (keyS && existMap.get(keyS)) || (keyA && existMap.get(keyA));
      try {
        if (found) {
          if (mode === 'update') {
            const { error } = await supabase.from('devices').update(m).eq('id', found.id);
            if (error) throw error;
            success.push({ action: 'updated', id: found.id });
          } else {
            success.push({ action: 'ignored-duplicate', id: found.id || null });
          }
        } else {
          const { data, error } = await supabase.from('devices').insert([m]).select('id').single();
          if (error) throw error;
          success.push({ action: 'inserted', id: data?.id || null });
        }
      } catch (e) {
        failed.push({ row: null, key: m.serial_number || m.asset_number || '', error: e?.message || 'Erro ao salvar' });
      }
    }

    // Log da importação
    const logsDir = ensureLogsDir();
    const logLine = JSON.stringify({
      at: new Date().toISOString(),
      user: actor,
      total: items.length,
      insertedOrUpdated: success.filter(s => s.action === 'inserted' || s.action === 'updated').length,
      ignored: success.filter(s => s.action === 'ignored-duplicate').length,
      errors: failed.length,
      mode,
    }) + '\n';
    fs.appendFileSync(path.join(logsDir, 'imports.log'), logLine, 'utf8');

    return res.json({
      ok: true,
      summary: {
        total_rows: items.length,
        success: success.length - success.filter(s => s.action === 'ignored-duplicate').length,
        ignored_duplicates: success.filter(s => s.action === 'ignored-duplicate').length,
        errors: failed.length,
      },
      errors: failed,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' });
  }
});

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

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
