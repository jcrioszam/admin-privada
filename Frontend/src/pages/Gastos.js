import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Gastos = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingGasto, setEditingGasto] = useState(null);
  const [filtros, setFiltros] = useState({
    categoria: '',
    estado: '',
    fechaInicio: '',
    fechaFin: ''
  });
  const [showFiltros, setShowFiltros] = useState(false);
  
  const queryClient = useQueryClient();

  // Obtener gastos
  const { data: gastosData, isLoading } = useQuery(
    ['gastos', filtros],
    () => api.get('/api/gastos', { params: filtros }).then(res => res.data),
    {
      refetchInterval: 5000
    }
  );

  // Obtener estadísticas
  const { data: estadisticas } = useQuery(
    ['gastos-estadisticas', filtros.fechaInicio, filtros.fechaFin],
    () => api.get('/api/gastos/estadisticas/resumen', { 
      params: { 
        fechaInicio: filtros.fechaInicio, 
        fechaFin: filtros.fechaFin 
      } 
    }).then(res => res.data)
  );

  // Mutaciones
  const createMutation = useMutation(
    (data) => api.post('/api/gastos', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('gastos');
        queryClient.invalidateQueries('gastos-estadisticas');
        toast.success('Gasto creado exitosamente');
        setShowModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error al crear gasto');
      }
    }
  );

  const updateMutation = useMutation(
    (data) => api.put(`/api/gastos/${editingGasto._id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('gastos');
        queryClient.invalidateQueries('gastos-estadisticas');
        toast.success('Gasto actualizado exitosamente');
        setShowModal(false);
        setEditingGasto(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error al actualizar gasto');
      }
    }
  );

  const deleteMutation = useMutation(
    (id) => api.delete(`/api/gastos/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('gastos');
        queryClient.invalidateQueries('gastos-estadisticas');
        toast.success('Gasto eliminado exitosamente');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error al eliminar gasto');
      }
    }
  );

  const estadoMutation = useMutation(
    ({ id, estado }) => api.patch(`/api/gastos/${id}/estado`, { estado }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('gastos');
        queryClient.invalidateQueries('gastos-estadisticas');
        toast.success('Estado actualizado exitosamente');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error al actualizar estado');
      }
    }
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  const onSubmit = (data) => {
    if (editingGasto) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (gasto) => {
    setEditingGasto(gasto);
    reset(gasto);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEstadoChange = (id, nuevoEstado) => {
    estadoMutation.mutate({ id, estado: nuevoEstado });
  };

  const limpiarFiltros = () => {
    setFiltros({
      categoria: '',
      estado: '',
      fechaInicio: '',
      fechaFin: ''
    });
  };

  const categorias = [
    'Mantenimiento', 'Limpieza', 'Seguridad', 'Jardinería',
    'Electricidad', 'Agua', 'Internet', 'Otros'
  ];

  const estados = ['Pendiente', 'Aprobado', 'Rechazado'];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Gastos</h1>
          <p className="text-gray-600">Gestiona los gastos del fraccionamiento</p>
        </div>
        <button
          onClick={() => {
            setEditingGasto(null);
            reset({});
            setShowModal(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
          Nuevo Gasto
        </button>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Ingresos</p>
                <p className="text-lg font-semibold text-green-600">
                  ${estadisticas.totalIngresos?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Gastos</p>
                <p className="text-lg font-semibold text-red-600">
                  ${estadisticas.totalGastos?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Balance</p>
                <p className={`text-lg font-semibold ${estadisticas.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${estadisticas.balance?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Pendientes</p>
                <p className="text-lg font-semibold text-yellow-600">
                  {estadisticas.gastosPendientes || '0'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Filtros</h3>
          <button
            onClick={() => setShowFiltros(!showFiltros)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <FunnelIcon className="h-5 w-5" />
            {showFiltros ? 'Ocultar' : 'Mostrar'} Filtros
          </button>
        </div>
        
        {showFiltros && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={filtros.categoria}
                onChange={(e) => setFiltros({...filtros, categoria: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Todos los estados</option>
                {estados.map(est => (
                  <option key={est} value={est}>{est}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => setFiltros({...filtros, fechaInicio: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => setFiltros({...filtros, fechaFin: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        )}
        
        <div className="mt-4 flex gap-2">
          <button
            onClick={limpiarFiltros}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabla de Gastos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responsable
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {gastosData?.gastos?.map((gasto) => (
                <tr key={gasto._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {gasto.descripcion}
                      </div>
                      {gasto.notas && (
                        <div className="text-sm text-gray-500">{gasto.notas}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {gasto.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${gasto.monto.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(gasto.fecha), 'dd/MM/yyyy', { locale: es })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      gasto.estado === 'Aprobado' ? 'bg-green-100 text-green-800' :
                      gasto.estado === 'Rechazado' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {gasto.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {gasto.responsable}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(gasto)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(gasto._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                      {gasto.estado === 'Pendiente' && (
                        <>
                          <button
                            onClick={() => handleEstadoChange(gasto._id, 'Aprobado')}
                            className="text-green-600 hover:text-green-900"
                            title="Aprobar"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEstadoChange(gasto._id, 'Rechazado')}
                            className="text-red-600 hover:text-red-900"
                            title="Rechazar"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingGasto ? 'Editar Gasto' : 'Nuevo Gasto'}
              </h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción *
                  </label>
                  <input
                    type="text"
                    {...register('descripcion', { required: 'La descripción es requerida' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  {errors.descripcion && (
                    <p className="text-red-600 text-sm">{errors.descripcion.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría *
                  </label>
                  <select
                    {...register('categoria', { required: 'La categoría es requerida' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors.categoria && (
                    <p className="text-red-600 text-sm">{errors.categoria.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('monto', { 
                      required: 'El monto es requerido',
                      min: { value: 0, message: 'El monto debe ser mayor a 0' }
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  {errors.monto && (
                    <p className="text-red-600 text-sm">{errors.monto.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    {...register('fecha', { required: 'La fecha es requerida' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  {errors.fecha && (
                    <p className="text-red-600 text-sm">{errors.fecha.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsable *
                  </label>
                  <input
                    type="text"
                    {...register('responsable', { required: 'El responsable es requerido' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  {errors.responsable && (
                    <p className="text-red-600 text-sm">{errors.responsable.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comprobante
                  </label>
                  <input
                    type="text"
                    {...register('comprobante')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="URL o referencia del comprobante"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    {...register('notas')}
                    rows="3"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Notas adicionales..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingGasto(null);
                      reset({});
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isLoading || updateMutation.isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {createMutation.isLoading || updateMutation.isLoading ? (
                      <LoadingSpinner />
                    ) : (
                      editingGasto ? 'Actualizar' : 'Crear'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gastos; 