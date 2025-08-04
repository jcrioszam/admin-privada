import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Configuracion = () => {
  const [formData, setFormData] = useState({
    cuotaMantenimientoMensual: 500,
    nombreFraccionamiento: 'Fraccionamiento Privado',
    direccionFraccionamiento: '',
    telefonoContacto: '',
    emailContacto: '',
    diasGraciaPago: 5,
    porcentajeRecargo: 10
  });

  const queryClient = useQueryClient();

  // Obtener configuración actual
  const { data: configuracion, isLoading } = useQuery(
    'configuracion',
    () => api.get('/api/configuracion').then(res => res.data),
    {
      onSuccess: (data) => {
        setFormData(data);
      }
    }
  );

  // Mutación para actualizar configuración
  const updateConfigMutation = useMutation(
    (data) => api.put('/api/configuracion', data),
    {
      onSuccess: () => {
        toast.success('Configuración actualizada correctamente');
        queryClient.invalidateQueries('configuracion');
      },
      onError: (error) => {
        toast.error('Error al actualizar la configuración');
        console.error('Error:', error);
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
    updateConfigMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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
            {/* Información del Fraccionamiento */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Información del Fraccionamiento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Nombre del Fraccionamiento</label>
                  <input
                    type="text"
                    name="nombreFraccionamiento"
                    value={formData.nombreFraccionamiento}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Dirección</label>
                  <input
                    type="text"
                    name="direccionFraccionamiento"
                    value={formData.direccionFraccionamiento}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Teléfono de Contacto</label>
                  <input
                    type="tel"
                    name="telefonoContacto"
                    value={formData.telefonoContacto}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Email de Contacto</label>
                  <input
                    type="email"
                    name="emailContacto"
                    value={formData.emailContacto}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Configuración de Pagos */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Configuración de Pagos</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div>
                  <label className="form-label">Días de Gracia</label>
                  <input
                    type="number"
                    name="diasGraciaPago"
                    value={formData.diasGraciaPago}
                    onChange={handleInputChange}
                    className="form-input"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Porcentaje de Recargo (%)</label>
                  <input
                    type="number"
                    name="porcentajeRecargo"
                    value={formData.porcentajeRecargo}
                    onChange={handleInputChange}
                    className="form-input"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setFormData(configuracion)}
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