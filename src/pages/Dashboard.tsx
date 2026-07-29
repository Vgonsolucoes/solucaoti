import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import DashboardStats from '../components/DashboardStats';
import DashboardCharts from '../components/DashboardCharts';
import { Device } from '../types/database';

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*');

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalDevices: devices.length,
    availableDevices: devices.filter(d => d.status === 'available').length,
    inUseDevices: devices.filter(d => d.status === 'assigned').length,
    damagedDevices: devices.filter(d => d.status === 'damaged').length,
    ownedDevices: devices.filter(d => d.origin === 'Próprio').length,
    rentedDevices: devices.filter(d => d.origin === 'Locado').length,
    rentedTotalValue: devices
      .filter(d => d.origin === 'Locado' && d.rental_value != null)
      .reduce((sum, d) => sum + (Number(d.rental_value) || 0), 0),
  };

  const getCategoryData = () => {
    const categories: Record<string, number> = {};
    devices.forEach(d => {
      const cat = d.category || 'Outros';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return {
      labels: Object.keys(categories),
      data: Object.values(categories),
    };
  };

  const getStatusData = () => {
    const statusMap: Record<string, string> = {
      available: 'Disponível',
      assigned: 'Em Uso',
      waiting_acceptance: 'Aguardando Aceite',
      damaged: 'Avariado',
    };
    
    const statuses: Record<string, number> = {};
    devices.forEach(d => {
      const statusLabel = statusMap[d.status] || d.status;
      statuses[statusLabel] = (statuses[statusLabel] || 0) + 1;
    });

    return {
      labels: Object.keys(statuses),
      data: Object.values(statuses),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <DashboardStats {...stats} />
      
      {/* Cards específicos: Notebooks, Mochilas, Headsets, Impressoras */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(() => {
          const notebookTotal = devices.filter(d => d.type === 'Notebook').length;
          const notebookInUse = devices.filter(d => d.type === 'Notebook' && d.status === 'assigned').length;
          const celularTotal = devices.filter(d => d.type === 'Celular').length;
          const celularInUse = devices.filter(d => d.type === 'Celular' && d.status === 'assigned').length;
          const mochilaTotal = devices.filter(d => d.category === 'Mochila').length;
          const mochilaInUse = devices.filter(d => d.category === 'Mochila' && d.status === 'assigned').length;
          const headsetLabel = 'Fone de Ouvido c/ Microfone';
          const headsetTotal = devices.filter(d => d.category === headsetLabel).length;
          const headsetInUse = devices.filter(d => d.category === headsetLabel && d.status === 'assigned').length;
          const impressorasLabel = 'Impressoras';
          const impressorasTotal = devices.filter(d => d.category === impressorasLabel).length;
          const impressorasInUse = devices.filter(d => d.category === impressorasLabel && d.status === 'assigned').length;
          
          const cards = [
            { title: 'Notebooks', total: notebookTotal, inUse: notebookInUse },
            { title: 'Celulares', total: celularTotal, inUse: celularInUse },
            { title: 'Mochilas', total: mochilaTotal, inUse: mochilaInUse },
            { title: 'Fone c/ Microfone', total: headsetTotal, inUse: headsetInUse },
            { title: 'Impressoras', total: impressorasTotal, inUse: impressorasInUse },
          ];
          
          return cards.map(c => (
            <div
              key={c.title}
              className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-5 shadow sm:px-6 sm:pt-6"
            >
              <dt>
                <p className="truncate text-sm font-medium text-gray-500">{c.title}</p>
              </dt>
              <dd className="mt-2 flex items-baseline justify-between">
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{c.total}</p>
                  <p className="mt-1 text-xs text-gray-500">Total</p>
                </div>
                <div className="self-end">
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                    Em uso: {c.inUse}
                  </span>
                </div>
              </dd>
            </div>
          ));
        })()}
      </div>
      
      <DashboardCharts 
        categoryData={getCategoryData()}
        statusData={getStatusData()}
      />
    </div>
  );
}
