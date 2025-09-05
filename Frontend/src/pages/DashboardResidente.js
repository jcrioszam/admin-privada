import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';

const DashboardResidente = () => {
  // Trigger deploy - corrección de datos del dashboard
  const navigate = useNavigate();
  const { user } = useAuth();
  const [residente, setResidente] = useState(null);
  const [claveAcceso, setClaveAcceso] = useState('');

  useEffect(() => {
    // Verificar si hay usuario autenticado
    if (!user) {
      console.log('❌ No hay usuario autenticado, redirigiendo al login');
      navigate('/residente/login');
      return;
    }

    // Verificar si el usuario es residente
    if (user.rol !== 'Residente') {
      console.log('❌ Usuario no es residente, redirigiendo al login');
      navigate('/residente/login');
      return;
    }

    console.log('✅ Usuario residente autenticado:', user);
    setResidente(user);

    // Para el sistema unificado, necesitamos obtener la clave de acceso del residente
    // Por ahora, usaremos el ID del usuario como identificador
    setClaveAcceso(user.id);
  }, [user, navigate]);

  // Query para obtener dashboard completo del residente
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard-residente', user?.residente],
    queryFn: () => api.get(`/api/residentes/dashboard/${user.residente}`),
    enabled: !!user?.residente,
  });

  const handleLogout = () => {
    // Limpiar datos del sistema unificado
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('isResidente');
    navigate('/residente/login');
  };

  if (!residente) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const perfil = dashboardData?.data?.residente;
  const estadisticas = dashboardData?.data?.estadisticas;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Portal de Residentes
              </h1>
              <p className="text-gray-600">
                Bienvenido, {residente.nombre} {residente.apellidos}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {residente.residente ? 'Usuario: Residente' : 'Usuario: ' + residente.rol}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Información Personal */}
        <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Información Personal
            </h3>
            {dashboardLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : perfil ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Nombre:</strong> {perfil.nombre} {perfil.apellidos}</p>
                  <p><strong>Teléfono:</strong> {perfil.telefono}</p>
                  <p><strong>Tipo:</strong> {perfil.tipo}</p>
                  <p><strong>Fecha de Ingreso:</strong> {new Date(perfil.fechaIngreso).toLocaleDateString()}</p>
                </div>
                <div>
                  <p><strong>Vivienda:</strong> {perfil.vivienda.numero}</p>
                  <p><strong>Estado:</strong> {perfil.vivienda.estado}</p>
                  <p><strong>Tipo de Ocupación:</strong> {perfil.vivienda.tipoOcupacion}</p>
                  <p><strong>Meses en el sistema:</strong> {estadisticas?.mesesDesdeIngreso || 0}</p>
                </div>
              </div>
            ) : (
              <p className="text-red-600">Error al cargar información personal</p>
            )}
          </div>
        </div>

        {/* Resumen de Pagos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pagos Realizados
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardLoading ? '...' : estadisticas?.totalPagos || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pagos Atrasados
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardLoading ? '...' : estadisticas?.totalAtrasados || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Proyectos Pendientes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardLoading ? '...' : estadisticas?.proyectosPendientes || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Próximo Pago
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {dashboardLoading ? '...' : 'Próximo mes'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pagos Atrasados */}
        {estadisticas?.pagosAtrasados?.length > 0 && (
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-red-900 mb-4">
                ⚠️ Pagos Atrasados
              </h3>
              <div className="space-y-3">
                {estadisticas.pagosAtrasados.map((pago, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-red-800">
                          Mantenimiento - {pago.mes}/{pago.año}
                        </p>
                        <p className="text-sm text-red-600">
                          {pago.mesesAtraso} meses de atraso
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-800">
                          ${pago.monto}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Proyectos Especiales */}
        {estadisticas?.proyectosPendientes > 0 && (
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Proyectos Especiales
              </h3>
              <div className="text-center py-8">
                <p className="text-gray-600">
                  Tienes {estadisticas.proyectosPendientes} proyectos especiales pendientes
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Contacta a la administración para más detalles
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Acciones Rápidas */}
        <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Acciones Rápidas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/residente/estado-cuenta')}
                className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ver Estado de Cuenta
              </button>
              
              <button
                onClick={() => navigate('/residente/comprobantes')}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar Comprobantes
              </button>
              
              <button
                onClick={() => navigate('/residente/proyectos-especiales')}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Proyectos Especiales
              </button>
            </div>
          </div>
        </div>

        {/* Historial de Pagos */}
        {estadisticas?.totalPagos > 0 && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Historial de Pagos
              </h3>
              <div className="text-center py-8">
                <p className="text-gray-600">
                  Has realizado {estadisticas.totalPagos} pagos de mantenimiento
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Usa el botón "Ver Estado de Cuenta" para ver el historial completo
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardResidente;
