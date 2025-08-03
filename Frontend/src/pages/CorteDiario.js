import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { CalendarIcon, CurrencyDollarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const CorteDiario = () => {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [filtroMetodo, setFiltroMetodo] = useState('todos');

  // Obtener pagos del día seleccionado
  const { data: pagosDelDia, isLoading } = useQuery(
    ['pagos-corte', fechaSeleccionada],
    () => api.get(`/api/pagos/corte-diario/${fechaSeleccionada}`).then(res => res.data),
    {
      refetchInterval: 30000, // Refrescar cada 30 segundos en lugar de 5
      staleTime: 10000 // Considerar datos frescos por 10 segundos
    }
  );

  // Calcular totales
  const totales = React.useMemo(() => {
    if (!pagosDelDia) return { total: 0, porMetodo: {} };

    const total = pagosDelDia.reduce((sum, pago) => sum + (pago.montoPagado || 0), 0);
    const porMetodo = pagosDelDia.reduce((acc, pago) => {
      const metodo = pago.metodoPago || 'Otro';
      acc[metodo] = (acc[metodo] || 0) + (pago.montoPagado || 0);
      return acc;
    }, {});

    return { total, porMetodo };
  }, [pagosDelDia]);

  // Filtrar pagos por método de pago
  const pagosFiltrados = React.useMemo(() => {
    if (!pagosDelDia) return [];
    
    if (filtroMetodo === 'todos') {
      return pagosDelDia;
    }
    
    return pagosDelDia.filter(pago => pago.metodoPago === filtroMetodo);
  }, [pagosDelDia, filtroMetodo]);

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
                ${totales.total.toLocaleString()}
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
                {pagosDelDia?.length || 0}
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
                ${pagosDelDia?.length > 0 ? (totales.total / pagosDelDia.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
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
      </div>

      {/* Desglose por método de pago */}
      {Object.keys(totales.porMetodo).length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Desglose por Método de Pago</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(totales.porMetodo).map(([metodo, monto]) => (
              <div key={metodo} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">{metodo}</div>
                <div className="text-lg font-bold text-gray-900">${monto.toLocaleString()}</div>
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
                  <th className="table-header-cell">Vivienda</th>
                  <th className="table-header-cell">Residente</th>
                  <th className="table-header-cell">Período</th>
                  <th className="table-header-cell">Método</th>
                  <th className="table-header-cell">Monto Pagado</th>
                  <th className="table-header-cell">Referencia</th>
                  <th className="table-header-cell">Registrado Por</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {pagosFiltrados?.map((pago) => (
                  <tr key={pago._id} className="table-row">
                    <td className="table-cell text-sm">
                      {new Date(pago.fechaPago).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="table-cell font-medium">
                      {pago.vivienda?.numero}
                    </td>
                    <td className="table-cell">
                      {pago.residente?.nombre} {pago.residente?.apellidos}
                    </td>
                    <td className="table-cell text-sm">
                      {pago.mes}/{pago.año}
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
                      ${(pago.montoPagado || 0).toLocaleString()}
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