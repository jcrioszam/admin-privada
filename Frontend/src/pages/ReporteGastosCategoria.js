import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const ReporteGastosCategoria = () => {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('actual');
  const [mesesAtras, setMesesAtras] = useState(6);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');

  // Obtener gastos
  const { data: gastos, isLoading } = useQuery({
    queryKey: ['gastos-categoria'],
    queryFn: async () => {
      try {
        console.log('🔍 Intentando obtener gastos para reporte de categorías...');
        const response = await api.get('/api/gastos');
        console.log('✅ Gastos obtenidos para reporte:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Error cargando gastos para reporte:', error);
        throw error;
      }
    }
  });

  // Calcular fechas del período
  const fechasPeriodo = useMemo(() => {
    const ahora = new Date();
    let fechaInicio, fechaFin;

    if (periodoSeleccionado === 'actual') {
      fechaInicio = startOfMonth(ahora);
      fechaFin = endOfMonth(ahora);
    } else if (periodoSeleccionado === 'anterior') {
      fechaInicio = startOfMonth(subMonths(ahora, 1));
      fechaFin = endOfMonth(subMonths(ahora, 1));
    } else if (periodoSeleccionado === 'personalizado') {
      fechaInicio = startOfMonth(subMonths(ahora, mesesAtras));
      fechaFin = endOfMonth(ahora);
    }

    return { fechaInicio, fechaFin };
  }, [periodoSeleccionado, mesesAtras]);

  // Categorías predefinidas
  const categorias = [
    'Mantenimiento',
    'Servicios Públicos',
    'Seguridad',
    'Limpieza',
    'Jardinería',
    'Administración',
    'Reparaciones',
    'Equipamiento',
    'Otros'
  ];

  // Función para determinar categoría basada en descripción
  const determinarCategoria = (descripcion) => {
    const desc = descripcion.toLowerCase();
    
    if (desc.includes('mantenimiento') || desc.includes('manten')) return 'Mantenimiento';
    if (desc.includes('agua') || desc.includes('luz') || desc.includes('electricidad') || desc.includes('gas')) return 'Servicios Públicos';
    if (desc.includes('seguridad') || desc.includes('vigilancia') || desc.includes('guardia')) return 'Seguridad';
    if (desc.includes('limpieza') || desc.includes('aseo')) return 'Limpieza';
    if (desc.includes('jardín') || desc.includes('jardineria') || desc.includes('poda')) return 'Jardinería';
    if (desc.includes('administración') || desc.includes('admin')) return 'Administración';
    if (desc.includes('reparación') || desc.includes('reparacion') || desc.includes('arreglo')) return 'Reparaciones';
    if (desc.includes('equipo') || desc.includes('herramienta') || desc.includes('maquinaria')) return 'Equipamiento';
    
    return 'Otros';
  };

  // Calcular estadísticas por categoría
  const estadisticasCategoria = useMemo(() => {
    if (!gastos) return null;

    const { fechaInicio, fechaFin } = fechasPeriodo;

    // Filtrar gastos del período
    const gastosPeriodo = gastos.filter(gasto => {
      if (!gasto.fecha) return false;
      const fechaGasto = new Date(gasto.fecha);
      return fechaGasto >= fechaInicio && fechaGasto <= fechaFin;
    });

    // Agrupar por categoría
    const gastosPorCategoria = {};
    
    gastosPeriodo.forEach(gasto => {
      const categoria = determinarCategoria(gasto.descripcion || '');
      
      if (!gastosPorCategoria[categoria]) {
        gastosPorCategoria[categoria] = {
          total: 0,
          aprobados: 0,
          pendientes: 0,
          cantidad: 0,
          gastos: []
        };
      }
      
      gastosPorCategoria[categoria].total += gasto.monto || 0;
      gastosPorCategoria[categoria].cantidad += 1;
      gastosPorCategoria[categoria].gastos.push(gasto);
      
      if (gasto.estado === 'Aprobado') {
        gastosPorCategoria[categoria].aprobados += gasto.monto || 0;
      } else {
        gastosPorCategoria[categoria].pendientes += gasto.monto || 0;
      }
    });

    // Calcular totales
    const totalGeneral = gastosPeriodo.reduce((sum, gasto) => sum + (gasto.monto || 0), 0);
    const totalAprobados = gastosPeriodo.filter(g => g.estado === 'Aprobado').reduce((sum, gasto) => sum + (gasto.monto || 0), 0);
    const totalPendientes = gastosPeriodo.filter(g => g.estado === 'Pendiente').reduce((sum, gasto) => sum + (gasto.monto || 0), 0);

    return {
      gastosPorCategoria,
      totalGeneral,
      totalAprobados,
      totalPendientes,
      cantidadTotal: gastosPeriodo.length,
      gastosPeriodo
    };
  }, [gastos, fechasPeriodo]);

  // Filtrar gastos por categoría seleccionada
  const gastosFiltrados = useMemo(() => {
    if (!estadisticasCategoria) return [];

    if (categoriaSeleccionada === 'todas') {
      return estadisticasCategoria.gastosPeriodo;
    }

    return estadisticasCategoria.gastosPorCategoria[categoriaSeleccionada]?.gastos || [];
  }, [estadisticasCategoria, categoriaSeleccionada]);

  // Función para imprimir reporte
  const imprimirReporte = () => {
    if (!estadisticasCategoria) return;

    const contenido = `
      <html>
        <head>
          <title>Reporte de Gastos por Categoría</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { display: flex; justify-content: space-around; margin-bottom: 30px; }
            .summary-item { text-align: center; padding: 10px; border: 1px solid #ccc; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .categoria { font-weight: bold; }
            .total { background-color: #f9f9f9; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reporte de Gastos por Categoría</h1>
            <p>Período: ${format(fechasPeriodo.fechaInicio, 'dd/MM/yyyy', { locale: es })} - ${format(fechasPeriodo.fechaFin, 'dd/MM/yyyy', { locale: es })}</p>
            <p>Fecha del reporte: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <h3>$${estadisticasCategoria.totalGeneral.toLocaleString()}</h3>
              <p>Total General</p>
            </div>
            <div class="summary-item">
              <h3>$${estadisticasCategoria.totalAprobados.toLocaleString()}</h3>
              <p>Total Aprobados</p>
            </div>
            <div class="summary-item">
              <h3>$${estadisticasCategoria.totalPendientes.toLocaleString()}</h3>
              <p>Total Pendientes</p>
            </div>
            <div class="summary-item">
              <h3>${estadisticasCategoria.cantidadTotal}</h3>
              <p>Total Gastos</p>
            </div>
          </div>

          <h2>Desglose por Categoría</h2>
          <table>
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Total</th>
                <th>Aprobados</th>
                <th>Pendientes</th>
                <th>Cantidad</th>
                <th>% del Total</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(estadisticasCategoria.gastosPorCategoria).map(([categoria, datos]) => `
                <tr>
                  <td class="categoria">${categoria}</td>
                  <td>$${datos.total.toLocaleString()}</td>
                  <td>$${datos.aprobados.toLocaleString()}</td>
                  <td>$${datos.pendientes.toLocaleString()}</td>
                  <td>${datos.cantidad}</td>
                  <td>${((datos.total / estadisticasCategoria.totalGeneral) * 100).toFixed(1)}%</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td>TOTAL</td>
                <td>$${estadisticasCategoria.totalGeneral.toLocaleString()}</td>
                <td>$${estadisticasCategoria.totalAprobados.toLocaleString()}</td>
                <td>$${estadisticasCategoria.totalPendientes.toLocaleString()}</td>
                <td>${estadisticasCategoria.cantidadTotal}</td>
                <td>100%</td>
              </tr>
            </tbody>
          </table>

          <h2>Detalle de Gastos</h2>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${gastosFiltrados.map(gasto => `
                <tr>
                  <td>${gasto.fecha ? format(new Date(gasto.fecha), 'dd/MM/yyyy', { locale: es }) : 'N/A'}</td>
                  <td>${gasto.descripcion || 'N/A'}</td>
                  <td>${determinarCategoria(gasto.descripcion || '')}</td>
                  <td>$${(gasto.monto || 0).toLocaleString()}</td>
                  <td>${gasto.estado || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const ventana = window.open('', '_blank');
    ventana.document.write(contenido);
    ventana.document.close();
    ventana.print();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Reporte de Gastos por Categoría</h1>
        <button
          onClick={imprimirReporte}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir Reporte
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <select
              value={periodoSeleccionado}
              onChange={(e) => setPeriodoSeleccionado(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="actual">Mes Actual</option>
              <option value="anterior">Mes Anterior</option>
              <option value="personalizado">Período Personalizado</option>
            </select>
          </div>
          {periodoSeleccionado === 'personalizado' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meses hacia atrás</label>
              <select
                value={mesesAtras}
                onChange={(e) => setMesesAtras(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <select
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="todas">Todas las Categorías</option>
              {categorias.map(categoria => (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </select>
          </div>
        </div>
        {estadisticasCategoria && (
          <p className="mt-2 text-sm text-gray-600">
            Período: {format(fechasPeriodo.fechaInicio, 'dd/MM/yyyy', { locale: es })} - {format(fechasPeriodo.fechaFin, 'dd/MM/yyyy', { locale: es })}
          </p>
        )}
      </div>

      {/* Estadísticas generales */}
      {estadisticasCategoria && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-blue-600">${estadisticasCategoria.totalGeneral.toLocaleString()}</h3>
            <p className="text-blue-700">Total General</p>
          </div>
          <div className="bg-green-100 border border-green-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-green-600">${estadisticasCategoria.totalAprobados.toLocaleString()}</h3>
            <p className="text-green-700">Total Aprobados</p>
          </div>
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-yellow-600">${estadisticasCategoria.totalPendientes.toLocaleString()}</h3>
            <p className="text-yellow-700">Total Pendientes</p>
          </div>
          <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-purple-600">{estadisticasCategoria.cantidadTotal}</h3>
            <p className="text-purple-700">Total Gastos</p>
          </div>
        </div>
      )}

      {/* Tabla de categorías */}
      {estadisticasCategoria && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Desglose por Categoría</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aprobados
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pendientes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % del Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(estadisticasCategoria.gastosPorCategoria).map(([categoria, datos]) => (
                  <tr key={categoria} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {categoria}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${datos.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${datos.aprobados.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${datos.pendientes.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {datos.cantidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {((datos.total / estadisticasCategoria.totalGeneral) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${estadisticasCategoria.totalGeneral.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${estadisticasCategoria.totalAprobados.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${estadisticasCategoria.totalPendientes.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {estadisticasCategoria.cantidadTotal}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    100%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla de gastos filtrados */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">
            Detalle de Gastos {categoriaSeleccionada !== 'todas' ? `- ${categoriaSeleccionada}` : ''}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {gastosFiltrados.map((gasto) => (
                <tr key={gasto._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {gasto.fecha ? format(new Date(gasto.fecha), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {gasto.descripcion || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {determinarCategoria(gasto.descripcion || '')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(gasto.monto || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      gasto.estado === 'Aprobado'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {gasto.estado || 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {gastosFiltrados.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron gastos con los filtros aplicados.
        </div>
      )}
    </div>
  );
};

export default ReporteGastosCategoria; 