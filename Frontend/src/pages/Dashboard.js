import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BuildingOfficeIcon,
  UsersIcon,
  CreditCardIcon,
  KeyIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  // Obtener estadísticas de viviendas
  const { data: viviendasStats, isLoading: loadingViviendas } = useQuery(
    'viviendas-stats',
    () => api.get('/api/viviendas/estadisticas/resumen').then(res => res.data)
  );

  // Obtener estadísticas de residentes
  const { data: residentesStats, isLoading: loadingResidentes } = useQuery(
    'residentes-stats',
    () => api.get('/api/residentes/estadisticas/resumen').then(res => res.data)
  );

  // Obtener estadísticas de pagos
  const { data: pagosStats, isLoading: loadingPagos } = useQuery(
    'pagos-stats',
    () => api.get('/api/pagos/estadisticas/resumen').then(res => res.data)
  );

  // Obtener estadísticas de accesos
  const { data: accesosStats, isLoading: loadingAccesos } = useQuery(
    'accesos-stats',
    () => api.get('/api/accesos/estadisticas/resumen').then(res => res.data)
  );

  // Obtener estadísticas de gastos
  const { data: gastosStats, isLoading: loadingGastos } = useQuery(
    'gastos-stats',
    () => api.get('/api/gastos/estadisticas/resumen').then(res => res.data)
  );

  const isLoading = loadingViviendas || loadingResidentes || loadingPagos || loadingAccesos || loadingGastos;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Viviendas',
      value: viviendasStats?.total || 0,
      icon: BuildingOfficeIcon,
      change: '+12%',
      changeType: 'positive',
      color: 'bg-blue-500',
    },
    {
      name: 'Residentes Activos',
      value: residentesStats?.activos || 0,
      icon: UsersIcon,
      change: '+5%',
      changeType: 'positive',
      color: 'bg-green-500',
    },
    {
      name: 'Pagos Pendientes',
      value: pagosStats?.pendientes || 0,
      icon: CreditCardIcon,
      change: '-8%',
      changeType: 'negative',
      color: 'bg-yellow-500',
    },
    {
      name: 'Balance Gastos',
      value: gastosStats?.balance || 0,
      icon: BanknotesIcon,
      change: gastosStats?.balance >= 0 ? '+$' + gastosStats?.balance?.toLocaleString() : '-$' + Math.abs(gastosStats?.balance || 0).toLocaleString(),
      changeType: gastosStats?.balance >= 0 ? 'positive' : 'negative',
      color: gastosStats?.balance >= 0 ? 'bg-green-500' : 'bg-red-500',
    },
    {
      name: 'Accesos Activos',
      value: accesosStats?.general?.activos || 0,
      icon: KeyIcon,
      change: '+3%',
      changeType: 'positive',
      color: 'bg-purple-500',
    },
  ];

  const viviendasChartData = [
    { name: 'Ocupadas', value: viviendasStats?.ocupadas || 0, color: '#10b981' },
    { name: 'Desocupadas', value: viviendasStats?.desocupadas || 0, color: '#6b7280' },
    { name: 'En Construcción', value: viviendasStats?.enConstruccion || 0, color: '#f59e0b' },
    { name: 'En Venta', value: viviendasStats?.enVenta || 0, color: '#ef4444' },
  ];

  const pagosChartData = [
    { name: 'Pagados', value: pagosStats?.pagados || 0, color: '#10b981' },
    { name: 'Pendientes', value: pagosStats?.pendientes || 0, color: '#f59e0b' },
    { name: 'Vencidos', value: pagosStats?.vencidos || 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Resumen general del fraccionamiento privado
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((item) => (
          <div key={item.name} className="stat-card">
            <div className="stat-card-body">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-md ${item.color}`}>
                  <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="stat-card-title">{item.name}</dt>
                    <dd className="stat-card-value">{item.value}</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div className={`stat-card-change ${
                  item.changeType === 'positive' ? 'stat-card-change-positive' : 'stat-card-change-negative'
                }`}>
                  {item.changeType === 'positive' ? (
                    <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-5 w-5" />
                  ) : (
                                          <ArrowTrendingDownIcon className="self-center flex-shrink-0 h-5 w-5" />
                  )}
                  <span className="ml-2">{item.change}</span>
                  <span className="sr-only">
                    {item.changeType === 'positive' ? 'Increased' : 'Decreased'} by {item.change}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Viviendas Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Estado de Viviendas
            </h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={viviendasChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {viviendasChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pagos Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Estado de Pagos
            </h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pagosChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Acciones Rápidas
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <BuildingOfficeIcon className="h-6 w-6 text-primary-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">Nueva Vivienda</span>
            </button>
            <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <UsersIcon className="h-6 w-6 text-primary-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">Nuevo Residente</span>
            </button>
            <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <CreditCardIcon className="h-6 w-6 text-primary-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">Registrar Pago</span>
            </button>
            <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <KeyIcon className="h-6 w-6 text-primary-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">Nuevo Acceso</span>
            </button>
          </div>
        </div>
             </div>
     </div>
   );
 };

export default Dashboard; 