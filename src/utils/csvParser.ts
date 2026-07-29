import { supabase } from '../lib/supabase';

/**
 * Parser e validador de CSV para importação de dispositivos
 * 
 * Formato esperado do CSV:
 * numero_patrimonio,categoria,estado,numero_serie,part_number,marca,modelo,numero_nf,descricao,observacoes
 */

export interface CSVRow {
  numero_patrimonio: string;
  categoria: string;
  estado: string;
  numero_serie: string;
  part_number: string;
  marca: string;
  modelo: string;
  numero_nf: string;
  descricao: string;
  observacoes: string;
}

export interface CSVImportResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: Array<{ row: number; message: string }>;
}

export interface CSVPreviewData {
  row: number;
  data: any;
  errors: string[];
  warnings: string[];
}

export interface CSVParseResult {
  data: CSVRow[];
  errors: string[];
}

/**
 * Faz o parsing do conteúdo CSV
 */
export function parseCSV(content: string): CSVParseResult {
  const errors: string[] = [];
  const data: CSVRow[] = [];

  try {
    // Verificar encoding UTF-8
    if (!isValidUTF8(content)) {
      errors.push('O arquivo não está em formato UTF-8 válido');
      return { data, errors };
    }

    // Remover BOM se existir
    const cleanContent = content.replace(/^\uFEFF/, '');
    
    // Separar em linhas
    const lines = cleanContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      errors.push('O arquivo está vazio');
      return { data, errors };
    }

    // Validar e processar header
    const headerLine = lines[0].trim();
    const headers = parseCSVLine(headerLine);
    
    const expectedHeaders = [
      'numero_patrimonio',
      'categoria',
      'estado',
      'numero_serie',
      'part_number',
      'marca',
      'modelo',
      'numero_nf',
      'descricao',
      'observacoes'
    ];

    // Verificar se todas as colunas obrigatórias existem
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      errors.push(`Colunas obrigatórias faltando: ${missingHeaders.join(', ')}`);
      return { data, errors };
    }

    // Processar dados
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = parseCSVLine(line);
        const row: any = {};

        // Mapear valores para os headers
        headers.forEach((header, index) => {
          if (expectedHeaders.includes(header)) {
            row[header] = values[index] || '';
          }
        });

        // Preencher campos faltantes com string vazia
        expectedHeaders.forEach(header => {
          if (!(header in row)) {
            row[header] = '';
          }
        });

        data.push(row as CSVRow);
      } catch (error) {
        errors.push(`Erro na linha ${i + 1}: ${(error as Error).message}`);
      }
    }

  } catch (error) {
    errors.push(`Erro ao processar arquivo: ${(error as Error).message}`);
  }

  return { data, errors };
}

/**
 * Valida os dados do CSV
 */
export function validateCSVData(data: CSVRow[]): {
  previewData: CSVPreviewData[];
  errors: string[];
} {
  const previewData: CSVPreviewData[] = [];
  const errors: string[] = [];

  data.forEach((row, index) => {
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];
    const processedData: any = {};

    // Validar campos obrigatórios
    if (!row.numero_patrimonio?.trim()) {
      rowErrors.push('Número do patrimônio é obrigatório');
    } else {
      processedData.numero_patrimonio = normalizeText(row.numero_patrimonio);
    }

    if (!row.numero_serie?.trim()) {
      rowErrors.push('Número de série é obrigatório');
    } else {
      processedData.numero_serie = normalizeText(row.numero_serie);
    }

    if (!row.part_number?.trim()) {
      rowErrors.push('Part number é obrigatório');
    } else {
      processedData.part_number = normalizeText(row.part_number);
    }

    if (!row.modelo?.trim()) {
      rowErrors.push('Modelo é obrigatório');
    } else {
      processedData.modelo = normalizeText(row.modelo);
    }

    // Validar campos com valores restritos
    if (row.estado?.trim()) {
      const validEstados = ['Novo', 'Usado', 'Avariado'];
      const estadoNormalizado = normalizeText(row.estado);
      if (!validEstados.includes(estadoNormalizado)) {
        rowWarnings.push(`Estado '${row.estado}' inválido. Valores aceitos: Novo, Usado, Avariado`);
      } else {
        processedData.estado = estadoNormalizado;
      }
    }

    // Processar campos opcionais
    if (row.categoria?.trim()) {
      processedData.categoria = normalizeText(row.categoria);
    }

    if (row.marca?.trim()) {
      processedData.marca = normalizeText(row.marca);
    }

    if (row.numero_nf?.trim()) {
      processedData.numero_nf = normalizeText(row.numero_nf);
    }

    // Combinar descrição e observações
    const descricao = row.descricao?.trim() || '';
    const observacoes = row.observacoes?.trim() || '';
    processedData.notes = [descricao, observacoes].filter(Boolean).join(' | ');

    if (rowWarnings.length > 0) {
      rowWarnings.forEach(warning => {
        errors.push(`Linha ${index + 2}: ${warning}`);
      });
    }

    previewData.push({
      row: index + 2,
      data: processedData,
      errors: rowErrors,
      warnings: rowWarnings
    });
  });

  return { previewData, errors };
}

/**
 * Transforma os dados do CSV para o formato da tabela devices
 */
export function transformToDeviceFormat(data: any): any {
  return {
    code: data.numero_patrimonio,
    name: data.modelo,
    type: data.part_number,
    brand: data.marca || null,
    category: data.categoria || null,
    serial_number: data.numero_serie,
    asset_number: data.numero_patrimonio,
    origin: 'Próprio', // Valor padrão
    condition: data.estado || 'Novo',
    invoice_number: data.numero_nf || null,
    notes: data.notes || null,
    status: 'available'
  };
}

/**
 * Verifica se o conteúdo é UTF-8 válido
 */
function isValidUTF8(content: string): boolean {
  try {
    // Teste básico de UTF-8
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const bytes = encoder.encode(content);
    decoder.decode(bytes);
    return true;
  } catch {
    return false;
  }
}

/**
 * Faz o parsing de uma linha CSV respeitando aspas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Pular próximo caractere
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Normaliza texto removendo espaços extras e caracteres especiais
 */
function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remover zero-width characters
}

/**
 * Valida duplicatas no banco de dados
 */
export async function checkDuplicates(devices: any[]): Promise<{
  duplicates: Array<{ device: any; reason: string }>;
  unique: any[];
}> {
  const duplicates: Array<{ device: any; reason: string }> = [];
  const unique: any[] = [];

  for (const device of devices) {
    let isDuplicate = false;
    let reason = '';

    try {
      // Verificar duplicatas por código
      if (device.code) {
        const { data: existingCode } = await supabase
          .from('devices')
          .select('id')
          .eq('code', device.code)
          .single();

        if (existingCode) {
          isDuplicate = true;
          reason = `Patrimônio ${device.code} já existe`;
        }
      }

      // Verificar duplicatas por número de série
      if (!isDuplicate && device.serial_number) {
        const { data: existingSerial } = await supabase
          .from('devices')
          .select('id')
          .eq('serial_number', device.serial_number)
          .single();

        if (existingSerial) {
          isDuplicate = true;
          reason = `Número de série ${device.serial_number} já existe`;
        }
      }

      if (isDuplicate) {
        duplicates.push({ device, reason });
      } else {
        unique.push(device);
      }
    } catch (error) {
      // Se der erro na verificação, considerar como não duplicado para não bloquear
      unique.push(device);
    }
  }

  return { duplicates, unique };
}