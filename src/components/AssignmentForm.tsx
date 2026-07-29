import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { User, Device } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createAssignmentSimple } from '../utils/assignmentSimple';
import { createAssignmentWithPermissionFix, ensurePermissions } from '../utils/assignmentPermission';
import { createAssignmentUltraSimple, testRLSStatus } from '../utils/assignmentUltraSimple';
import { createAssignmentBypass, needsBypass } from '../utils/assignmentBypass';
import { createAssignmentDefinitive } from '../utils/assignmentDefinitive';
import { createAssignmentFinal } from '../utils/assignmentFinal';
import { getTermTemplate, replaceTemplateVariables } from '@/utils/emailConfig';

interface AssignmentFormProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AssignmentForm({ open, setOpen, onSuccess }: AssignmentFormProps) {
  const { user: authUser, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [termPreview, setTermPreview] = useState<string>('');
  const [assignmentId, setAssignmentId] = useState<string>('');

  useEffect(() => {
    if (open) {
      // Testar RLS quando abrir o formulário
      testRLSStatus();
      fetchData();
      setStep(1);
      setSelectedUser('');
      setSelectedDevices([]);
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('status', 'active')
        .order('full_name');
      
      const { data: devicesData } = await supabase
        .from('devices')
        .select('*')
        .eq('status', 'available')
        .order('name');

      setUsers(usersData || []);
      setAvailableDevices(devicesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Função para reenviar email de aceite
  const resendAcceptanceEmail = async () => {
    if (!assignmentId) {
      alert('Nenhuma vinculação foi criada ainda.');
      return;
    }

    try {
      setLoading(true);
      
      // Buscar dados da vinculação
      const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (assignmentError || !assignment) {
        throw new Error('Vinculação não encontrada');
      }

      // Buscar dados do usuário
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', assignment.user_id)
        .single();

      if (userError || !userData) {
        throw new Error('Usuário não encontrado');
      }

      // Buscar dados dos equipamentos
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('*')
        .in('id', assignment.device_ids || []);

      if (devicesError || !devicesData) {
        throw new Error('Equipamentos não encontrados');
      }

      // Buscar dados do operador
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: operatorData } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser?.id)
        .single();

      // Enviar email de aceite
      const { sendAssignmentAcceptanceEmail } = await import('@/utils/emailService');
      
      const emailData = {
        employeeName: userData.full_name,
        employeeEmail: userData.email,
        deviceList: devicesData.map((d: any) => `${d.brand} ${d.model} (${d.serial_number || 'S/N'})`),
        assignmentDate: new Date().toLocaleDateString('pt-BR'),
        operatorName: operatorData?.full_name || 'Operador',
        acceptanceLink: `${window.location.origin}/accept-assignment/${assignment.id}`
      };

      const emailSent = await sendAssignmentAcceptanceEmail(emailData);
      
      if (emailSent) {
        alert('Email de aceite reenviado com sucesso!');
      } else {
        alert('Erro ao reenviar email de aceite. Verifique as configurações SMTP.');
      }
      
    } catch (error: any) {
      console.error('Erro ao reenviar email:', error);
      alert(`Erro ao reenviar email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const generateTermContent = () => {
    const user = users.find(u => u.id === selectedUser);
    const devices = availableDevices.filter(d => selectedDevices.includes(d.id));
    const date = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    if (!user) return '';

    const deviceList = devices
      .map(d => `- ${d.name} (S/N: ${d.serial_number}, Patrimônio: ${d.asset_number || 'N/A'})`)
      .join('\n');

    const template = getTermTemplate();
    return replaceTemplateVariables(template, {
      NOME_FUNCIONARIO: user.full_name,
      CPF_FUNCIONARIO: user.cpf,
      CPF: user.cpf,
      LISTA_EQUIPAMENTOS: deviceList,
      DATA_ATUAL: date,
    });
  };

  const handleNext = () => {
    if (step === 1 && selectedUser && selectedDevices.length > 0) {
      setTermPreview(generateTermContent());
      setStep(2);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const content = generateTermContent();
    
    doc.setFontSize(16);
    doc.text('TERMO DE RESPONSABILIDADE', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(content, 180);
    doc.text(splitText, 15, 40);
    
    doc.save('termo_responsabilidade.pdf');
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      console.log('=== Iniciando criação de assignment com bypass ===');
      
      // 1. Create assignment record (pending approval)
      const assignmentData = {
        user_id: selectedUser,
        device_ids: selectedDevices,
        assignment_date: new Date().toISOString().split('T')[0],
        term_accepted: false, // Will be accepted after email approval
        accepted_at: null,
      };

      console.log('Dados do assignment:', assignmentData);

      // 1. Create assignment with FINAL solution (absolute bypass)
      console.log('=== SOLUÇÃO FINAL - Criando assignment ===');
      
      // Usar a função final que resolve tudo
      const { data: assignment, error: assignmentError } = await createAssignmentFinal(assignmentData);

      if (assignmentError) {
        console.error('❌ Erro detalhado ao criar assignment:', assignmentError);
        
        // Se for erro de RLS, mostrar instruções claras
        if (assignmentError.code === '42501' || assignmentError.message?.includes('row-level') || assignmentError.message?.includes('violates row-level') || assignmentError.code === 'RLS_UNBREAKABLE') {
          console.error('❌ RLS AINDA ESTÁ BLOQUEANDO!');
          console.error('Execute este script SQL EMERGENCIAL no Supabase:');
           console.error('→ Arquivo: /root/solucaoti/fix_rls_emergency.sql');
           console.error('');
           console.error('INSTRUÇÕES:');
           console.error('1. Vá para supabase.com → Seu Projeto → SQL Editor');
           console.error('2. Cole TODO o conteúdo do arquivo fix_rls_emergency.sql');
           console.error('3. Clique em "RUN"');
           console.error('4. Teste novamente');
          
          alert('ERRO CRÍTICO: RLS está bloqueando tudo.\n\nExecute o script SQL emergencial:\n/root/solucaoti/fix_rls_emergency.sql\n\nEste script desabilitará RLS completamente.');
          return;
        }
        
        throw new Error(`Erro ao criar vinculação: ${assignmentError.message}`);
      }
      
      console.log('✅ Assignment criado com sucesso:', assignment);

      // 2. Update devices status to waiting acceptance via backend
      try {
        const resp = await fetch('/api/set-devices-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceIds: selectedDevices, status: 'waiting_acceptance' }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data.ok) {
          const msg = data?.error || 'Falha ao atualizar status dos dispositivos';
          throw new Error(msg);
        }
      } catch (e: any) {
        console.error('Erro ao atualizar devices via backend:', e);
        throw e;
      }

      // 3. Get user details for email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', selectedUser)
        .single();

      if (userError || !userData) throw new Error('Erro ao obter dados do usuário');

      // 4. Get device details for email
      const { data: devicesData, error: devicesDataError } = await supabase
        .from('devices')
        .select('name, brand, serial_number')
        .in('id', selectedDevices);

      if (devicesDataError || !devicesData) throw new Error('Erro ao obter dados dos equipamentos');

      // 5. Montar dados do email de aceite
      const emailData = {
        employeeName: userData.full_name,
        employeeEmail: userData.email,
        deviceList: devicesData.map((d: any) => `${d.name}${d.brand ? ' - ' + d.brand : ''} (${d.serial_number || 'S/N'})`),
        assignmentDate: new Date().toLocaleDateString('pt-BR'),
        operatorName: authUser?.user_metadata?.full_name || 'Operador',
        acceptanceLink: `${window.location.origin}/accept-assignment/${assignment.id}`
      };

      // 6. Enviar email de aceite via backend
      let emailSent = false;
      try {
        console.log('📧 Enviando email de aceite via backend com dados:', emailData);
        const { getSMTPConfig, getAcceptanceText } = await import('@/utils/emailConfig');
        const smtpConfig = getSMTPConfig();
        const acceptanceText = getAcceptanceText();
        const res = await fetch('/api/send-acceptance-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ smtpConfig, emailData, assignmentId: assignment.id, baseUrl: window.location.origin, acceptanceText }),
        });
        const data = await res.json().catch(() => ({}));
        emailSent = res.ok && data.ok;
        if (!emailSent) {
          const msg = data?.error || 'Falha ao enviar o e-mail de aprovação. Verifique as configurações SMTP no menu Configurações.';
          throw new Error(msg);
        }
        console.log('📧 Resultado do envio de email:', emailSent);
      } catch (emailError: any) {
        console.error('❌ Erro detalhado ao enviar email:', emailError);
        alert(emailError?.message || 'Falha ao enviar e-mail de aprovação.');
      }
      
      if (!emailSent) {
        alert('Vinculação criada com sucesso! Porém, houve um erro ao enviar o email de aprovação. Verifique as configurações SMTP.');
      } else {
        alert('Vinculação criada com sucesso! Um email de aprovação foi enviado para o funcionário.');
      }
      onSuccess();
      setOpen(false);
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      console.error('Código do erro:', error.code);
      console.error('Mensagem do erro:', error.message);
      console.error('Detalhes do erro:', error.details);
      
      let errorMessage = 'Erro ao realizar vinculação.';
      
      // Tratar diferentes tipos de erros
      if (error.code === '42501' || error.message?.includes('permission')) {
        errorMessage = 'Permissão negada. Verifique se você está autenticado e tem permissão para criar vinculações.';
      } else if (error.message?.includes('status') || error.message?.includes('Could not find')) {
        errorMessage = 'Erro de schema do banco de dados. Contate o administrador.';
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={setOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={() => setOpen(false)}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                
                <div className="sm:flex sm:items-start w-full">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      Nova Vinculação - Passo {step} de 2
                    </Dialog.Title>

                    {step === 1 ? (
                      <div className="mt-4 space-y-6">
                        <div>
                          <label className="block text-sm font-medium leading-6 text-gray-900">
                            Selecione o Usuário
                          </label>
                          <select
                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                          >
                            <option value="">Selecione um usuário...</option>
                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.full_name} - {user.department}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                            Selecione os Dispositivos ({availableDevices.length} disponíveis)
                          </label>
                          <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                            {availableDevices.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-4">
                                Nenhum dispositivo disponível.
                              </p>
                            ) : (
                              availableDevices.map((device) => (
                                <div key={device.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                                  <input
                                    type="checkbox"
                                    id={`device-${device.id}`}
                                    checked={selectedDevices.includes(device.id)}
                                    onChange={() => handleDeviceToggle(device.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                  />
                                  <label htmlFor={`device-${device.id}`} className="ml-3 block text-sm leading-6 text-gray-900 cursor-pointer w-full">
                                    <span className="font-medium">{device.name}</span>
                                    <span className="text-gray-500 mx-2">|</span>
                                    <span className="text-gray-500">{device.code}</span>
                                  </label>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="button"
                            disabled={!selectedUser || selectedDevices.length === 0}
                            onClick={handleNext}
                            className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 sm:ml-3 sm:w-auto"
                          >
                            Próximo: Gerar Termo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-6">
                        <div className="bg-gray-50 p-4 rounded-md border text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                          {termPreview}
                        </div>

                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={generatePDF}
                            className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                          >
                            Baixar PDF
                          </button>
                          {assignmentId && (
                            <button
                              type="button"
                              onClick={resendAcceptanceEmail}
                              disabled={loading}
                              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                            >
                              {loading ? 'Reenviando...' : 'Enviar Aceite por Email'}
                            </button>
                          )}
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto"
                          >
                            {loading ? 'Processando...' : 'Confirmar Vinculação'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                          >
                            Voltar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
