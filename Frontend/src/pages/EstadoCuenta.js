import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
  UserIcon, 
  HomeIcon, 
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const EstadoCuenta = () => {
  const [residenteSeleccionado, setResidenteSeleccionado] = useState(null);

  // Obtener residentes con sus viviendas
  const { data: residentes, isLoading: isLoadingResidentes } = useQuery({
    queryKey: ['residentes'],
    queryFn: async () => {
      const response = await api.get('/api/residentes');
      return response.data;
    }
  });

  // Obtener pagos del residente seleccionado
  const { data: pagosResidente, isLoading: isLoadingPagos } = useQuery({
    queryKey: ['pagos-residente', residenteSeleccionado?._id],
    queryFn: async () => {
      if (!residenteSeleccionado) return [];
      const response = await api.get(`/api/pagos/residente/${residenteSeleccionado._id}`);
      return response.data;
    },
    enabled: !!residenteSeleccionado
  });

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

  const calcularResumen = (pagos) => {
    if (!pagos || pagos.length === 0) {
      return { totalPagado: 0, totalPendiente: 0, totalVencido: 0, mesesPagados: 0, mesesPendientes: 0 };
    }

    const resumen = pagos.reduce((acc, pago) => {
      if (pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente') {
        acc.totalPagado += pago.montoPagado || 0;
        acc.mesesPagados++;
      } else if (pago.estado === 'Pendiente') {
        const hoy = new Date();
        const fechaLimite = new Date(pago.fechaLimite);
        const diasVencido = Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
        
        if (diasVencido > 0) {
          acc.totalVencido += pago.monto;
        } else {
          acc.totalPendiente += pago.monto;
        }
        acc.mesesPendientes++;
      }
      return acc;
    }, { totalPagado: 0, totalPendiente: 0, totalVencido: 0, mesesPagados: 0, mesesPendientes: 0 });

    return resumen;
  };

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

  if (isLoadingResidentes) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const resumen = calcularResumen(pagosResidente);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <DocumentTextIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estado de Cuenta</h1>
            <p className="text-gray-600">Consulta el historial de pagos de cada residente</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Residentes */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Residentes</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {residentes?.map((residente) => (
                <button
                  key={residente._id}
                  onClick={() => setResidenteSeleccionado(residente)}
                  className={`w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors ${
                    residenteSeleccionado?._id === residente._id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-8 w-8 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {residente.nombre} {residente.apellidos}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <HomeIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-500">
                          Vivienda {residente.vivienda?.numero}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Estado de Cuenta del Residente Seleccionado */}
        <div className="lg:col-span-2">
          {residenteSeleccionado ? (
            <div className="space-y-6">
              {/* Información del Residente */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <UserIcon className="h-12 w-12 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {residenteSeleccionado.nombre} {residenteSeleccionado.apellidos}
                    </h3>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <HomeIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Vivienda {residenteSeleccionado.vivienda?.numero}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Ingreso: {formatearFecha(residenteSeleccionado.fechaIngreso)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen de Pagos */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">Pagados</p>
                      <p className="text-2xl font-bold text-green-900">
                        {resumen.mesesPagados} meses
                      </p>
                      <p className="text-sm text-green-700">
                        {formatearMoneda(resumen.totalPagado)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <ClockIcon className="h-8 w-8 text-yellow-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-800">Pendientes</p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {resumen.mesesPendientes} meses
                      </p>
                      <p className="text-sm text-yellow-700">
                        {formatearMoneda(resumen.totalPendiente)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">Vencidos</p>
                      <p className="text-2xl font-bold text-red-900">
                        {resumen.totalVencido > 0 ? 'Sí' : 'No'}
                      </p>
                      <p className="text-sm text-red-700">
                        {formatearMoneda(resumen.totalVencido)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-800">Total</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {resumen.mesesPagados + resumen.mesesPendientes}
                      </p>
                      <p className="text-sm text-blue-700">
                        {formatearMoneda(resumen.totalPagado + resumen.totalPendiente + resumen.totalVencido)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historial de Pagos */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Historial de Pagos</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {isLoadingPagos ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : pagosResidente && pagosResidente.length > 0 ? (
                    pagosResidente
                      .sort((a, b) => b.año - a.año || b.mes - a.mes)
                      .map((pago) => {
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
                                    {formatearMoneda(pago.monto)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-medium ${estado.color}`}>
                                  {estado.texto}
                                </p>
                                {pago.fechaPago && (
                                  <p className="text-xs text-gray-500">
                                    Pagado: {formatearFecha(pago.fechaPago)}
                                  </p>
                                )}
                                {pago.fechaLimite && pago.estado === 'Pendiente' && (
                                  <p className="text-xs text-gray-500">
                                    Vence: {formatearFecha(pago.fechaLimite)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      <p>No hay pagos registrados para este residente</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecciona un residente
              </h3>
              <p className="text-gray-500">
                Elige un residente de la lista para ver su estado de cuenta
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EstadoCuenta;
