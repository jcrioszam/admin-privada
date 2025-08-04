import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Usuarios = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const queryClient = useQueryClient();

  // Obtener usuarios
  const { data: usuarios, isLoading } = useQuery(
    'usuarios',
    () => api.get('/api/usuarios').then(res => res.data)
  );

  // Crear/Actualizar usuario
  const mutation = useMutation(
    (data) => {
      if (editingUsuario) {
        return api.put(`/api/usuarios/${editingUsuario._id}`, data);
      }
      return api.post('/api/usuarios', data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('usuarios');
        setIsModalOpen(false);
        setEditingUsuario(null);
        toast.success(editingUsuario ? 'Usuario actualizado' : 'Usuario creado');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error al guardar usuario');
      },
    }
  );

  // Eliminar usuario
  const deleteMutation = useMutation(
    (id) => api.delete(`/api/usuarios/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('usuarios');
        toast.success('Usuario eliminado');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error al eliminar usuario');
      },
    }
  );

  const handleSubmit = (formData) => {
    mutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      deleteMutation.mutate(id);
    }
  };

  const openModal = (usuario = null) => {
    setEditingUsuario(usuario);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUsuario(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nuevo Usuario
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
                  <th className="table-header-cell">Email</th>
                  <th className="table-header-cell">Rol</th>
                  <th className="table-header-cell">Estado</th>
                  <th className="table-header-cell">Último Acceso</th>
                  <th className="table-header-cell">Acciones</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {usuarios?.map((usuario) => (
                  <tr key={usuario._id} className="table-row">
                    <td className="table-cell font-medium">
                      {usuario.nombre} {usuario.apellidos}
                    </td>
                    <td className="table-cell">{usuario.email}</td>
                    <td className="table-cell">
                      <span className={`badge ${
                        usuario.rol === 'Administrador' ? 'badge-danger' :
                        usuario.rol === 'Supervisor' ? 'badge-warning' :
                        'badge-secondary'
                      }`}>
                        {usuario.rol}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${
                        usuario.activo ? 'badge-success' : 'badge-danger'
                      }`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="table-cell">
                      {usuario.ultimoAcceso ? 
                        new Date(usuario.ultimoAcceso).toLocaleDateString() : 
                        'Nunca'
                      }
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(usuario)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(usuario._id)}
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
        <UsuarioModal
          usuario={editingUsuario}
          onSubmit={handleSubmit}
          onClose={closeModal}
          isLoading={mutation.isLoading}
        />
      )}
    </div>
  );
};

// Componente Modal
const UsuarioModal = ({ usuario, onSubmit, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    nombre: usuario?.nombre || '',
    apellidos: usuario?.apellidos || '',
    email: usuario?.email || '',
    password: '',
    rol: usuario?.rol || 'Operador',
    activo: usuario?.activo ?? true,
    telefono: usuario?.telefono || '',
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
            {usuario ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            {!usuario && (
              <div>
                <label className="form-label">Contraseña</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input"
                  required={!usuario}
                  minLength="6"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Rol</label>
                <select
                  name="rol"
                  value={formData.rol}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="Operador">Operador</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Administrador">Administrador</option>
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
              <label className="form-label">Teléfono</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="input"
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
                  usuario ? 'Actualizar' : 'Crear'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Usuarios; 