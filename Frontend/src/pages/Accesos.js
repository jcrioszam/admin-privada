import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, KeyIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Accesos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAcceso, setEditingAcceso] = useState(null);
  const queryClient = useQueryClient();

  // Obtener accesos
  const { data: accesos, isLoading } = useQuery(
    ['accesos'],
    async () => {
      try {
        console.log('🔍 Intentando obtener accesos...');
        const response = await api.get('/api/accesos');
        console.log('✅ Accesos obtenidos:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Error cargando accesos:', error);
        console.error('❌ Error response:', error.response);
        console.error('❌', 'Error al cargar los accesos');
        throw error;
      }
    }
  );

  // Obtener residentes para el select
  const { data: residentes } = useQuery(
    ['residentes'],
    () => api.get('/api/residentes').then(res => res.data)
  );

  // Crear/Actualizar acceso
  const mutation = useMutation(
    (data) => {
      if (editingAcceso) {
        return api.put(`/api/accesos/${editingAcceso._id}`, data);
      }
      return api.post('/api/accesos', data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['accesos']);
        setIsModalOpen(false);
        setEditingAcceso(null);
        console.log('✅', editingAcceso ? 'Acceso actualizado' : 'Acceso creado');
      },
      onError: (error) => {
        console.error('❌', error.response?.data?.message || 'Error al guardar acceso');
      },
    }
  );

  // Activar/Desactivar acceso
  const toggleAccesoMutation = useMutation(
    ({ id, activo }) => api.put(`/api/accesos/${id}/${activo ? 'activar' : 'desactivar'}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['accesos']);
        console.log('✅', 'Estado de acceso actualizado');
      },
      onError: (error) => {
        console.error('❌', error.response?.data?.message || 'Error al actualizar acceso');
      },
    }
  );

  // Eliminar acceso
  const deleteMutation = useMutation(
    (id) => api.delete(`/api/accesos/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['accesos']);
        console.log('✅', 'Acceso eliminado');
      },
      onError: (error) => {
        console.error('❌', error.response?.data?.message || 'Error al eliminar acceso');
      },
    }
  );

  const handleSubmit = (formData) => {
    mutation.mutate(formData);
  };

  const handleToggleAcceso = (acceso) => {
    toggleAccesoMutation.mutate({
      id: acceso._id,
      activo: !acceso.activo
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este acceso?')) {
      deleteMutation.mutate(id);
    }
  };

  const openModal = (acceso = null) => {
    setEditingAcceso(acceso);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAcceso(null);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accesos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los accesos al fraccionamiento
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nuevo Acceso
        </button>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table">
                             <thead className="table-header">
                 <tr>
                   <th className="table-header-cell">Residente</th>
                   <th className="table-header-cell">Vivienda</th>
                   <th className="table-header-cell">Tipo</th>
                   <th className="table-header-cell">Estado</th>
                   <th className="table-header-cell">Asignación</th>
                   <th className="table-header-cell">Acciones</th>
                 </tr>
               </thead>
              <tbody className="table-body">
                {accesos?.map((acceso) => (
                  <tr key={acceso._id} className="table-row">
                    <td className="table-cell font-medium">
                      {acceso.residente?.nombre} {acceso.residente?.apellidos}
                    </td>
                    <td className="table-cell">
                      {acceso.vivienda?.numero} - {acceso.vivienda?.calle}
                    </td>
                                         <td className="table-cell">{acceso.tipoAcceso}</td>
                     <td className="table-cell">
                      <span className={`badge ${
                        acceso.activo ? 'badge-success' : 'badge-danger'
                      }`}>
                        {acceso.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="table-cell">
                      {new Date(acceso.fechaAsignacion).toLocaleDateString()}
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleAcceso(acceso)}
                          className={`btn-sm ${
                            acceso.activo ? 'btn-warning' : 'btn-success'
                          }`}
                        >
                          <KeyIcon className="h-4 w-4 mr-1" />
                          {acceso.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => openModal(acceso)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(acceso._id)}
                          className="text-danger-600 hover:text-danger-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <AccesoModal
          acceso={editingAcceso}
          residentes={residentes}
          onSubmit={handleSubmit}
          onClose={closeModal}
          isLoading={mutation.isLoading}
        />
      )}
    </div>
  );
};

// Componente Modal
const AccesoModal = ({ acceso, residentes, onSubmit, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    residente: acceso?.residente?._id || '',
    vivienda: acceso?.vivienda?._id || '',
    tipoAcceso: acceso?.tipoAcceso || 'Tarjeta RFID',
    activo: acceso?.activo ?? true,
    observaciones: acceso?.observaciones || '',
  });

  // Actualizar vivienda cuando se selecciona un residente
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'residente') {
      // Buscar el residente seleccionado para obtener su vivienda
      const residenteSeleccionado = residentes?.find(r => r._id === value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        vivienda: residenteSeleccionado?.vivienda?._id || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {acceso ? 'Editar Acceso' : 'Nuevo Acceso'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Residente</label>
              <select
                name="residente"
                value={formData.residente}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Seleccionar residente</option>
                {residentes?.map((residente) => (
                  <option key={residente._id} value={residente._id}>
                    {residente.nombre} {residente.apellidos} - {residente.vivienda?.numero}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Tipo de Acceso</label>
              <select
                name="tipoAcceso"
                value={formData.tipoAcceso}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="Tarjeta RFID">Tarjeta RFID</option>
                <option value="Código PIN">Código PIN</option>
                <option value="Huella Digital">Huella Digital</option>
                <option value="Reconocimiento Facial">Reconocimiento Facial</option>
                <option value="Llave Física">Llave Física</option>
                <option value="Control Remoto">Control Remoto</option>
              </select>
            </div>

            <div>
              <label className="form-label">Estado</label>
              <select
                name="activo"
                value={formData.activo}
                onChange={handleChange}
                className="input"
              >
                <option value={true}>Activo</option>
                <option value={false}>Inactivo</option>
              </select>
            </div>

            <div>
              <label className="form-label">Observaciones</label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                className="input"
                rows="3"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  acceso ? 'Actualizar' : 'Crear'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Accesos; 