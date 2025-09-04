import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { formatCurrency } from '../utils/currencyFormatter';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const EstadoCuentaResidente = () => {
  const [filtroAño, setFiltroAño] = useState(new Date().getFullYear());
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [mostrarComprobante, setMostrarComprobante] = useState(null);

  // Obtener datos del residente desde localStorage
  const residente = JSON.parse(localStorage.getItem('user') || '{}');

  // Obtener pagos del residente
  const { data: pagos, isLoading, error } = useQuery({
    queryKey: ['pagos-residente', residente._id],
    queryFn: async () => {
      const response = await api.get(`/api/pagos/residente/${residente._id}`);
      return response.data;
    },
    enabled: !!residente._id
  });

  // Filtrar pagos según los filtros
  const pagosFiltrados = useMemo(() => {
    if (!pagos) return [];
    
    return pagos.filter(pago => {
      const cumpleAño = pago.año === filtroAño;
      const cumpleEstado = filtroEstado === 'todos' || pago.estado === filtroEstado;
      return cumpleAño && cumpleEstado;
    });
  }, [pagos, filtroAño, filtroEstado]);

  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    if (!pagosFiltrados) return { totalPagado: 0, totalPendiente: 0, totalVencido: 0 };

    const totalPagado = pagosFiltrados
      .filter(p => p.estado === 'Pagado')
      .reduce((sum, p) => sum + (p.montoPagado || 0), 0);

    const totalPendiente = pagosFiltrados
      .filter(p => p.estado === 'Pendiente')
      .reduce((sum, p) => sum + (p.saldoPendiente || p.monto), 0);

    const totalVencido = pagosFiltrados
      .filter(p => p.estado === 'Vencido')
      .reduce((sum, p) => sum + (p.saldoPendiente || p.monto), 0);

    return { totalPagado, totalPendiente, totalVencido };
  }, [pagosFiltrados]);

  // Generar años disponibles
  const añosDisponibles = useMemo(() => {
    if (!pagos) return [new Date().getFullYear()];
    const años = [...new Set(pagos.map(p => p.año))].sort((a, b) => b - a);
    return años.length > 0 ? años : [new Date().getFullYear()];
  }, [pagos]);

  // Generar comprobante PDF
  const generarComprobantePDF = async (pago) => {
    try {
      const element = document.getElementById(`comprobante-${pago._id}`);
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const nombreArchivo = `Comprobante_${pago.mes}_${pago.año}_${residente.nombre}_${residente.apellidos}.pdf`;
      pdf.save(nombreArchivo);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el comprobante');
    }
  };

  // Formatear fecha
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Obtener nombre del mes
  const obtenerNombreMes = (mes) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1] || '';
  };

  // Obtener color según estado
  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case 'Pagado': return 'text-green-600 bg-green-100';
      case 'Pendiente': return 'text-yellow-600 bg-yellow-100';
      case 'Vencido': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error al cargar datos</h2>
          <p className="text-gray-600">No se pudieron cargar los datos de pagos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Estado de Cuenta</h1>
              <p className="text-gray-600 mt-2">
                {residente.nombre} {residente.apellidos} - Vivienda {residente.vivienda?.numero}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Fecha de consulta</p>
              <p className="text-lg font-semibold">{formatearFecha(new Date())}</p>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-center">
              <div className="text-green-500 text-3xl mr-4">✅</div>
              <div>
                <p className="text-sm font-medium text-green-600">Total Pagado</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(estadisticas.totalPagado)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-6">
            <div className="flex items-center">
              <div className="text-yellow-500 text-3xl mr-4">⏳</div>
              <div>
                <p className="text-sm font-medium text-yellow-600">Pendiente</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {formatCurrency(estadisticas.totalPendiente)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-6">
            <div className="flex items-center">
              <div className="text-red-500 text-3xl mr-4">⚠️</div>
              <div>
                <p className="text-sm font-medium text-red-600">Vencido</p>
                <p className="text-2xl font-bold text-red-900">
                  {formatCurrency(estadisticas.totalVencido)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año
              </label>
              <select
                value={filtroAño}
                onChange={(e) => setFiltroAño(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {añosDisponibles.map(año => (
                  <option key={año} value={año}>{año}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos</option>
                <option value="Pagado">Pagado</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Vencido">Vencido</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Pagos */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Historial de Pagos ({pagosFiltrados.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {pagosFiltrados.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No hay pagos para el año {filtroAño}
              </div>
            ) : (
              pagosFiltrados.map((pago) => (
                <div key={pago._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {obtenerNombreMes(pago.mes)} {pago.año}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Cuota de mantenimiento
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${obtenerColorEstado(pago.estado)}`}>
                          {pago.estado}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(pago.monto)}
                        </p>
                        {pago.estado === 'Pagado' && (
                          <p className="text-sm text-green-600">
                            Pagado: {formatCurrency(pago.montoPagado)}
                          </p>
                        )}
                        {pago.estado !== 'Pagado' && (
                          <p className="text-sm text-red-600">
                            Saldo: {formatCurrency(pago.saldoPendiente || pago.monto)}
                          </p>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        {pago.estado === 'Pagado' && (
                          <button
                            onClick={() => setMostrarComprobante(pago)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                          >
                            Ver Comprobante
                          </button>
                        )}
                        
                        {pago.estado === 'Pagado' && (
                          <button
                            onClick={() => generarComprobantePDF(pago)}
                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                          >
                            Descargar PDF
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {pago.estado === 'Pagado' && pago.fechaPago && (
                    <div className="mt-3 text-sm text-gray-500">
                      <p>Fecha de pago: {formatearFecha(pago.fechaPago)}</p>
                      {pago.metodoPago && (
                        <p>Método: {pago.metodoPago}</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Comprobante */}
      {mostrarComprobante && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Comprobante de Pago</h3>
                <button
                  onClick={() => setMostrarComprobante(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div id={`comprobante-${mostrarComprobante._id}`} className="bg-white p-6 border border-gray-200">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">COMPROBANTE DE PAGO</h1>
                  <p className="text-gray-600">Fraccionamiento Privado</p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Información del Residente</h3>
                    <p className="text-sm text-gray-600">
                      <strong>Nombre:</strong> {residente.nombre} {residente.apellidos}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Vivienda:</strong> {residente.vivienda?.numero}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Dirección:</strong> {residente.vivienda?.calle}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Información del Pago</h3>
                    <p className="text-sm text-gray-600">
                      <strong>Período:</strong> {obtenerNombreMes(mostrarComprobante.mes)} {mostrarComprobante.año}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Fecha de Pago:</strong> {formatearFecha(mostrarComprobante.fechaPago)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Método:</strong> {mostrarComprobante.metodoPago || 'No especificado'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Monto Pagado:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(mostrarComprobante.montoPagado || mostrarComprobante.monto)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 text-center text-xs text-gray-500">
                  <p>Este comprobante es válido como constancia de pago</p>
                  <p>Generado el {formatearFecha(new Date())}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setMostrarComprobante(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => generarComprobantePDF(mostrarComprobante)}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                  Descargar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstadoCuentaResidente;
