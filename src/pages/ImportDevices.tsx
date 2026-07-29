import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type PreviewRow = Record<string, string>;

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
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

function normalizeHeader(h: string) {
  return (h || '').trim().normalize('NFKC').toLowerCase();
}

const expectedHeaders = [
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

export default function ImportDevices() {
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'ignore' | 'update'>('ignore');
  const [summary, setSummary] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const canAccess = profile?.role === 'admin' || profile?.role === 'master_operator';

  const missingHeaders = useMemo(() => {
    const hs = headers.map(normalizeHeader);
    return expectedHeaders.filter((h) => !hs.includes(h));
  }, [headers]);

  const handleFile = async (f: File) => {
    setFile(f);
    setSummary(null);
    setError(null);
    const text = await f.text();
    if (!text) {
      setError('Arquivo vazio ou encoding inválido (use UTF-8)');
      return;
    }
    const matrix = parseCSV(text);
    if (!matrix.length) {
      setError('CSV sem conteúdo');
      return;
    }
    const hdr = matrix[0];
    setHeaders(hdr);
    const idxMap: Record<string, number> = {};
    hdr.forEach((h, i) => (idxMap[normalizeHeader(h)] = i));
    const data: PreviewRow[] = matrix
      .slice(1)
      .filter((r) => r.length && r.some((c) => (c || '').trim() !== ''))
      .map((r) => {
        const obj: PreviewRow = {};
        hdr.forEach((h, i) => {
          obj[h] = r[i] ?? '';
        });
        return obj;
      });
    setRows(data);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Selecione um arquivo CSV');
      return;
    }
    if (missingHeaders.length) {
      setError(`Colunas obrigatórias faltando: ${missingHeaders.join(', ')}`);
      return;
    }
    setError(null);
    setImporting(true);
    setSummary(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', mode);
      fd.append('user', profile?.email || 'desconhecido');
      const resp = await fetch('/api/import-devices', {
        method: 'POST',
        body: fd,
      });
      const js = await resp.json();
      if (!resp.ok || !js.ok) {
        throw new Error(js.error || 'Falha na importação');
      }
      setSummary(js.summary);
      if (js.errors && js.errors.length) {
        setError(`${js.errors.length} linha(s) com erro. Veja detalhes no console.`);
        console.warn('Erros de importação:', js.errors);
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao importar');
    } finally {
      setImporting(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900">Importar Dispositivos</h2>
          <p className="mt-2 text-sm text-gray-600">Acesso restrito a administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Importar Dispositivos</h1>
          <p className="mt-2 text-sm text-gray-700">
            Envie um arquivo CSV no modelo esperado e confirme a importação.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={() => {
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
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'modelo_dispositivos.csv';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="block rounded-md bg-[#2eafa4] px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#258f86]"
          >
            Baixar modelo CSV
          </button>
        </div>
      </div>

      <div className="mt-6 bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
            className="block w-full sm:w-auto rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="mode"
                value="ignore"
                checked={mode === 'ignore'}
                onChange={() => setMode('ignore')}
              />
              Ignorar duplicados
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="mode"
                value="update"
                checked={mode === 'update'}
                onChange={() => setMode('update')}
              />
              Atualizar existentes
            </label>
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        {!!headers.length && (
          <div className="text-sm text-gray-700">
            <p className="font-medium">Pré-visualização</p>
            {missingHeaders.length > 0 ? (
              <p className="text-red-600 mt-1">
                Faltam colunas: {missingHeaders.join(', ')}
              </p>
            ) : (
              <p className="text-gray-500 mt-1">Colunas OK</p>
            )}
          </div>
        )}

        {!!rows.length && (
          <div className="overflow-auto border rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.slice(0, 20).map((r, idx) => (
                  <tr key={idx} className="text-xs">
                    {headers.map((h) => (
                      <td key={h} className="px-3 py-1 whitespace-nowrap text-gray-700">
                        {r[h] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 20 && (
              <div className="p-2 text-xs text-gray-500">Mostrando 20 de {rows.length} linhas</div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || missingHeaders.length > 0 || importing}
            className="rounded-md bg-[#2eafa4] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#258f86] disabled:opacity-50"
          >
            {importing ? 'Importando...' : 'Confirmar importação'}
          </button>
        </div>
      </div>

      {summary && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <h3 className="text-base font-semibold text-gray-900">Resumo da Importação</h3>
          <div className="mt-2 text-sm text-gray-700">
            <p>Total linhas: {summary.total_rows}</p>
            <p>Importadas: {summary.success}</p>
            <p>Ignoradas (duplicadas): {summary.ignored_duplicates}</p>
            <p>Com erro: {summary.errors}</p>
          </div>
        </div>
      )}
    </div>
  );
}
