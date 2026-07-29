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

// Configuração padrão do SMTP (uaihost.com)
export const defaultSMTPConfig: SMTPConfig = {
  host: 'mail.uaihost.com',
  port: 465,
  secure: true, // true para 465 (SSL), false para outras portas
  user: 'send@uaihost.com',
  pass: 'Vsi@#$2018',
  fromEmail: 'no-reply@sesolucao.com.br',
  fromName: 'Aceite Solução Equipamentos'
};

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
