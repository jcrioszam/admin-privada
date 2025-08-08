import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarIcon, CurrencyDollarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/currencyFormatter';
// import toast from 'react-hot-toast';

const CorteDiario = () => {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [filtroMetodo, setFiltroMetodo] = useState('todos');

  // Obtener pagos del día seleccionado
  const { data: pagosDelDia, isLoading: isLoadingPagos } = useQuery(
    ['pagos-corte', fechaSeleccionada],
    () => api.get(`/api/pagos/corte-diario/${fechaSeleccionada}`).then(res => res.data),
    {
      refetchInterval: 30000, // Refrescar cada 30 segundos en lugar de 5
      staleTime: 10000 // Considerar datos frescos por 10 segundos
    }
  );

  // Obtener pagos especiales del día seleccionado
  const { data: pagosEspecialesDelDia, isLoading: isLoadingPagosEspeciales } = useQuery(
    ['pagos-especiales-corte', fechaSeleccionada],
    () => api.get(`/api/proyectos-pagos-especiales/pagos-del-dia/${fechaSeleccionada}`).then(res => res.data),
    {
      refetchInterval: 30000,
      staleTime: 10000
    }
  );

  // Calcular totales
  const totales = useMemo(() => {
    const pagosNormales = pagosDelDia || [];
    const pagosEspeciales = pagosEspecialesDelDia || [];
    
    // Combinar todos los pagos
    const todosLosPagos = [
      ...pagosNormales,
      ...pagosEspeciales.map(pago => ({
        ...pago,
        tipo: 'especial',
        montoPagado: pago.montoPagado
      }))
    ];

    const total = todosLosPagos.reduce((sum, pago) => sum + (pago.montoPagado || 0), 0);
    const porMetodo = todosLosPagos.reduce((acc, pago) => {
      const metodo = pago.metodoPago || 'Otro';
      acc[metodo] = (acc[metodo] || 0) + (pago.montoPagado || 0);
      return acc;
    }, {});

    const totalPagosNormales = pagosNormales.reduce((sum, pago) => sum + (pago.montoPagado || 0), 0);
    const totalPagosEspeciales = pagosEspeciales.reduce((sum, pago) => sum + (pago.montoPagado || 0), 0);

    return { 
      total, 
      porMetodo, 
      totalPagosNormales, 
      totalPagosEspeciales,
      totalPagos: todosLosPagos.length
    };
  }, [pagosDelDia, pagosEspecialesDelDia]);

  // Filtrar pagos por método de pago
  const pagosFiltrados = useMemo(() => {
    const pagosNormales = pagosDelDia || [];
    const pagosEspeciales = pagosEspecialesDelDia || [];
    
    const todosLosPagos = [
      ...pagosNormales.map(pago => ({ ...pago, tipo: 'normal' })),
      ...pagosEspeciales.map(pago => ({ ...pago, tipo: 'especial' }))
    ];
    
    if (filtroMetodo === 'todos') {
      return todosLosPagos;
    }
    
    return todosLosPagos.filter(pago => pago.metodoPago === filtroMetodo);
  }, [pagosDelDia, pagosEspecialesDelDia, filtroMetodo]);

  const isLoading = isLoadingPagos || isLoadingPagosEspeciales;
  
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Corte Diario</h1>
        <p className="mt-1 text-sm text-gray-500">
          Control de pagos registrados por día
        </p>
      </div>

      {/* Filtros */}
      <div className="flex space-x-4 items-center">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filtroMetodo}
          onChange={(e) => setFiltroMetodo(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos los métodos</option>
          <option value="Efectivo">Efectivo</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Tarjeta">Tarjeta</option>
          <option value="Cheque">Cheque</option>
          <option value="Otro">Otro</option>
        </select>
      </div>

      {/* Resumen del día */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <div className="text-sm text-gray-500">Total del Día</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totales.total)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <div className="text-sm text-gray-500">Pagos Registrados</div>
              <div className="text-2xl font-bold text-blue-600">
                {totales.totalPagos}
              </div>
              <div className="text-xs text-gray-500">
                {pagosDelDia?.length || 0} normales + {pagosEspecialesDelDia?.length || 0} especiales
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 font-bold">$</span>
            </div>
            <div className="ml-3">
              <div className="text-sm text-gray-500">Promedio por Pago</div>
              <div className="text-2xl font-bold text-yellow-600">
                {pagosDelDia?.length > 0 ? formatCurrency(totales.total / pagosDelDia.length) : formatCurrency(0)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold">M</span>
            </div>
            <div className="ml-3">
              <div className="text-sm text-gray-500">Métodos Usados</div>
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(totales.porMetodo).length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-bold">$</span>
            </div>
            <div className="ml-3">
              <div className="text-sm text-gray-500">Pagos Especiales</div>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(totales.totalPagosEspeciales)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desglose por método de pago */}
      {Object.keys(totales.porMetodo).length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Desglose por Método de Pago</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(totales.porMetodo).map(([metodo, monto]) => (
              <div key={metodo} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">{metodo}</div>
                <div className="text-lg font-bold text-gray-900">{formatCurrency(monto)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de pagos */}
      <div className="card">
        <div className="card-body">
          <div className="mb-4 text-sm text-gray-600">
            Mostrando {pagosFiltrados?.length || 0} pagos del {new Date(fechaSeleccionada).toLocaleDateString()}
            {filtroMetodo !== 'todos' && (
              <span className="ml-2 text-blue-600">
                (filtrado por: {filtroMetodo})
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Hora</th>
                  <th className="table-header-cell">Tipo</th>
                  <th className="table-header-cell">Vivienda</th>
                  <th className="table-header-cell">Residente</th>
                  <th className="table-header-cell">Período/Proyecto</th>
                  <th className="table-header-cell">Método</th>
                  <th className="table-header-cell">Monto Pagado</th>
                  <th className="table-header-cell">Referencia</th>
                  <th className="table-header-cell">Registrado Por</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {pagosFiltrados?.map((pago) => (
                  <tr key={pago._id} className={`table-row ${pago.tipo === 'especial' ? 'bg-orange-50' : ''}`}>
                    <td className="table-cell text-sm">
                      {new Date(pago.fechaPago || pago.fechaCreacion).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        pago.tipo === 'especial' 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {pago.tipo === 'especial' ? 'Especial' : 'Normal'}
                      </span>
                    </td>
                    <td className="table-cell font-medium">
                      {pago.vivienda?.numero}
                    </td>
                    <td className="table-cell">
                      {pago.residente?.nombre} {pago.residente?.apellidos}
                    </td>
                    <td className="table-cell text-sm">
                      {pago.tipo === 'especial' ? (
                        <span className="text-orange-600 font-medium">
                          {pago.proyecto?.nombre || 'Proyecto Especial'}
                        </span>
                      ) : (
                        `${pago.mes}/${pago.año}`
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${
                        pago.metodoPago === 'Efectivo' ? 'badge-success' :
                        pago.metodoPago === 'Transferencia' ? 'badge-info' :
                        pago.metodoPago === 'Tarjeta' ? 'badge-warning' :
                        pago.metodoPago === 'Cheque' ? 'badge-secondary' :
                        'badge-light'
                      }`}>
                        {pago.metodoPago}
                      </span>
                    </td>
                    <td className="table-cell font-medium text-green-600">
                      {formatCurrency(pago.montoPagado || 0)}
                    </td>
                    <td className="table-cell text-sm text-gray-600">
                      {pago.referenciaPago || '-'}
                    </td>
                    <td className="table-cell text-sm text-gray-600">
                      {pago.registradoPor?.nombre || 'Sistema'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagosFiltrados?.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500">
                No hay pagos registrados para el {new Date(fechaSeleccionada).toLocaleDateString()}
                {filtroMetodo !== 'todos' && ` con método ${filtroMetodo}`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorteDiario; 