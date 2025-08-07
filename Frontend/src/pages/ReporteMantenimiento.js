import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
// import toast from 'react-hot-toast';

const ReporteMantenimiento = () => {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('actual');
  const [mesesAtras, setMesesAtras] = useState(6);
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Obtener gastos (que incluyen mantenimiento)
  const { data: gastos, isLoading } = useQuery({
    queryKey: ['gastos-mantenimiento'],
    queryFn: async () => {
      try {
        console.log('🔍 Intentando obtener gastos para reporte de mantenimiento...');
        const response = await api.get('/api/gastos/reportes');
        console.log('✅ Gastos obtenidos para reporte:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Error cargando gastos para reporte:', error);
        throw error;
      }
    }
  });

  // Obtener viviendas
  const { data: viviendas, isLoading: isLoadingViviendas } = useQuery({
    queryKey: ['viviendas-mantenimiento'],
    queryFn: async () => {
      try {
        console.log('🔍 Intentando obtener viviendas para reporte de mantenimiento...');
        const response = await api.get('/api/viviendas');
        console.log('✅ Viviendas obtenidas para reporte:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Error cargando viviendas para reporte:', error);
        throw error;
      }
    }
  });

  // Obtener pagos para impresión
  const { data: pagos } = useQuery({
    queryKey: ['pagos-mantenimiento'],
    queryFn: async () => {
      try {
        console.log('🔍 Intentando obtener pagos para reporte de mantenimiento...');
        const response = await api.get('/api/pagos');
        console.log('✅ Pagos obtenidos para reporte:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Error cargando pagos para reporte:', error);
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

  // Función para determinar si un gasto es de mantenimiento
  const esMantenimiento = (descripcion) => {
    const desc = descripcion.toLowerCase();
    return desc.includes('mantenimiento') || 
           desc.includes('manten') || 
           desc.includes('reparación') || 
           desc.includes('reparacion') || 
           desc.includes('arreglo') ||
           desc.includes('limpieza') ||
           desc.includes('jardín') ||
           desc.includes('jardineria') ||
           desc.includes('poda') ||
           desc.includes('pintura') ||
           desc.includes('material') ||
           desc.includes('herramienta') ||
           desc.includes('equipo') ||
           desc.includes('instalación') ||
           desc.includes('instalacion') ||
           desc.includes('construcción') ||
           desc.includes('construccion') ||
           desc.includes('mejora') ||
           desc.includes('renovación') ||
           desc.includes('renovacion');
  };

  // Calcular estadísticas de mantenimiento
  const estadisticasMantenimiento = useMemo(() => {
    if (!gastos || !viviendas) return null;

    const { fechaInicio, fechaFin } = fechasPeriodo;

    console.log('🔍 Analizando gastos para reporte de mantenimiento...');
    console.log('📊 Gastos disponibles:', gastos);
    console.log('📅 Período:', { fechaInicio, fechaFin });

    // Filtrar gastos de mantenimiento del período
    const gastosMantenimiento = gastos.filter(gasto => {
      if (!gasto.fecha) {
        console.log('❌ Gasto sin fecha:', gasto);
        return false;
      }
      const fechaGasto = new Date(gasto.fecha);
      const enPeriodo = fechaGasto >= fechaInicio && fechaGasto <= fechaFin;
      const esMant = esMantenimiento(gasto.descripcion || '');
      
      console.log(`🔍 Gasto: "${gasto.descripcion}" - En período: ${enPeriodo} - Es mantenimiento: ${esMant}`);
      
      return enPeriodo && esMant;
    });

    console.log('✅ Gastos de mantenimiento filtrados:', gastosMantenimiento);

    // Categorizar gastos de mantenimiento
    const gastosPorCategoria = {
      'Mantenimiento General': [],
      'Reparaciones': [],
      'Limpieza': [],
      'Jardinería': [],
      'Otros': []
    };

    gastosMantenimiento.forEach(gasto => {
      const desc = gasto.descripcion.toLowerCase();
      if (desc.includes('reparación') || desc.includes('reparacion') || desc.includes('arreglo')) {
        gastosPorCategoria['Reparaciones'].push(gasto);
      } else if (desc.includes('limpieza')) {
        gastosPorCategoria['Limpieza'].push(gasto);
      } else if (desc.includes('jardín') || desc.includes('jardineria') || desc.includes('poda')) {
        gastosPorCategoria['Jardinería'].push(gasto);
      } else if (desc.includes('pintura') || desc.includes('material') || desc.includes('herramienta') || desc.includes('equipo')) {
        gastosPorCategoria['Mantenimiento General'].push(gasto);
      } else if (desc.includes('mantenimiento') || desc.includes('manten')) {
        gastosPorCategoria['Mantenimiento General'].push(gasto);
      } else {
        gastosPorCategoria['Otros'].push(gasto);
      }
    });

    // Calcular totales por categoría
    const totalesPorCategoria = {};
    Object.entries(gastosPorCategoria).forEach(([categoria, gastos]) => {
      totalesPorCategoria[categoria] = {
        total: gastos.reduce((sum, g) => sum + (g.monto || 0), 0),
        aprobados: gastos.filter(g => g.estado === 'Aprobado').reduce((sum, g) => sum + (g.monto || 0), 0),
        pendientes: gastos.filter(g => g.estado === 'Pendiente').reduce((sum, g) => sum + (g.monto || 0), 0),
        cantidad: gastos.length
      };
    });

    // Calcular totales generales
    const totalGeneral = gastosMantenimiento.reduce((sum, g) => sum + (g.monto || 0), 0);
    const totalAprobados = gastosMantenimiento.filter(g => g.estado === 'Aprobado').reduce((sum, g) => sum + (g.monto || 0), 0);
    const totalPendientes = gastosMantenimiento.filter(g => g.estado === 'Pendiente').reduce((sum, g) => sum + (g.monto || 0), 0);

    return {
      gastosMantenimiento,
      gastosPorCategoria,
      totalesPorCategoria,
      totalGeneral,
      totalAprobados,
      totalPendientes,
      cantidadTotal: gastosMantenimiento.length
    };
  }, [gastos, viviendas, fechasPeriodo]);

  // Filtrar gastos según estado
  const gastosFiltrados = useMemo(() => {
    if (!estadisticasMantenimiento) return [];

    let filtrados = estadisticasMantenimiento.gastosMantenimiento;

    if (filtroEstado === 'aprobados') {
      filtrados = filtrados.filter(g => g.estado === 'Aprobado');
    } else if (filtroEstado === 'pendientes') {
      filtrados = filtrados.filter(g => g.estado === 'Pendiente');
    }

    return filtrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [estadisticasMantenimiento, filtroEstado]);

  // Función para imprimir reporte
  const imprimirReporte = () => {
    if (!estadisticasMantenimiento) return;

    const contenido = `
      <html>
        <head>
          <title>Reporte de Mantenimiento</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .stats { display: flex; justify-content: space-around; margin-bottom: 30px; }
            .stat { text-align: center; padding: 10px; border: 1px solid #ccc; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .categoria { font-weight: bold; }
            .total { background-color: #f9f9f9; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reporte de Mantenimiento</h1>
            <p>Período: ${format(fechasPeriodo.fechaInicio, 'dd/MM/yyyy', { locale: es })} - ${format(fechasPeriodo.fechaFin, 'dd/MM/yyyy', { locale: es })}</p>
            <p>Fecha del reporte: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          </div>
          
          <div class="stats">
            <div class="stat">
              <h3>$${estadisticasMantenimiento.totalGeneral.toLocaleString()}</h3>
              <p>Total Mantenimiento</p>
            </div>
            <div class="stat">
              <h3>$${estadisticasMantenimiento.totalAprobados.toLocaleString()}</h3>
              <p>Total Aprobados</p>
            </div>
            <div class="stat">
              <h3>$${estadisticasMantenimiento.totalPendientes.toLocaleString()}</h3>
              <p>Total Pendientes</p>
            </div>
            <div class="stat">
              <h3>${estadisticasMantenimiento.cantidadTotal}</h3>
              <p>Total Trabajos</p>
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
              ${Object.entries(estadisticasMantenimiento.totalesPorCategoria).map(([categoria, datos]) => `
                <tr>
                  <td class="categoria">${categoria}</td>
                  <td>$${datos.total.toLocaleString()}</td>
                  <td>$${datos.aprobados.toLocaleString()}</td>
                  <td>$${datos.pendientes.toLocaleString()}</td>
                  <td>${datos.cantidad}</td>
                  <td>${((datos.total / estadisticasMantenimiento.totalGeneral) * 100).toFixed(1)}%</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td>TOTAL</td>
                <td>$${estadisticasMantenimiento.totalGeneral.toLocaleString()}</td>
                <td>$${estadisticasMantenimiento.totalAprobados.toLocaleString()}</td>
                <td>$${estadisticasMantenimiento.totalPendientes.toLocaleString()}</td>
                <td>${estadisticasMantenimiento.cantidadTotal}</td>
                <td>100%</td>
              </tr>
            </tbody>
          </table>

          <h2>Detalle de Trabajos</h2>
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
              ${gastosFiltrados.map(gasto => {
                const categoria = gasto.descripcion.toLowerCase().includes('reparación') || gasto.descripcion.toLowerCase().includes('reparacion') || gasto.descripcion.toLowerCase().includes('arreglo') ? 'Reparaciones' :
                                gasto.descripcion.toLowerCase().includes('limpieza') ? 'Limpieza' :
                                gasto.descripcion.toLowerCase().includes('jardín') || gasto.descripcion.toLowerCase().includes('jardineria') || gasto.descripcion.toLowerCase().includes('poda') ? 'Jardinería' :
                                gasto.descripcion.toLowerCase().includes('mantenimiento') || gasto.descripcion.toLowerCase().includes('manten') ? 'Mantenimiento General' : 'Otros';
                return `
                  <tr>
                    <td>${gasto.fecha ? format(new Date(gasto.fecha), 'dd/MM/yyyy', { locale: es }) : 'N/A'}</td>
                    <td>${gasto.descripcion || 'N/A'}</td>
                    <td>${categoria}</td>
                    <td>$${(gasto.monto || 0).toLocaleString()}</td>
                    <td>${gasto.estado || 'N/A'}</td>
                  </tr>
                `;
              }).join('')}
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

  // Función para imprimir lista de morosos
  const imprimirMorosos = () => {
    if (!pagos || pagos.length === 0) {
      console.error('❌', 'No hay datos para imprimir');
      return;
    }

    // Filtrar pagos vencidos con saldo pendiente
    const pagosVencidos = pagos.filter(pago => {
      if (!pago.vivienda) return false;
      
      const fechaLimite = new Date(pago.fechaLimite);
      const hoy = new Date();
      const diasAtraso = pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' || 
                         hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
      
      const saldoPendiente = pago.monto - (pago.montoPagado || 0);
      return diasAtraso > 0 && saldoPendiente > 0;
    });

    // Agrupar por vivienda
    const morososPorVivienda = {};
    pagosVencidos.forEach(pago => {
      const viviendaId = pago.vivienda._id;
      if (!morososPorVivienda[viviendaId]) {
        morososPorVivienda[viviendaId] = {
          vivienda: pago.vivienda,
          pagos: [],
          totalSaldo: 0,
          totalRecargo: 0,
          totalAdeudo: 0
        };
      }
      
      const saldoPendiente = pago.monto - (pago.montoPagado || 0);
      const recargo = pago.recargo || 0;
      
      morososPorVivienda[viviendaId].pagos.push(pago);
      morososPorVivienda[viviendaId].totalSaldo += saldoPendiente;
      morososPorVivienda[viviendaId].totalRecargo += recargo;
      morososPorVivienda[viviendaId].totalAdeudo += saldoPendiente + recargo;
    });

    const morosos = Object.values(morososPorVivienda);

    if (morosos.length === 0) {
      console.error('❌', 'No hay morosos para imprimir');
      return;
    }

    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lista de Morosos - ${new Date().toLocaleDateString('es-ES')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #1f2937; margin: 0; }
          .header p { color: #6b7280; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .total { font-weight: bold; background-color: #fef3c7; }
          .stats { display: flex; justify-content: space-between; margin: 20px 0; }
          .stat { text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; }
          .stat-label { font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Lista de Morosos</h1>
          <p>Fecha de impresión: ${new Date().toLocaleDateString('es-ES')}</p>
          <p>Total de morosos: ${morosos.length}</p>
        </div>
        
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${morosos.reduce((sum, grupo) => sum + grupo.totalSaldo, 0).toLocaleString()}</div>
            <div class="stat-label">Total Saldo Pendiente</div>
          </div>
          <div class="stat">
            <div class="stat-value">${morosos.reduce((sum, grupo) => sum + grupo.totalRecargo, 0).toLocaleString()}</div>
            <div class="stat-label">Total Recargos</div>
          </div>
          <div class="stat">
            <div class="stat-value">${morosos.reduce((sum, grupo) => sum + grupo.totalAdeudo, 0).toLocaleString()}</div>
            <div class="stat-label">Total Adeudo</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Vivienda</th>
              <th>Residente</th>
              <th>Saldo Pendiente</th>
              <th>Recargos</th>
              <th>Total Adeudo</th>
              <th>Períodos Vencidos</th>
            </tr>
          </thead>
          <tbody>
            ${morosos.map((grupo) => {
              const primerPago = grupo.pagos[0];
              const residente = primerPago.residente;
              
              return `
                <tr>
                  <td>${grupo.vivienda.numero}</td>
                  <td>${residente ? `${residente.nombre || ''} ${residente.apellidos || ''}`.trim() : 'Sin residente'}</td>
                  <td>$${grupo.totalSaldo.toLocaleString()}</td>
                  <td>$${grupo.totalRecargo.toLocaleString()}</td>
                  <td class="total">$${grupo.totalAdeudo.toLocaleString()}</td>
                  <td>${grupo.pagos.length}</td>
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

  // Función para imprimir lista de al corriente
  const imprimirAlCorriente = () => {
    if (!pagos || pagos.length === 0) {
      console.error('❌', 'No hay datos para imprimir');
      return;
    }

    // Filtrar viviendas que no tienen pagos vencidos
    const viviendasConPagos = {};
    pagos.forEach(pago => {
      if (!pago.vivienda) return;
      
      const viviendaId = pago.vivienda._id;
      if (!viviendasConPagos[viviendaId]) {
        viviendasConPagos[viviendaId] = {
          vivienda: pago.vivienda,
          pagos: [],
          tieneVencidos: false
        };
      }
      
      const fechaLimite = new Date(pago.fechaLimite);
      const hoy = new Date();
      const diasAtraso = pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' || 
                         hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
      
      const saldoPendiente = pago.monto - (pago.montoPagado || 0);
      
      if (diasAtraso > 0 && saldoPendiente > 0) {
        viviendasConPagos[viviendaId].tieneVencidos = true;
      }
      
      viviendasConPagos[viviendaId].pagos.push(pago);
    });

    const alCorriente = Object.values(viviendasConPagos).filter(grupo => !grupo.tieneVencidos);

    if (alCorriente.length === 0) {
      console.error('❌', 'No hay viviendas al corriente para imprimir');
      return;
    }

    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lista de Al Corriente - ${new Date().toLocaleDateString('es-ES')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #1f2937; margin: 0; }
          .header p { color: #6b7280; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .stats { display: flex; justify-content: space-between; margin: 20px 0; }
          .stat { text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; }
          .stat-label { font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Lista de Al Corriente</h1>
          <p>Fecha de impresión: ${new Date().toLocaleDateString('es-ES')}</p>
          <p>Total de viviendas al corriente: ${alCorriente.length}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Vivienda</th>
              <th>Residente</th>
              <th>Estado</th>
              <th>Último Pago</th>
            </tr>
          </thead>
          <tbody>
            ${alCorriente.map((grupo) => {
              const primerPago = grupo.pagos[0];
              const residente = primerPago.residente;
              
              return `
                <tr>
                  <td>${grupo.vivienda.numero}</td>
                  <td>${residente ? `${residente.nombre || ''} ${residente.apellidos || ''}`.trim() : 'Sin residente'}</td>
                  <td>Al corriente</td>
                  <td>${primerPago.fechaPago ? new Date(primerPago.fechaPago).toLocaleDateString('es-ES') : '-'}</td>
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

  if (isLoading || isLoadingViviendas) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Reporte de Mantenimiento</h1>
        <div className="flex gap-2">
          <button
            onClick={imprimirMorosos}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            title="Imprimir lista de morosos"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir Morosos
          </button>
          <button
            onClick={imprimirAlCorriente}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            title="Imprimir lista de al corriente"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir Al Corriente
          </button>
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
        {estadisticasMantenimiento && (
          <p className="mt-2 text-sm text-gray-600">
            Período: {format(fechasPeriodo.fechaInicio, 'dd/MM/yyyy', { locale: es })} - {format(fechasPeriodo.fechaFin, 'dd/MM/yyyy', { locale: es })}
          </p>
        )}
      </div>

      {/* Estadísticas generales */}
      {estadisticasMantenimiento && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-blue-600">${estadisticasMantenimiento.totalGeneral.toLocaleString()}</h3>
            <p className="text-blue-700">Total Mantenimiento</p>
          </div>
          <div className="bg-green-100 border border-green-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-green-600">${estadisticasMantenimiento.totalAprobados.toLocaleString()}</h3>
            <p className="text-green-700">Total Aprobados</p>
          </div>
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-yellow-600">${estadisticasMantenimiento.totalPendientes.toLocaleString()}</h3>
            <p className="text-yellow-700">Total Pendientes</p>
          </div>
          <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-purple-600">{estadisticasMantenimiento.cantidadTotal}</h3>
            <p className="text-purple-700">Total Trabajos</p>
          </div>
        </div>
      )}

      {/* Tabla de categorías */}
      {estadisticasMantenimiento && (
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
                {Object.entries(estadisticasMantenimiento.totalesPorCategoria).map(([categoria, datos]) => (
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
                      {((datos.total / estadisticasMantenimiento.totalGeneral) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${estadisticasMantenimiento.totalGeneral.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${estadisticasMantenimiento.totalAprobados.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${estadisticasMantenimiento.totalPendientes.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {estadisticasMantenimiento.cantidadTotal}
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
              <option value="aprobados">Aprobados</option>
              <option value="pendientes">Pendientes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de trabajos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Detalle de Trabajos de Mantenimiento</h3>
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
              {gastosFiltrados.map((gasto) => {
                const categoria = gasto.descripcion.toLowerCase().includes('reparación') || gasto.descripcion.toLowerCase().includes('reparacion') || gasto.descripcion.toLowerCase().includes('arreglo') ? 'Reparaciones' :
                                gasto.descripcion.toLowerCase().includes('limpieza') ? 'Limpieza' :
                                gasto.descripcion.toLowerCase().includes('jardín') || gasto.descripcion.toLowerCase().includes('jardineria') || gasto.descripcion.toLowerCase().includes('poda') ? 'Jardinería' :
                                gasto.descripcion.toLowerCase().includes('mantenimiento') || gasto.descripcion.toLowerCase().includes('manten') ? 'Mantenimiento General' : 'Otros';
                
                return (
                  <tr key={gasto._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {gasto.fecha ? format(new Date(gasto.fecha), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {gasto.descripcion || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {categoria}
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {gastosFiltrados.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron trabajos de mantenimiento con los filtros aplicados.
        </div>
      )}
    </div>
  );
};

export default ReporteMantenimiento; 