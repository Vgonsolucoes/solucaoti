import React, { useEffect, useMemo, useState } from 'react';
import { DocumentChartBarIcon, PrinterIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

export default function Reports() {
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [returnsData, setReturnsData] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    alert('Funcionalidade de envio por e-mail será implementada em breve.');
  };

  const rangeStart = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    switch (dateRange) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setMonth(now.getMonth() - 1);
    }
    return start;
  }, [dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Buscar vinculações
      const { data: assignmentsRaw, error: aErr } = await supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false });
      if (aErr) throw aErr;

      // Usuarios relacionados às vinculações
      const userIds = [...new Set((assignmentsRaw || []).map((a: any) => a.user_id).filter(Boolean))];
      let usersMap: Record<string, any> = {};
      if (userIds.length) {
        const { data: users, error: uErr } = await supabase
          .from('users')
          .select('*')
          .in('id', userIds);
        if (!uErr && users) {
          usersMap = Object.fromEntries(users.map((u: any) => [u.id, u]));
        }
      }

      const deviceIdsSet = new Set<string>();
      (assignmentsRaw || []).forEach((a: any) => {
        (a.device_ids || []).forEach((d: string) => deviceIdsSet.add(d));
      });
      let devicesMap: Record<string, any> = {};
      if (deviceIdsSet.size) {
        const allIds = Array.from(deviceIdsSet);
        const { data: devices } = await supabase.from('devices').select('id,name,brand,code').in('id', allIds);
        if (devices) {
          devicesMap = Object.fromEntries(devices.map((d: any) => [d.id, d]));
        }
      }

      // Aplicar filtro por período usando assignment_date (se existir) ou created_at
      let assignmentsFiltered = (assignmentsRaw || []).filter((a: any) => {
        const d = a.assignment_date ? new Date(a.assignment_date) : new Date(a.created_at);
        return d >= rangeStart;
      }).map((a: any) => {
        const devs = (a.device_ids || []).map((id: string) => devicesMap[id]).filter(Boolean);
        return {
          ...a,
          user: usersMap[a.user_id] || null,
          devicesInfo: devs,
        };
      });

      if (selectedUser !== 'all') {
        assignmentsFiltered = assignmentsFiltered.filter((a: any) => a.user_id === selectedUser);
      }

      // Buscar devoluções
      const { data: returnsRaw, error: rErr } = await supabase
        .from('returns')
        .select('*')
        .order('created_at', { ascending: false });
      if (rErr) throw rErr;

      // Para mostrar o funcionário nas devoluções: pegar assignments e users relacionados
      const assignmentIds = [...new Set((returnsRaw || []).map((r: any) => r.assignment_id).filter(Boolean))];
      let assignmentMap: Record<string, any> = {};
      if (assignmentIds.length) {
        const { data: aList } = await supabase
          .from('assignments')
          .select('*')
          .in('id', assignmentIds);
        if (aList) {
          assignmentMap = Object.fromEntries(aList.map((it: any) => [it.id, it]));
        }
      }
      // usuários para devoluções
      const returnUserIds = [...new Set(Object.values(assignmentMap).map((a: any) => a.user_id).filter(Boolean))];
      let returnUsersMap: Record<string, any> = {};
      if (returnUserIds.length) {
        const { data: uList } = await supabase
          .from('users')
          .select('*')
          .in('id', returnUserIds);
        if (uList) {
          returnUsersMap = Object.fromEntries(uList.map((u: any) => [u.id, u]));
        }
      }
      const returnDeviceIds = new Set<string>();
      Object.values(assignmentMap).forEach((a: any) => {
        (a.device_ids || []).forEach((d: string) => returnDeviceIds.add(d));
      });
      let returnDevicesMap: Record<string, any> = devicesMap;
      if (returnDeviceIds.size) {
        const ids = Array.from(returnDeviceIds).filter((id) => !devicesMap[id]);
        if (ids.length) {
          const { data: moreDevices } = await supabase.from('devices').select('id,name,brand,code').in('id', ids);
          if (moreDevices) {
            moreDevices.forEach((d: any) => {
              returnDevicesMap[d.id] = d;
            });
          }
        }
      }
      const returnsFiltered = (returnsRaw || []).filter((r: any) => {
        const d = r.return_date ? new Date(r.return_date) : new Date(r.created_at);
        return d >= rangeStart;
      }).map((r: any) => {
        const a = assignmentMap[r.assignment_id];
        const u = a ? returnUsersMap[a.user_id] : null;
        const devs = (a?.device_ids || []).map((id: string) => returnDevicesMap[id]).filter(Boolean);
        return { ...r, assignment: a || null, user: u || null, devicesInfo: devs };
      });

      const filteredReturns = selectedUser === 'all'
        ? returnsFiltered
        : returnsFiltered.filter((r: any) => r.assignment?.user_id === selectedUser);

      setAssignments(assignmentsFiltered);
      setReturnsData(filteredReturns);
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err);
      setAssignments([]);
      setReturnsData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedUser]);

  useEffect(() => {
    const loadUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .order('full_name');
      setUsers(data || []);
    };
    loadUsers();
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Relatórios</h1>
          <p className="mt-2 text-sm text-gray-700">
            Relatórios detalhados de vinculações e devoluções de equipamentos.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex gap-3">
          <button
            type="button"
            onClick={handleEmail}
            className="block rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <EnvelopeIcon className="h-5 w-5 inline-block mr-1 text-gray-500" />
            Enviar por E-mail
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="block rounded-md bg-[#2eafa4] px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#258f86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2eafa4]"
          >
            <PrinterIcon className="h-5 w-5 inline-block mr-1" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 bg-white p-4 rounded-lg shadow-sm flex flex-wrap gap-4 items-center">
        <div>
          <label htmlFor="report-type" className="block text-sm font-medium text-gray-700">Tipo de Relatório</label>
          <select
            id="report-type"
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-[#2eafa4] focus:outline-none focus:ring-[#2eafa4] sm:text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="assignments">Vinculações</option>
            <option value="returns">Devoluções</option>
          </select>
        </div>

        <div>
          <label htmlFor="date-range" className="block text-sm font-medium text-gray-700">Período</label>
          <select
            id="date-range"
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-[#2eafa4] focus:outline-none focus:ring-[#2eafa4] sm:text-sm"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="week">Última Semana</option>
            <option value="month">Último Mês</option>
            <option value="quarter">Último Trimestre</option>
            <option value="year">Último Ano</option>
          </select>
        </div>

        <div>
          <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700">Funcionário</label>
          <select
            id="user-filter"
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-[#2eafa4] focus:outline-none focus:ring-[#2eafa4] sm:text-sm"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="all">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({u.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="mt-8">
        {loading ? (
          <div className="flow-root bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2eafa4] mx-auto"></div>
            <p className="mt-3 text-sm">Carregando dados…</p>
          </div>
        ) : (
          <>
            {(filterType === 'all' || filterType === 'assignments') && (
              <div className="flow-root bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Vinculações</h2>
                {assignments.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <DocumentChartBarIcon className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-sm">Nenhuma vinculação no período selecionado.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Data</th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Funcionário</th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Equipamentos</th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Operador Responsável</th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {assignments.map((a) => (
                          <tr key={a.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                              {format(new Date(a.assignment_date || a.created_at), 'dd/MM/yyyy')}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
                              {a.user?.full_name || '—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {a.user?.email || '—'}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-700">
                              {a.devicesInfo && a.devicesInfo.length
                                ? a.devicesInfo.map((d: any) => d ? `${d.name}${d.brand ? ' - ' + d.brand : ''}${d.code ? ' (' + d.code + ')' : ''}` : '').filter(Boolean).join('; ')
                                : '—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
                              {'—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              {a.term_accepted ? (
                                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                  Aprovada
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                                  Pendente
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {(filterType === 'all' || filterType === 'returns') && (
              <div className="flow-root bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Devoluções</h2>
                {returnsData.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <DocumentChartBarIcon className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-sm">Nenhuma devolução no período selecionado.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Data</th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Funcionário</th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tipo</th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Condição</th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Equipamentos</th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Operador Responsável</th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Observações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {returnsData.map((r) => (
                          <tr key={r.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                              {format(new Date(r.return_date || r.created_at), 'dd/MM/yyyy')}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
                              {r.user?.full_name || '—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
                              {r.report_type}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
                              {r.condition || '—'}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-700">
                              {r.devicesInfo && r.devicesInfo.length
                                ? r.devicesInfo.map((d: any) => d ? `${d.name}${d.brand ? ' - ' + d.brand : ''}${d.code ? ' (' + d.code + ')' : ''}` : '').filter(Boolean).join('; ')
                                : '—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
                              {'—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {r.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
