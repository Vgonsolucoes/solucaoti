import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import { User } from '../types/database';

interface UserFormProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  user?: User | null;
  onSuccess: () => void;
  formType?: 'employee' | 'system';
}

// Função para gerar UUID compatível com navegador
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para navegadores que não suportam crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function UserForm({ open, setOpen, user, onSuccess, formType = 'system' }: UserFormProps) {
  const [loading, setLoading] = useState(false);
  const [rateLimitTimeout, setRateLimitTimeout] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<User> & { password?: string }>(
    user || {
      email: '',
      full_name: '',
      position: '',
      department: '',
      cpf: '',
      phone: '',
      whatsapp: '',
      role: formType === 'employee' ? 'employee' : 'operator',
      status: 'active',
      password: '',
    }
  );

  useEffect(() => {
    console.log('UserForm useEffect - user:', user, 'formType:', formType); // Debug log
    if (user) {
      setFormData(user);
    } else {
      const newFormData: Partial<User> & { password?: string } = {
        email: '',
        full_name: '',
        position: '',
        department: '',
        cpf: '',
        phone: '',
        whatsapp: '',
        role: formType === 'employee' ? 'employee' : 'operator',
        status: 'active',
        password: '',
      };
      console.log('Setting initial form data:', newFormData); // Debug log
      setFormData(newFormData);
    }
  }, [user, formType]);

  // Clear rate limit timeout when modal is closed
  useEffect(() => {
    if (!open && rateLimitTimeout !== null) {
      setRateLimitTimeout(null);
    }
  }, [open, rateLimitTimeout]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log('Submitting form with data:', formData); // Debug log

    try {
      if (user?.id) {
        // Update existing user (without password)
        const { password, ...dataToUpdate } = formData;
        const { error } = await supabase
          .from('users')
          .update(dataToUpdate)
          .eq('id', user.id);
        if (error) throw error;
      } else {
        // Create new user with authentication
        if (formType !== 'employee' && (!formData.password || formData.password.length < 6)) {
          alert('A senha deve ter pelo menos 6 caracteres.');
          return;
        }

        // Step 1: Check if user already exists in auth
        try {
          const { data: existingUsers, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', formData.email);

          if (checkError) throw checkError;
          if (existingUsers && existingUsers.length > 0) {
            alert('Este e-mail já está cadastrado no sistema.');
            return;
          }
        } catch (checkError: any) {
          console.error('Error checking existing user:', checkError);
          alert('Erro ao verificar e-mail existente. Tente novamente.');
          return;
        }

        let userId: string;
        
        if (formType === 'employee') {
          // For employees, create user directly in database without auth
          const { password, ...userData } = formData;
          userId = generateUUID();
          console.log('Creating employee user with data:', userData); // Debug log
          const { error: dbError } = await supabase
            .from('users')
            .insert([{ ...userData, id: userId }]);

          if (dbError) throw dbError;
        } else {
          // For operators, create Supabase Auth user
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email!,
            password: formData.password,
          });

          if (authError) throw authError;
          if (!authData.user) throw new Error('Erro ao criar usuário de autenticação');

          // Step 3: Create user profile in database
          const { password, ...userData } = formData;
          console.log('Creating operator user with data:', userData); // Debug log
          const { error: dbError } = await supabase
            .from('users')
            .insert([{ ...userData, id: authData.user.id }]);

          if (dbError) throw dbError;
        }

      }
      onSuccess();
      setOpen(false);
    } catch (error: any) {
      console.error('Error saving user:', error);
      let errorMessage = 'Erro ao salvar usuário. Verifique os dados e tente novamente.';
      if (error.message?.includes('User already registered')) {
        errorMessage = 'Este e-mail já está cadastrado no sistema.';
      } else if (error.message?.includes('rate limit exceeded') || error.message?.includes('Rate limit exceeded')) {
        errorMessage = 'Limite de cadastro excedido. Aguarde 60 segundos antes de tentar novamente.';
        // Set a 60-second timeout
        setRateLimitTimeout(60);
        const interval = setInterval(() => {
          setRateLimitTimeout(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(interval);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
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
                      {user ? 
                        (formType === 'employee' ? 'Editar Funcionário' : 'Editar Operador') : 
                        (formType === 'employee' ? 'Novo Funcionário' : 'Novo Operador')
                      }
                    </Dialog.Title>
                    <div className="mt-4">
                      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label htmlFor="full_name" className="block text-sm font-medium leading-6 text-gray-900">Nome Completo</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="full_name"
                              id="full_name"
                              required
                              value={formData.full_name}
                              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">E-mail Corporativo</label>
                          <div className="mt-1">
                            <input
                              type="email"
                              name="email"
                              id="email"
                              required
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="cpf" className="block text-sm font-medium leading-6 text-gray-900">CPF</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="cpf"
                              id="cpf"
                              required
                              value={formData.cpf}
                              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="position" className="block text-sm font-medium leading-6 text-gray-900">Cargo</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="position"
                              id="position"
                              value={formData.position}
                              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="department" className="block text-sm font-medium leading-6 text-gray-900">Departamento</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="department"
                              id="department"
                              value={formData.department}
                              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium leading-6 text-gray-900">Telefone</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="phone"
                              id="phone"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="whatsapp" className="block text-sm font-medium leading-6 text-gray-900">WhatsApp</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="whatsapp"
                              id="whatsapp"
                              value={formData.whatsapp}
                              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="role" className="block text-sm font-medium leading-6 text-gray-900">Permissão</label>
                          <select
                            id="role"
                            name="role"
                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            value={formData.role}
                            onChange={(e) => {
                              if (formType !== 'employee') {
                                setFormData({ ...formData, role: e.target.value as any });
                              }
                            }}
                            disabled={formType === 'employee'}
                          >
                            {formType === 'employee' ? (
                              <option value="employee">Funcionário</option>
                            ) : (
                              <>
                                <option value="operator">Operador RH</option>
                                <option value="master_operator">Operador Master</option>
                                <option value="admin">Admin</option>
                              </>
                            )}
                          </select>
                        </div>

                        {!user && formType !== 'employee' && (
                          <div>
                            <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">Senha</label>
                            <div className="mt-1">
                              <input
                                type="password"
                                name="password"
                                id="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                                minLength={6}
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label htmlFor="status" className="block text-sm font-medium leading-6 text-gray-900">Status</label>
                          <select
                            id="status"
                            name="status"
                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                          >
                            <option value="active">Ativo</option>
                            <option value="inactive">Inativo</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2 mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={loading || rateLimitTimeout !== null}
                            className={clsx(
                              'inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:ml-3 sm:w-auto',
                              rateLimitTimeout !== null 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-[#2eafa4] hover:bg-[#258f86] focus-visible:outline-[#2eafa4]'
                            )}
                          >
                            {loading ? 'Salvando...' : rateLimitTimeout !== null ? `Aguarde ${rateLimitTimeout}s` : 'Salvar'}
                          </button>
                          <button
                            type="button"
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                            onClick={() => setOpen(false)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
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
