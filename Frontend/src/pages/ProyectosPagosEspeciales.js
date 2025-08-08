import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../utils/currencyFormatter';

const ProyectosPagosEspeciales = () => {
  const [showForm, setShowForm] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState(null);
  const [editingProyecto, setEditingProyecto] = useState(null);
  const [showViviendasPagadas, setShowViviendasPagadas] = useState({});
  const queryClient = useQueryClient();

  // Obtener proyectos
  const { data: proyectos, isLoading } = useQuery({
    queryKey: ['proyectos-pagos-especiales'],
    queryFn: async () => {
      const response = await api.get('/api/proyectos-pagos-especiales');
      return response.data;
    }
  });

  // Obtener viviendas para el modal de pago
  const { data: viviendas } = useQuery({
    queryKey: ['viviendas'],
    queryFn: async () => {
      const response = await api.get('/api/viviendas?populate=residentes');
      return response.data;
    }
  });

  // Crear/Actualizar proyecto
  const proyectoMutation = useMutation({
    mutationFn: async (data) => {
      if (editingProyecto) {
        return api.put(`/api/proyectos-pagos-especiales/${editingProyecto._id}`, data);
      }
      return api.post('/api/proyectos-pagos-especiales', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['proyectos-pagos-especiales']);
      setShowForm(false);
      setEditingProyecto(null);
      console.log('✅', editingProyecto ? 'Proyecto actualizado' : 'Proyecto creado');
    },
    onError: (error) => {
      console.error('❌', error.response?.data?.message || 'Error al guardar proyecto');
    }
  });

  // Registrar pago
  const pagoMutation = useMutation({
    mutationFn: async (data) => {
      return api.post(`/api/proyectos-pagos-especiales/${selectedProyecto._id}/pagar`, data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['proyectos-pagos-especiales']);
      setShowPagoModal(false);
      setSelectedProyecto(null);
      // Mostrar mensaje de confirmación
      alert(response.data.message || '✅ Pago registrado exitosamente');
      console.log('✅', response.data.message || 'Pago registrado exitosamente');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Error al registrar pago';
      alert(`❌ ${errorMessage}`);
      console.error('❌', errorMessage);
    }
  });

  // Eliminar proyecto
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/proyectos-pagos-especiales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['proyectos-pagos-especiales']);
      console.log('✅', 'Proyecto eliminado');
    },
    onError: (error) => {
      console.error('❌', error.response?.data?.message || 'Error al eliminar proyecto');
    }
  });

  const handleSubmit = (formData) => {
    proyectoMutation.mutate(formData);
  };

  const handlePago = (proyecto) => {
    setSelectedProyecto(proyecto);
    setShowPagoModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este proyecto?')) {
      deleteMutation.mutate(id);
    }
  };

  const openModal = (proyecto = null) => {
    setEditingProyecto(proyecto);
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditingProyecto(null);
  };

  const closePagoModal = () => {
    setShowPagoModal(false);
    setSelectedProyecto(null);
  };

  // Calcular estadísticas
  const estadisticas = proyectos ? {
    total: proyectos.length,
    activos: proyectos.filter(p => p.estado === 'Activo').length,
    completados: proyectos.filter(p => p.estado === 'Completado').length,
    montoTotal: proyectos.reduce((total, p) => total + p.cantidadPagar, 0),
    totalRecaudado: proyectos.reduce((total, p) => {
      const recaudado = p.pagosRealizados?.reduce((sum, pago) => sum + pago.montoPagado, 0) || 0;
      return total + recaudado;
    }, 0),
    totalViviendasPagadas: proyectos.reduce((total, p) => total + (p.pagosRealizados?.length || 0), 0)
  } : { total: 0, activos: 0, completados: 0, montoTotal: 0, totalRecaudado: 0, totalViviendasPagadas: 0 };

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
          <h1 className="text-2xl font-bold text-gray-900">Proyectos de Pagos Especiales</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los proyectos y cobra los pagos especiales
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nuevo Proyecto
        </button>
      </div>

             {/* Estadísticas */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-blue-50 p-4 rounded-lg">
           <div className="flex items-center">
             <ChartBarIcon className="h-8 w-8 text-blue-600" />
             <div className="ml-3">
               <p className="text-sm font-medium text-blue-600">Total Proyectos</p>
               <p className="text-2xl font-bold text-blue-900">{estadisticas.total}</p>
             </div>
           </div>
         </div>
         <div className="bg-yellow-50 p-4 rounded-lg">
           <div className="flex items-center">
             <ChartBarIcon className="h-8 w-8 text-yellow-600" />
             <div className="ml-3">
               <p className="text-sm font-medium text-yellow-600">Activos</p>
               <p className="text-2xl font-bold text-yellow-900">{estadisticas.activos}</p>
             </div>
           </div>
         </div>
         <div className="bg-green-50 p-4 rounded-lg">
           <div className="flex items-center">
             <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
             <div className="ml-3">
               <p className="text-sm font-medium text-green-600">Total Recaudado</p>
               <p className="text-2xl font-bold text-green-900">
                 {formatCurrency(estadisticas.totalRecaudado)}
               </p>
             </div>
           </div>
         </div>
         <div className="bg-purple-50 p-4 rounded-lg">
           <div className="flex items-center">
             <ChartBarIcon className="h-8 w-8 text-purple-600" />
             <div className="ml-3">
               <p className="text-sm font-medium text-purple-600">Viviendas Pagadas</p>
               <p className="text-2xl font-bold text-purple-900">{estadisticas.totalViviendasPagadas}</p>
             </div>
           </div>
         </div>
       </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica de Progreso General */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Progreso General de Proyectos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Viviendas Pagadas', value: estadisticas.totalViviendasPagadas, color: '#10B981' },
                    { name: 'Viviendas Pendientes', value: (25 * estadisticas.total) - estadisticas.totalViviendasPagadas, color: '#F59E0B' }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {[
                    { name: 'Viviendas Pagadas', value: estadisticas.totalViviendasPagadas, color: '#10B981' },
                    { name: 'Viviendas Pendientes', value: (25 * estadisticas.total) - estadisticas.totalViviendasPagadas, color: '#F59E0B' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Viviendas']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica de Recaudación por Proyecto */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recaudación por Proyecto</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={proyectos?.map(proyecto => ({
                nombre: proyecto.nombre,
                recaudado: proyecto.pagosRealizados?.reduce((total, pago) => total + pago.montoPagado, 0) || 0,
                meta: proyecto.cantidadPagar
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Monto']} />
                <Legend />
                <Bar dataKey="recaudado" fill="#3B82F6" name="Recaudado" />
                <Bar dataKey="meta" fill="#EF4444" name="Meta" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Proyecto</th>
                  <th className="table-header-cell">Descripción</th>
                  <th className="table-header-cell">Monto Proyecto</th>
                  <th className="table-header-cell">Cuota Extra</th>
                  <th className="table-header-cell">Fecha Límite</th>
                  <th className="table-header-cell">Estado</th>
                  <th className="table-header-cell">Progreso</th>
                  <th className="table-header-cell">Acciones</th>
                </tr>
              </thead>
              <tbody className="table-body">
                                 {proyectos?.map((proyecto) => {
                   // Calcular estadísticas del proyecto
                   const totalRecaudado = proyecto.pagosRealizados?.reduce((total, pago) => total + pago.montoPagado, 0) || 0;
                   const viviendasPagadas = proyecto.pagosRealizados?.length || 0;
                   // Calcular progreso basado en viviendas que han pagado (asumiendo 25 viviendas totales)
                   const totalViviendas = 25; // Total de viviendas en el fraccionamiento
                   const porcentajeCompletado = (viviendasPagadas / totalViviendas) * 100;
                   const estadisticasProyecto = {
                     totalRecaudado,
                     viviendasPagadas,
                     totalViviendas,
                     porcentajeCompletado,
                     pendiente: proyecto.cantidadPagar - totalRecaudado
                   };
                                     return (
                     <React.Fragment key={proyecto._id}>
                       <tr className="table-row">
                         <td className="table-cell font-medium">{proyecto.nombre}</td>
                         <td className="table-cell">{proyecto.descripcion}</td>
                         <td className="table-cell">
                           {formatCurrency(proyecto.montoProyecto || 0)}
                         </td>
                         <td className="table-cell">
                           {formatCurrency(proyecto.cantidadPagar)}
                         </td>
                         <td className="table-cell">
                           {format(new Date(proyecto.fechaLimite), 'dd/MM/yyyy', { locale: es })}
                         </td>
                         <td className="table-cell">
                           <span className={`badge ${
                             proyecto.estado === 'Activo' ? 'badge-success' :
                             proyecto.estado === 'Completado' ? 'badge-info' : 'badge-warning'
                           }`}>
                             {proyecto.estado}
                           </span>
                         </td>
                         <td className="table-cell">
                           <div className="flex items-center">
                             <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                               <div 
                                 className="bg-blue-600 h-2 rounded-full" 
                                 style={{ width: `${estadisticasProyecto.porcentajeCompletado}%` }}
                               ></div>
                             </div>
                             <span className="text-sm text-gray-600">
                               {estadisticasProyecto.viviendasPagadas}/{estadisticasProyecto.totalViviendas}
                             </span>
                           </div>
                           <div className="text-xs text-gray-500 mt-1">
                             {formatCurrency(estadisticasProyecto.totalRecaudado)} recaudado
                           </div>
                         </td>
                         <td className="table-cell">
                           <div className="flex space-x-2">
                             {proyecto.estado === 'Activo' && (
                               <button
                                 onClick={() => handlePago(proyecto)}
                                 className="btn-sm btn-success"
                               >
                                 <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                                 Cobrar
                               </button>
                             )}
                             <button
                               onClick={() => setShowViviendasPagadas(prev => ({
                                 ...prev,
                                 [proyecto._id]: !prev[proyecto._id]
                               }))}
                               className="btn-sm btn-info"
                             >
                               <ChartBarIcon className="h-4 w-4 mr-1" />
                               {showViviendasPagadas[proyecto._id] ? 'Ocultar' : 'Ver'} Pagos
                             </button>
                             <button
                               onClick={() => openModal(proyecto)}
                               className="text-primary-600 hover:text-primary-900"
                             >
                               <PencilIcon className="h-5 w-5" />
                             </button>
                             <button
                               onClick={() => handleDelete(proyecto._id)}
                               className="text-danger-600 hover:text-danger-900"
                             >
                               <TrashIcon className="h-5 w-5" />
                             </button>
                           </div>
                         </td>
                       </tr>
                       {showViviendasPagadas[proyecto._id] && (
                         <tr>
                           <td colSpan="8" className="bg-gray-50 p-4">
                             <div className="space-y-4">
                               <h4 className="font-medium text-gray-900">
                                 Viviendas que han pagado - {proyecto.nombre}
                               </h4>
                               {proyecto.pagosRealizados && proyecto.pagosRealizados.length > 0 ? (
                                 <div className="overflow-x-auto">
                                   <table className="min-w-full divide-y divide-gray-200">
                                     <thead className="bg-gray-100">
                                       <tr>
                                         <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                           Vivienda
                                         </th>
                                         <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                           Residente
                                         </th>
                                         <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                           Monto Pagado
                                         </th>
                                         <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                           Método
                                         </th>
                                         <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                           Fecha
                                         </th>
                                         <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                           Registrado Por
                                         </th>
                                       </tr>
                                     </thead>
                                     <tbody className="bg-white divide-y divide-gray-200">
                                       {proyecto.pagosRealizados.map((pago, index) => (
                                         <tr key={index} className="hover:bg-gray-50">
                                           <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                             {pago.vivienda?.numero} - {pago.vivienda?.calle}
                                           </td>
                                           <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                             {pago.residente?.nombre} {pago.residente?.apellidos}
                                           </td>
                                           <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600 font-medium">
                                             {formatCurrency(pago.montoPagado)}
                                           </td>
                                           <td className="px-4 py-2 whitespace-nowrap">
                                             <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                               pago.metodoPago === 'Efectivo' ? 'bg-green-100 text-green-800' :
                                               pago.metodoPago === 'Transferencia' ? 'bg-blue-100 text-blue-800' :
                                               pago.metodoPago === 'Tarjeta' ? 'bg-yellow-100 text-yellow-800' :
                                               pago.metodoPago === 'Cheque' ? 'bg-purple-100 text-purple-800' :
                                               'bg-gray-100 text-gray-800'
                                             }`}>
                                               {pago.metodoPago}
                                             </span>
                                           </td>
                                           <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                             {format(new Date(pago.fechaPago), 'dd/MM/yyyy HH:mm', { locale: es })}
                                           </td>
                                           <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                             {pago.registradoPor?.nombre || 'Sistema'}
                                           </td>
                                         </tr>
                                       ))}
                                     </tbody>
                                   </table>
                                 </div>
                               ) : (
                                 <div className="text-center py-4 text-gray-500">
                                   No hay pagos registrados para este proyecto
                                 </div>
                               )}
                             </div>
                           </td>
                         </tr>
                       )}
                     </React.Fragment>
                   );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Proyecto */}
      {showForm && (
        <ProyectoModal
          proyecto={editingProyecto}
          onSubmit={handleSubmit}
          onClose={closeModal}
          isLoading={proyectoMutation.isLoading}
        />
      )}

      {/* Modal de Pago */}
      {showPagoModal && selectedProyecto && (
        <PagoModal
          proyecto={selectedProyecto}
          viviendas={viviendas}
          onSubmit={pagoMutation.mutate}
          onClose={closePagoModal}
          isLoading={pagoMutation.isLoading}
        />
      )}
    </div>
  );
};

// Componente Modal de Proyecto
const ProyectoModal = ({ proyecto, onSubmit, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    nombre: proyecto?.nombre || '',
    descripcion: proyecto?.descripcion || '',
    montoProyecto: proyecto?.montoProyecto || '',
    cantidadPagar: proyecto?.cantidadPagar || '',
    fechaLimite: proyecto?.fechaLimite ? format(new Date(proyecto.fechaLimite), 'yyyy-MM-dd') : '',
    estado: proyecto?.estado || 'Activo',
    notas: proyecto?.notas || ''
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
            {proyecto ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Nombre del Proyecto</label>
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
              <label className="form-label">Descripción</label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                className="input"
                rows="3"
                required
              />
            </div>

            <div>
              <label className="form-label">Monto del Proyecto (opcional)</label>
              <input
                type="number"
                name="montoProyecto"
                value={formData.montoProyecto}
                onChange={handleChange}
                className="input"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="form-label">Cuota Extra por Vivienda</label>
              <input
                type="number"
                name="cantidadPagar"
                value={formData.cantidadPagar}
                onChange={handleChange}
                className="input"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="form-label">Fecha Límite</label>
              <input
                type="date"
                name="fechaLimite"
                value={formData.fechaLimite}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="form-label">Estado</label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="input"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Completado">Completado</option>
              </select>
            </div>

            <div>
              <label className="form-label">Notas</label>
              <textarea
                name="notas"
                value={formData.notas}
                onChange={handleChange}
                className="input"
                rows="2"
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
                  proyecto ? 'Actualizar' : 'Crear'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Componente Modal de Pago
const PagoModal = ({ proyecto, viviendas, onSubmit, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    viviendaId: '',
    residenteId: '',
    montoPagado: proyecto?.cantidadPagar || '',
    metodoPago: 'Efectivo',
    notas: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'viviendaId') {
      // Buscar el residente de la vivienda seleccionada
      const vivienda = viviendas?.find(v => v._id === value);
      const residente = vivienda?.residentes?.[0]; // Tomar el primer residente
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        residenteId: residente?._id || ''
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

  // Filtrar viviendas que no han pagado y ordenarlas por número
  const viviendasPendientes = viviendas?.filter(vivienda => 
    !proyecto.pagosRealizados.some(pago => 
      pago.vivienda._id === vivienda._id
    )
  ).sort((a, b) => parseInt(a.numero) - parseInt(b.numero)) || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Registrar Pago - {proyecto.nombre}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Vivienda</label>
              <select
                name="viviendaId"
                value={formData.viviendaId}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Seleccionar vivienda</option>
                {viviendasPendientes.map((vivienda) => {
                  const residente = vivienda.residentes?.[0]; // Tomar el primer residente
                  return (
                    <option key={vivienda._id} value={vivienda._id}>
                      {vivienda.numero} - {vivienda.calle}
                      {residente && ` (${residente.nombre} ${residente.apellidos})`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="form-label">Residente</label>
              <select
                name="residenteId"
                value={formData.residenteId}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Seleccionar residente</option>
                {formData.viviendaId && viviendas?.find(v => v._id === formData.viviendaId)?.residentes?.map((residente) => (
                  <option key={residente._id} value={residente._id}>
                    {residente.nombre} {residente.apellidos}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Monto a Pagar</label>
              <input
                type="number"
                name="montoPagado"
                value={formData.montoPagado}
                onChange={handleChange}
                className="input"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="form-label">Método de Pago</label>
              <select
                name="metodoPago"
                value={formData.metodoPago}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Cheque">Cheque</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="form-label">Notas</label>
              <textarea
                name="notas"
                value={formData.notas}
                onChange={handleChange}
                className="input"
                rows="2"
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
                  'Registrar Pago'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProyectosPagosEspeciales; 