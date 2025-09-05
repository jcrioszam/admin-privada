import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const ProyectosEspecialesResidente = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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

  // Obtener proyectos generales activos
  const { data: proyectosGenerales, isLoading: isLoadingGenerales } = useQuery({
    queryKey: ['proyectos-generales'],
    queryFn: async () => {
      const response = await api.get('/api/proyectos-pagos-especiales');
      return response.data.filter(proyecto => proyecto.activo);
    }
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

  const getEstadoProyecto = (proyecto) => {
    if (proyecto.pagado) {
      return {
        texto: 'Pagado',
        color: 'text-green-600',
        icono: CheckCircleIcon,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    } else {
      const hoy = new Date();
      const fechaLimite = new Date(proyecto.fechaLimite);
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
  };

  if (isLoadingProyectos || isLoadingGenerales) {
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
                <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Proyectos Especiales</h1>
                  <p className="text-gray-600">Proyectos especiales y pagos adicionales</p>
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

        {/* Resumen de Proyectos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">Total Proyectos</p>
                <p className="text-2xl font-bold text-blue-900">
                  {proyectosEspeciales?.length || 0}
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
                  {proyectosEspeciales?.filter(p => !p.pagado).length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">Pagados</p>
                <p className="text-2xl font-bold text-green-900">
                  {proyectosEspeciales?.filter(p => p.pagado).length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Proyectos Especiales del Residente */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Mis Proyectos Especiales</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {proyectosEspeciales && proyectosEspeciales.length > 0 ? (
              proyectosEspeciales.map((proyecto) => {
                const estado = getEstadoProyecto(proyecto);
                const IconoEstado = estado.icono;
                
                return (
                  <div key={proyecto._id} className={`p-6 ${estado.bgColor} ${estado.borderColor} border-l-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <IconoEstado className={`h-6 w-6 ${estado.color}`} />
                          <div>
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
                              <div className="flex items-center space-x-2">
                                <CalendarIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  Vence: {formatearFecha(proyecto.fechaLimite)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${estado.color}`}>
                          {estado.texto}
                        </p>
                        {proyecto.fechaPago && (
                          <p className="text-xs text-gray-500">
                            Pagado: {formatearFecha(proyecto.fechaPago)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-gray-500">
                <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p>No tienes proyectos especiales asignados</p>
              </div>
            )}
          </div>
        </div>

        {/* Proyectos Generales Activos */}
        {proyectosGenerales && proyectosGenerales.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Proyectos Generales Activos</h3>
              <p className="text-sm text-gray-600 mt-1">
                Proyectos disponibles para todos los residentes
              </p>
            </div>
            <div className="divide-y divide-gray-200">
              {proyectosGenerales.map((proyecto) => (
                <div key={proyecto._id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">
                        {proyecto.tipo}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {proyecto.descripcion}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formatearMoneda(proyecto.cantidadPagar)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Vence: {formatearFecha(proyecto.fechaLimite)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Disponible
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

export default ProyectosEspecialesResidente;
