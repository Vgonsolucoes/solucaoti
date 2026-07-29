import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ComputerDesktopIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon,
  ArrowLeftOnRectangleIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { Link, useLocation, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, roles: ['admin', 'master_operator', 'operator', 'employee'] },
  { name: 'Dispositivos', href: '/devices', icon: ComputerDesktopIcon, roles: ['admin', 'master_operator'] },
  { name: 'Funcionários', href: '/employees', icon: UserGroupIcon, roles: ['admin', 'master_operator', 'operator'] },
  { name: 'Operadores', href: '/users', icon: ShieldCheckIcon, roles: ['admin', 'master_operator'] },
  { name: 'Vinculações', href: '/assignments', icon: ClipboardDocumentCheckIcon, roles: ['admin', 'master_operator'] },
  { name: 'Devoluções', href: '/returns', icon: ArrowPathIcon, roles: ['admin', 'master_operator'] },
  { name: 'Relatórios', href: '/reports', icon: DocumentChartBarIcon, roles: ['admin', 'master_operator'] },
  { name: 'Importar Dispositivos', href: '/import-devices', icon: DocumentChartBarIcon, roles: ['admin', 'master_operator'] },
  { name: 'Configurações', href: '/settings', icon: Cog6ToothIcon, roles: ['admin', 'master_operator'] },
];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { signOut, profile } = useAuth();

  return (
    <>
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/80" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                      <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                        <span className="sr-only">Close sidebar</span>
                        <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </button>
                    </div>
                  </Transition.Child>
                  {/* Sidebar component for mobile */}
                  <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-900 px-6 pb-4 ring-1 ring-white/10">
                    <div className="flex flex-col items-center pt-6 pb-4">
                      <img
                        className="h-14 w-auto mb-3"
                        src="https://sesolucao.com.br/wp-content/themes/solucao/img/logo__solucao.png"
                        alt="Solução Equipamentos"
                      />
                      <span className="text-white font-medium text-xs text-center uppercase tracking-wide">Controle de Acervo de TI</span>
                    </div>
                    <nav className="flex flex-1 flex-col">
                      <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                          <ul role="list" className="-mx-2 space-y-1">
                            {navigation
                              .filter((item) => !item.roles || (profile?.role && item.roles.includes(profile.role)))
                              .map((item) => (
                              <li key={item.name}>
                                <Link
                                  to={item.href}
                                  className={clsx(
                                    location.pathname === item.href
                                      ? 'bg-[#2eafa4] text-white'
                                      : 'text-gray-400 hover:text-white hover:bg-slate-800',
                                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                  )}
                                >
                                  <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                  {item.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                        <li className="mt-auto">
                          <button
                            onClick={() => signOut()}
                            className="text-gray-400 hover:text-white hover:bg-slate-800 group -mx-2 flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full"
                          >
                            <ArrowLeftOnRectangleIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                            Sair
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-900 px-6 pb-4">
            <div className="flex flex-col items-center pt-6 pb-4">
               <img
                className="h-14 w-auto mb-3"
                src="https://sesolucao.com.br/wp-content/themes/solucao/img/logo__solucao.png"
                alt="Solução Equipamentos"
              />
               <span className="text-white font-medium text-xs text-center uppercase tracking-wide">Controle de Acervo de TI</span>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation
                      .filter((item) => !item.roles || (profile?.role && item.roles.includes(profile.role)))
                      .map((item) => (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={clsx(
                            location.pathname === item.href
                              ? 'bg-[#2eafa4] text-white'
                              : 'text-gray-400 hover:text-white hover:bg-slate-800',
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                          )}
                        >
                          <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
                <li className="mt-auto">
                   <div className="text-xs font-semibold leading-6 text-gray-400">
                      Logado como: {profile?.full_name} ({profile?.role})
                   </div>
                  <button
                    onClick={() => signOut()}
                    className="text-gray-400 hover:text-white hover:bg-slate-800 group -mx-2 flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full mt-2"
                  >
                    <ArrowLeftOnRectangleIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                    Sair
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="lg:pl-72">
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <div className="flex flex-1" />
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                {/* Profile dropdown could go here */}
              </div>
            </div>
          </div>

          <main className="py-10 bg-[#e6e6e6] min-h-screen">
            <div className="px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
