import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  CalendarIcon, 
  DocumentChartBarIcon, 
  CurrencyDollarIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const ReporteProyectos = () => {
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroFecha, setFiltroFecha] = useState('todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Obtener todos los proyectos
  const { data: proyectos, isLoading } = useQuery({
    queryKey: ['proyectos-reporte'],
    queryFn: async () => {
      const response = await api.get('/api/proyectos-pagos-especiales');
      return response.data;
    },
    refetchInterval: 30000
  });

  // Calcular estadísticas generales
  const estadisticas = useMemo(() => {
    if (!proyectos) return null;

    const total = proyectos.length;
    const activos = proyectos.filter(p => p.estado === 'Activo').length;
    const completados = proyectos.filter(p => p.estado === 'Completado').length;
    const vencidos = proyectos.filter(p => {
      const fechaLimite = new Date(p.fechaLimite);
      const hoy = new Date();
      return p.estado === 'Activo' && isAfter(hoy, fechaLimite);
    }).length;

    const totalRecaudado = proyectos.reduce((sum, proyecto) => {
      return sum + (proyecto.pagosRealizados?.reduce((pSum, pago) => pSum + pago.montoPagado, 0) || 0);
    }, 0);

    const totalEsperado = proyectos.reduce((sum, proyecto) => sum + (proyecto.montoProyecto || 0), 0);
    const totalViviendasPagadas = proyectos.reduce((sum, proyecto) => sum + (proyecto.pagosRealizados?.length || 0), 0);

    return {
      total,
      activos,
      completados,
      vencidos,
      totalRecaudado,
      totalEsperado,
      totalViviendasPagadas,
      porcentajeRecaudado: totalEsperado > 0 ? (totalRecaudado / totalEsperado) * 100 : 0
    };
  }, [proyectos]);

  // Filtrar proyectos
  const proyectosFiltrados = useMemo(() => {
    if (!proyectos) return [];

    let filtrados = [...proyectos];

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      if (filtroEstado === 'vencidos') {
        filtrados = filtrados.filter(p => {
          const fechaLimite = new Date(p.fechaLimite);
          const hoy = new Date();
          return p.estado === 'Activo' && isAfter(hoy, fechaLimite);
        });
      } else {
        filtrados = filtrados.filter(p => p.estado === filtroEstado);
      }
    }

    // Filtro por fecha
    if (filtroFecha !== 'todos') {
      const hoy = new Date();
      if (filtroFecha === 'proximos7dias') {
        const proximos7 = addDays(hoy, 7);
        filtrados = filtrados.filter(p => {
          const fechaLimite = new Date(p.fechaLimite);
          return isAfter(fechaLimite, hoy) && isBefore(fechaLimite, proximos7);
        });
      } else if (filtroFecha === 'rango' && fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        filtrados = filtrados.filter(p => {
          const fechaCreacion = new Date(p.fechaCreacion);
          return fechaCreacion >= inicio && fechaCreacion <= fin;
        });
      }
    }

    return filtrados;
  }, [proyectos, filtroEstado, filtroFecha, fechaInicio, fechaFin]);

  // Datos para gráficas
  const datosGraficas = useMemo(() => {
    if (!proyectos) return { estados: [], recaudacion: [], progreso: [] };

    const estados = [
      { name: 'Activos', value: estadisticas?.activos || 0, color: '#3B82F6' },
      { name: 'Completados', value: estadisticas?.completados || 0, color: '#10B981' },
      { name: 'Vencidos', value: estadisticas?.vencidos || 0, color: '#EF4444' }
    ];

    const recaudacion = proyectos.map(proyecto => {
      const recaudado = proyecto.pagosRealizados?.reduce((sum, pago) => sum + pago.montoPagado, 0) || 0;
      const meta = proyecto.montoProyecto || 0;
      return {
        nombre: proyecto.nombre.length > 15 ? proyecto.nombre.substring(0, 15) + '...' : proyecto.nombre,
        recaudado,
        meta,
        progreso: meta > 0 ? (recaudado / meta) * 100 : 0
      };
    });

    const progreso = proyectos.map(proyecto => {
      const totalViviendas = 25; // Asumiendo 25 viviendas por defecto
      const viviendasPagadas = proyecto.pagosRealizados?.length || 0;
      const porcentaje = (viviendasPagadas / totalViviendas) * 100;
      
      return {
        nombre: proyecto.nombre.length > 15 ? proyecto.nombre.substring(0, 15) + '...' : proyecto.nombre,
        viviendas: viviendasPagadas,
        porcentaje: Math.min(porcentaje, 100)
      };
    });

    return { estados, recaudacion, progreso };
  }, [proyectos, estadisticas]);

  const exportarReporte = () => {
    // Preparar datos para exportación
    const datosExport = proyectosFiltrados.map(proyecto => {
      const recaudado = proyecto.pagosRealizados?.reduce((sum, pago) => sum + pago.montoPagado, 0) || 0;
      const viviendasPagadas = proyecto.pagosRealizados?.length || 0;
      const totalViviendas = 25; // Asumiendo 25 viviendas
      const progreso = (viviendasPagadas / totalViviendas) * 100;

      return {
        Proyecto: proyecto.nombre,
        Descripción: proyecto.descripcion,
        Estado: proyecto.estado,
        'Fecha Límite': format(new Date(proyecto.fechaLimite), 'dd/MM/yyyy', { locale: es }),
        'Monto Esperado': `$${proyecto.montoProyecto?.toLocaleString() || '0'}`,
        'Monto Recaudado': `$${recaudado.toLocaleString()}`,
        'Viviendas Pagadas': `${viviendasPagadas}/${totalViviendas}`,
        'Progreso %': `${progreso.toFixed(1)}%`,
        'Fecha Creación': format(new Date(proyecto.fechaCreacion), 'dd/MM/yyyy', { locale: es })
      };
    });

    // Convertir a CSV
    const headers = Object.keys(datosExport[0] || {});
    const csvContent = [
      headers.join(','),
      ...datosExport.map(row => 
        headers.map(header => `"${row[header]}"`).join(',')
      )
    ].join('\n');

    // Descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_proyectos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporte de Proyectos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Análisis detallado de proyectos de pagos especiales
          </p>
        </div>
        <button
          onClick={exportarReporte}
          className="btn-primary flex items-center"
        >
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Exportar CSV
        </button>
      </div>

      {/* Estadísticas Generales */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <DocumentChartBarIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <div className="text-sm text-gray-500">Total Proyectos</div>
                  <div className="text-2xl font-bold text-blue-600">{estadisticas.total}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <div className="text-sm text-gray-500">Total Recaudado</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${estadisticas.totalRecaudado.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {estadisticas.porcentajeRecaudado.toFixed(1)}% del esperado
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <div className="text-sm text-gray-500">Proyectos Activos</div>
                  <div className="text-2xl font-bold text-yellow-600">{estadisticas.activos}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-3">
                  <div className="text-sm text-gray-500">Proyectos Vencidos</div>
                  <div className="text-2xl font-bold text-red-600">{estadisticas.vencidos}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="form-select"
              >
                <option value="todos">Todos los estados</option>
                <option value="Activo">Activos</option>
                <option value="Completado">Completados</option>
                <option value="Pausado">Pausados</option>
                <option value="vencidos">Vencidos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <select
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="form-select"
              >
                <option value="todos">Todos los períodos</option>
                <option value="proximos7dias">Próximos 7 días</option>
                <option value="rango">Rango personalizado</option>
              </select>
            </div>

            {filtroFecha === 'rango' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="form-input"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfica de Estados */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Estado de Proyectos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={datosGraficas.estados}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {datosGraficas.estados.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica de Recaudación */}
        <div className="card lg:col-span-2">
          <div className="card-body">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recaudación por Proyecto</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosGraficas.recaudacion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Monto']} />
                <Legend />
                <Bar dataKey="recaudado" fill="#3B82F6" name="Recaudado" />
                <Bar dataKey="meta" fill="#EF4444" name="Meta" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla de Proyectos */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Proyectos Detallados ({proyectosFiltrados.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Estado</th>
                  <th>Fecha Límite</th>
                  <th>Progreso</th>
                  <th>Recaudación</th>
                  <th>Viviendas</th>
                </tr>
              </thead>
              <tbody>
                {proyectosFiltrados.map((proyecto) => {
                  const recaudado = proyecto.pagosRealizados?.reduce((sum, pago) => sum + pago.montoPagado, 0) || 0;
                  const viviendasPagadas = proyecto.pagosRealizados?.length || 0;
                  const totalViviendas = 25; // Asumiendo 25 viviendas
                  const progreso = (viviendasPagadas / totalViviendas) * 100;
                  const fechaLimite = new Date(proyecto.fechaLimite);
                  const hoy = new Date();
                  const estaVencido = proyecto.estado === 'Activo' && isAfter(hoy, fechaLimite);

                  return (
                    <tr key={proyecto._id} className={estaVencido ? 'bg-red-50' : ''}>
                      <td>
                        <div>
                          <div className="font-medium text-gray-900">{proyecto.nombre}</div>
                          <div className="text-sm text-gray-500">{proyecto.descripcion}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          proyecto.estado === 'Activo' ? (estaVencido ? 'badge-danger' : 'badge-success') :
                          proyecto.estado === 'Completado' ? 'badge-info' : 'badge-warning'
                        }`}>
                          {estaVencido ? 'Vencido' : proyecto.estado}
                        </span>
                      </td>
                      <td className={estaVencido ? 'text-red-600 font-medium' : ''}>
                        {format(fechaLimite, 'dd/MM/yyyy', { locale: es })}
                      </td>
                      <td>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(progreso, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {progreso.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          <div className="font-medium text-green-600">
                            ${recaudado.toLocaleString()}
                          </div>
                          <div className="text-gray-500">
                            de ${proyecto.montoProyecto?.toLocaleString() || '0'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-sm font-medium">
                          {viviendasPagadas}/{totalViviendas}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {proyectosFiltrados.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay proyectos que coincidan con los filtros seleccionados
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReporteProyectos;