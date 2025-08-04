import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, FilterIcon, PrinterIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const HistorialPagos = () => {
  const [selectedVivienda, setSelectedVivienda] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterFecha, setFilterFecha] = useState('todos');

  // Obtener viviendas con mejor manejo de errores
  const { data: viviendas, isLoading: loadingViviendas, error: errorViviendas } = useQuery(
    ['viviendas'],
    async () => {
      try {
        console.log('🔍 Intentando obtener viviendas...');
        const response = await api.get('/api/viviendas');
        console.log('✅ Viviendas obtenidas:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Error cargando viviendas:', error);
        console.error('❌ Error response:', error.response);
        console.error('❌ Error status:', error.response?.status);
        console.error('❌ Error data:', error.response?.data);
        toast.error('Error al cargar las viviendas');
        throw error; // Re-lanzar el error para que useQuery lo maneje
      }
    },
    {
      retry: 3,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000, // 5 minutos
    }
  );

  // Ordenar viviendas por número de manera ascendente
  const viviendasOrdenadas = useMemo(() => {
    if (!viviendas || !Array.isArray(viviendas)) return [];
    
    return [...viviendas].sort((a, b) => {
      // Convertir a números si es posible, sino ordenar alfabéticamente
      const numA = parseInt(a.numero) || 0;
      const numB = parseInt(b.numero) || 0;
      
      if (numA !== 0 && numB !== 0) {
        // Si ambos son números, ordenar numéricamente
        return numA - numB;
      } else {
        // Si alguno no es número, ordenar alfabéticamente
        return a.numero.localeCompare(b.numero);
      }
    });
  }, [viviendas]);

  // Obtener historial de pagos
  const { data: historial, isLoading: loadingHistorial } = useQuery(
    ['historial-pagos', selectedVivienda, filterEstado, filterFecha],
    async () => {
      if (!selectedVivienda) return [];
      
      try {
        let url = selectedVivienda === 'todos' 
          ? '/api/pagos/historial-todos'
          : `/api/pagos/historial/${selectedVivienda}`;
        
        const params = new URLSearchParams();
        
        if (filterEstado !== 'todos') params.append('estado', filterEstado);
        if (filterFecha !== 'todos') params.append('fecha', filterFecha);
        
        if (params.toString()) url += `?${params.toString()}`;
        
        const response = await api.get(url);
        return response.data;
      } catch (error) {
        console.error('Error cargando historial:', error);
        toast.error('Error al cargar el historial de pagos');
        return [];
      }
    },
    {
      enabled: !!selectedVivienda,
      retry: 2,
      retryDelay: 1000,
    }
  );

  const handleViviendaChange = (e) => {
    setSelectedVivienda(e.target.value);
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'Pagado': 'badge-success',
      'Pagado con excedente': 'badge-success',
      'Pendiente': 'badge-warning',
      'Parcial': 'badge-info',
      'Vencido': 'badge-danger'
    };
    return badges[estado] || 'badge-secondary';
  };

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calcularRecargo = (pago) => {
    if (pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente') return 0;
    
    const fechaLimite = new Date(pago.fechaLimite);
    const hoy = new Date();
    const diasAtraso = hoy > fechaLimite ? Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24)) : 0;
    
    return diasAtraso > 0 ? (pago.monto * 0.10) * Math.ceil(diasAtraso / 30) : 0;
  };

  // Función para imprimir historial
  const imprimirHistorial = () => {
    if (!historial || historial.length === 0) {
      toast.error('No hay datos para imprimir');
      return;
    }

    const printWindow = window.open('', '_blank');
    const viviendaSeleccionada = selectedVivienda === 'todos' 
      ? 'Todas las viviendas' 
      : viviendasOrdenadas?.find(v => v._id === selectedVivienda)?.numero;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Historial de Pagos - ${viviendaSeleccionada}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #1f2937; margin: 0; }
          .header p { color: #6b7280; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .badge-success { background-color: #d1fae5; color: #065f46; }
          .badge-warning { background-color: #fef3c7; color: #92400e; }
          .badge-danger { background-color: #fee2e2; color: #991b1b; }
          .badge-info { background-color: #dbeafe; color: #1e40af; }
          .stats { display: flex; justify-content: space-between; margin: 20px 0; }
          .stat { text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; }
          .stat-label { font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Historial de Pagos</h1>
          <p>Vivienda: ${viviendaSeleccionada}</p>
          <p>Fecha de impresión: ${new Date().toLocaleDateString('es-ES')}</p>
        </div>
        
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${historial.reduce((sum, pago) => sum + (pago.montoPagado || 0), 0).toLocaleString()}</div>
            <div class="stat-label">Total Pagado</div>
          </div>
          <div class="stat">
            <div class="stat-value">${historial.reduce((sum, pago) => sum + calcularRecargo(pago), 0).toLocaleString()}</div>
            <div class="stat-label">Total Recargos</div>
          </div>
          <div class="stat">
            <div class="stat-value">${historial.filter(p => p.estado === 'Pagado' || p.estado === 'Pagado con excedente').length}</div>
            <div class="stat-label">Pagos Completos</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Vivienda</th>
              <th>Período</th>
              <th>Monto</th>
              <th>Pagado</th>
              <th>Saldo</th>
              <th>Recargo</th>
              <th>Estado</th>
              <th>Fecha Pago</th>
            </tr>
          </thead>
          <tbody>
            ${historial.map((pago) => {
              const recargo = calcularRecargo(pago);
              const saldoPendiente = pago.monto - (pago.montoPagado || 0);
              const vivienda = viviendasOrdenadas?.find(v => v._id === pago.vivienda);
              
              return `
                <tr>
                  <td>${vivienda?.numero || 'N/A'}</td>
                  <td>${pago.mes}/${pago.año}</td>
                  <td>$${pago.monto?.toLocaleString()}</td>
                  <td>$${(pago.montoPagado || 0).toLocaleString()}</td>
                  <td>$${saldoPendiente.toLocaleString()}</td>
                  <td>$${recargo.toLocaleString()}</td>
                  <td><span class="badge badge-${getEstadoBadge(pago.estado).replace('badge-', '')}">${pago.estado}</span></td>
                  <td>${pago.fechaPago ? formatFecha(pago.fechaPago) : '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  if (loadingViviendas) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (errorViviendas) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Error al cargar viviendas</div>
          <div className="text-gray-500">No se pudieron cargar las viviendas. Intenta recargar la página.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historial de Pagos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Consulta el historial completo de pagos por vivienda
        </p>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Selección de Vivienda */}
            <div>
              <label className="form-label">Vivienda</label>
              <select
                value={selectedVivienda}
                onChange={handleViviendaChange}
                className="input"
              >
                <option value="">Seleccionar vivienda</option>
                <option value="todos">Todas las viviendas</option>
                {viviendasOrdenadas?.map((vivienda) => (
                  <option key={vivienda._id} value={vivienda._id}>
                    {vivienda.numero}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Estado */}
            <div>
              <label className="form-label">Estado</label>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="input"
              >
                <option value="todos">Todos los estados</option>
                <option value="Pagado">Pagado</option>
                <option value="Pagado con excedente">Pagado con excedente</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Parcial">Parcial</option>
                <option value="Vencido">Vencido</option>
              </select>
            </div>

            {/* Filtro por Fecha */}
            <div>
              <label className="form-label">Período</label>
              <select
                value={filterFecha}
                onChange={(e) => setFilterFecha(e.target.value)}
                className="input"
              >
                <option value="todos">Todos los períodos</option>
                <option value="ultimo_mes">Último mes</option>
                <option value="ultimos_3_meses">Últimos 3 meses</option>
                <option value="ultimos_6_meses">Últimos 6 meses</option>
                <option value="ultimo_año">Último año</option>
              </select>
            </div>

            {/* Botón de búsqueda */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  if (!selectedVivienda) {
                    toast.error('Por favor selecciona una vivienda');
                    return;
                  }
                  toast.success('Consultando historial...');
                }}
                className="btn-primary w-full"
                disabled={!selectedVivienda}
              >
                <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                Consultar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {selectedVivienda && (
        <div className="card">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Historial de Pagos
                {selectedVivienda === 'todos' ? (
                  <span className="text-gray-500 ml-2">- Todas las viviendas</span>
                ) : viviendasOrdenadas?.find(v => v._id === selectedVivienda) && (
                  <span className="text-gray-500 ml-2">
                    - {viviendasOrdenadas.find(v => v._id === selectedVivienda).numero}
                  </span>
                )}
              </h3>
              <div className="flex items-center space-x-2">
                {historial && historial.length > 0 && (
                  <>
                    <span className="text-sm text-gray-500">
                      {historial.length} registro{historial.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={imprimirHistorial}
                      className="btn-secondary btn-sm"
                      title="Imprimir historial"
                    >
                      <PrinterIcon className="w-4 h-4 mr-1" />
                      Imprimir
                    </button>
                  </>
                )}
              </div>
            </div>

            {loadingHistorial ? (
              <div className="flex justify-center items-center h-32">
                <LoadingSpinner size="md" />
              </div>
            ) : historial && historial.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      {selectedVivienda === 'todos' && (
                        <th className="table-header-cell">Vivienda</th>
                      )}
                      <th className="table-header-cell">Período</th>
                      <th className="table-header-cell">Monto</th>
                      <th className="table-header-cell">Pagado</th>
                      <th className="table-header-cell">Saldo</th>
                      <th className="table-header-cell">Recargo</th>
                      <th className="table-header-cell">Estado</th>
                      <th className="table-header-cell">Fecha Pago</th>
                      <th className="table-header-cell">Método</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {historial.map((pago) => {
                      const recargo = calcularRecargo(pago);
                      const saldoPendiente = pago.monto - (pago.montoPagado || 0);
                      const vivienda = viviendasOrdenadas?.find(v => v._id === pago.vivienda);
                      
                      return (
                        <tr key={pago._id} className="table-row">
                          {selectedVivienda === 'todos' && (
                            <td className="table-cell font-medium">
                              {vivienda?.numero || 'N/A'}
                            </td>
                          )}
                          <td className="table-cell">
                            <div className="text-sm">
                              <div className="font-medium">
                                {pago.mes}/{pago.año}
                              </div>
                              {pago.fechaInicioPeriodo && pago.fechaFinPeriodo && (
                                <div className="text-xs text-gray-500">
                                  {formatFecha(pago.fechaInicioPeriodo)} - {formatFecha(pago.fechaFinPeriodo)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="table-cell">
                            ${pago.monto?.toLocaleString()}
                          </td>
                          <td className="table-cell">
                            ${(pago.montoPagado || 0).toLocaleString()}
                          </td>
                          <td className="table-cell">
                            <span className={`font-medium ${
                              saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              ${saldoPendiente.toLocaleString()}
                            </span>
                          </td>
                          <td className="table-cell">
                            {recargo > 0 ? (
                              <span className="text-red-600 font-medium">
                                ${recargo.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-green-600">$0</span>
                            )}
                          </td>
                          <td className="table-cell">
                            <span className={`badge ${getEstadoBadge(pago.estado)}`}>
                              {pago.estado}
                            </span>
                          </td>
                          <td className="table-cell">
                            {pago.fechaPago ? (
                              formatFecha(pago.fechaPago)
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="table-cell">
                            {pago.metodoPago || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  {selectedVivienda ? 'No se encontraron pagos para esta vivienda' : 'Selecciona una vivienda para ver su historial'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estadísticas */}
      {historial && historial.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Total Pagado</div>
            <div className="text-2xl font-bold text-green-600">
              ${historial.reduce((sum, pago) => sum + (pago.montoPagado || 0), 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Pagos Completos</div>
            <div className="text-2xl font-bold text-blue-600">
              {historial.filter(p => p.estado === 'Pagado' || p.estado === 'Pagado con excedente').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Pagos Pendientes</div>
            <div className="text-2xl font-bold text-yellow-600">
              {historial.filter(p => p.estado === 'Pendiente' || p.estado === 'Parcial' || p.estado === 'Vencido').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Total Recargos</div>
            <div className="text-2xl font-bold text-red-600">
              ${historial.reduce((sum, pago) => sum + calcularRecargo(pago), 0).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistorialPagos; 