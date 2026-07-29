import React, { useState, useEffect } from 'react';
import { getSMTPConfig, saveSMTPConfig, getAcceptanceText, saveAcceptanceText, SMTPConfig } from '@/utils/emailConfig';

export function EmailConfigTab() {
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig>(getSMTPConfig());
  const [acceptanceText, setAcceptanceText] = useState(getAcceptanceText());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testEmail, setTestEmail] = useState<string>(getSMTPConfig().user || getSMTPConfig().fromEmail || '');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    const savedSMTP = getSMTPConfig();
    const savedText = getAcceptanceText();
    setSmtpConfig(savedSMTP);
    setAcceptanceText(savedText);
  }, []);

  const handleSave = () => {
    setSaveStatus('saving');
    try {
      saveSMTPConfig(smtpConfig);
      saveAcceptanceText(acceptanceText);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleTestEmail = async () => {
    setTestStatus('testing');
    try {
      const res = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtpConfig }),
      });
      const data = await res.json();
      setTestStatus(res.ok && data.ok ? 'success' : 'error');
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch (error) {
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  const handleReset = () => {
    const { defaultSMTPConfig, defaultAcceptanceText } = require('@/utils/emailConfig');
    setSmtpConfig(defaultSMTPConfig);
    setAcceptanceText(defaultAcceptanceText);
  };

  const handleSendTest = async () => {
    setSendStatus('sending');
    try {
      const res = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtpConfig, to: testEmail }),
      });
      const data = await res.json();
      setSendStatus(res.ok && data.ok ? 'success' : 'error');
      setTimeout(() => setSendStatus('idle'), 3000);
    } catch {
      setSendStatus('error');
      setTimeout(() => setSendStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuração SMTP */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Configuração SMTP</h3>
          <div className="flex space-x-2">
            <button
              onClick={handleTestEmail}
              disabled={testStatus === 'testing'}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {testStatus === 'testing' ? 'Testando...' : 'Testar Conexão'}
            </button>
            <button
              onClick={handleSendTest}
              disabled={sendStatus === 'sending' || !testEmail}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {sendStatus === 'sending' ? 'Enviando...' : 'Enviar e-mail de teste'}
            </button>
          </div>
        </div>

        {testStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">✅ Conexão SMTP testada com sucesso!</p>
          </div>
        )}

        {testStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">❌ Erro na conexão SMTP. Verifique as configurações.</p>
          </div>
        )}

        {sendStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">✅ E-mail de teste enviado com sucesso!</p>
          </div>
        )}

        {sendStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">❌ Falha ao enviar o e-mail de teste.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Servidor SMTP (Host)
            </label>
            <input
              type="text"
              value={smtpConfig.host}
              onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="mail.uaihost.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Porta
            </label>
            <input
              type="number"
              value={smtpConfig.port}
              onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) || 465 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="465"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuário
            </label>
            <input
              type="text"
              value={smtpConfig.user}
              onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="send@uaihost.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={smtpConfig.pass}
              onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email de Envio (From)
            </label>
            <input
              type="email"
              value={smtpConfig.fromEmail}
              onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="no-reply@sesolucao.com.br"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome de Envio
            </label>
            <input
              type="text"
              value={smtpConfig.fromName}
              onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Aceite Solução Equipamentos"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={smtpConfig.secure}
              onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Usar conexão segura (TLS/SSL)</span>
          </label>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail para teste
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="destinatario@exemplo.com"
            />
          </div>
          <div>
            <button
              onClick={handleSendTest}
              disabled={sendStatus === 'sending' || !testEmail}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {sendStatus === 'sending' ? 'Enviando...' : 'Enviar e-mail de teste'}
            </button>
          </div>
        </div>
      </div>

      {/* Texto de Aceite */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Texto de Aceite</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Texto do Email de Aceite
          </label>
          <textarea
            value={acceptanceText}
            onChange={(e) => setAcceptanceText(e.target.value)}
            rows={15}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            placeholder="Prezado(a) {employee_name},..."
          />
        </div>

        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Variáveis Disponíveis:</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><code>{'{employee_name}'}</code> - Nome do funcionário</p>
            <p><code>{'{employee_email}'}</code> - Email do funcionário</p>
            <p><code>{'{device_list}'}</code> - Lista de equipamentos</p>
            <p><code>{'{assignment_date}'}</code> - Data da vinculação</p>
            <p><code>{'{operator_name}'}</code> - Nome do operador</p>
            <p><code>{'{acceptance_link}'}</code> - Link de aceite</p>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-between">
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Restaurar Padrões
        </button>
        
        <div className="flex space-x-3">
          {saveStatus === 'saved' && (
            <div className="flex items-center text-green-600">
              ✅ Configurações salvas com sucesso!
            </div>
          )}
          
          {saveStatus === 'error' && (
            <div className="flex items-center text-red-600">
              ❌ Erro ao salvar configurações
            </div>
          )}
          
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  );
}
