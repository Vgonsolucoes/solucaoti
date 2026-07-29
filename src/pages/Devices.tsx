import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Device } from '../types/database';
import DeviceForm from '../components/DeviceForm';
import { PlusIcon, PencilSquareIcon, TrashIcon, FunnelIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
  });
  const { profile } = useAuth();
  const navigate = useNavigate();

  const canEdit = profile?.role === 'admin' || profile?.role === 'operator' || profile?.role === 'master_operator';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'master_operator';
  const canDelete = profile?.role === 'admin' || profile?.role === 'master_operator';

  useEffect(() => {
    fetchDevices();
  }, [filters]);

  const fetchDevices = async () => {
    try {
      let query = supabase.from('devices').select('*').order('created_at', { ascending: false });

      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (device: Device) => {
    setSelectedDevice(device);
    setOpenForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este dispositivo?')) return;

    try {
      const { error } = await supabase.from('devices').delete().eq('id', id);
      if (error) throw error;
      fetchDevices();
    } catch (error) {
      console.error('Error deleting device:', error);
      alert('Erro ao excluir dispositivo.');
    }
  };

  const handleAddNew = () => {
    setSelectedDevice(null);
    setOpenForm(true);
  };

  const handleImportCSV = () => {
    navigate('/devices/import');
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      available: 'bg-green-100 text-green-800',
      assigned: 'bg-red-100 text-red-800',
      waiting_acceptance: 'bg-yellow-100 text-yellow-800',
      damaged: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      available: 'Disponível',
      assigned: 'Em Uso',
      waiting_acceptance: 'Aguardando',
      damaged: 'Avariado',
    };
    return (
      <span className={clsx(
        styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800',
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
      )}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Dispositivos</h1>
          <p className="mt-2 text-sm text-gray-700">
            Lista de todos os equipamentos cadastrados no sistema.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex gap-3">
          {isAdmin && (
            <button
              type="button"
              onClick={handleImportCSV}
              className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <ArrowUpTrayIcon className="h-5 w-5 inline-block mr-1" />
              Importar CSV
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={handleAddNew}
              className="block rounded-md bg-[#2eafa4] px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#258f86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2eafa4]"
            >
              <PlusIcon className="h-5 w-5 inline-block mr-1" />
              Cadastrar Dispositivo
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 flex gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center">
          <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-700">Filtros:</span>
        </div>
        <select
          className="block w-40 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">Todas Categorias</option>
          <option value="Computadores">Computadores</option>
          <option value="Periféricos">Periféricos</option>
          <option value="Fone de Ouvido c/ Microfone">Fone de Ouvido c/ Microfone</option>
          <option value="Mochila">Mochila</option>
          <option value="Mouse">Mouse</option>
          <option value="Impressoras">Impressoras</option>
          <option value="Móveis">Móveis</option>
          <option value="Acessórios">Acessórios</option>
          <option value="Rede">Rede</option>
          <option value="Outros">Outros</option>
        </select>
        <select
          className="block w-40 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Todos Status</option>
          <option value="available">Disponível</option>
          <option value="assigned">Em Uso</option>
          <option value="waiting_acceptance">Aguardando</option>
          <option value="damaged">Avariado</option>
        </select>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Código</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Nome</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Categoria</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Valor Locação</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Nº Série</th>
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
                  ) : devices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-gray-500">Nenhum dispositivo encontrado.</td>
                    </tr>
                  ) : (
                    devices.map((device) => (
                      <tr key={device.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {device.code}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{device.name}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{device.category}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {device.rental_value != null
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(device.rental_value)
                            : '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {getStatusBadge(device.status)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{device.serial_number}</td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          {canEdit && (
                            <button
                              onClick={() => handleEdit(device)}
                              className="text-[#2eafa4] hover:text-[#258f86] mr-4"
                            >
                              <PencilSquareIcon className="h-5 w-5" />
                              <span className="sr-only">Editar, {device.name}</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(device.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" />
                              <span className="sr-only">Excluir, {device.name}</span>
                            </button>
                          )}
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

      <DeviceForm
        open={openForm}
        setOpen={setOpenForm}
        device={selectedDevice}
        onSuccess={fetchDevices}
      />
    </div>
  );
}
