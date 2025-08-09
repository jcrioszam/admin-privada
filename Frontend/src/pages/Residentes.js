import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
// import toast from 'react-hot-toast';

const Residentes = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResidente, setEditingResidente] = useState(null);
  const queryClient = useQueryClient();

  // Obtener residentes
  const { data: residentes, isLoading } = useQuery({
    queryKey: ['residentes'],
    queryFn: async () => {
      const response = await api.get('/api/residentes');
      return response.data;
    }
  });

  // Obtener viviendas para el select
  const { data: viviendas } = useQuery({
    queryKey: ['viviendas'],
    queryFn: async () => {
      const response = await api.get('/api/viviendas');
      return response.data;
    }
  });

  // Obtener viviendas disponibles
  const { data: viviendasDisponibles } = useQuery({
    queryKey: ['viviendas-disponibles'],
    queryFn: async () => {
      const response = await api.get('/api/residentes/viviendas/disponibles');
      return response.data;
    }
  });

  // Crear/Actualizar residente
  const mutation = useMutation(
    (data) => {
      if (editingResidente) {
        return api.put(`/api/residentes/${editingResidente._id}`, data);
      }
      return api.post('/api/residentes', data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['residentes']);
        setIsModalOpen(false);
        setEditingResidente(null);
        console.log('✅', editingResidente ? 'Residente actualizado' : 'Residente creado');
      },
      onError: (error) => {
        console.error('❌', error.response?.data?.message || 'Error al guardar residente');
      },
    }
  );

  // Eliminar residente
  const deleteMutation = useMutation(
    (id) => api.delete(`/api/residentes/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['residentes']);
        console.log('✅', 'Residente eliminado');
      },
      onError: (error) => {
        console.error('❌', error.response?.data?.message || 'Error al eliminar residente');
      },
    }
  );

  const handleSubmit = (formData) => {
    mutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este residente?')) {
      deleteMutation.mutate(id);
    }
  };

  const openModal = (residente = null) => {
    setEditingResidente(residente);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingResidente(null);
  };

  // Ordenar viviendas disponibles
  const viviendasDisponiblesOrdenadas = useMemo(() => {
    if (!viviendasDisponibles) return [];
    
    return [...viviendasDisponibles].sort((a, b) => {
      const numA = parseInt(a.numero) || 0;
      const numB = parseInt(b.numero) || 0;
      
      if (numA !== 0 && numB !== 0) {
        return numA - numB;
      } else {
        return a.numero.localeCompare(b.numero);
      }
    });
  }, [viviendasDisponibles]);

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
          <h1 className="text-2xl font-bold text-gray-900">Residentes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los residentes del fraccionamiento
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nuevo Residente
        </button>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table">
                             <thead className="table-header">
                 <tr>
                   <th className="table-header-cell">Nombre</th>
                   <th className="table-header-cell">Teléfono</th>
                   <th className="table-header-cell">Tipo</th>
                   <th className="table-header-cell">Vivienda</th>
                   <th className="table-header-cell">Estado</th>
                   <th className="table-header-cell">Acciones</th>
                 </tr>
               </thead>
              <tbody className="table-body">
                {residentes?.map((residente) => (
                                     <tr key={residente._id} className="table-row">
                     <td className="table-cell font-medium">
                       {residente.nombre} {residente.apellidos}
                     </td>
                     <td className="table-cell">{residente.telefono}</td>
                     <td className="table-cell">
                       <span className={`badge ${
                         residente.tipo === 'Dueño' ? 'badge-success' : 'badge-secondary'
                       }`}>
                         {residente.tipo}
                       </span>
                     </td>
                     <td className="table-cell">
                       {residente.vivienda?.numero} - {residente.vivienda?.calle}
                     </td>
                     <td className="table-cell">
                       <span className={`badge ${
                         residente.activo ? 'badge-success' : 'badge-danger'
                       }`}>
                         {residente.activo ? 'Activo' : 'Inactivo'}
                       </span>
                     </td>
                     <td className="table-cell">
                       <div className="flex space-x-2">
                         <button
                           onClick={() => openModal(residente)}
                           className="text-primary-600 hover:text-primary-900"
                         >
                           <PencilIcon className="h-5 w-5" />
                         </button>
                         <button
                           onClick={() => handleDelete(residente._id)}
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
        <ResidenteModal
          residente={editingResidente}
          viviendasDisponibles={viviendasDisponiblesOrdenadas}
          onSubmit={handleSubmit}
          onClose={closeModal}
          isLoading={mutation.isLoading}
        />
      )}
    </div>
  );
};

// Componente Modal
const ResidenteModal = ({ residente, viviendasDisponibles, onSubmit, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    vivienda: residente?.vivienda?._id || '',
    tipo: residente?.tipo || 'Dueño',
    nombre: residente?.nombre || '',
    apellidos: residente?.apellidos || '',
    telefono: residente?.telefono || '',
    email: residente?.email || '',
    password: '',
    crearUsuario: false,
    activo: residente?.activo ?? true,
    observaciones: residente?.observaciones || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
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
            {residente ? 'Editar Residente' : 'Nuevo Residente'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Vivienda</label>
              <select
                name="vivienda"
                value={formData.vivienda}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Seleccionar vivienda</option>
                {/* Si estamos editando, mostrar la vivienda actual + las disponibles */}
                {residente && residente.vivienda && (
                  <option value={residente.vivienda._id || residente.vivienda}>
                    {residente.vivienda.numero} - {residente.vivienda.calle} (Actual)
                  </option>
                )}
                {/* Mostrar viviendas disponibles */}
                {viviendasDisponibles?.map((vivienda) => (
                  <option key={vivienda._id} value={vivienda._id}>
                    {vivienda.numero} - {vivienda.calle}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Apellidos</label>
                <input
                  type="text"
                  name="apellidos"
                  value={formData.apellidos}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Teléfono</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="form-label">Email (opcional)</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="crearUsuario"
                  checked={formData.crearUsuario}
                  onChange={(e) => setFormData(prev => ({ ...prev, crearUsuario: e.target.checked }))}
                />
                <label className="form-label">Crear usuario para residente</label>
              </div>
              <div>
                <label className="form-label">Contraseña (si se crea usuario)</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input"
                  placeholder="Mínimo 4 caracteres"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Tipo</label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="Dueño">Dueño</option>
                  <option value="Inquilino">Inquilino</option>
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
                  residente ? 'Actualizar' : 'Crear'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Residentes; 