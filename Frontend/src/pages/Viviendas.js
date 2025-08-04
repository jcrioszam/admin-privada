import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Viviendas = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVivienda, setEditingVivienda] = useState(null);
  const queryClient = useQueryClient();

  // Obtener viviendas
  const { data: viviendas, isLoading, error } = useQuery({
    queryKey: ['viviendas'],
    queryFn: async () => {
      console.log('🔍 Intentando obtener viviendas...');
      console.log('🌐 API Base URL:', process.env.REACT_APP_API_URL);
      console.log('🔗 URL completa:', `${process.env.REACT_APP_API_URL}/api/viviendas`);
      try {
        const response = await api.get('/api/viviendas');
        console.log('✅ Viviendas obtenidas:', response.data);
        return response.data;
      } catch (err) {
        console.error('❌ Error obteniendo viviendas:', err);
        console.error('❌ Error details:', err.response?.config?.url);
        throw err;
      }
    }
  });

  // Log para depuración
  console.log('📊 Estado de la consulta:', { isLoading, error, viviendasCount: viviendas?.length });

  // Crear/Actualizar vivienda
  const mutation = useMutation(
    (data) => {
      if (editingVivienda) {
        return api.put(`/api/viviendas/${editingVivienda._id}`, data);
      }
      return api.post('/api/viviendas', data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['viviendas']);
        setIsModalOpen(false);
        setEditingVivienda(null);
        toast.success(editingVivienda ? 'Vivienda actualizada' : 'Vivienda creada');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error al guardar vivienda');
      },
    }
  );

  // Eliminar vivienda
  const deleteMutation = useMutation(
    (id) => api.delete(`/api/viviendas/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['viviendas']);
        toast.success('Vivienda eliminada');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error al eliminar vivienda');
      },
    }
  );

  const handleSubmit = (formData) => {
    mutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta vivienda?')) {
      deleteMutation.mutate(id);
    }
  };

  const openModal = (vivienda = null) => {
    setEditingVivienda(vivienda);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVivienda(null);
  };

  // Ordenar viviendas por número de manera ascendente
  const viviendasOrdenadas = useMemo(() => {
    if (!viviendas) return [];
    
    return [...viviendas].sort((a, b) => {
      // Convertir a números si es posible, sino ordenar alfabéticamente
      const numA = parseInt(a.numero) || 0;
      const numB = parseInt(b.numero) || 0;
      
      if (numA !== 0 && numB !== 0) {
        // Si ambos son números, ordenar numéricamente
        return numA - numB;
      } else {
        // Si alguno no es número, ordenar alfabéticamente
        return a.numero.localeCompare(b.numero);
      }
    });
  }, [viviendas]);

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
          <h1 className="text-2xl font-bold text-gray-900">Viviendas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona las viviendas del fraccionamiento
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nueva Vivienda
        </button>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Número</th>
                  <th className="table-header-cell">Tipo</th>
                  <th className="table-header-cell">Estado</th>
                  <th className="table-header-cell">Ocupación</th>
                  <th className="table-header-cell">Residente</th>
                  <th className="table-header-cell">Observaciones</th>
                  <th className="table-header-cell">Acciones</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {viviendasOrdenadas?.map((vivienda) => (
                  <tr key={vivienda._id} className="table-row">
                    <td className="table-cell font-medium">{vivienda.numero}</td>
                    <td className="table-cell">{vivienda.tipo}</td>
                    <td className="table-cell">
                      <span className={`badge ${
                        vivienda.estado === 'Ocupada' ? 'badge-success' :
                        vivienda.estado === 'Desocupada' ? 'badge-secondary' :
                        vivienda.estado === 'En construcción' ? 'badge-warning' :
                        'badge-danger'
                      }`}>
                        {vivienda.estado}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${
                        vivienda.tipoOcupacion === 'Dueño' ? 'badge-primary' :
                        vivienda.tipoOcupacion === 'Inquilino' ? 'badge-info' :
                        'badge-secondary'
                      }`}>
                        {vivienda.tipoOcupacion}
                      </span>
                    </td>
                    <td className="table-cell text-sm">
                      {vivienda.residente ? (
                        <div>
                          <div className="font-medium">
                            {vivienda.residente.nombre} {vivienda.residente.apellidos}
                          </div>
                          <div className="text-xs text-gray-500">
                            {vivienda.residente.telefono}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Sin residente</span>
                      )}
                    </td>
                    <td className="table-cell text-sm text-gray-600">
                      {vivienda.observaciones || '-'}
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(vivienda)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(vivienda._id)}
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
        <ViviendaModal
          vivienda={editingVivienda}
          onSubmit={handleSubmit}
          onClose={closeModal}
          isLoading={mutation.isLoading}
        />
      )}
    </div>
  );
};

// Componente Modal
const ViviendaModal = ({ vivienda, onSubmit, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    numero: vivienda?.numero || '',
    tipo: vivienda?.tipo || 'Casa',
    estado: vivienda?.estado || 'Desocupada',
    tipoOcupacion: vivienda?.tipoOcupacion || 'Vacante',
    observaciones: vivienda?.observaciones || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
            {vivienda ? 'Editar Vivienda' : 'Nueva Vivienda'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Número de Casa</label>
              <input
                type="text"
                name="numero"
                value={formData.numero}
                onChange={handleChange}
                className="input"
                placeholder="Ej: Casa 1, Casa 2, etc."
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">Tipo</label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="Casa">Casa</option>
                  <option value="Departamento">Departamento</option>
                  <option value="Townhouse">Townhouse</option>
                </select>
              </div>
              <div>
                <label className="form-label">Estado</label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="Ocupada">Ocupada</option>
                  <option value="Desocupada">Desocupada</option>
                  <option value="En construcción">En construcción</option>
                  <option value="En venta">En venta</option>
                </select>
              </div>
              <div>
                <label className="form-label">Tipo de Ocupación</label>
                <select
                  name="tipoOcupacion"
                  value={formData.tipoOcupacion}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="Dueño">Dueño</option>
                  <option value="Inquilino">Inquilino</option>
                  <option value="Vacante">Vacante</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Observaciones</label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                className="input"
                rows="3"
                placeholder="Información adicional..."
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
                {isLoading ? 'Guardando...' : (vivienda ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Viviendas; 