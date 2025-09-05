import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { 
  UserIcon, 
  HomeIcon, 
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  DocumentTextIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const EstadoCuentaResidente = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [residente, setResidente] = useState(user);

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

  if (isLoadingPagos) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const resumen = calcularResumen(pagosResidente);

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
                <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Estado de Cuenta</h1>
                  <p className="text-gray-600">Tu historial de pagos y estado actual</p>
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
                {residente?.nombre} {residente?.apellidos}
              </h3>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <HomeIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Vivienda {residente?.vivienda?.numero}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Ingreso: {formatearFecha(residente?.fechaIngreso)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de Pagos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            {pagosResidente && pagosResidente.length > 0 ? (
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
                <p>No hay pagos registrados</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstadoCuentaResidente;