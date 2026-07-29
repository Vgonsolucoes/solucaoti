import React from 'react';
import {
  ComputerDesktopIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

interface StatsProps {
  totalDevices: number;
  availableDevices: number;
  inUseDevices: number;
  damagedDevices: number;
  ownedDevices: number;
  rentedDevices: number;
  rentedTotalValue: number;
}

export default function DashboardStats({ 
  totalDevices, 
  availableDevices, 
  inUseDevices, 
  ownedDevices,
  rentedDevices,
  rentedTotalValue
}: StatsProps) {
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const stats: Array<{ name: string; value: string | number; icon: any; color: string; bg: string }> = [
    { name: 'Total de Equipamentos', value: totalDevices, icon: ComputerDesktopIcon, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Próprios', value: ownedDevices, icon: BuildingOfficeIcon, color: 'text-purple-600', bg: 'bg-purple-100' },
    { name: 'Locados', value: rentedDevices, icon: CreditCardIcon, color: 'text-orange-600', bg: 'bg-orange-100' },
    { name: 'Valor total locados', value: currency.format(rentedTotalValue || 0), icon: BanknotesIcon, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { name: 'Disponíveis', value: availableDevices, icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'Em Uso', value: inUseDevices, icon: ExclamationTriangleIcon, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  ];

  return (
    <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((item) => (
        <div
          key={item.name}
          className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6"
        >
          <dt>
            <div className={`absolute rounded-md ${item.bg} p-3`}>
              <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500">{item.name}</p>
          </dt>
          <dd className="ml-16 flex items-baseline pb-1 sm:pb-7">
            <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
          </dd>
        </div>
      ))}
    </dl>
  );
}
