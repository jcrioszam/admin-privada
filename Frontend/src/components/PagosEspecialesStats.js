import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { formatCurrency } from '../utils/currencyFormatter';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const PagosEspecialesStats = ({ pagosEspeciales }) => {
  if (!pagosEspeciales || pagosEspeciales.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay datos suficientes para mostrar estadísticas
      </div>
    );
  }

  // Calcular estadísticas generales
  const estadisticasGenerales = {
    total: pagosEspeciales.length,
    activos: pagosEspeciales.filter(p => p.estado === 'Activo' || p.estado === 'Pendiente').length,
    completados: pagosEspeciales.filter(p => p.estado === 'Completado' || p.estado === 'Pagado').length,
    montoTotal: pagosEspeciales.reduce((total, p) => total + (p.monto || 0), 0),
    totalRecaudado: pagosEspeciales.reduce((total, p) => {
      const recaudado = p.pagosRealizados?.reduce((sum, pago) => sum + pago.montoPagado, 0) || 0;
      return total + recaudado;
    }, 0),
    totalViviendasPagadas: pagosEspeciales.reduce((total, p) => total + (p.pagosRealizados?.length || 0), 0)
  };

  // Datos para el gráfico de barras - Progreso por proyecto
  const proyectosData = pagosEspeciales.map(pago => {
    const totalRecaudado = pago.pagosRealizados?.reduce((total, pago) => total + pago.montoPagado, 0) || 0;
    const viviendasPagadas = pago.pagosRealizados?.length || 0;
    const totalViviendas = pago.aplicaATodasLasViviendas 
      ? 25 // Total de viviendas del sistema
      : (pago.viviendasSeleccionadas || []).length;
    const porcentajeCompletado = totalViviendas > 0 ? (viviendasPagadas / totalViviendas) * 100 : 0;

    return {
      nombre: pago.tipo,
      recaudado: totalRecaudado,
      meta: pago.monto || 0,
      viviendasPagadas,
      totalViviendas,
      porcentajeCompletado
    };
  });

  // Gráfico de barras - Progreso por proyecto
  const barChartData = {
    labels: proyectosData.map(p => p.nombre),
    datasets: [
      {
        label: 'Recaudado',
        data: proyectosData.map(p => p.recaudado),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
      {
        label: 'Meta',
        data: proyectosData.map(p => p.meta),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      }
    ],
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Progreso de Recaudación por Proyecto',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${formatCurrency(value)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  // Gráfico de dona - Estado de proyectos
  const doughnutData = {
    labels: ['Activos', 'Completados'],
    datasets: [
      {
        data: [estadisticasGenerales.activos, estadisticasGenerales.completados],
        backgroundColor: [
          'rgba(251, 191, 36, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgba(251, 191, 36, 1)',
          'rgba(34, 197, 94, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Estado de Proyectos',
      },
    },
  };

  // Gráfico de barras - Viviendas pagadas vs total
  const viviendasChartData = {
    labels: proyectosData.map(p => p.nombre),
    datasets: [
      {
        label: 'Viviendas Pagadas',
        data: proyectosData.map(p => p.viviendasPagadas),
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgba(147, 51, 234, 1)',
        borderWidth: 1,
      },
      {
        label: 'Total Viviendas',
        data: proyectosData.map(p => p.totalViviendas),
        backgroundColor: 'rgba(156, 163, 175, 0.8)',
        borderColor: 'rgba(156, 163, 175, 1)',
        borderWidth: 1,
      }
    ],
  };

  const viviendasChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Progreso de Viviendas por Proyecto',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total Proyectos</p>
              <p className="text-2xl font-bold text-blue-900">{estadisticasGenerales.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-yellow-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-600">Activos</p>
              <p className="text-2xl font-bold text-yellow-900">{estadisticasGenerales.activos}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">R</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Total Recaudado</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(estadisticasGenerales.totalRecaudado)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">V</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Viviendas Pagadas</p>
              <p className="text-2xl font-bold text-purple-900">{estadisticasGenerales.totalViviendasPagadas}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras - Progreso de recaudación */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <Bar data={barChartData} options={barChartOptions} />
        </div>

        {/* Gráfico de dona - Estado de proyectos */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
      </div>

      {/* Gráfico de viviendas */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <Bar data={viviendasChartData} options={viviendasChartOptions} />
      </div>

      {/* Tabla de resumen */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Resumen por Proyecto</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proyecto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Meta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recaudado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progreso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Viviendas
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {proyectosData.map((proyecto, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {proyecto.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(proyecto.meta)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {formatCurrency(proyecto.recaudado)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${proyecto.porcentajeCompletado}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {proyecto.porcentajeCompletado.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {proyecto.viviendasPagadas}/{proyecto.totalViviendas}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PagosEspecialesStats;
