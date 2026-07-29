import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { Device } from '../types/database';

interface DeviceFormProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  device?: Device | null;
  onSuccess: () => void;
}

export default function DeviceForm({ open, setOpen, device, onSuccess }: DeviceFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Device>>(
    device || {
      code: '',
      name: '',
      type: 'Notebook',
      brand: '',
      category: 'Computadores',
      serial_number: '',
      asset_number: '',
      origin: 'Próprio',
      condition: 'Novo',
      invoice_number: '',
      rental_value: null,
      notes: '',
      status: 'available',
      created_at: '',
      updated_at: '',
    }
  );

  React.useEffect(() => {
    if (device) {
      setFormData(device);
    } else {
      setFormData({
        code: '',
        name: '',
        type: 'Notebook',
        brand: '',
        category: 'Computadores',
        serial_number: '',
        asset_number: '',
        origin: 'Próprio',
        condition: 'Novo',
        invoice_number: '',
        rental_value: null,
        notes: '',
        status: 'available',
        created_at: '',
        updated_at: '',
      });
    }
  }, [device]);

  const checkUniqueFields = async (code: string, serialNumber: string, excludeId?: string) => {
    try {
      // Verificar código único
      let codeQuery = supabase
        .from('devices')
        .select('id')
        .eq('code', code);
      
      if (excludeId) {
        codeQuery = codeQuery.neq('id', excludeId);
      }
      
      const { data: codeData } = await codeQuery;
      
      if (codeData && codeData.length > 0) {
        return { valid: false, field: 'code', message: 'Código já existe. Por favor, use um código único.' };
      }
      
      // Verificar número de série único
      let serialQuery = supabase
        .from('devices')
        .select('id')
        .eq('serial_number', serialNumber);
      
      if (excludeId) {
        serialQuery = serialQuery.neq('id', excludeId);
      }
      
      const { data: serialData } = await serialQuery;
      
      if (serialData && serialData.length > 0) {
        return { valid: false, field: 'serial_number', message: 'Número de série já existe. Por favor, use um número de série único.' };
      }
      
      return { valid: true };
    } catch (error) {
      console.error('Error checking unique fields:', error);
      return { valid: false, message: 'Erro ao verificar campos únicos.' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validação básica
      if (!formData.code || !formData.name || !formData.serial_number) {
        alert('Por favor, preencha todos os campos obrigatórios (Código, Nome e Nº de Série).');
        return;
      }

      // Verificar campos únicos
      const uniqueCheck = await checkUniqueFields(
        formData.code!,
        formData.serial_number!,
        device?.id
      );
      
      if (!uniqueCheck.valid) {
        alert(uniqueCheck.message);
        return;
      }

      const now = new Date().toISOString();
      const dataBase: any = {
        ...formData,
        updated_at: now,
        ...(device?.id ? {} : { created_at: now })
      };
      // Normalizar valor da locação: converter string para número ou null
      if (typeof dataBase.rental_value === 'string') {
        const n = parseFloat(dataBase.rental_value.replace(/\./g, '').replace(',', '.'));
        dataBase.rental_value = isNaN(n) ? null : n;
      }
      if (dataBase.rental_value === undefined) {
        delete dataBase.rental_value;
      }

      // Remover campos de ID e datas que devem ser gerenciados pelo banco
      if (!device?.id) {
        delete dataBase.id;
        delete dataBase.created_at; // Deixar o banco gerenciar
      }
      delete dataBase.updated_at; // Deixar o banco gerenciar

      const doSave = async () => {
        if (device?.id) {
          return await supabase.from('devices').update(dataBase).eq('id', device.id);
        } else {
          return await supabase.from('devices').insert([dataBase]);
        }
      };

      let { error } = await doSave();
      // Se a coluna não existir no banco, tentar novamente sem rental_value
      const msg = (error?.message || '').toString();
      const missingRental =
        error &&
        (
          error.code === '42703' ||
          /column .*rental_value.* does not exist/i.test(msg) ||
          /could not find the 'rental_value' column of 'devices' in the schema cache/i.test(msg)
        );
      if (missingRental) {
        const fallback = { ...dataBase };
        delete fallback.rental_value;
        const res = device?.id
          ? await supabase.from('devices').update(fallback).eq('id', device.id)
          : await supabase.from('devices').insert([fallback]);
        error = res.error;
        if (!error && formData.rental_value != null) {
          console.warn('Coluna rental_value não existe no banco. Salvo sem valor da locação.');
        }
      }
      if (error) throw error;
      onSuccess();
      setOpen(false);
    } catch (error: any) {
      console.error('Error saving device:', error);
      let errorMessage = 'Erro ao salvar dispositivo. Verifique os dados e tente novamente.';
      
      if (error.code === '23505') {
        errorMessage = 'Código ou número de série já existe. Por favor, use valores únicos.';
      } else if (error.code === '23502') {
        errorMessage = 'Campos obrigatórios não preenchidos. Verifique todos os campos obrigatórios.';
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
                      {device ? 'Editar Dispositivo' : 'Cadastrar Dispositivo'}
                    </Dialog.Title>
                    <div className="mt-4">
                      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="code" className="block text-sm font-medium leading-6 text-gray-900">Código</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="code"
                              id="code"
                              required
                              value={formData.code}
                              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">Nome do Dispositivo</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="name"
                              id="name"
                              required
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="type" className="block text-sm font-medium leading-6 text-gray-900">Tipo</label>
                          <select
                            id="type"
                            name="type"
                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          >
                            <option>Notebook</option>
                            <option>Desktop</option>
                            <option>Monitor</option>
                            <option>Celular</option>
                            <option>Tablet</option>
                            <option>Case</option>
                            <option>Periférico</option>
                            <option>Outro</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="brand" className="block text-sm font-medium leading-6 text-gray-900">Marca</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="brand"
                              id="brand"
                              value={formData.brand}
                              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="category" className="block text-sm font-medium leading-6 text-gray-900">Categoria</label>
                          <select
                            id="category"
                            name="category"
                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          >
                            <option>Computadores</option>
                            <option>Periféricos</option>
                            <option>Fone de Ouvido c/ Microfone</option>
                            <option>Mochila</option>
                            <option>Mouse</option>
                            <option>Impressoras</option>
                            <option>Móveis</option>
                            <option>Acessórios</option>
                            <option>Rede</option>
                            <option>Outros</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="serial_number" className="block text-sm font-medium leading-6 text-gray-900">Nº de Série</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="serial_number"
                              id="serial_number"
                              required
                              value={formData.serial_number}
                              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="asset_number" className="block text-sm font-medium leading-6 text-gray-900">Nº de Patrimônio</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="asset_number"
                              id="asset_number"
                              value={formData.asset_number}
                              onChange={(e) => setFormData({ ...formData, asset_number: e.target.value })}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="origin" className="block text-sm font-medium leading-6 text-gray-900">Origem</label>
                          <select
                            id="origin"
                            name="origin"
                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            value={formData.origin}
                            onChange={(e) => setFormData({ ...formData, origin: e.target.value as any })}
                          >
                            <option>Locado</option>
                            <option>Próprio</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="condition" className="block text-sm font-medium leading-6 text-gray-900">Estado</label>
                          <select
                            id="condition"
                            name="condition"
                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            value={formData.condition}
                            onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                          >
                            <option>Novo</option>
                            <option>Usado</option>
                            <option>Avariado</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="rental_value" className="block text-sm font-medium leading-6 text-gray-900">
                            Valor da locação (R$) <span className="text-gray-400">(opcional)</span>
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              name="rental_value"
                              id="rental_value"
                              value={
                                formData.rental_value !== null && formData.rental_value !== undefined
                                  ? String(formData.rental_value)
                                  : ''
                              }
                              onChange={(e) => {
                                const v = e.target.value;
                                setFormData({
                                  ...formData,
                                  rental_value: v === '' ? null : (Number.isNaN(parseFloat(v)) ? null : parseFloat(v))
                                });
                              }}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                              placeholder="Ex.: 199.90"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="invoice_number" className="block text-sm font-medium leading-6 text-gray-900">Nº da Nota Fiscal</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="invoice_number"
                              id="invoice_number"
                              value={formData.invoice_number}
                              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label htmlFor="notes" className="block text-sm font-medium leading-6 text-gray-900">Observações</label>
                          <div className="mt-1">
                            <textarea
                              id="notes"
                              name="notes"
                              rows={3}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#2eafa4] sm:text-sm sm:leading-6"
                              value={formData.notes}
                              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2 mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex w-full justify-center rounded-md bg-[#2eafa4] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#258f86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2eafa4] sm:ml-3 sm:w-auto"
                          >
                            {loading ? 'Salvando...' : 'Salvar'}
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
