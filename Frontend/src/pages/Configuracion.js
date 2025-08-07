import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
// import toast from 'react-hot-toast';

const Configuracion = () => {
  const [formData, setFormData] = useState({
    cuotaMantenimientoMensual: 500
  });

  const queryClient = useQueryClient();

  // Obtener configuración actual
  const { data: configuracion, isLoading, error } = useQuery(
    ['configuracion'],
    async () => {
      try {
        console.log('🔍 Intentando obtener configuración...');
        const response = await api.get('/api/configuracion');
        console.log('✅ Configuración obtenida:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Error cargando configuración:', error);
        console.error('❌ Error response:', error.response);
        console.error('❌ Error status:', error.response?.status);
        console.error('❌ Error data:', error.response?.data);
        console.error('❌', 'Error al cargar la configuración');
        throw error; // Re-lanzar el error para que useQuery lo maneje
      }
    },
    {
      retry: 3,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000, // 5 minutos
    }
  );

  // Actualizar formData solo cuando se carga la configuración por primera vez
  useEffect(() => {
    console.log('🔄 useEffect ejecutándose...');
    console.log('📊 configuracion:', configuracion);
    console.log('⏳ isLoading:', isLoading);
    
    if (configuracion && !isLoading) {
      console.log('✅ Actualizando formData con configuración:', configuracion);
      setFormData({
        cuotaMantenimientoMensual: configuracion.cuotaMantenimientoMensual || 500
      });
    }
  }, [configuracion, isLoading]);

  // Mutación para actualizar configuración
  const updateConfigMutation = useMutation(
    (data) => {
      console.log('🔄 Enviando datos para actualizar:', data);
      return api.put('/api/configuracion', data);
    },
    {
      onSuccess: (response) => {
        console.log('✅ Configuración actualizada exitosamente:', response.data);
        console.log('✅', 'Configuración actualizada correctamente');
        queryClient.invalidateQueries(['configuracion']);
      },
      onError: (error) => {
        console.error('❌ Error actualizando configuración:', error);
        console.error('❌ Error response:', error.response);
        console.error('❌', 'Error al actualizar la configuración');
      }
    }
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('📝 Enviando formulario con datos:', formData);
    updateConfigMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Error al cargar configuración</div>
          <div className="text-gray-500">No se pudo cargar la configuración. Intenta recargar la página.</div>
        </div>
      </div>
    );
  }

  // Log para diagnosticar qué valores se están mostrando
  console.log('🎯 Render - formData actual:', formData);
  console.log('🎯 Render - configuracion cargada:', configuracion);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona la configuración del fraccionamiento
        </p>
      </div>

      {/* Formulario de configuración */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <Cog6ToothIcon className="h-6 w-6 text-primary-600 mr-3" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Configuración General
            </h3>
          </div>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Configuración de Pagos */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Configuración de Pagos</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="form-label">Cuota Mensual de Mantenimiento ($)</label>
                  <input
                    type="number"
                    name="cuotaMantenimientoMensual"
                    value={formData.cuotaMantenimientoMensual}
                    onChange={handleInputChange}
                    className="form-input"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  if (configuracion) {
                    setFormData({
                      cuotaMantenimientoMensual: configuracion.cuotaMantenimientoMensual || 500
                    });
                  }
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateConfigMutation.isLoading}
                className="btn-primary"
              >
                {updateConfigMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Configuración'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Configuracion; 