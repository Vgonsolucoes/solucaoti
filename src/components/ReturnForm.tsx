import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { Assignment, User, Device } from '../types/database';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReturnFormProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
}

interface AssignmentWithDetails extends Assignment {
  user: User;
  devices?: Device[]; // In a real app we'd fetch these
}

export default function ReturnForm({ open, setOpen, onSuccess }: ReturnFormProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  
  const [checklist, setChecklist] = useState({
    screen: false,
    case: false,
    keyboard: false,
    battery: false,
    accessories: false,
  });
  const [condition, setCondition] = useState<'Bom' | 'Avariado'>('Bom');
  const [notes, setNotes] = useState('');
  const [termPreview, setTermPreview] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchAssignments();
      setStep(1);
      setSelectedAssignment('');
      setChecklist({
        screen: false,
        case: false,
        keyboard: false,
        battery: false,
        accessories: false,
      });
      setCondition('Bom');
      setNotes('');
    }
  }, [open]);

  const fetchAssignments = async () => {
    try {
      // Fetch active assignments (simplified query logic for demo)
      // Ideally we would filter for assignments that haven't been fully returned
      // For now, we fetch recent assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      if (!assignmentsData || assignmentsData.length === 0) {
        setAssignments([]);
        return;
      }

      const userIds = [...new Set(assignmentsData.map(a => a.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds);

      const assignmentsWithDetails = assignmentsData.map(assignment => {
        const user = usersData?.find(u => u.id === assignment.user_id);
        return {
          ...assignment,
          user: user!,
        };
      }).filter(a => a.user);

      setAssignments(assignmentsWithDetails);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const generateTermContent = () => {
    const assignment = assignments.find(a => a.id === selectedAssignment);
    const date = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    if (!assignment) return '';

    const isDamaged = condition === 'Avariado';
    const title = isDamaged ? 'LAUDO DE AVARIA DE EQUIPAMENTO' : 'TERMO DE DEVOLUÇÃO DE EQUIPAMENTO';

    let content = `
      ${title}

      Eu, ${assignment.user.full_name}, portador(a) do CPF ${assignment.user.cpf}, devolvo à empresa Solução Equipamentos os itens previamente vinculados.

      DATA DE DEVOLUÇÃO: ${date}

      CHECKLIST DE VISTORIA:
      - Tela/Monitor: ${checklist.screen ? 'OK' : 'Não verificado/Problema'}
      - Carcaça: ${checklist.case ? 'OK' : 'Não verificado/Problema'}
      - Teclado/Periféricos: ${checklist.keyboard ? 'OK' : 'Não verificado/Problema'}
      - Bateria/Fonte: ${checklist.battery ? 'OK' : 'Não verificado/Problema'}
      - Acessórios: ${checklist.accessories ? 'OK' : 'Não verificado/Problema'}

      CONDIÇÃO GERAL: ${condition.toUpperCase()}
    `;

    if (notes) {
      content += `\n\nOBSERVAÇÕES:\n${notes}`;
    }

    if (isDamaged) {
      content += `\n\nDeclaro estar ciente das avarias constatadas e descritas neste laudo, estando sujeito às políticas internas da empresa quanto à responsabilidade por danos ao patrimônio.`;
    } else {
      content += `\n\nDeclaro que devolvi os equipamentos nas mesmas condições em que os recebi, ressalvado o desgaste natural pelo uso.`;
    }

    return content;
  };

  const handleNext = () => {
    if (step === 1 && selectedAssignment) {
      setStep(2);
    } else if (step === 2) {
      setTermPreview(generateTermContent());
      setStep(3);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const content = generateTermContent();
    const isDamaged = condition === 'Avariado';
    const title = isDamaged ? 'LAUDO DE AVARIA' : 'TERMO DE DEVOLUÇÃO';
    
    doc.setFontSize(16);
    doc.text(title, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(content, 180);
    doc.text(splitText, 15, 40);
    
    doc.save(isDamaged ? 'laudo_avaria.pdf' : 'termo_devolucao.pdf');
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const assignment = assignments.find(a => a.id === selectedAssignment);
      if (!assignment) return;

      // 1. Criar devolução via backend (bypass RLS) + atualizar status dos dispositivos
      const resp = await fetch('/api/create-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: selectedAssignment,
          inspection_checklist: checklist,
          condition,
          notes,
          report_type: condition === 'Avariado' ? 'Avaria' : 'Devolução',
        }),
      });
      const respData = await resp.json().catch(() => ({}));
      if (!resp.ok || !respData?.ok) {
        throw new Error(respData?.error || 'Erro ao registrar devolução');
      }

      // 3. Send return confirmation email via backend
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', assignment.user_id)
          .single();
        const { data: devicesData } = await supabase
          .from('devices')
          .select('name, brand, serial_number')
          .in('id', assignment.device_ids || []);
        const deviceList = (devicesData || []).map((d: any) => `${d.name}${d.brand ? ' - ' + d.brand : ''} (${d.serial_number || 'S/N'})`);
        const emailData = {
          employeeName: userData?.full_name || 'Colaborador',
          employeeEmail: userData?.email,
          deviceList,
          returnDate: new Date().toLocaleDateString('pt-BR'),
          reportType: condition === 'Avariado' ? 'Avaria' : 'Devolução',
          condition,
          notes
        };
        const { getSMTPConfig, isSMTPConfigUsable } = await import('@/utils/emailConfig');
        const smtpConfig = getSMTPConfig();
        const useUiSmtp = isSMTPConfigUsable(smtpConfig);
        const resp = await fetch('/api/send-return-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(useUiSmtp ? { smtpConfig } : {}),
            emailData
          }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data.ok) {
          console.warn('Falha ao enviar email de devolução:', data?.error);
        }
      } catch (emailErr) {
        console.warn('Erro ao enviar email de devolução:', emailErr);
      }

      onSuccess();
      setOpen(false);
    } catch (error) {
      console.error('Error processing return:', error);
      alert('Erro ao processar devolução.');
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
                      Nova Devolução - Passo {step} de 3
                    </Dialog.Title>

                    {step === 1 && (
                      <div className="mt-4 space-y-6">
                        <div>
                          <label className="block text-sm font-medium leading-6 text-gray-900">
                            Selecione a Vinculação (Usuário)
                          </label>
                          <select
                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            value={selectedAssignment}
                            onChange={(e) => setSelectedAssignment(e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            {assignments.map((assignment) => (
                              <option key={assignment.id} value={assignment.id}>
                                {assignment.user.full_name} - {format(new Date(assignment.assignment_date), 'dd/MM/yyyy')}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="button"
                            disabled={!selectedAssignment}
                            onClick={handleNext}
                            className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 sm:ml-3 sm:w-auto"
                          >
                            Próximo: Checklist
                          </button>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="mt-4 space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-gray-900">Checklist de Vistoria</h4>
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {Object.entries(checklist).map(([key, value]) => (
                              <div key={key} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={key}
                                  checked={value}
                                  onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked })}
                                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <label htmlFor={key} className="ml-2 block text-sm text-gray-900 capitalize">
                                  {key === 'screen' ? 'Tela/Monitor' : 
                                   key === 'case' ? 'Carcaça' : 
                                   key === 'keyboard' ? 'Teclado/Periféricos' : 
                                   key === 'battery' ? 'Bateria/Fonte' : 'Acessórios'}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium leading-6 text-gray-900">
                            Condição Geral
                          </label>
                          <select
                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            value={condition}
                            onChange={(e) => setCondition(e.target.value as any)}
                          >
                            <option value="Bom">Bom</option>
                            <option value="Avariado">Avariado</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium leading-6 text-gray-900">
                            Observações
                          </label>
                          <textarea
                            rows={3}
                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="button"
                            onClick={handleNext}
                            className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                          >
                            Próximo: Gerar Termo/Laudo
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

                    {step === 3 && (
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
                            Baixar {condition === 'Avariado' ? 'Laudo' : 'Termo'}
                          </button>
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto"
                          >
                            {loading ? 'Processando...' : 'Confirmar Devolução'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep(2)}
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
