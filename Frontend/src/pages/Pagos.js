import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, CreditCardIcon, CheckIcon, PrinterIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/currencyFormatter';

const Pagos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVivienda, setSelectedVivienda] = useState(null);
  const [selectedMeses, setSelectedMeses] = useState([]);
  const [filter, setFilter] = useState('pendientes');
  const [formData, setFormData] = useState({
    metodoPago: 'Efectivo',
    referenciaPago: '',
    montoPagado: 0
  });
  const queryClient = useQueryClient();

  // Obtener pagos
  const { data: pagos, isLoading, error } = useQuery({
    queryKey: ['pagos'],
    queryFn: async () => {
        const response = await api.get('/api/pagos');
        return response.data;
    },
    refetchInterval: 30000,
    staleTime: 10000,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Agrupar pagos por vivienda
  const viviendasConPagos = useMemo(() => {
    if (!pagos) return [];
    
    // Filtrar pagos con vivienda válida
    const pagosConVivienda = pagos.filter(pago => pago.vivienda);
    
    // Filtrar según el estado seleccionado
    let pagosFiltrados = [];
    switch (filter) {
             case 'pendientes':
         pagosFiltrados = pagosConVivienda.filter(pago => {
           const saldoPendiente = pago.monto - (pago.montoPagado || 0);
           return saldoPendiente > 0 && pago.estado !== 'Pagado' && pago.estado !== 'Pagado con excedente';
         });
        break;
             case 'vencidos':
         pagosFiltrados = pagosConVivienda.filter(pago => {
           const fechaLimite = new Date(pago.fechaLimite);
           const hoy = new Date();
           const diasAtraso = pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' || 
                              hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
           const saldoPendiente = pago.monto - (pago.montoPagado || 0);
           return diasAtraso > 0 && saldoPendiente > 0 && pago.estado !== 'Pagado' && pago.estado !== 'Pagado con excedente';
         });
        break;
                          case 'todos':
          pagosFiltrados = pagosConVivienda.filter(pago => {
           const saldoPendiente = pago.monto - (pago.montoPagado || 0);
           return saldoPendiente > 0;
         });
         break;
      default:
        pagosFiltrados = pagosConVivienda;
    }
    
    // Agrupar por vivienda
    const agrupados = {};
    
    pagosFiltrados.forEach(pago => {
      const viviendaId = pago.vivienda._id;
      
      if (!agrupados[viviendaId]) {
        agrupados[viviendaId] = {
          vivienda: pago.vivienda,
          residente: pago.residente,
          pagos: [],
          totalSaldo: 0,
          totalMonto: 0,
          mesesPendientes: 0,
          estadoGeneral: 'Pendiente'
        };
      }
      
      // Calcular días de atraso
        const fechaLimite = new Date(pago.fechaLimite);
        const hoy = new Date();
        const diasAtraso = pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' || 
                           hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
        
        const saldoPendiente = pago.monto - (pago.montoPagado || 0);
      
      agrupados[viviendaId].pagos.push({
        ...pago,
        diasAtraso,
        saldoPendiente
      });
      
      agrupados[viviendaId].totalSaldo += saldoPendiente;
      agrupados[viviendaId].totalMonto += pago.monto;
      agrupados[viviendaId].mesesPendientes += 1;
      
      if (diasAtraso > 0) {
        agrupados[viviendaId].estadoGeneral = 'Vencida';
      }
    });
    
    // Convertir a array y ordenar por número de vivienda
    return Object.values(agrupados).sort((a, b) => a.vivienda.numero - b.vivienda.numero);
  }, [pagos, filter]);

  // Mutación para pagos múltiples
  const pagosMultiplesMutation = useMutation(
    (data) => api.post('/api/pagos/pago-multiple', data),
    {
             onSuccess: async (response) => {
         await queryClient.invalidateQueries('pagos');
         setIsModalOpen(false);
        setSelectedVivienda(null);
        setSelectedMeses([]);
        console.log('✅ Pagos múltiples registrados exitosamente');
          },
          onError: (error) => {
        console.error('❌ Error al registrar pagos múltiples:', error.response?.data?.message || error.message);
      },
    }
  );

  const handleSeleccionarVivienda = (vivienda) => {
    setSelectedVivienda(vivienda);
    setSelectedMeses([]);
    setFormData({
      metodoPago: 'Efectivo',
      referenciaPago: '',
      montoPagado: 0
    });
    setIsModalOpen(true);
  };

  const handleSeleccionarMes = (pagoId) => {
    setSelectedMeses(prev => {
      if (prev.includes(pagoId)) {
        return prev.filter(id => id !== pagoId);
      } else {
        return [...prev, pagoId];
      }
    });
  };

  const handleSeleccionarTodos = () => {
    if (selectedMeses.length === selectedVivienda?.pagos.length) {
      setSelectedMeses([]);
    } else {
      const todosLosIds = selectedVivienda?.pagos.map(pago => pago._id) || [];
      setSelectedMeses(todosLosIds);
    }
  };

  const calcularTotalSeleccionado = () => {
    if (!selectedVivienda || selectedMeses.length === 0) return 0;
    
    return selectedMeses.reduce((total, pagoId) => {
      const pago = selectedVivienda.pagos.find(p => p._id === pagoId);
      if (pago) {
        const recargo = pago.diasAtraso > 0 ? (pago.monto * 0.10) * Math.ceil(pago.diasAtraso / 30) : 0;
        return total + pago.saldoPendiente + recargo;
      }
      return total;
    }, 0);
  };

  const handlePagarSeleccionados = (formData) => {
    if (selectedMeses.length === 0) {
      console.error('❌ Selecciona al menos un mes para pagar');
      return;
    }

    const data = {
      pagoIds: selectedMeses,
      metodoPago: formData.metodoPago,
      referenciaPago: formData.referenciaPago,
      montoPagado: formData.montoPagado
    };

    pagosMultiplesMutation.mutate(data);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500">Error al cargar pagos: {error.message}</div>;

    return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Pagos</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilter('todos')}
            className={`px-4 py-2 rounded-lg ${filter === 'todos' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Todos
          </button>
                 <button
           onClick={() => setFilter('pendientes')}
            className={`px-4 py-2 rounded-lg ${filter === 'pendientes' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
         >
           Pendientes
         </button>
        <button
          onClick={() => setFilter('vencidos')}
            className={`px-4 py-2 rounded-lg ${filter === 'vencidos' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Vencidos
             </button>
           </div>
      </div>

      {/* Tabla de viviendas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vivienda
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Residente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Meses Pendientes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saldo Total
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
            {viviendasConPagos.map((vivienda) => (
              <tr key={vivienda.vivienda._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Vivienda {vivienda.vivienda.numero}
                        </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {vivienda.residente ? `${vivienda.residente.nombre} ${vivienda.residente.apellidos}` : 'Sin residente'}
                        </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {vivienda.mesesPendientes} mes(es)
                        </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(vivienda.totalSaldo)}
                        </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    vivienda.estadoGeneral === 'Vencida' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {vivienda.estadoGeneral}
                          </span>
                        </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleSeleccionarVivienda(vivienda)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Seleccionar Meses
                  </button>
                         </td>
                       </tr>
            ))}
               </tbody>
            </table>
          </div>
          
      {/* Modal para seleccionar meses */}
      {isModalOpen && selectedVivienda && (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
                Seleccionar Meses - Vivienda {selectedVivienda.vivienda.numero}
          </h3>
          
              {/* Checkbox para seleccionar todos */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedMeses.length === selectedVivienda.pagos.length}
                    onChange={handleSeleccionarTodos}
                    className="mr-2"
                  />
                  <span className="font-medium">Seleccionar todos los meses</span>
                </label>
              </div>

              {/* Lista de meses */}
              <div className="space-y-2 mb-6">
                {selectedVivienda.pagos.map((pago) => (
                  <div key={pago._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <label className="flex items-center flex-1">
                      <input
                        type="checkbox"
                        checked={selectedMeses.includes(pago._id)}
                        onChange={() => handleSeleccionarMes(pago._id)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">
                          {pago.mes}/{pago.año}
                        </div>
                        <div className="text-sm text-gray-500">
                          {pago.diasAtraso > 0 ? `${pago.diasAtraso} días de atraso` : 'Al día'}
                        </div>
                      </div>
                    </label>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(pago.saldoPendiente)}</div>
                      {pago.diasAtraso > 0 && (
                        <div className="text-sm text-red-500">
                          +{formatCurrency((pago.monto * 0.10) * Math.ceil(pago.diasAtraso / 30))} recargo
                        </div>
                      )}
                        </div>
                      </div>
                ))}
              </div>

              {/* Total seleccionado */}
              {selectedMeses.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <div className="text-lg font-medium text-blue-900">
                    Total a pagar: {formatCurrency(calcularTotalSeleccionado())}
                  </div>
                  <div className="text-sm text-blue-700">
                    {selectedMeses.length} mes(es) seleccionado(s)
              </div>
            </div>
          )}
          
                            {/* Formulario de pago */}
              {selectedMeses.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Método de Pago
                    </label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.metodoPago}
                      onChange={(e) => setFormData(prev => ({ ...prev, metodoPago: e.target.value }))}
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Tarjeta">Tarjeta</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Referencia de Pago
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="Ej: Transferencia 123456"
                      value={formData.referenciaPago}
                      onChange={(e) => setFormData(prev => ({ ...prev, referenciaPago: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto a Pagar
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={calcularTotalSeleccionado()}
                      readOnly
                    />
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end space-x-3 mt-6">
                               <button
                   onClick={() => {
                     setIsModalOpen(false);
                     setSelectedVivienda(null);
                     setSelectedMeses([]);
                     setFormData({
                       metodoPago: 'Efectivo',
                       referenciaPago: '',
                       montoPagado: 0
                     });
                   }}
                   className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                 >
                   Cancelar
                 </button>
                                 {selectedMeses.length > 0 && (
                   <button
                     onClick={() => {
                       const dataToSend = {
                         ...formData,
                         montoPagado: calcularTotalSeleccionado()
                       };
                       handlePagarSeleccionados(dataToSend);
                     }}
                     className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                     disabled={pagosMultiplesMutation.isPending}
                   >
                     {pagosMultiplesMutation.isPending ? 'Procesando...' : 'Registrar Pago'}
                   </button>
                 )}
            </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
};

export default Pagos; 
