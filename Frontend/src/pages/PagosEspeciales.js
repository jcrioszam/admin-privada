import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, CurrencyDollarIcon, ChartBarIcon, XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/currencyFormatter';

const PagosEspeciales = () => {
  const [showForm, setShowForm] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [editingPago, setEditingPago] = useState(null);
  const [selectedPagoEspecial, setSelectedPagoEspecial] = useState(null);
  const [showViviendasPagadas, setShowViviendasPagadas] = useState({});
  const [activeView, setActiveView] = useState('list');
  const [formData, setFormData] = useState({
    tipo: '',
    descripcion: '',
    monto: '',
    fechaLimite: '',
    aplicaATodasLasViviendas: true,
    viviendasSeleccionadas: [],
    cantidadPagar: '',
    notas: ''
  });

  const [pagoModalData, setPagoModalData] = useState({
    viviendaId: '',
    monto: '',
    notas: ''
  });

  const queryClient = useQueryClient();

  // Obtener pagos especiales
  const { data: pagosEspeciales, isLoading } = useQuery({
    queryKey: ['pagos-especiales'],
    queryFn: async () => {
      const response = await api.get('/api/pagos-especiales');
      console.log('Datos de pagos especiales recibidos:', response.data);
      return response.data;
    },
    refetchInterval: 5000,
    staleTime: 0
  });

  // Obtener viviendas con residentes
  const { data: viviendas, isLoading: viviendasLoading } = useQuery({
    queryKey: ['viviendas'],
    queryFn: async () => {
      const response = await api.get('/api/viviendas?populate=residentes');
      console.log('Viviendas cargadas:', response.data.length);
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

  // Calcular estadísticas
  const estadisticasCalculadas = pagosEspeciales ? {
    total: pagosEspeciales.length,
    activos: pagosEspeciales.filter(p => p.estado === 'Activo' || p.estado === 'Pendiente').length,
    completados: pagosEspeciales.filter(p => p.estado === 'Completado' || p.estado === 'Pagado').length,
    montoTotal: pagosEspeciales.reduce((total, p) => total + (p.cantidadPagar || 0), 0),
    totalRecaudado: pagosEspeciales.reduce((total, p) => {
      const recaudado = p.pagosRealizados?.reduce((sum, pago) => sum + pago.montoPagado, 0) || 0;
      return total + recaudado;
    }, 0),
    totalViviendasPagadas: pagosEspeciales.reduce((total, p) => total + (p.pagosRealizados?.length || 0), 0)
  } : { total: 0, activos: 0, completados: 0, montoTotal: 0, totalRecaudado: 0, totalViviendasPagadas: 0 };

  // Calcular estadísticas para el gráfico de pastel
  const totalViviendasSistema = viviendas?.length || 0;
  const totalViviendasPagadas = estadisticasCalculadas.totalViviendasPagadas;
  const totalViviendasPendientes = totalViviendasSistema - totalViviendasPagadas;
  const porcentajePagadas = totalViviendasSistema > 0 ? (totalViviendasPagadas / totalViviendasSistema) * 100 : 0;
  const porcentajePendientes = 100 - porcentajePagadas;

  // Funciones para manejar formularios y modales
  const openModal = (pago = null) => {
    setEditingPago(pago);
    if (pago) {
      // Cargar datos para edición
      setFormData({
        tipo: pago.tipo || '',
        descripcion: pago.descripcion || '',
        monto: pago.monto?.toString() || '',
        fechaLimite: pago.fechaLimite ? pago.fechaLimite.split('T')[0] : '',
        aplicaATodasLasViviendas: pago.aplicaATodasLasViviendas || true,
        viviendasSeleccionadas: pago.viviendasSeleccionadas?.map(v => typeof v === 'string' ? v : v._id) || [],
        cantidadPagar: pago.cantidadPagar?.toString() || '',
        notas: pago.notas || ''
      });
    } else {
      // Resetear formulario para nuevo proyecto
      resetForm();
    }
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditingPago(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      tipo: '',
      descripcion: '',
      monto: '',
      fechaLimite: '',
      aplicaATodasLasViviendas: true,
      viviendasSeleccionadas: [],
      cantidadPagar: '',
      notas: ''
    });
  };

  // Función para abrir modal de cobro
  const openPagoModal = (pago) => {
    setSelectedPagoEspecial(pago);
    setPagoModalData({
      viviendaId: '',
      monto: pago.cantidadPagar?.toString() || '',
      notas: ''
    });
    setShowPagoModal(true);
  };

  // Función para cerrar modal de cobro
  const closePagoModal = () => {
    setShowPagoModal(false);
    setSelectedPagoEspecial(null);
    setPagoModalData({
      viviendaId: '',
      monto: '',
      notas: ''
    });
  };

  // Función para registrar pago individual
  const registrarPagoIndividual = useMutation({
    mutationFn: async (pagoData) => {
      const response = await api.post('/api/pagos-especiales/registrar-pago', pagoData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.refetchQueries(['pagos-especiales']);
      closePagoModal();
    }
  });

  // Función para eliminar pago especial
  const eliminarPagoEspecial = useMutation({
    mutationFn: async (pagoId) => {
      const response = await api.delete(`/api/pagos-especiales/${pagoId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.refetchQueries(['pagos-especiales']);
    }
  });

  // Función para crear/actualizar pago especial
  const crearActualizarPagoEspecial = useMutation({
    mutationFn: async (pagoData) => {
      if (editingPago) {
        // Actualizar
        const response = await api.put(`/api/pagos-especiales/${editingPago._id}`, pagoData);
        return response.data;
      } else {
        // Crear
        const response = await api.post('/api/pagos-especiales', pagoData);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries(['pagos-especiales']);
      closeModal();
    }
  });

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

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total Proyectos</p>
              <p className="text-2xl font-bold text-blue-900">{estadisticasCalculadas.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-600">Activos</p>
              <p className="text-2xl font-bold text-yellow-900">{estadisticasCalculadas.activos}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Total Recaudado</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(estadisticasCalculadas.totalRecaudado)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Viviendas Pagadas</p>
              <p className="text-2xl font-bold text-purple-900">{estadisticasCalculadas.totalViviendasPagadas}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de progreso general */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Progreso General de Proyectos</h3>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="relative w-32 h-32 mb-4">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-green-500"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={`${porcentajePagadas}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-orange-500"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={`${porcentajePendientes}, 100`}
                    strokeDashoffset={`-${porcentajePagadas}`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-700">{porcentajePagadas.toFixed(0)}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span className="text-sm">Viviendas Pagadas: {porcentajePagadas.toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
                  <span className="text-sm">Viviendas Pendientes: {porcentajePendientes.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de recaudación por proyecto */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Recaudación por Proyecto</h3>
          <div className="space-y-4">
            {pagosEspeciales?.map((pago, index) => {
              const totalRecaudado = pago.pagosRealizados?.reduce((sum, pago) => sum + pago.montoPagado, 0) || 0;
              const porcentaje = pago.monto > 0 ? (totalRecaudado / pago.monto) * 100 : 0;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{pago.tipo}</span>
                    <span>{formatCurrency(totalRecaudado)} / {formatCurrency(pago.monto)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(porcentaje, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabla de proyectos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Proyectos</h3>
        </div>
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
                  Progreso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagosEspeciales?.map((pago, index) => {
                const totalRecaudado = pago.pagosRealizados?.reduce((sum, pago) => sum + pago.montoPagado, 0) || 0;
                const viviendasPagadas = pago.pagosRealizados?.length || 0;
                const totalViviendas = pago.aplicaATodasLasViviendas 
                  ? (viviendas?.length || 0)
                  : (pago.viviendasSeleccionadas || []).length;
                
                return (
                  <React.Fragment key={index}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {pago.tipo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pago.descripcion}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(pago.monto)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(pago.cantidadPagar)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pago.fechaLimite ? format(new Date(pago.fechaLimite), 'dd/MM/yyyy', { locale: es }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          pago.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {pago.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${totalViviendas > 0 ? (viviendasPagadas / totalViviendas) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {viviendasPagadas}/{totalViviendas}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatCurrency(totalRecaudado)} recaudado
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => openPagoModal(pago)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          <CurrencyDollarIcon className="h-3 w-3 mr-1" />
                          Cobrar
                        </button>
                        <button
                          onClick={() => setShowViviendasPagadas(prev => ({ ...prev, [pago._id]: !prev[pago._id] }))}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          {showViviendasPagadas[pago._id] ? (
                            <>
                              <EyeSlashIcon className="h-3 w-3 mr-1" />
                              Ocultar Pagos
                            </>
                          ) : (
                            <>
                              <EyeIcon className="h-3 w-3 mr-1" />
                              Ver Pagos
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => openModal(pago)}
                          className="inline-flex items-center p-1 border border-transparent text-xs font-medium rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                          title="Editar"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de que quieres eliminar el proyecto "${pago.tipo}"?`)) {
                              eliminarPagoEspecial.mutate(pago._id);
                            }
                          }}
                          disabled={eliminarPagoEspecial.isPending}
                          className="inline-flex items-center p-1 border border-transparent text-xs font-medium rounded-md text-red-600 hover:text-red-800 hover:bg-red-50 disabled:opacity-50"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                    {/* Tabla de pagos expandida */}
                    {showViviendasPagadas[pago._id] && (
                      <tr>
                        <td colSpan="8" className="px-0 py-0">
                          <div className="bg-gray-50 border-t border-gray-200">
                            <div className="px-6 py-4">
                              <h4 className="text-sm font-medium text-gray-900 mb-3">
                                que han pagado - {pago.tipo}
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-100">
                                    <tr>
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
                                    {pago.pagosRealizados?.map((pagoRealizado, index) => (
                                      <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                          {pagoRealizado.residente?.nombre || 'N/A'}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {formatCurrency(pagoRealizado.montoPagado)}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                            {pagoRealizado.metodoPago || 'Efectivo'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {pagoRealizado.fechaPago ? format(new Date(pagoRealizado.fechaPago), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A'}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {pagoRealizado.registradoPor?.nombre || 'Administrador'}
                                        </td>
                                      </tr>
                                    ))}
                                    {(!pago.pagosRealizados || pago.pagosRealizados.length === 0) && (
                                      <tr>
                                        <td colSpan="5" className="px-4 py-4 text-center text-sm text-gray-500">
                                          No hay pagos registrados para este proyecto
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
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

             {/* Modal de Edición/Creación */}
       {showForm && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-20 mx-auto p-5 border w-3/4 shadow-lg rounded-md bg-white">
             <div className="mt-3">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-medium text-gray-900">
                   {editingPago ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                 </h3>
                 <button
                   onClick={closeModal}
                   className="text-gray-400 hover:text-gray-600"
                 >
                   <XMarkIcon className="h-6 w-6" />
                 </button>
               </div>
               
                               <form onSubmit={(e) => {
                  e.preventDefault();
                  
                  // Validar campos requeridos
                  if (!formData.tipo || !formData.descripcion || !formData.monto || !formData.cantidadPagar) {
                    alert('Por favor completa todos los campos requeridos');
                    return;
                  }
                  
                  // Preparar datos para enviar
                  const pagoData = {
                    tipo: formData.tipo,
                    descripcion: formData.descripcion,
                    monto: parseFloat(formData.monto),
                    cantidadPagar: parseFloat(formData.cantidadPagar),
                    fechaLimite: formData.fechaLimite || null,
                    aplicaATodasLasViviendas: formData.aplicaATodasLasViviendas,
                    viviendasSeleccionadas: formData.aplicaATodasLasViviendas ? [] : formData.viviendasSeleccionadas,
                    notas: formData.notas,
                    estado: 'Activo'
                  };
                  
                  crearActualizarPagoEspecial.mutate(pagoData);
                }}>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Tipo de Proyecto
                     </label>
                     <input
                       type="text"
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="Ej: Barda, Alumbrado, etc."
                       value={formData.tipo}
                       onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                       required
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Descripción
                     </label>
                     <input
                       type="text"
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="Descripción del proyecto"
                       value={formData.descripcion}
                       onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                       required
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Monto Total del Proyecto
                     </label>
                     <input
                       type="number"
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="0.00"
                       value={formData.monto}
                       onChange={(e) => setFormData(prev => ({ ...prev, monto: e.target.value }))}
                       required
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Cuota por Vivienda
                     </label>
                     <input
                       type="number"
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="0.00"
                       value={formData.cantidadPagar}
                       onChange={(e) => setFormData(prev => ({ ...prev, cantidadPagar: e.target.value }))}
                       required
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Fecha Límite
                     </label>
                     <input
                       type="date"
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                       value={formData.fechaLimite}
                       onChange={(e) => setFormData(prev => ({ ...prev, fechaLimite: e.target.value }))}
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Aplicar a Todas las Viviendas
                     </label>
                     <div className="flex items-center">
                       <input
                         type="checkbox"
                         className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                         checked={formData.aplicaATodasLasViviendas}
                         onChange={(e) => setFormData(prev => ({ 
                           ...prev, 
                           aplicaATodasLasViviendas: e.target.checked,
                           viviendasSeleccionadas: e.target.checked ? [] : prev.viviendasSeleccionadas
                         }))}
                       />
                       <label className="ml-2 text-sm text-gray-700">
                         Sí, aplicar a todas las viviendas
                       </label>
                     </div>
                   </div>
                 </div>
                 
                 {!formData.aplicaATodasLasViviendas && (
                   <div className="mt-4">
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Seleccionar Viviendas Específicas
                     </label>
                     <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                       {viviendas?.map((vivienda) => (
                         <div key={vivienda._id} className="flex items-center mb-2">
                           <input
                             type="checkbox"
                             className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                             checked={formData.viviendasSeleccionadas.includes(vivienda._id)}
                             onChange={(e) => {
                               if (e.target.checked) {
                                 setFormData(prev => ({
                                   ...prev,
                                   viviendasSeleccionadas: [...prev.viviendasSeleccionadas, vivienda._id]
                                 }));
                               } else {
                                 setFormData(prev => ({
                                   ...prev,
                                   viviendasSeleccionadas: prev.viviendasSeleccionadas.filter(id => id !== vivienda._id)
                                 }));
                               }
                             }}
                           />
                           <label className="ml-2 text-sm text-gray-700">
                             Vivienda {vivienda.numero} - {vivienda.residentes?.[0]?.nombre || 'Sin residente'}
                           </label>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
                 
                 <div className="mt-4">
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Notas Adicionales
                   </label>
                   <textarea
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                     rows="3"
                     placeholder="Notas adicionales sobre el proyecto..."
                     value={formData.notas}
                     onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                   />
                 </div>
                 
                 <div className="flex justify-end space-x-3 mt-6">
                   <button
                     type="button"
                     onClick={closeModal}
                     className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                   >
                     Cancelar
                   </button>
                   <button
                     type="submit"
                     disabled={crearActualizarPagoEspecial.isPending}
                     className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {crearActualizarPagoEspecial.isPending 
                       ? (editingPago ? 'Actualizando...' : 'Creando...') 
                       : (editingPago ? 'Actualizar Proyecto' : 'Crear Proyecto')
                     }
                   </button>
                 </div>
               </form>
             </div>
           </div>
         </div>
       )}

       {/* Modal de Cobro */}
       {showPagoModal && selectedPagoEspecial && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Cobrar Pago Especial: {selectedPagoEspecial.tipo}
                </h3>
                <button
                  onClick={closePagoModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Vivienda
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={viviendasLoading}
                    value={pagoModalData.viviendaId}
                    onChange={(e) => setPagoModalData(prev => ({ ...prev, viviendaId: e.target.value }))}
                  >
                    <option value="">Selecciona una vivienda...</option>
                    {(() => {
                      // Obtener viviendas que ya pagaron
                      const viviendasYaPagadas = selectedPagoEspecial.pagosRealizados?.map(pago => pago.vivienda?._id) || [];
                      
                      // Filtrar viviendas aplicables
                      let viviendasAplicables = [];
                      if (selectedPagoEspecial.aplicaATodasLasViviendas) {
                        // Si aplica a todas las viviendas, mostrar todas las que no han pagado
                        viviendasAplicables = viviendas?.filter(vivienda => 
                          !viviendasYaPagadas.includes(vivienda._id)
                        ) || [];
                      } else {
                        // Si solo aplica a viviendas seleccionadas, mostrar solo esas que no han pagado
                        const viviendasSeleccionadas = selectedPagoEspecial.viviendasSeleccionadas || [];
                        // Extraer los IDs de las viviendas seleccionadas (pueden ser objetos o strings)
                        const viviendasSeleccionadasIds = viviendasSeleccionadas.map(v => typeof v === 'string' ? v : v._id);
                        
                        viviendasAplicables = viviendas?.filter(vivienda => 
                          viviendasSeleccionadasIds.includes(vivienda._id) && 
                          !viviendasYaPagadas.includes(vivienda._id)
                        ) || [];
                      }
                      
                      return viviendasAplicables.map((vivienda) => (
                        <option key={vivienda._id} value={vivienda._id}>
                          {vivienda.numero} - {vivienda.residentes?.[0]?.nombre || 'Sin residente'}
                        </option>
                      ));
                    })()}
                  </select>
                  {(() => {
                    const viviendasYaPagadas = selectedPagoEspecial.pagosRealizados?.map(pago => pago.vivienda?._id) || [];
                    let viviendasAplicables = [];
                    
                    if (selectedPagoEspecial.aplicaATodasLasViviendas) {
                      viviendasAplicables = viviendas?.filter(vivienda => 
                        !viviendasYaPagadas.includes(vivienda._id)
                      ) || [];
                    } else {
                      const viviendasSeleccionadas = selectedPagoEspecial.viviendasSeleccionadas || [];
                      // Extraer los IDs de las viviendas seleccionadas (pueden ser objetos o strings)
                      const viviendasSeleccionadasIds = viviendasSeleccionadas.map(v => typeof v === 'string' ? v : v._id);
                      viviendasAplicables = viviendas?.filter(vivienda => 
                        viviendasSeleccionadasIds.includes(vivienda._id) && 
                        !viviendasYaPagadas.includes(vivienda._id)
                      ) || [];
                    }
                    
                    if (viviendasAplicables.length === 0) {
                      return (
                        <p className="text-sm text-red-600 mt-2">
                          Todas las viviendas asignadas ya han pagado este proyecto
                        </p>
                      );
                    }
                    
                    return (
                      <p className="text-sm text-gray-600 mt-2">
                        {viviendasAplicables.length} vivienda(s) pendiente(s) de pago
                      </p>
                    );
                  })()}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto a Pagar
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    value={pagoModalData.monto}
                    onChange={(e) => setPagoModalData(prev => ({ ...prev, monto: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas (opcional)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Notas adicionales..."
                    value={pagoModalData.notas}
                    onChange={(e) => setPagoModalData(prev => ({ ...prev, notas: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closePagoModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!pagoModalData.viviendaId || !pagoModalData.monto || parseFloat(pagoModalData.monto) <= 0) {
                      alert('Por favor selecciona una vivienda y ingresa un monto válido');
                      return;
                    }
                    
                    const pagoData = {
                      pagoEspecialId: selectedPagoEspecial._id,
                      viviendaId: pagoModalData.viviendaId,
                      montoPagado: parseFloat(pagoModalData.monto),
                      notas: pagoModalData.notas,
                      fechaPago: new Date().toISOString()
                    };
                    
                    registrarPagoIndividual.mutate(pagoData);
                  }}
                  disabled={registrarPagoIndividual.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registrarPagoIndividual.isPending ? 'Registrando...' : 'Registrar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PagosEspeciales;
