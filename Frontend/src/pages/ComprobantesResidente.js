import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { 
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  PrinterIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ComprobantesResidente = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAño, setFiltroAño] = useState('');

  // Obtener pagos del residente
  const { data: pagosResidente, isLoading: isLoadingPagos } = useQuery({
    queryKey: ['pagos-residente', user?.residente],
    queryFn: async () => {
      if (!user?.residente) return [];
      const response = await api.get(`/api/pagos/residente/${user.residente}`);
      return response.data;
    },
    enabled: !!user?.residente
  });

  // Obtener proyectos especiales del residente
  const { data: proyectosEspeciales, isLoading: isLoadingProyectos } = useQuery({
    queryKey: ['proyectos-especiales-residente', user?.residente],
    queryFn: async () => {
      if (!user?.residente) return [];
      const response = await api.get(`/api/pagos-especiales/residente/${user.residente}`);
      return response.data;
    },
    enabled: !!user?.residente
  });

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearMoneda = (monto) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(monto);
  };

  const getEstadoPago = (pago) => {
    if (pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente') {
      return { 
        texto: 'Pagado', 
        color: 'text-green-600', 
        icono: CheckCircleIcon,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    } else if (pago.estado === 'Pendiente') {
      const hoy = new Date();
      const fechaLimite = new Date(pago.fechaLimite);
      const diasVencido = Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
      
      if (diasVencido > 0) {
        return { 
          texto: `Vencido (${diasVencido} días)`, 
          color: 'text-red-600', 
          icono: ExclamationTriangleIcon,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      } else {
        return { 
          texto: 'Pendiente', 
          color: 'text-yellow-600', 
          icono: ClockIcon,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      }
    }
    return { 
      texto: pago.estado, 
      color: 'text-gray-600', 
      icono: ClockIcon,
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };
  };

  // Filtrar pagos según los filtros
  const pagosFiltrados = pagosResidente?.filter(pago => {
    if (filtroMes && pago.mes !== parseInt(filtroMes)) return false;
    if (filtroAño && pago.año !== parseInt(filtroAño)) return false;
    return true;
  }) || [];

  // Filtrar proyectos especiales según los filtros
  const proyectosFiltrados = proyectosEspeciales?.filter(proyecto => {
    if (!proyecto.fechaPago) return false;
    const fechaPago = new Date(proyecto.fechaPago);
    if (filtroMes && fechaPago.getMonth() + 1 !== parseInt(filtroMes)) return false;
    if (filtroAño && fechaPago.getFullYear() !== parseInt(filtroAño)) return false;
    return true;
  }) || [];

  // Generar PDF de comprobante individual
  const generarComprobantePDF = async (pago) => {
    const pdf = new jsPDF();
    
    // Configurar fuente
    pdf.setFont('helvetica');
    
    // Título
    pdf.setFontSize(20);
    pdf.text('COMPROBANTE DE PAGO', 105, 20, { align: 'center' });
    
    // Información del residente
    pdf.setFontSize(12);
    pdf.text(`Residente: ${user?.nombre} ${user?.apellidos}`, 20, 40);
    pdf.text(`Vivienda: ${user?.vivienda?.numero}`, 20, 50);
    pdf.text(`Fecha de Pago: ${formatearFecha(pago.fechaPago)}`, 20, 60);
    
    // Detalles del pago
    pdf.text(`Período: ${pago.mes}/${pago.año}`, 20, 80);
    pdf.text(`Monto: ${formatearMoneda(pago.montoPagado || pago.monto)}`, 20, 90);
    pdf.text(`Método de Pago: ${pago.metodoPago || 'No especificado'}`, 20, 100);
    pdf.text(`Estado: ${pago.estado}`, 20, 110);
    
    // Referencia de pago si existe
    if (pago.referenciaPago) {
      pdf.text(`Referencia: ${pago.referenciaPago}`, 20, 120);
    }
    
    // Pie de página
    pdf.setFontSize(10);
    pdf.text('Este comprobante es válido como recibo de pago', 105, 180, { align: 'center' });
    pdf.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 105, 190, { align: 'center' });
    
    // Descargar PDF
    pdf.save(`comprobante-${pago.mes}-${pago.año}.pdf`);
  };

  // Generar PDF de resumen de pagos
  const generarResumenPDF = async () => {
    const pdf = new jsPDF();
    
    // Configurar fuente
    pdf.setFont('helvetica');
    
    // Título
    pdf.setFontSize(20);
    pdf.text('RESUMEN DE PAGOS', 105, 20, { align: 'center' });
    
    // Información del residente
    pdf.setFontSize(12);
    pdf.text(`Residente: ${user?.nombre} ${user?.apellidos}`, 20, 40);
    pdf.text(`Vivienda: ${user?.vivienda?.numero}`, 20, 50);
    pdf.text(`Período: ${filtroAño || 'Todos los años'}`, 20, 60);
    
    let yPosition = 80;
    
    // Pagos de mantenimiento
    pdf.setFontSize(14);
    pdf.text('PAGOS DE MANTENIMIENTO', 20, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(10);
    pagosFiltrados.forEach(pago => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.text(`${pago.mes}/${pago.año} - ${formatearMoneda(pago.montoPagado || pago.monto)} - ${pago.estado}`, 20, yPosition);
      yPosition += 8;
    });
    
    // Proyectos especiales
    if (proyectosFiltrados.length > 0) {
      yPosition += 10;
      pdf.setFontSize(14);
      pdf.text('PROYECTOS ESPECIALES', 20, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      proyectosFiltrados.forEach(proyecto => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.text(`${proyecto.tipo} - ${formatearMoneda(proyecto.monto)} - ${proyecto.pagado ? 'Pagado' : 'Pendiente'}`, 20, yPosition);
        yPosition += 8;
      });
    }
    
    // Pie de página
    pdf.setFontSize(10);
    pdf.text('Este resumen es válido como comprobante de pagos', 105, 280, { align: 'center' });
    pdf.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 105, 290, { align: 'center' });
    
    // Descargar PDF
    const nombreArchivo = filtroAño ? `resumen-${filtroAño}.pdf` : 'resumen-pagos.pdf';
    pdf.save(nombreArchivo);
  };

  if (isLoadingPagos || isLoadingProyectos) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/residente/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Volver al Dashboard
              </button>
              <div className="flex items-center space-x-3">
                <DocumentArrowDownIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Comprobantes</h1>
                  <p className="text-gray-600">Descarga tus comprobantes de pago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Información del Residente */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <UserIcon className="h-12 w-12 text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">
                {user?.nombre} {user?.apellidos}
              </h3>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    Vivienda {user?.vivienda?.numero}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-4">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Mes</label>
              <select
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Todos los meses</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => (
                  <option key={mes} value={mes}>
                    {new Date(2024, mes - 1).toLocaleString('es-ES', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Año</label>
              <select
                value={filtroAño}
                onChange={(e) => setFiltroAño(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Todos los años</option>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(año => (
                  <option key={año} value={año}>{año}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={generarResumenPDF}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Descargar Resumen
              </button>
            </div>
          </div>
        </div>

        {/* Pagos de Mantenimiento */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Pagos de Mantenimiento</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {pagosFiltrados.length > 0 ? (
              pagosFiltrados.map((pago) => {
                const estado = getEstadoPago(pago);
                const IconoEstado = estado.icono;
                
                return (
                  <div key={pago._id} className={`p-6 ${estado.bgColor} ${estado.borderColor} border-l-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <IconoEstado className={`h-6 w-6 ${estado.color}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {pago.mes}/{pago.año}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatearMoneda(pago.montoPagado || pago.monto)}
                          </p>
                          {pago.fechaPago && (
                            <p className="text-xs text-gray-500">
                              Pagado: {formatearFecha(pago.fechaPago)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <p className={`text-sm font-medium ${estado.color}`}>
                          {estado.texto}
                        </p>
                        {pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' ? (
                          <button
                            onClick={() => generarComprobantePDF(pago)}
                            className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                          >
                            <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                            Descargar
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p>No hay pagos que coincidan con los filtros seleccionados</p>
              </div>
            )}
          </div>
        </div>

        {/* Proyectos Especiales */}
        {proyectosFiltrados.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Proyectos Especiales</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {proyectosFiltrados.map((proyecto) => (
                <div key={proyecto._id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">
                        {proyecto.tipo || 'Proyecto Especial'}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {proyecto.descripcion || 'Sin descripción'}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formatearMoneda(proyecto.monto || 0)}
                          </span>
                        </div>
                        {proyecto.fechaPago && (
                          <div className="flex items-center space-x-2">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              Pagado: {formatearFecha(proyecto.fechaPago)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        proyecto.pagado ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {proyecto.pagado ? 'Pagado' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComprobantesResidente;
