import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../utils/currencyFormatter';

const ReporteFlujoCaja = () => {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('actual');
  const [mesesAtras, setMesesAtras] = useState(6);

  // Obtener pagos
  const { data: pagos, isLoading: isLoadingPagos } = useQuery({
    queryKey: ['pagos-flujo-caja'],
    queryFn: async () => {
      try {
        console.log('🔍 Intentando obtener pagos para reporte de flujo de caja...');
        const response = await api.get('/api/pagos');
        const pagosFiltrados = response.data.filter(pago => pago.vivienda);
        console.log('✅ Pagos obtenidos para reporte:', pagosFiltrados);
        return pagosFiltrados;
      } catch (error) {
        console.error('❌ Error cargando pagos para reporte:', error);
        throw error;
      }
    }
  });

  // Obtener gastos
  const { data: gastos, isLoading: isLoadingGastos } = useQuery({
    queryKey: ['gastos-flujo-caja'],
    queryFn: async () => {
      try {
        console.log('🔍 Intentando obtener gastos para reporte de flujo de caja...');
        const response = await api.get('/api/gastos/reportes');
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

  // Calcular flujo de caja
  const flujoCaja = useMemo(() => {
    if (!pagos || !gastos) return null;

    const { fechaInicio, fechaFin } = fechasPeriodo;

    // Filtrar pagos del período
    const pagosPeriodo = pagos.filter(pago => {
      if (!pago.fechaPago) return false;
      const fechaPago = new Date(pago.fechaPago);
      return fechaPago >= fechaInicio && fechaPago <= fechaFin;
    });

    // Filtrar gastos del período
    const gastosPeriodo = gastos.filter(gasto => {
      if (!gasto.fecha) return false;
      const fechaGasto = new Date(gasto.fecha);
      return fechaGasto >= fechaInicio && fechaGasto <= fechaFin;
    });

    // Calcular ingresos
    const ingresosPagados = pagosPeriodo.filter(pago => pago.pagado);
    const ingresosPendientes = pagosPeriodo.filter(pago => !pago.pagado);
    
    const totalIngresosPagados = ingresosPagados.reduce((sum, pago) => sum + (pago.montoPagado || pago.monto || 0), 0);
    const totalIngresosPendientes = ingresosPendientes.reduce((sum, pago) => sum + (pago.monto || 0), 0);

    // Calcular gastos
    const gastosAprobados = gastosPeriodo.filter(gasto => gasto.estado === 'Aprobado');
    const gastosPendientes = gastosPeriodo.filter(gasto => gasto.estado === 'Pendiente');
    
    const totalGastosAprobados = gastosAprobados.reduce((sum, gasto) => sum + (gasto.monto || 0), 0);
    const totalGastosPendientes = gastosPendientes.reduce((sum, gasto) => sum + (gasto.monto || 0), 0);

    // Calcular balance
    const balance = totalIngresosPagados - totalGastosAprobados;
    const proyeccion = totalIngresosPagados + totalIngresosPendientes - totalGastosAprobados - totalGastosPendientes;

    return {
      periodo: {
        inicio: fechaInicio,
        fin: fechaFin
      },
      ingresos: {
        pagados: totalIngresosPagados,
        pendientes: totalIngresosPendientes,
        total: totalIngresosPagados + totalIngresosPendientes,
        cantidadPagados: ingresosPagados.length,
        cantidadPendientes: ingresosPendientes.length
      },
      gastos: {
        aprobados: totalGastosAprobados,
        pendientes: totalGastosPendientes,
        total: totalGastosAprobados + totalGastosPendientes,
        cantidadAprobados: gastosAprobados.length,
        cantidadPendientes: gastosPendientes.length
      },
      balance: {
        actual: balance,
        proyeccion: proyeccion
      },
      detalles: {
        pagos: pagosPeriodo,
        gastos: gastosPeriodo
      }
    };
  }, [pagos, gastos, fechasPeriodo]);

  // Función para imprimir reporte
  const imprimirReporte = () => {
    if (!flujoCaja) return;

    const contenido = `
      <html>
        <head>
          <title>Reporte de Flujo de Caja</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { display: flex; justify-content: space-around; margin-bottom: 30px; }
            .summary-item { text-align: center; padding: 10px; border: 1px solid #ccc; }
            .positive { color: green; }
            .negative { color: red; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reporte de Flujo de Caja</h1>
            <p>Período: ${format(flujoCaja.periodo.inicio, 'dd/MM/yyyy', { locale: es })} - ${format(flujoCaja.periodo.fin, 'dd/MM/yyyy', { locale: es })}</p>
            <p>Fecha del reporte: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <h3>${formatCurrency(flujoCaja.ingresos.pagados)}</h3>
              <p>Ingresos Pagados</p>
            </div>
            <div class="summary-item">
              <h3>${formatCurrency(flujoCaja.gastos.aprobados)}</h3>
              <p>Gastos Aprobados</p>
            </div>
            <div class="summary-item">
              <h3 class="${flujoCaja.balance.actual >= 0 ? 'positive' : 'negative'}">${formatCurrency(flujoCaja.balance.actual)}</h3>
              <p>Balance Actual</p>
            </div>
            <div class="summary-item">
              <h3 class="${flujoCaja.balance.proyeccion >= 0 ? 'positive' : 'negative'}">${formatCurrency(flujoCaja.balance.proyeccion)}</h3>
              <p>Proyección</p>
            </div>
          </div>

          <h2>Detalle de Ingresos</h2>
          <table>
            <thead>
              <tr>
                <th>Vivienda</th>
                <th>Residente</th>
                <th>Monto</th>
                <th>Fecha Pago</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${flujoCaja.detalles.pagos.map(pago => `
                <tr>
                  <td>${pago.vivienda?.numero || 'N/A'}</td>
                  <td>${pago.residente?.nombre || 'N/A'}</td>
                  <td>${formatCurrency((pago.montoPagado || pago.monto || 0))}</td>
                  <td>${pago.fechaPago ? format(new Date(pago.fechaPago), 'dd/MM/yyyy', { locale: es }) : 'N/A'}</td>
                  <td>${pago.pagado ? 'Pagado' : 'Pendiente'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>Detalle de Gastos</h2>
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${flujoCaja.detalles.gastos.map(gasto => `
                <tr>
                  <td>${gasto.descripcion || 'N/A'}</td>
                  <td>${formatCurrency((gasto.monto || 0))}</td>
                  <td>${gasto.fecha ? format(new Date(gasto.fecha), 'dd/MM/yyyy', { locale: es }) : 'N/A'}</td>
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

  if (isLoadingPagos || isLoadingGastos) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Reporte de Flujo de Caja</h1>
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

      {/* Selector de período */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Período de Análisis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
        {flujoCaja && (
          <p className="mt-2 text-sm text-gray-600">
            Período: {format(flujoCaja.periodo.inicio, 'dd/MM/yyyy', { locale: es })} - {format(flujoCaja.periodo.fin, 'dd/MM/yyyy', { locale: es })}
          </p>
        )}
      </div>

      {/* Resumen del flujo de caja */}
      {flujoCaja && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-100 border border-green-300 rounded-lg p-4">
              <h3 className="text-2xl font-bold text-green-600">{formatCurrency(flujoCaja.ingresos.pagados)}</h3>
              <p className="text-green-700">Ingresos Pagados</p>
              <p className="text-sm text-green-600">{flujoCaja.ingresos.cantidadPagados} pagos</p>
            </div>
            <div className="bg-red-100 border border-red-300 rounded-lg p-4">
              <h3 className="text-2xl font-bold text-red-600">{formatCurrency(flujoCaja.gastos.aprobados)}</h3>
              <p className="text-red-700">Gastos Aprobados</p>
              <p className="text-sm text-red-600">{flujoCaja.gastos.cantidadAprobados} gastos</p>
            </div>
            <div className={`border rounded-lg p-4 ${flujoCaja.balance.actual >= 0 ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'}`}>
              <h3 className={`text-2xl font-bold ${flujoCaja.balance.actual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(flujoCaja.balance.actual)}
              </h3>
              <p className={flujoCaja.balance.actual >= 0 ? 'text-green-700' : 'text-red-700'}>Balance Actual</p>
            </div>
            <div className={`border rounded-lg p-4 ${flujoCaja.balance.proyeccion >= 0 ? 'bg-blue-100 border-blue-300' : 'bg-orange-100 border-orange-300'}`}>
              <h3 className={`text-2xl font-bold ${flujoCaja.balance.proyeccion >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatCurrency(flujoCaja.balance.proyeccion)}
              </h3>
              <p className={flujoCaja.balance.proyeccion >= 0 ? 'text-blue-700' : 'text-orange-700'}>Proyección</p>
            </div>
          </div>

          {/* Detalles adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Ingresos Pendientes</h3>
              <div className="text-3xl font-bold text-yellow-600 mb-2">
                {formatCurrency(flujoCaja.ingresos.pendientes)}
              </div>
              <p className="text-sm text-gray-600">{flujoCaja.ingresos.cantidadPendientes} pagos pendientes</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Gastos Pendientes</h3>
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {formatCurrency(flujoCaja.gastos.pendientes)}
              </div>
              <p className="text-sm text-gray-600">{flujoCaja.gastos.cantidadPendientes} gastos pendientes</p>
            </div>
          </div>

          {/* Tabla de transacciones */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Transacciones del Período</h3>
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
                      Tipo
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
                  {[
                    ...flujoCaja.detalles.pagos.map(pago => ({
                      ...pago,
                      tipo: 'Ingreso',
                      descripcion: `Pago - Vivienda ${pago.vivienda?.numero}`,
                      fecha: pago.fechaPago
                    })),
                    ...flujoCaja.detalles.gastos.map(gasto => ({
                      ...gasto,
                      tipo: 'Gasto',
                      descripcion: gasto.descripcion,
                      fecha: gasto.fecha
                    }))
                  ]
                  .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                  .map((transaccion, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaccion.fecha ? format(new Date(transaccion.fecha), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaccion.descripcion}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaccion.tipo === 'Ingreso' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaccion.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency((transaccion.monto || transaccion.montoPagado || 0))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaccion.pagado || transaccion.estado === 'Aprobado'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaccion.pagado ? 'Pagado' : transaccion.estado || 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!flujoCaja && (
        <div className="text-center py-8 text-gray-500">
          No hay datos disponibles para el período seleccionado.
        </div>
      )}
    </div>
  );
};

export default ReporteFlujoCaja; 