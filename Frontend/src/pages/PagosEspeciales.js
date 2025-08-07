import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PagosEspeciales = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingPago, setEditingPago] = useState(null);
  const [formData, setFormData] = useState({
    tipo: '',
    descripcion: '',
    monto: '',
    fechaLimite: '',
    aplicaATodasLasViviendas: true,
    cantidadPagar: '',
    notas: ''
  });

  const queryClient = useQueryClient();

  // Obtener pagos especiales
  const { data: pagosEspeciales, isLoading } = useQuery({
    queryKey: ['pagos-especiales'],
    queryFn: async () => {
      const response = await api.get('/api/pagos-especiales');
      return response.data;
    }
  });

  // Obtener viviendas
  const { data: viviendas } = useQuery({
    queryKey: ['viviendas'],
    queryFn: async () => {
      const response = await api.get('/api/viviendas');
      return response.data;
    }
  });

  // Obtener residentes
  const { data: residentes } = useQuery({
    queryKey: ['residentes'],
    queryFn: async () => {
      const response = await api.get('/api/residentes');
      return response.data;
    }
  });

  // Obtener estadísticas
  const { data: estadisticas } = useQuery({
    queryKey: ['pagos-especiales-estadisticas'],
    queryFn: async () => {
      const response = await api.get('/api/pagos-especiales/estadisticas/resumen');
      return response.data;
    }
  });

  // Mutación para crear pago especial
  const createPagoEspecial = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/api/pagos-especiales', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['pagos-especiales']);
      queryClient.invalidateQueries(['pagos-especiales-estadisticas']);
      setShowForm(false);
      resetForm();
      console.log('✅', data.message || 'Pago especial creado exitosamente');
    },
    onError: (error) => {
      console.error('❌', error.response?.data?.message || 'Error al crear el pago especial');
    }
  });

  // Mutación para actualizar pago especial
  const updatePagoEspecial = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/api/pagos-especiales/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pagos-especiales']);
      queryClient.invalidateQueries(['pagos-especiales-estadisticas']);
      setShowForm(false);
      setEditingPago(null);
      resetForm();
      console.log('✅', 'Pago especial actualizado exitosamente');
    },
    onError: (error) => {
      console.error('❌', error.response?.data?.message || 'Error al actualizar el pago especial');
    }
  });

  // Mutación para registrar pago
  const registrarPago = useMutation({
    mutationFn: async ({ id, metodoPago }) => {
      const response = await api.post(`/api/pagos-especiales/${id}/pagar`, { metodoPago });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pagos-especiales']);
      queryClient.invalidateQueries(['pagos-especiales-estadisticas']);
      console.log('✅', 'Pago registrado exitosamente');
    },
    onError: (error) => {
      console.error('❌', error.response?.data?.message || 'Error al registrar el pago');
    }
  });

  // Mutación para eliminar pago especial
  const deletePagoEspecial = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/api/pagos-especiales/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pagos-especiales']);
      queryClient.invalidateQueries(['pagos-especiales-estadisticas']);
      console.log('✅', 'Pago especial eliminado exitosamente');
    },
    onError: (error) => {
      console.error('❌', error.response?.data?.message || 'Error al eliminar el pago especial');
    }
  });

  const resetForm = () => {
    setFormData({
      tipo: '',
      descripcion: '',
      monto: '',
      fechaLimite: '',
      aplicaATodasLasViviendas: true,
      cantidadPagar: '',
      notas: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      monto: parseFloat(formData.monto) || 0,
      cantidadPagar: parseFloat(formData.cantidadPagar) || 0
    };

    if (editingPago) {
      updatePagoEspecial.mutate({ id: editingPago._id, data });
    } else {
      createPagoEspecial.mutate(data);
    }
  };

  const handleEdit = (pago) => {
    setEditingPago(pago);
    setFormData({
      tipo: pago.tipo,
      descripcion: pago.descripcion,
      monto: pago.monto ? pago.monto.toString() : '',
      fechaLimite: format(new Date(pago.fechaLimite), 'yyyy-MM-dd'),
      aplicaATodasLasViviendas: pago.aplicaATodasLasViviendas,
      cantidadPagar: pago.cantidadPagar ? pago.cantidadPagar.toString() : '',
      notas: pago.notas || ''
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este pago especial?')) {
      deletePagoEspecial.mutate(id);
    }
  };

  const handlePagar = (pago) => {
    const metodoPago = prompt('Ingrese el método de pago (Efectivo, Transferencia, Tarjeta, Cheque, Otro):');
    if (metodoPago && ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro'].includes(metodoPago)) {
      registrarPago.mutate({ id: pago._id, metodoPago });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Pagos Especiales</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Nuevo Pago Especial
        </button>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-blue-600">{estadisticas.totalPagosEspeciales}</h3>
            <p className="text-blue-700">Total Pagos Especiales</p>
          </div>
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-yellow-600">{estadisticas.pagosPendientes}</h3>
            <p className="text-yellow-700">Pendientes</p>
          </div>
          <div className="bg-green-100 border border-green-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-green-600">{estadisticas.pagosPagados}</h3>
            <p className="text-green-700">Pagados</p>
          </div>
          <div className="bg-red-100 border border-red-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-red-600">${estadisticas.montoTotalPendiente.toLocaleString()}</h3>
            <p className="text-red-700">Monto Pendiente</p>
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingPago ? 'Editar Pago Especial' : 'Nuevo Pago Especial'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Proyecto</label>
                <input
                  type="text"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Ej: Proyecto Barda, Mantenimiento Extraordinario, etc."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monto del Proyecto</label>
                <input
                  type="number"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows="3"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Límite</label>
                <input
                  type="date"
                  value={formData.fechaLimite}
                  onChange={(e) => setFormData({ ...formData, fechaLimite: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad a Pagar (Cuota Extra)</label>
                <input
                  type="number"
                  value={formData.cantidadPagar}
                  onChange={(e) => setFormData({ ...formData, cantidadPagar: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="aplicaATodasLasViviendas"
                checked={formData.aplicaATodasLasViviendas}
                onChange={(e) => setFormData({ ...formData, aplicaATodasLasViviendas: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="aplicaATodasLasViviendas" className="text-sm font-medium text-gray-700">
                Aplicar a todas las viviendas
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="aplicaATodasLasViviendas"
                checked={formData.aplicaATodasLasViviendas}
                onChange={(e) => setFormData({ ...formData, aplicaATodasLasViviendas: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="aplicaATodasLasViviendas" className="text-sm font-medium text-gray-700">
                Aplicar a todas las viviendas
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows="2"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                disabled={createPagoEspecial.isLoading || updatePagoEspecial.isLoading}
              >
                {createPagoEspecial.isLoading || updatePagoEspecial.isLoading ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPago(null);
                  resetForm();
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de pagos especiales */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proyecto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto Proyecto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cuota Extra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Límite
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagosEspeciales?.map((pago) => (
                <tr key={pago._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {pago.tipo}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {pago.descripcion}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(pago.monto || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(pago.cantidadPagar || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(pago.fechaLimite), 'dd/MM/yyyy', { locale: es })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      pago.estado === 'Pagado' 
                        ? 'bg-green-100 text-green-800' 
                        : pago.estado === 'Pendiente'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {pago.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {!pago.pagado && (
                        <>
                          <button
                            onClick={() => handlePagar(pago)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Cobrar
                          </button>
                          <button
                            onClick={() => handleEdit(pago)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(pago._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                      {pago.pagado && (
                        <span className="text-green-600 font-semibold">
                          Cobrado
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagosEspeciales?.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay pagos especiales registrados.
        </div>
      )}
    </div>
  );
};

export default PagosEspeciales; 