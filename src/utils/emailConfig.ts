// Configurações SMTP do sistema
export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

// Configuração padrão do SMTP
// Prioridade: localStorage -> VITE_SMTP_* do build -> defaults placeholders (NÃO válidos para envio)
const envFallback = {
  host: import.meta.env.VITE_SMTP_HOST as string | undefined,
  port: parseInt(import.meta.env.VITE_SMTP_PORT || '', 10) || undefined,
  secure: import.meta.env.VITE_SMTP_SECURE === 'true',
  user: import.meta.env.VITE_SMTP_USER as string | undefined,
  pass: import.meta.env.VITE_SMTP_PASS as string | undefined,
  fromEmail: import.meta.env.VITE_EMAIL_FROM as string | undefined,
  fromName: undefined,
};

export const defaultSMTPConfig: SMTPConfig = {
  host: envFallback.host || '',
  port: envFallback.port || 587,
  secure: envFallback.secure,
  user: envFallback.user || '',
  pass: envFallback.pass || '',
  fromEmail: envFallback.fromEmail || '',
  fromName: envFallback.fromName || 'Solução Equipamentos',
};

export function isSMTPConfigUsable(cfg: SMTPConfig | null | undefined): boolean {
  if (!cfg) return false;
  if (!cfg.host || !cfg.port) return false;
  if (!cfg.user || !cfg.pass) return false;
  const isPlaceholder = (s: string) => {
    const v = (s || '').trim();
    if (!v) return true;
    if (v.length < 2) return true;
    if (/seu-email|sua-senha|exemplo|coloque|your-email|your-password/i.test(v)) return true;
    if (/^\$\{|^\{.*\}$/.test(v)) return true;
    if (v === 'no-reply@sesolucao.com.br') return true;
    return false;
  };
  if (isPlaceholder(cfg.user)) return false;
  if (isPlaceholder(cfg.pass)) return false;
  if (isPlaceholder(cfg.host)) return false;
  if (cfg.fromEmail && isPlaceholder(cfg.fromEmail)) return false;
  return true;
}

// Texto padrão de aceite com variáveis
export const defaultAcceptanceText = `Prezado(a) {employee_name},

Você está recebendo este e-mail para confirmar o aceite dos equipamentos da Solução Equipamentos.

**Detalhes da Vinculação:**
- Funcionário: {employee_name} ({employee_email})
- Equipamentos: {device_list}
- Data da Vinculação: {assignment_date}
- Operador Responsável: {operator_name}

**Termos de Uso:**
Ao clicar no link de aceite abaixo, você confirma que:
1. Recebeu os equipamentos listados acima
2. Concorda com os termos de uso e responsabilidade
3. Compromete-se a zelar pela guarda e conservação dos equipamentos
4. Está ciente que o uso indevido pode gerar responsabilidades

**Para confirmar o aceite, clique no link abaixo:**
{acceptance_link}

Este link expira em 24 horas.

Em caso de dúvidas, entre em contato com o operador responsável.

Atenciosamente,
Equipe Solução Equipamentos`;

export const defaultTermTemplate = `TERMO DE RESPONSABILIDADE DE USO DE EQUIPAMENTOS

Eu, {NOME_FUNCIONARIO}, portador(a) do CPF nº {CPF_FUNCIONARIO}, declaro ter recebido da empresa SOLUÇÃO TI os equipamentos relacionados abaixo, em perfeitas condições de uso e conservação.

EQUIPAMENTOS:
{LISTA_EQUIPAMENTOS}

Comprometo-me a:
1. Utilizar os equipamentos única e exclusivamente para fins profissionais;
2. Zelar pela guarda, conservação e limpeza dos equipamentos;
3. Comunicar imediatamente à empresa qualquer dano, defeito ou extravio;
4. Devolver os equipamentos quando solicitado ou no desligamento da empresa.

Local e Data: {DATA_ATUAL}

__________________________________________
{NOME_FUNCIONARIO}`;

// Função para substituir variáveis no texto
export function replaceTemplateVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  Object.keys(variables).forEach(key => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), variables[key]);
  });
  return result;
}

// Função para obter configurações do localStorage
export function getSMTPConfig(): SMTPConfig {
  try {
    const saved = localStorage.getItem('smtp_config');
    return saved ? JSON.parse(saved) : defaultSMTPConfig;
  } catch {
    return defaultSMTPConfig;
  }
}

// Função para salvar configurações no localStorage
export function saveSMTPConfig(config: SMTPConfig): void {
  localStorage.setItem('smtp_config', JSON.stringify(config));
}

// Função para obter texto de aceite
export function getAcceptanceText(): string {
  try {
    const saved = localStorage.getItem('acceptance_text');
    return saved || defaultAcceptanceText;
  } catch {
    return defaultAcceptanceText;
  }
}

// Função para salvar texto de aceite
export function saveAcceptanceText(text: string): void {
  localStorage.setItem('acceptance_text', text);
}

export function getTermTemplate(): string {
  try {
    const saved = localStorage.getItem('term_template');
    return saved ? JSON.parse(saved) : defaultTermTemplate;
  } catch {
    return defaultTermTemplate;
  }
}

export function saveTermTemplate(text: string): void {
  localStorage.setItem('term_template', JSON.stringify(text));
}
