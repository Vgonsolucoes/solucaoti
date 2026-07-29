import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface ChartsProps {
  categoryData: {
    labels: string[];
    data: number[];
  };
  statusData: {
    labels: string[];
    data: number[];
  };
}

export default function DashboardCharts({ categoryData, statusData }: ChartsProps) {
  const pieData = {
    labels: categoryData.labels,
    datasets: [
      {
        data: categoryData.data,
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const barData = {
    labels: statusData.labels,
    datasets: [
      {
        label: 'Quantidade',
        data: statusData.data,
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
  };

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Equipamentos por Categoria</h3>
        <div className="h-64 flex justify-center">
          <Pie data={pieData} options={options} />
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Status dos Equipamentos</h3>
        <div className="h-64">
          <Bar options={options} data={barData} />
        </div>
      </div>
    </div>
  );
}
