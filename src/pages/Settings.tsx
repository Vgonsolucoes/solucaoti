import React, { useEffect, useState } from 'react';
import { DocumentTextIcon, CogIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { EmailConfigTab } from '@/components/settings/EmailConfigTab';
import { defaultTermTemplate, getTermTemplate, saveTermTemplate } from '@/utils/emailConfig';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('acceptance-text');

  const [termTemplate, setTermTemplate] = useState(getTermTemplate());
  const [termSaveStatus, setTermSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setTermTemplate(getTermTemplate());
  }, []);

  const tabs = [
    { id: 'acceptance-text', name: 'Texto de Aceite', icon: DocumentTextIcon },
    { id: 'template', name: 'Modelo do Termo', icon: DocumentTextIcon },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Configurações</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gerencie as configurações gerais do sistema.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  activeTab === tab.id
                    ? 'border-[#2eafa4] text-[#2eafa4]'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium'
                )}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <tab.icon
                  className={clsx(
                    activeTab === tab.id ? 'text-[#2eafa4]' : 'text-gray-400 group-hover:text-gray-500',
                    '-ml-0.5 mr-2 h-5 w-5'
                  )}
                  aria-hidden="true"
                />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mt-8">
        {activeTab === 'acceptance-text' && <EmailConfigTab />}

        {activeTab === 'template' && (
          <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-6 sm:gap-x-6">
            <div className="sm:col-span-6">
              <h2 className="text-lg font-medium leading-6 text-gray-900 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-500" />
                Modelo do Termo de Responsabilidade
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Edite o modelo padrão do termo que será enviado ou impresso para os funcionários. Use as variáveis entre chaves (ex: {'{NOME_FUNCIONARIO}'}) para substituição automática.
              </p>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="termTemplate" className="block text-sm font-medium leading-6 text-gray-900">
                Texto do Termo
              </label>
              <div className="mt-2">
                <textarea
                  id="termTemplate"
                  name="termTemplate"
                  rows={15}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6 font-mono"
                  value={termTemplate}
                  onChange={(e) => setTermTemplate(e.target.value)}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Variáveis disponíveis: {'{NOME_FUNCIONARIO}'}, {'{CPF_FUNCIONARIO}'} (ou {'{CPF}'}), {'{LISTA_EQUIPAMENTOS}'}, {'{DATA_ATUAL}'}
              </p>
            </div>

            <div className="sm:col-span-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="text-sm">
                {termSaveStatus === 'saved' && <span className="text-green-700">Configurações salvas com sucesso.</span>}
                {termSaveStatus === 'error' && <span className="text-red-700">Erro ao salvar configurações.</span>}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTermTemplate(defaultTermTemplate);
                    try {
                      saveTermTemplate(defaultTermTemplate);
                      setTermSaveStatus('saved');
                      setTimeout(() => setTermSaveStatus('idle'), 3000);
                    } catch {
                      setTermSaveStatus('error');
                      setTimeout(() => setTermSaveStatus('idle'), 3000);
                    }
                  }}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Restaurar padrão
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTermSaveStatus('saving');
                    try {
                      saveTermTemplate(termTemplate);
                      setTermSaveStatus('saved');
                      setTimeout(() => setTermSaveStatus('idle'), 3000);
                    } catch {
                      setTermSaveStatus('error');
                      setTimeout(() => setTermSaveStatus('idle'), 3000);
                    }
                  }}
                  className="rounded-md bg-[#2eafa4] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#258f86]"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
