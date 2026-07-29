import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types/database';
import UserForm from '../components/UserForm';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { profile } = useAuth();

  const canEdit = profile?.role === 'admin' || profile?.role === 'operator' || profile?.role === 'master_operator';
  const canDelete = profile?.role === 'admin' || profile?.role === 'master_operator';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'employee')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setOpenForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erro ao excluir usuário.');
    }
  };

  const handleAddNew = () => {
    setSelectedUser(null);
    setOpenForm(true);
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-800',
      master_operator: 'bg-blue-100 text-blue-800',
      operator: 'bg-gray-100 text-gray-800',
      employee: 'bg-green-100 text-green-800',
    };
    const labels = {
      admin: 'Admin',
      master_operator: 'Op. Master',
      operator: 'Operador RH',
      employee: 'Funcionário',
    };
    return (
      <span className={clsx(
        styles[role as keyof typeof styles] || 'bg-gray-100 text-gray-800',
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
      )}>
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Operadores do Sistema</h1>
          <p className="mt-2 text-sm text-gray-700">
            Lista de usuários com acesso administrativo ou operacional ao sistema.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          {canEdit && (
            <button
              type="button"
              onClick={handleAddNew}
              className="block rounded-md bg-[#2eafa4] px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#258f86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2eafa4]"
            >
              <PlusIcon className="h-5 w-5 inline-block mr-1" />
              Novo Operador
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Nome</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Cargo</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Departamento</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Permissão</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4">Carregando...</td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-gray-500">Nenhum usuário encontrado.</td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {user.full_name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.email}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.position}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.department}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          {canEdit && (
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-[#2eafa4] hover:text-[#258f86] mr-4"
                            >
                              <PencilSquareIcon className="h-5 w-5" />
                              <span className="sr-only">Editar, {user.full_name}</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" />
                              <span className="sr-only">Excluir, {user.full_name}</span>
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

      <UserForm
        open={openForm}
        setOpen={setOpenForm}
        user={selectedUser}
        onSuccess={fetchUsers}
        formType="system"
      />
    </div>
  );
}
