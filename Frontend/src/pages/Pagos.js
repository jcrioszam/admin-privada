import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, CreditCardIcon, CheckIcon, PrinterIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/currencyFormatter';
// import toast from 'react-hot-toast';

const Pagos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPago, setSelectedPago] = useState(null);
  const [filter, setFilter] = useState('pendientes'); // 'todos', 'pendientes', 'vencidos'
  const [selectedPagos, setSelectedPagos] = useState([]);
  const queryClient = useQueryClient();

  // Obtener pagos
  const { data: pagos, isLoading, error } = useQuery({
    queryKey: ['pagos'],
    queryFn: async () => {
      console.log('🔍 Obteniendo pagos...');
      try {
        const response = await api.get('/api/pagos');
        console.log('✅ Pagos obtenidos:', response.data);
        return response.data;
      } catch (err) {
        console.error('❌ Error obteniendo pagos:', err);
        throw err;
      }
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
    staleTime: 10000, // Considerar datos frescos por 10 segundos
    refetchOnWindowFocus: true, // Refrescar al enfocar la ventana
    refetchOnMount: true // Refrescar al montar el componente
  });

  // Agrupar pagos por vivienda y filtrar según el estado seleccionado
  const pagosAgrupados = useMemo(() => {
    if (!pagos) return [];
    
    // Filtrar pagos que tienen vivienda válida
    const pagosConVivienda = pagos.filter(pago => {
      if (!pago.vivienda) {
        console.warn('⚠️ Pago sin vivienda encontrado:', pago._id);
        return false;
      }
      return true;
    });
    
    // Filtrar pagos según el estado
    let pagosFiltrados = [];
    switch (filter) {
             case 'pendientes':
         pagosFiltrados = pagosConVivienda.filter(pago => {
           const saldoPendiente = pago.monto - (pago.montoPagado || 0);
           // Solo mostrar pagos con saldo pendiente Y que no estén completamente pagados
           return saldoPendiente > 0 && pago.estado !== 'Pagado' && pago.estado !== 'Pagado con excedente';
         });
        break;
             case 'vencidos':
         pagosFiltrados = pagosConVivienda.filter(pago => {
           // Solo mostrar pagos que realmente están vencidos
           const fechaLimite = new Date(pago.fechaLimite);
           const hoy = new Date();
           const diasAtraso = pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' || 
                              hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
           
           // Debe estar vencido Y tener saldo pendiente Y no estar completamente pagado
           const saldoPendiente = pago.monto - (pago.montoPagado || 0);
           return diasAtraso > 0 && saldoPendiente > 0 && pago.estado !== 'Pagado' && pago.estado !== 'Pagado con excedente';
         });
        break;
                          case 'todos':
          // Para "todos" mostrar solo pagos con saldo pendiente
          pagosFiltrados = pagosConVivienda.filter(pago => {
           const saldoPendiente = pago.monto - (pago.montoPagado || 0);
           return saldoPendiente > 0;
         });
         break;
               case 'actual':
          // Para "mes actual" mostrar solo pagos del mes actual con saldo pendiente
          const mesActual = new Date().getMonth() + 1;
          const añoActual = new Date().getFullYear();
          pagosFiltrados = pagosConVivienda.filter(pago => {
           const saldoPendiente = pago.monto - (pago.montoPagado || 0);
           return pago.mes === mesActual && pago.año === añoActual && saldoPendiente > 0;
         });
         break;
      default:
        pagosFiltrados = pagos;
    }
    
         // Para los filtros "pendientes" y "actual", mostrar pagos individuales en lugar de agrupar
     if (filter === 'pendientes' || filter === 'actual') {
      return pagosFiltrados.map(pago => {
        const fechaLimite = new Date(pago.fechaLimite);
        const hoy = new Date();
        const diasAtraso = pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' || 
                           hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
        
        const saldoPendiente = pago.monto - (pago.montoPagado || 0);
        // Solo aplicar recargo si hay saldo pendiente
        const recargo = diasAtraso > 0 && saldoPendiente > 0 ? (pago.monto * 0.10) * Math.ceil(diasAtraso / 30) : 0;
        
        return {
          vivienda: pago.vivienda,
          pagos: [pago],
          totalSaldo: saldoPendiente,
          totalRecargo: recargo,
          totalAdeudo: saldoPendiente + recargo,
          periodosVencidos: diasAtraso > 0 ? 1 : 0,
          periodosPendientes: 1,
          esPagoIndividual: true
        };
      });
    }
    
    // Para otros filtros, agrupar por vivienda
    const grupos = {};
    pagosFiltrados.forEach(pago => {
      const viviendaId = pago.vivienda._id;
      if (!grupos[viviendaId]) {
        grupos[viviendaId] = {
          vivienda: pago.vivienda,
          pagos: [],
          totalSaldo: 0,
          totalRecargo: 0,
          totalAdeudo: 0,
          periodosVencidos: 0
        };
      }
      grupos[viviendaId].pagos.push(pago);
    });
    
    // Calcular totales para cada grupo
    Object.values(grupos).forEach(grupo => {
      grupo.pagos.forEach(pago => {
        const fechaLimite = new Date(pago.fechaLimite);
        const hoy = new Date();
        const diasAtraso = pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' || 
                           hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
        
        const saldoPendiente = pago.monto - (pago.montoPagado || 0);
        // Solo aplicar recargo si hay saldo pendiente
        const recargo = diasAtraso > 0 && saldoPendiente > 0 ? (pago.monto * 0.10) * Math.ceil(diasAtraso / 30) : 0;
        
        grupo.totalSaldo += saldoPendiente;
        grupo.totalRecargo += recargo;
        if (diasAtraso > 0) grupo.periodosVencidos++;
      });
      grupo.totalAdeudo = grupo.totalSaldo + grupo.totalRecargo;
      
             // Para el filtro "todos", contar períodos pendientes basado en TODOS los pagos de la vivienda
       if (filter === 'todos') {
         const todosLosPagosDeLaVivienda = pagosConVivienda.filter(p => p.vivienda._id === grupo.vivienda._id);
        grupo.periodosPendientes = todosLosPagosDeLaVivienda.filter(p => 
          p.estado === 'Pendiente' || p.estado === 'Parcial' || p.estado === 'Vencido'
        ).length;
      } else {
        // Para otros filtros, contar basado en los pagos filtrados
        grupo.periodosPendientes = grupo.pagos.filter(p => 
          p.estado === 'Pendiente' || p.estado === 'Parcial' || p.estado === 'Vencido'
        ).length;
      }
    });
    
    return Object.values(grupos);
  }, [pagos, filter]);

  // Registrar pago flexible
  const registerPagoMutation = useMutation(
    (data) => api.put(`/api/pagos/${data.id}/registrar-pago-flexible`, data),
    {
             onSuccess: async (response) => {
         // Invalidar y refrescar los datos
         await queryClient.invalidateQueries('pagos');
         
         setIsModalOpen(false);
         setSelectedPago(null);
         setSelectedPagos([]); // Limpiar selección después del pago
         
         // Mostrar mensaje de éxito
         let mensaje = 'Pago registrado exitosamente';
         if (response.data.excedente > 0 && response.data.aplicadoAMesesFuturos) {
           mensaje = `Pago registrado exitosamente. Excedente de ${formatCurrency(response.data.excedente)} aplicado a meses futuros.`;
         } else if (response.data.excedente > 0) {
           mensaje = `Pago registrado exitosamente. Excedente de ${formatCurrency(response.data.excedente)} disponible.`;
                     }
            
            console.log('✅', mensaje);
            
            // Si el pago se completó completamente, mostrar el próximo pago
            if (response.data.pago.estado === 'Pagado' || response.data.pago.estado === 'Pagado con excedente') {
              console.log('✅', `Pago completado. El próximo pago se generará automáticamente.`);
            }
          },
          onError: (error) => {
            console.error('❌', error.response?.data?.message || 'Error al registrar pago');
      },
    }
  );

  const handleRegisterPago = (pago) => {
    setSelectedPago(pago);
    setIsModalOpen(true);
  };

  const handleSelectPago = (pagoId) => {
    setSelectedPagos(prev => {
      if (prev.includes(pagoId)) {
        return prev.filter(id => id !== pagoId);
      } else {
        return [...prev, pagoId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPagos.length === pagosAgrupados?.length) {
      setSelectedPagos([]);
    } else {
      const allIds = pagosAgrupados?.map(grupo => grupo.pagos[0]._id) || [];
      setSelectedPagos(allIds);
    }
  };

  const handlePagarSeleccionados = () => {
    if (selectedPagos.length === 0) {
      console.error('❌', 'Selecciona al menos un pago para registrar');
      return;
    }
    
    // Por ahora, pagar solo el primero seleccionado
    const primerPagoSeleccionado = pagosAgrupados?.find(grupo => 
      grupo.pagos[0]._id === selectedPagos[0]
    );
    
    if (primerPagoSeleccionado) {
      handleRegisterPago(primerPagoSeleccionado.pagos[0]);
    }
  };

  const actualizarResidentesMutation = useMutation(
    () => api.post('/api/pagos/actualizar-residentes'),
    {
      onSuccess: async (response) => {
        await queryClient.invalidateQueries('pagos');
        console.log('✅', response.data.message);
      },
      onError: (error) => {
        console.error('❌', error.response?.data?.message || 'Error al actualizar residentes');
      }
    }
  );

  const handleActualizarResidentes = () => {
    actualizarResidentesMutation.mutate();
  };

  const handleSubmitPago = async (formData) => {
    try {
      if (formData.esPagoMultiple && formData.pagoIds) {
        // Manejar pago múltiple
        const response = await api.post('/api/pagos/pago-multiple', {
          pagoIds: formData.pagoIds,
          metodoPago: formData.metodoPago,
          referenciaPago: formData.referenciaPago,
          montoPagado: formData.montoPagado,
          registradoPor: '64f1a2b3c4d5e6f7g8h9i0j1' // ID temporal
        });
        
        console.log('✅', response.data.message);
        queryClient.invalidateQueries(['pagos']);
        closeModal();
      } else {
        // Manejar pago individual
        const pagoId = formData.pagoId || selectedPago._id;
        const response = await api.post(`/api/pagos/${pagoId}/registrar-pago`, {
          metodoPago: formData.metodoPago,
          referenciaPago: formData.referenciaPago,
          registradoPor: '64f1a2b3c4d5e6f7g8h9i0j1' // ID temporal
        });
        
        console.log('✅', 'Pago registrado exitosamente');
        queryClient.invalidateQueries(['pagos']);
        closeModal();
      }
    } catch (error) {
      console.error('❌', error.response?.data?.message || 'Error al registrar pago');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPago(null);
  };

  // Función para generar próximo pago
  const generarProximoPago = async (viviendaId) => {
    try {
      const response = await api.get(`/api/pagos/proximo-pago/${viviendaId}`);
      if (response.data) {
        queryClient.invalidateQueries('pagos');
        console.log('✅', `Próximo pago generado para ${response.data.vivienda.numero}`);
      }
    } catch (error) {
      console.error('❌', 'Error al generar próximo pago');
    }
  };

  // Función para obtener pagos pendientes de una vivienda
  const obtenerPagosPendientes = async (viviendaId) => {
    try {
      const response = await api.get(`/api/pagos/pendientes/${viviendaId}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo pagos pendientes:', error);
      return [];
    }
  };

  // Función para calcular total acumulado de pagos vencidos de una vivienda
  const calcularTotalAdeudoVivienda = (viviendaId) => {
    if (!pagos) return { totalSaldo: 0, totalRecargo: 0, totalAdeudo: 0 };
    
    const pagosVivienda = pagos.filter(p => p.vivienda._id === viviendaId && 
                                           (p.estado === 'Vencido' || p.estado === 'Parcial'));
    
    let totalSaldo = 0;
    let totalRecargo = 0;
    
    pagosVivienda.forEach(pago => {
      const fechaLimite = new Date(pago.fechaLimite);
      const hoy = new Date();
      const diasAtraso = pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' || 
                         hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
      
      const saldoPendiente = pago.monto - (pago.montoPagado || 0);
      const recargo = diasAtraso > 0 ? (pago.monto * 0.10) * Math.ceil(diasAtraso / 30) : 0;
      
      totalSaldo += saldoPendiente;
      totalRecargo += recargo;
    });
    
    return {
      totalSaldo,
      totalRecargo,
      totalAdeudo: totalSaldo + totalRecargo
    };
  };



  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    console.error('❌ Error en componente Pagos:', error);
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">
            Error al cargar los pagos
          </div>
          <div className="text-gray-600 text-sm">
            {error.message || 'Error desconocido'}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona los pagos de mantenimiento
        </p>
      </div>

      {/* Filtros */}
      <div className="flex space-x-4 items-center">
                 <button
           onClick={() => setFilter('pendientes')}
           className={`px-4 py-2 rounded-md text-sm font-medium ${
             filter === 'pendientes'
               ? 'bg-blue-600 text-white'
               : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
           }`}
         >
           Pendientes
         </button>
        <button
          onClick={() => setFilter('vencidos')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'vencidos'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Solo Vencidos
        </button>
                 <button
           onClick={() => setFilter('todos')}
           className={`px-4 py-2 rounded-md text-sm font-medium ${
             filter === 'todos'
               ? 'bg-gray-600 text-white'
               : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
           }`}
         >
           Todos
         </button>
         <button
           onClick={() => setFilter('actual')}
           className={`px-4 py-2 rounded-md text-sm font-medium ${
             filter === 'actual'
               ? 'bg-green-600 text-white'
               : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
           }`}
         >
           Mes Actual
         </button>


        
                                                                       <div className="ml-auto flex space-x-2">
             <button
               onClick={handleActualizarResidentes}
               disabled={actualizarResidentesMutation.isLoading}
               className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
             >
               {actualizarResidentesMutation.isLoading ? '🔄 Actualizando...' : '👥 Actualizar Residentes'}
             </button>
             {selectedPagos.length > 0 && (
               <button
                 onClick={handlePagarSeleccionados}
                 className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
               >
                 💳 Pagar Seleccionados ({selectedPagos.length})
               </button>
             )}
             <button
               onClick={() => {
                 queryClient.invalidateQueries('pagos');
                 queryClient.refetchQueries('pagos');
                 console.log('✅', 'Lista actualizada');
               }}
               className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
             >
               🔄 Actualizar
             </button>
           </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Pendientes</div>
          <div className="text-2xl font-bold text-yellow-600">
            {pagos?.filter(p => p.estado === 'Pendiente').length || 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Vencidos</div>
          <div className="text-2xl font-bold text-red-600">
            {pagos?.filter(p => p.estado === 'Vencido').length || 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Parciales</div>
          <div className="text-2xl font-bold text-blue-600">
            {pagos?.filter(p => p.estado === 'Parcial').length || 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Completamente Pagados</div>
          <div className="text-2xl font-bold text-green-600">
            {pagos?.filter(p => p.estado === 'Pagado' || p.estado === 'Pagado con excedente').length || 0}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-body">
                     {/* Indicador de resultados */}
           <div className="mb-4 text-sm text-gray-600">
                           Mostrando {pagosAgrupados?.length || 0} viviendas con pagos pendientes
              {filter !== 'todos' && (
                <span className="ml-2 text-blue-600">
                  (filtrado por: {
                    filter === 'pendientes' ? 'Pendientes' : 
                    filter === 'vencidos' ? 'Solo Vencidos' : 
                    filter === 'actual' ? 'Mes Actual' : 'Todos'
                  })
                </span>
              )}
           </div>
          
          <div className="overflow-x-auto">
            <table className="table min-w-full">
                             <thead className="table-header">
                                  <tr>
                    <th className="table-header-cell w-8">
                      <input
                        type="checkbox"
                        checked={selectedPagos.length === pagosAgrupados?.length && pagosAgrupados?.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="table-header-cell w-20">Vivienda</th>
                    <th className="table-header-cell w-32">Residente</th>
                    <th className="table-header-cell w-40">Período</th>
                    <th className="table-header-cell w-24">Monto</th>
                    <th className="table-header-cell w-24">Pagado</th>
                    <th className="table-header-cell w-28">Saldo</th>
                    <th className="table-header-cell w-32">Total</th>
                    <th className="table-header-cell w-28">Pendientes</th>
                    <th className="table-header-cell w-20">Estado</th>
                    <th className="table-header-cell w-28">Vencimiento</th>
                  </tr>
               </thead>
                             <tbody className="table-body">
                 {pagosAgrupados?.map((grupo) => {
                   // Validación adicional para evitar errores
                   if (!grupo.vivienda || !grupo.pagos || grupo.pagos.length === 0) {
                     console.warn('⚠️ Grupo inválido encontrado:', grupo);
                     return null;
                   }
                   
                   const primerPago = grupo.pagos[0];
                   const tienePagosVencidos = grupo.periodosVencidos > 0;
                   
                                       return (
                      <tr key={grupo.vivienda._id} className="table-row">
                        <td className="table-cell">
                          <input
                            type="checkbox"
                            checked={selectedPagos.includes(grupo.pagos[0]._id)}
                            onChange={() => handleSelectPago(grupo.pagos[0]._id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="table-cell font-medium">
                          {grupo.vivienda?.numero}
                        </td>
                                               <td className="table-cell text-sm">
                          <div className="truncate max-w-32">
                            {primerPago.residente ? 
                              `${primerPago.residente.nombre || ''} ${primerPago.residente.apellidos || ''}`.trim() : 
                              <span className="text-gray-400 italic">Sin residente</span>
                            }
                          </div>
                        </td>
                                               <td className="table-cell text-sm">
                          {(() => {
                                                         // Si es un pago individual (filtros pendientes o actual), mostrar solo ese período
                             if (grupo.esPagoIndividual) {
                              const pago = grupo.pagos[0];
                              const fechaInicio = new Date(pago.fechaInicioPeriodo || new Date(pago.año, pago.mes - 1, 1));
                              const fechaFin = new Date(pago.fechaFinPeriodo || new Date(pago.año, pago.mes - 1, 0));
                              
                              return (
                                <div className="text-xs">
                                  <div className="font-medium">
                                    {fechaInicio.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })} - {fechaFin.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ({pago.mes}/{pago.año})
                                  </div>
                                </div>
                              );
                            }
                            
                            // Para pagos agrupados, mostrar el rango
                            const pagosOrdenados = [...grupo.pagos].sort((a, b) => {
                              const fechaA = new Date(a.fechaInicioPeriodo || new Date(a.año, a.mes - 1, 1));
                              const fechaB = new Date(b.fechaInicioPeriodo || new Date(b.año, b.mes - 1, 1));
                              return fechaA - fechaB;
                            });
                            
                            const primerMes = pagosOrdenados[0];
                            const ultimoMes = pagosOrdenados[pagosOrdenados.length - 1];
                            
                            const fechaInicio = new Date(primerMes.fechaInicioPeriodo || new Date(primerMes.año, primerMes.mes - 1, 1));
                            const fechaFin = new Date(ultimoMes.fechaFinPeriodo || new Date(ultimoMes.año, ultimoMes.mes - 1, 0));
                            
                            return (
                              <div className="text-xs">
                                <div className="font-medium">
                                  {fechaInicio.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })} - {fechaFin.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ({grupo.pagos.length} mes{grupo.pagos.length > 1 ? 'es' : ''})
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                       <td className="table-cell text-sm">
                         <div className="font-medium">
                           {grupo.esPagoIndividual ? 
                             formatCurrency(grupo.pagos[0].monto) : 
                             formatCurrency(grupo.totalSaldo / grupo.pagos.length)
                           }
                         </div>
                       </td>
                       <td className="table-cell text-sm">
                         <div className="text-gray-600">
                           {grupo.esPagoIndividual ? 
                             formatCurrency(grupo.pagos[0].montoPagado || 0) : 
                             formatCurrency(0)
                           }
                         </div>
                       </td>
                       <td className="table-cell text-sm">
                         <span className="font-medium text-red-600">
                           {formatCurrency(grupo.totalSaldo)}
                         </span>
                       </td>
                                                                                               <td className="table-cell text-sm">
                           {grupo.totalAdeudo > 0 ? (
                             <div className="text-red-600">
                               <div className="font-medium">{formatCurrency(grupo.totalAdeudo)}</div>
                               {grupo.totalRecargo > 0 && (
                                 <div className="text-xs">
                                   +{formatCurrency(grupo.totalRecargo)}
                                 </div>
                               )}
                             </div>
                           ) : (
                             <span className="text-green-600">$0</span>
                           )}
                         </td>
                                                <td className="table-cell text-sm">
                           {grupo.esPagoIndividual ? (
                             <span className="text-red-600 font-medium text-xs">
                               1 mes
                             </span>
                           ) : grupo.periodosPendientes > 0 ? (
                             <span className="text-red-600 font-medium text-xs">
                               {grupo.periodosPendientes} mes{grupo.periodosPendientes > 1 ? 'es' : ''}
                             </span>
                           ) : (
                             <span className="text-green-600 text-xs">Al día</span>
                           )}
                         </td>
                        <td className="table-cell text-sm">
                          <span className={`badge text-xs ${
                            tienePagosVencidos ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {tienePagosVencidos ? 'Vencido' : 'Pendiente'}
                          </span>
                        </td>
                                                 <td className="table-cell text-sm">
                           <div className="text-xs">
                             {new Date(primerPago.fechaLimite).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                           </div>
                         </td>
                       </tr>
                   );
                 })}
               </tbody>
            </table>
          </div>
          
                     {pagosAgrupados?.length === 0 && (
             <div className="text-center py-8">
               <div className="text-gray-500">
                                   {filter === 'pendientes' && 'No hay viviendas con pagos pendientes'}
                  {filter === 'vencidos' && 'No hay viviendas con pagos vencidos'}
                  {filter === 'todos' && 'No hay pagos con saldo pendiente'}
                  {filter === 'actual' && 'No hay pagos pendientes del mes actual'}
               </div>
             </div>
           )}
        </div>
      </div>

      {/* Modal de Registro de Pago */}
      {isModalOpen && selectedPago && (
        <RegistrarPagoModal
          pago={selectedPago}
          onSubmit={handleSubmitPago}
          onClose={closeModal}
          isLoading={registerPagoMutation.isLoading}
          obtenerPagosPendientes={obtenerPagosPendientes}
        />
      )}
    </div>
  );
};

// Componente Modal para Registrar Pago Flexible
const RegistrarPagoModal = ({ pago, onSubmit, onClose, isLoading, obtenerPagosPendientes }) => {
  const [formData, setFormData] = useState({
    montoPagado: pago.monto || 0,
    metodoPago: 'Efectivo',
    referenciaPago: '',
    aplicarExcedenteAMesFuturo: false
  });
  const [pagosPendientes, setPagosPendientes] = useState([]);
  const [pagoSeleccionado, setPagoSeleccionado] = useState(pago);
  const [mostrarSeleccion, setMostrarSeleccion] = useState(false);
  const [pagosSeleccionados, setPagosSeleccionados] = useState([]);
  const [modoSeleccionMultiple, setModoSeleccionMultiple] = useState(false);

  // Cargar pagos pendientes cuando se abre el modal
  useEffect(() => {
    const cargarPagosPendientes = async () => {
      const pagos = await obtenerPagosPendientes(pago.vivienda._id);
      setPagosPendientes(pagos);
      setMostrarSeleccion(pagos.length > 1);
      
      // Activar modo selección múltiple si hay más de 1 mes de atraso
      const pagosAtrasados = pagos.filter(p => p.diasAtraso > 30); // Más de 30 días de atraso
      setModoSeleccionMultiple(pagosAtrasados.length > 1);
      
      // Si hay múltiples meses atrasados, seleccionar el primero por defecto
      if (pagosAtrasados.length > 1) {
        setPagosSeleccionados([pagosAtrasados[0]._id]);
        setPagoSeleccionado(pagosAtrasados[0]);
        const totalInicial = pagosAtrasados[0].monto + (pagosAtrasados[0].estaVencido ? (pagosAtrasados[0].calcularRecargo?.() || 0) : 0);
        setFormData(prev => ({
          ...prev,
          montoPagado: totalInicial
        }));
      }
    };
    cargarPagosPendientes();
  }, [pago.vivienda._id, obtenerPagosPendientes]);

  // Actualizar monto cuando cambien los pagos seleccionados
  useEffect(() => {
    if (modoSeleccionMultiple && pagosSeleccionados.length > 0) {
      const nuevoTotal = calcularTotalSeleccionado();
      setFormData(prev => ({
        ...prev,
        montoPagado: nuevoTotal
      }));
    }
  }, [pagosSeleccionados, modoSeleccionMultiple]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Manejar selección múltiple de pagos
  const handleSeleccionarPago = (pagoId, isSelected) => {
    if (isSelected) {
      setPagosSeleccionados(prev => [...prev, pagoId]);
    } else {
      setPagosSeleccionados(prev => prev.filter(id => id !== pagoId));
    }
  };

  // Calcular total de pagos seleccionados
  const calcularTotalSeleccionado = () => {
    return pagosSeleccionados.reduce((total, pagoId) => {
      const pago = pagosPendientes.find(p => p._id === pagoId);
      if (pago) {
        const recargo = pago.estaVencido ? (pago.calcularRecargo?.() || 0) : 0;
        return total + pago.monto + recargo;
      }
      return total;
    }, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (modoSeleccionMultiple && pagosSeleccionados.length > 0) {
      // Enviar múltiples pagos
      onSubmit({
        ...formData,
        pagoIds: pagosSeleccionados,
        esPagoMultiple: true
      });
    } else {
      // Enviar un solo pago
      onSubmit({
        ...formData,
        pagoId: pagoSeleccionado._id
      });
    }
  };

  // Calcular total a pagar (monto + recargo si está vencido)
  const totalAPagar = modoSeleccionMultiple ? calcularTotalSeleccionado() : 
    (pagoSeleccionado.monto + (pagoSeleccionado.estaVencido ? (pagoSeleccionado.calcularRecargo?.() || 0) : 0));
  const excedente = parseFloat(formData.montoPagado) > totalAPagar ? parseFloat(formData.montoPagado) - totalAPagar : 0;

  const seleccionarPago = (pagoSeleccion) => {
    setPagoSeleccionado(pagoSeleccion);
    setFormData(prev => ({
      ...prev,
      montoPagado: pagoSeleccion.monto || 0
    }));
    setMostrarSeleccion(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Registrar Pago Flexible
          </h3>
          
          {/* Selección de período si hay múltiples pagos pendientes */}
          {mostrarSeleccion && (
            <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                {modoSeleccionMultiple ? 'Selecciona los períodos a pagar (múltiples meses atrasados):' : 'Selecciona el período a pagar:'}
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {pagosPendientes.map((pagoPendiente) => {
                  const diasAtraso = pagoPendiente.diasAtraso || 0;
                  const recargoPendiente = pagoPendiente.calcularRecargo ? pagoPendiente.calcularRecargo() : 0;
                  const totalPendiente = pagoPendiente.monto + recargoPendiente;
                  const isSelected = modoSeleccionMultiple ? 
                    pagosSeleccionados.includes(pagoPendiente._id) : 
                    pagoSeleccionado._id === pagoPendiente._id;
                  
                  return (
                    <div
                      key={pagoPendiente._id}
                      className={`w-full p-2 rounded border ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {modoSeleccionMultiple ? (
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSeleccionarPago(pagoPendiente._id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="text-sm flex-1">
                            <div className="font-medium">
                              {pagoPendiente.mes}/{pagoPendiente.año}
                            </div>
                            <div className="text-xs text-gray-600">
                              {formatCurrency(pagoPendiente.monto)}
                              {recargoPendiente > 0 && ` + ${formatCurrency(recargoPendiente)} recargo`}
                              {diasAtraso > 0 && ` (${diasAtraso} días atrasado)`}
                            </div>
                          </div>
                        </label>
                      ) : (
                        <button
                          onClick={() => seleccionarPago(pagoPendiente)}
                          className="w-full text-left"
                        >
                          <div className="text-sm">
                            <div className="font-medium">
                              {pagoPendiente.mes}/{pagoPendiente.año}
                            </div>
                            <div className="text-xs text-gray-600">
                              {formatCurrency(pagoPendiente.monto)}
                              {recargoPendiente > 0 && ` + ${formatCurrency(recargoPendiente)} recargo`}
                              {diasAtraso > 0 && ` (${diasAtraso} días atrasado)`}
                            </div>
                          </div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Mostrar total de pagos seleccionados */}
              {modoSeleccionMultiple && pagosSeleccionados.length > 0 && (
                <div className="mt-3 p-2 bg-blue-100 rounded border border-blue-200">
                  <div className="text-sm font-medium text-blue-800">
                    Total seleccionado: {formatCurrency(calcularTotalSeleccionado())}
                  </div>
                  <div className="text-xs text-blue-600">
                    {pagosSeleccionados.length} período{pagosSeleccionados.length > 1 ? 's' : ''} seleccionado{pagosSeleccionados.length > 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Vivienda:</strong> {pagoSeleccionado.vivienda?.numero}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Residente:</strong> {pagoSeleccionado.residente?.nombre} {pagoSeleccionado.residente?.apellidos}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Período:</strong> {pagoSeleccionado.mes}/{pagoSeleccionado.año}
            </p>
            <p className="text-sm text-gray-600">
                              <strong>Monto Base:</strong> {formatCurrency(pagoSeleccionado.monto)}
            </p>
            {!modoSeleccionMultiple && pagoSeleccionado.estaVencido && (pagoSeleccionado.calcularRecargo?.() || 0) > 0 && (
              <p className="text-sm text-red-600">
                <strong>Recargo por atraso:</strong> {formatCurrency(pagoSeleccionado.calcularRecargo?.() || 0)}
              </p>
            )}
            <p className="text-sm font-medium text-gray-800">
              <strong>Total a Pagar:</strong> {formatCurrency(totalAPagar)}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Monto a Pagar</label>
              <input
                type="number"
                name="montoPagado"
                value={formData.montoPagado}
                onChange={handleChange}
                className="input"
                min={totalAPagar}
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
              <label className="form-label">Referencia de Pago</label>
              <input
                type="text"
                name="referenciaPago"
                value={formData.referenciaPago}
                onChange={handleChange}
                className="input"
                placeholder="Número de referencia, folio, etc."
              />
            </div>

            {excedente > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Excedente detectado:</strong> {formatCurrency(excedente)}
                </p>
                <div className="mt-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="aplicarExcedenteAMesFuturo"
                      checked={formData.aplicarExcedenteAMesFuturo}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span className="text-sm text-blue-800">
                      Aplicar excedente a meses futuros
                    </span>
                  </label>
                </div>
              </div>
            )}

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
                {isLoading ? 'Registrando...' : '✓ Registrar Pago'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Pagos; 