import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';

const DashboardResidente = () => {
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

  // Query para obtener perfil completo
  const { data: perfilData, isLoading: perfilLoading } = useQuery({
    queryKey: ['perfil-residente', user?.id],
    queryFn: () => api.get(`/api/usuarios/perfil`),
    enabled: !!user,
  });

  // Query para obtener pagos (usando el ID del residente asociado)
  const { data: pagosData, isLoading: pagosLoading } = useQuery({
    queryKey: ['pagos-residente', user?.residente],
    queryFn: () => {
      // Necesitamos obtener la clave de acceso del residente
      // Por ahora, vamos a usar un endpoint diferente o crear uno nuevo
      return api.get(`/api/residentes/pagos/${user.residente}`);
    },
    enabled: !!user?.residente,
  });

  // Query para obtener proyectos
  const { data: proyectosData, isLoading: proyectosLoading } = useQuery({
    queryKey: ['proyectos-residente', user?.residente],
    queryFn: () => api.get(`/api/residentes/proyectos/${user.residente}`),
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

  const perfil = perfilData?.data;
  const pagos = pagosData?.data;
  const proyectos = proyectosData?.data;

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
            {perfilLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : perfil ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Nombre:</strong> {perfil.nombre} {perfil.apellidos}</p>
                  <p><strong>Email:</strong> {perfil.email}</p>
                  <p><strong>Teléfono:</strong> {perfil.telefono}</p>
                  <p><strong>Rol:</strong> {perfil.rol}</p>
                </div>
                <div>
                  <p><strong>ID Usuario:</strong> {perfil.id}</p>
                  <p><strong>Residente ID:</strong> {perfil.residente || 'No asociado'}</p>
                  <p><strong>Estado:</strong> {perfil.activo ? 'Activo' : 'Inactivo'}</p>
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
                      {pagosLoading ? '...' : pagos?.totalPagos || 0}
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
                      {pagosLoading ? '...' : pagos?.totalAtrasados || 0}
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
                      {proyectosLoading ? '...' : proyectos?.proyectosPendientes || 0}
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
                      {pagosLoading ? '...' : pagos?.proximoPago ? (
                        <span>
                          {`Mantenimiento ${pagos.proximoPago.mes}/${pagos.proximoPago.año} - $${pagos.proximoPago.monto}`}
                        </span>
                      ) : '—'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pagos Atrasados */}
        {pagos?.pagosAtrasados?.length > 0 && (
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-red-900 mb-4">
                ⚠️ Pagos Atrasados
              </h3>
              <div className="space-y-3">
                {pagos.pagosAtrasados.map((pago, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-red-800">
                          {pago.tipo} - {pago.mes}/{pago.año}
                        </p>
                        <p className="text-sm text-red-600">
                          {pago.diasAtraso} días de atraso
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
        {proyectos?.proyectos?.length > 0 && (
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Proyectos Especiales
              </h3>
              {proyectosLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {proyectos.proyectos.map((proyecto) => (
                    <div key={proyecto.id} className={`border rounded-lg p-4 ${proyecto.yaPago ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">
                            {proyecto.nombre}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {proyecto.descripcion}
                          </p>
                          <div className="mt-2 flex items-center space-x-4 text-sm">
                            <span className="text-gray-500">
                              Fecha límite: {format(new Date(proyecto.fechaLimite), 'dd/MM/yyyy', { locale: es })}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              proyecto.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {proyecto.estado}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            ${proyecto.cantidadPagar}
                          </p>
                          {proyecto.yaPago ? (
                            <span className="text-sm text-green-600 font-medium">
                              ✅ Pagado
                            </span>
                          ) : (
                            <span className="text-sm text-yellow-600 font-medium">
                              ⏳ Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Historial de Pagos */}
        {pagos?.pagos?.length > 0 && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Historial de Pagos
              </h3>
              {pagosLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
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
                      {pagos.pagos.slice(0, 10).map((pago) => (
                        <tr key={pago._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(pago.fechaPago), 'dd/MM/yyyy', { locale: es })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            Mantenimiento {pago.mes}/{pago.año}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${pago.monto}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Pagado
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardResidente;
