import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Assignment, User } from '../types/database';
import AssignmentForm from '../components/AssignmentForm';
import { PlusIcon, EyeIcon, PaperAirplaneIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { format } from 'date-fns';

interface AssignmentWithDetails extends Assignment {
  user: User;
  devices_count: number;
}

export default function Assignments() {
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      // In a real app with proper relations set up in Supabase client type generation,
      // we could do a joined query. For now, we'll fetch and join manually or use a view.
      // Let's fetch assignments and then fetch users.
      
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      if (!assignmentsData || assignmentsData.length === 0) {
        setAssignments([]);
        return;
      }

      // Fetch users for these assignments
      const userIds = [...new Set(assignmentsData.map(a => a.user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Map data
      const assignmentsWithDetails = assignmentsData.map(assignment => {
        const user = usersData?.find(u => u.id === assignment.user_id);
        return {
          ...assignment,
          user: user!,
          devices_count: assignment.device_ids?.length || 0,
        };
      }).filter(a => a.user); // Filter out any assignments where user wasn't found (shouldn't happen with FKs)

      setAssignments(assignmentsWithDetails);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setOpenForm(true);
  };

  const handleResendApprovalEmail = async (assignment: AssignmentWithDetails) => {
    if (!assignment.user?.email) {
      alert('Email do funcionário não encontrado');
      return;
    }

    try {
      const { getSMTPConfig, isSMTPConfigUsable, getAcceptanceText } = await import('@/utils/emailConfig');
      const smtpConfig = getSMTPConfig();
      const useUiSmtp = isSMTPConfigUsable(smtpConfig);

      // Buscar dados dos equipamentos
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('name, brand, serial_number')
        .in('id', assignment.device_ids || []);

      if (devicesError || !devicesData) {
        throw new Error('Equipamentos não encontrados');
      }

      // Buscar dados do operador atual
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: operatorData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser?.id)
        .single();

      // Enviar email via backend
      const emailData = {
        employeeName: assignment.user.full_name,
        employeeEmail: assignment.user.email,
        deviceList: devicesData.map((d: any) => `${d.name}${d.brand ? ' - ' + d.brand : ''} (${d.serial_number || 'S/N'})`),
        assignmentDate: new Date().toLocaleDateString('pt-BR'),
        operatorName: operatorData?.full_name || 'Operador',
        acceptanceLink: `${window.location.origin}/accept-assignment/${assignment.id}`
      };

      const acceptanceText = getAcceptanceText();
      const resp = await fetch('/api/send-acceptance-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(useUiSmtp ? { smtpConfig } : {}),
          emailData,
          assignmentId: assignment.id,
          baseUrl: window.location.origin,
          acceptanceText
        }),
      });
      const respData = await resp.json().catch(() => ({}));
      const sent = resp.ok && respData.ok;
      if (sent) {
        alert('Email de aprovação reenviado com sucesso!');
      } else {
        const msg = respData?.error || 'Erro ao reenviar email de aprovação. Verifique as configurações SMTP em Configurações > E-mail/SMTP.';
        alert(msg);
      }
    } catch (error) {
      console.error('Error resending approval email:', error);
      alert('Erro ao reenviar email de aprovação');
    }
  };

  const handleDeleteAssignment = async (assignment: AssignmentWithDetails) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir esta vinculação de ${assignment.user?.full_name} com ${assignment.devices_count} equipamento(s)?\n\n` +
      `Esta ação não poderá ser desfeita.`
    );
    if (!confirmed) return;

    try {
      // Liberar dispositivos (status: available), se houver
      if (assignment.device_ids && assignment.device_ids.length > 0) {
        const { error: devicesError } = await supabase
          .from('devices')
          .update({ status: 'available' })
          .in('id', assignment.device_ids);
        if (devicesError) {
          console.error('Erro ao liberar dispositivos:', devicesError);
        }
      }

      // Excluir a vinculação
      const { error: deleteError } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignment.id);

      if (deleteError) {
        console.error('Erro ao excluir vinculação:', deleteError);
        alert('Erro ao excluir vinculação.');
        return;
      }

      // Atualizar lista
      await fetchAssignments();
      alert('Vinculação excluída com sucesso.');
    } catch (e) {
      console.error('Erro ao excluir vinculação:', e);
      alert('Erro ao excluir vinculação.');
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Vinculações</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gerencie as entregas de equipamentos e termos de responsabilidade.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={handleAddNew}
            className="block rounded-md bg-[#2eafa4] px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#258f86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2eafa4]"
          >
            <PlusIcon className="h-5 w-5 inline-block mr-1" />
            Nova Vinculação
          </button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Data</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Usuário</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Departamento</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Qtd. Equipamentos</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status Termo</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4">Carregando...</td>
                    </tr>
                  ) : assignments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-gray-500">Nenhuma vinculação encontrada.</td>
                    </tr>
                  ) : (
                    assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {format(new Date(assignment.assignment_date), 'dd/MM/yyyy')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{assignment.user?.full_name}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{assignment.user?.department}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{assignment.devices_count}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {(() => {
                            const isReturned = (assignment.device_ids?.length || 0) === 0;
                            if (isReturned) {
                              return (
                                <span
                                  className={clsx(
                                    'bg-gray-100 text-gray-800',
                                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
                                  )}
                                >
                                  Devolvido
                                </span>
                              );
                            }
                            return (
                              <span className={clsx(
                                assignment.term_accepted === null || assignment.term_accepted === false ? 'bg-blue-100 text-blue-800' :
                                assignment.term_accepted === true ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800',
                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
                              )}>
                                {assignment.term_accepted === null || assignment.term_accepted === false ? 'Aguardando Aprovação' :
                                 assignment.term_accepted === true ? 'Aprovado' :
                                 'Pendente'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className={clsx(
                            assignment.term_accepted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800',
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
                          )}>
                            {assignment.term_accepted ? 'Aceito' : 'Pendente'}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex items-center justify-end space-x-2">
                            {(assignment.term_accepted === null || assignment.term_accepted === false) && (assignment.device_ids?.length || 0) > 0 && (
                              <button
                                className="text-blue-600 hover:text-blue-800"
                                onClick={() => handleResendApprovalEmail(assignment)}
                                title="Enviar aceite por email"
                              >
                                <PaperAirplaneIcon className="h-5 w-5" />
                                <span className="sr-only">Enviar aceite por email</span>
                              </button>
                            )}
                            <button
                              className="text-red-600 hover:text-red-800"
                              onClick={() => handleDeleteAssignment(assignment)}
                              title="Excluir vinculação"
                            >
                              <TrashIcon className="h-5 w-5" />
                              <span className="sr-only">Excluir vinculação</span>
                            </button>
                            <button
                              className="text-[#2eafa4] hover:text-[#258f86]"
                              onClick={() => {/* View details logic would go here */}}
                            >
                              <EyeIcon className="h-5 w-5" />
                              <span className="sr-only">Ver detalhes</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AssignmentForm
        open={openForm}
        setOpen={setOpenForm}
        onSuccess={fetchAssignments}
      />
    </div>
  );
}
