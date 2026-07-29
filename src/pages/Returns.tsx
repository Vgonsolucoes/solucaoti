import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Return, Assignment, User } from '../types/database';
import ReturnForm from '../components/ReturnForm';
import { PlusIcon, EyeIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { format } from 'date-fns';

interface ReturnWithDetails extends Return {
  assignment: Assignment & {
    user: User;
  };
}

export default function Returns() {
  const [returns, setReturns] = useState<ReturnWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      // Manual join strategy again
      const { data: returnsData, error: returnsError } = await supabase
        .from('returns')
        .select('*')
        .order('created_at', { ascending: false });

      if (returnsError) throw returnsError;

      if (!returnsData || returnsData.length === 0) {
        setReturns([]);
        return;
      }

      const assignmentIds = [...new Set(returnsData.map(r => r.assignment_id))];
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .in('id', assignmentIds);

      if (assignmentsError) throw assignmentsError;

      const userIds = [...new Set(assignmentsData?.map(a => a.user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds);

      if (usersError) throw usersError;

      const returnsWithDetails = returnsData.map(r => {
        const assignment = assignmentsData?.find(a => a.id === r.assignment_id);
        const user = usersData?.find(u => u.id === assignment?.user_id);
        
        return {
          ...r,
          assignment: {
            ...assignment!,
            user: user!,
          },
        };
      }).filter(r => r.assignment && r.assignment.user);

      setReturns(returnsWithDetails);
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setOpenForm(true);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Devoluções</h1>
          <p className="mt-2 text-sm text-gray-700">
            Histórico de devoluções e laudos de avaria.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={handleAddNew}
            className="block rounded-md bg-[#2eafa4] px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#258f86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2eafa4]"
          >
            <PlusIcon className="h-5 w-5 inline-block mr-1" />
            Nova Devolução
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
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tipo</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Condição</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4">Carregando...</td>
                    </tr>
                  ) : returns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-gray-500">Nenhuma devolução encontrada.</td>
                    </tr>
                  ) : (
                    returns.map((ret) => (
                      <tr key={ret.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {format(new Date(ret.return_date), 'dd/MM/yyyy')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{ret.assignment.user.full_name}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{ret.report_type}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className={clsx(
                            ret.condition === 'Bom' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
                          )}>
                            {ret.condition}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            className="text-[#2eafa4] hover:text-[#258f86]"
                            onClick={() => {/* View details logic would go here */}}
                          >
                            <EyeIcon className="h-5 w-5" />
                            <span className="sr-only">Ver detalhes</span>
                          </button>
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

      <ReturnForm
        open={openForm}
        setOpen={setOpenForm}
        onSuccess={fetchReturns}
      />
    </div>
  );
}
