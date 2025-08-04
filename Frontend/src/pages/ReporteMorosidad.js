import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ReporteMorosidad = () => {
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroMonto, setFiltroMonto] = useState('todos');

  // Obtener pagos con información de viviendas y residentes
  const { data: pagos, isLoading } = useQuery({
    queryKey: ['pagos-morosidad'],
    queryFn: async () => {
      const response = await api.get('/api/pagos');
      return response.data.filter(pago => pago.vivienda); // Filtrar pagos válidos
    },
    refetchInterval: 30000, // Actualizar cada 30 segundos
    staleTime: 10000
  });

  // Calcular estadísticas de morosidad
  const estadisticas = useMemo(() => {
    if (!pagos) return null;

    const pagosVencidos = pagos.filter(pago => pago.vencido);
    const pagosDentroPlazo = pagos.filter(pago => pago.dentroDelPlazo);
    const pagosPendientes = pagos.filter(pago => !pago.pagado && !pago.vencido);

    const totalVencido = pagosVencidos.reduce((sum, pago) => sum + (pago.monto || 0), 0);
    const totalPendiente = pagosPendientes.reduce((sum, pago) => sum + (pago.monto || 0), 0);

    return {
      totalViviendas: pagos.length,
      viviendasVencidas: pagosVencidos.length,
      viviendasAlCorriente: pagosDentroPlazo.length,
      viviendasPendientes: pagosPendientes.length,
      montoTotalVencido: totalVencido,
      montoTotalPendiente: totalPendiente,
      porcentajeMorosidad: ((pagosVencidos.length / pagos.length) * 100).toFixed(1)
    };
  }, [pagos]);

  // Filtrar pagos según criterios
  const pagosFiltrados = useMemo(() => {
    if (!pagos) return [];

    let filtrados = pagos;

    // Filtro por estado
    if (filtroEstado === 'vencidos') {
      filtrados = filtrados.filter(pago => pago.vencido);
    } else if (filtroEstado === 'alCorriente') {
      filtrados = filtrados.filter(pago => pago.dentroDelPlazo);
    } else if (filtroEstado === 'pendientes') {
      filtrados = filtrados.filter(pago => !pago.pagado && !pago.vencido);
    }

    // Filtro por monto
    if (filtroMonto === 'alto') {
      filtrados = filtrados.filter(pago => (pago.monto || 0) > 5000);
    } else if (filtroMonto === 'medio') {
      filtrados = filtrados.filter(pago => (pago.monto || 0) >= 2000 && (pago.monto || 0) <= 5000);
    } else if (filtroMonto === 'bajo') {
      filtrados = filtrados.filter(pago => (pago.monto || 0) < 2000);
    }

    return filtrados.sort((a, b) => {
      // Ordenar por monto vencido descendente
      const montoA = a.vencido ? (a.monto || 0) : 0;
      const montoB = b.vencido ? (b.monto || 0) : 0;
      return montoB - montoA;
    });
  }, [pagos, filtroEstado, filtroMonto]);

  // Función para imprimir reporte
  const imprimirReporte = () => {
    const contenido = `
      <html>
        <head>
          <title>Reporte de Morosidad</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .stats { display: flex; justify-content: space-around; margin-bottom: 30px; }
            .stat { text-align: center; padding: 10px; border: 1px solid #ccc; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .vencido { color: red; font-weight: bold; }
            .al-corriente { color: green; }
            .pendiente { color: orange; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reporte de Morosidad</h1>
            <p>Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          </div>
          
          <div class="stats">
            <div class="stat">
              <h3>${estadisticas?.viviendasVencidas || 0}</h3>
              <p>Viviendas Vencidas</p>
            </div>
            <div class="stat">
              <h3>$${estadisticas?.montoTotalVencido?.toLocaleString() || 0}</h3>
              <p>Monto Total Vencido</p>
            </div>
            <div class="stat">
              <h3>${estadisticas?.porcentajeMorosidad || 0}%</h3>
              <p>Porcentaje de Morosidad</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Vivienda</th>
                <th>Residente</th>
                <th>Estado</th>
                <th>Monto</th>
                <th>Fecha Límite</th>
                <th>Días Vencido</th>
              </tr>
            </thead>
            <tbody>
              ${pagosFiltrados.map(pago => `
                <tr>
                  <td>${pago.vivienda?.numero || 'N/A'}</td>
                  <td>${pago.residente?.nombre || 'N/A'}</td>
                  <td class="${pago.vencido ? 'vencido' : pago.dentroDelPlazo ? 'al-corriente' : 'pendiente'}">
                    ${pago.vencido ? 'Vencido' : pago.dentroDelPlazo ? 'Al Corriente' : 'Pendiente'}
                  </td>
                  <td>$${(pago.monto || 0).toLocaleString()}</td>
                  <td>${pago.fechaLimite ? format(new Date(pago.fechaLimite), 'dd/MM/yyyy', { locale: es }) : 'N/A'}</td>
                  <td>${pago.vencido ? Math.ceil((new Date() - new Date(pago.fechaLimite)) / (1000 * 60 * 60 * 24)) : '-'}</td>
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
        <h1 className="text-3xl font-bold text-gray-800">Reporte de Morosidad</h1>
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

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-100 border border-red-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-red-600">{estadisticas.viviendasVencidas}</h3>
            <p className="text-red-700">Viviendas Vencidas</p>
          </div>
          <div className="bg-green-100 border border-green-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-green-600">{estadisticas.viviendasAlCorriente}</h3>
            <p className="text-green-700">Al Corriente</p>
          </div>
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-blue-600">${estadisticas.montoTotalVencido.toLocaleString()}</h3>
            <p className="text-blue-700">Monto Vencido</p>
          </div>
          <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-orange-600">{estadisticas.porcentajeMorosidad}%</h3>
            <p className="text-orange-700">Morosidad</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="todos">Todos</option>
              <option value="vencidos">Vencidos</option>
              <option value="alCorriente">Al Corriente</option>
              <option value="pendientes">Pendientes</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Monto</label>
            <select
              value={filtroMonto}
              onChange={(e) => setFiltroMonto(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="todos">Todos</option>
              <option value="alto">Alto (>$5,000)</option>
              <option value="medio">Medio ($2,000-$5,000)</option>
              <option value="bajo">Bajo (&lt;$2,000)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de resultados */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vivienda
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Residente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Límite
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Días Vencido
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagosFiltrados.map((pago) => (
                <tr key={pago._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {pago.vivienda?.numero || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pago.residente?.nombre || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      pago.vencido 
                        ? 'bg-red-100 text-red-800' 
                        : pago.dentroDelPlazo 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {pago.vencido ? 'Vencido' : pago.dentroDelPlazo ? 'Al Corriente' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(pago.monto || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pago.fechaLimite ? format(new Date(pago.fechaLimite), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pago.vencido 
                      ? Math.ceil((new Date() - new Date(pago.fechaLimite)) / (1000 * 60 * 60 * 24))
                      : '-'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagosFiltrados.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron pagos con los filtros aplicados.
        </div>
      )}
    </div>
  );
};

export default ReporteMorosidad; 