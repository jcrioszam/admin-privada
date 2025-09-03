import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, CreditCardIcon, CheckIcon, UserIcon, CalendarIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/currencyFormatter';

const Pagos = () => {
  const [selectedResidente, setSelectedResidente] = useState(null);
  const [selectedMeses, setSelectedMeses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('todos');
  const [formData, setFormData] = useState({
    metodoPago: 'Efectivo',
    referenciaPago: '',
    montoPagado: 0
  });
  const queryClient = useQueryClient();

  // Obtener residentes con vivienda
  const { data: residentes, isLoading: loadingResidentes } = useQuery({
    queryKey: ['residentes'],
    queryFn: async () => {
      const response = await api.get('/api/residentes');
      return response.data.filter(residente => residente.vivienda);
    }
  });

  // Obtener pagos
  const { data: pagos, isLoading: loadingPagos } = useQuery({
    queryKey: ['pagos'],
    queryFn: async () => {
        const response = await api.get('/api/pagos');
        return response.data;
    }
  });

  // Filtrar residentes según el filtro
  const residentesFiltrados = useMemo(() => {
    if (!residentes || !pagos) return [];

    return residentes.filter(residente => {
      const pagosResidente = pagos.filter(pago => 
        pago.residente && pago.residente._id === residente._id
      );

      if (filter === 'todos') {
        return pagosResidente.some(pago => {
           const saldoPendiente = pago.monto - (pago.montoPagado || 0);
           const fechaLimite = new Date(pago.fechaLimite);
           const hoy = new Date();
           const diasAtraso = pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' || 
                              hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
          return saldoPendiente > 0 || diasAtraso > 0 || pago.estado === 'Parcial';
        });
      }
           
      if (filter === 'vencidas') {
        return pagosResidente.some(pago => {
           const saldoPendiente = pago.monto - (pago.montoPagado || 0);
          const fechaLimite = new Date(pago.fechaLimite);
          const hoy = new Date();
          const diasAtraso = pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' || 
                             hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
          return saldoPendiente > 0 && diasAtraso > 0;
        });
      }

      if (filter === 'pendientes') {
        return pagosResidente.some(pago => {
          const saldoPendiente = pago.monto - (pago.montoPagado || 0);
        const fechaLimite = new Date(pago.fechaLimite);
        const hoy = new Date();
        const diasAtraso = pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' || 
                           hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
          return saldoPendiente > 0 && diasAtraso <= 0;
        });
      }

      if (filter === 'al-dia') {
        return pagosResidente.every(pago => {
          const saldoPendiente = pago.monto - (pago.montoPagado || 0);
        const fechaLimite = new Date(pago.fechaLimite);
        const hoy = new Date();
        const diasAtraso = pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' || 
                           hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
        
          // Un residente está "al día" si:
          // 1. No tiene saldo pendiente Y
          // 2. No tiene días de atraso
          return saldoPendiente <= 0 && diasAtraso <= 0;
        }) && pagosResidente.length > 0;
      }

      return true;
    });
  }, [residentes, pagos, filter]);

  // Generar meses pendientes para un residente
  const generarMesesPendientes = (residente) => {
    if (!residente || !residente.fechaIngreso) return [];

    const fechaIngreso = new Date(residente.fechaIngreso);
    const añoIngreso = fechaIngreso.getFullYear();
    const mesIngreso = fechaIngreso.getMonth() + 1;

    const hoy = new Date();
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;

    const mesesPendientes = [];

    // Generar meses desde la fecha de ingreso hasta el mes actual
    for (let año = añoIngreso; año <= añoActual; año++) {
      const mesInicio = año === añoIngreso ? mesIngreso : 1;
      const mesFin = año === añoActual ? mesActual : 12;

      for (let mes = mesInicio; mes <= mesFin; mes++) {
        // Verificar si ya existe un pago para este mes
        const pagoExistente = pagos?.find(pago => 
          pago.residente && pago.residente._id === residente._id &&
          pago.mes === mes && pago.año === año
        );

        const fechaLimite = new Date(año, mes, 0); // Último día del mes
        const hoy = new Date();
        const diasAtraso = hoy > fechaLimite ? Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24)) : 0;

        if (pagoExistente) {
          const saldoPendiente = pagoExistente.monto - (pagoExistente.montoPagado || 0);
          if (saldoPendiente > 0 || diasAtraso > 0 || pagoExistente.estado === 'Parcial') {
            mesesPendientes.push({
              mes,
              año,
              monto: pagoExistente.monto,
              montoPagado: pagoExistente.montoPagado || 0,
              saldoPendiente,
              estado: pagoExistente.estado,
              diasAtraso,
              fechaLimite,
              pagoId: pagoExistente._id,
              existe: true
            });
          }
        } else {
          // Crear mes pendiente que no existe en la base de datos
          const montoMantenimiento = 200; // Valor por defecto
          mesesPendientes.push({
            mes,
            año,
            monto: montoMantenimiento,
            montoPagado: 0,
            saldoPendiente: montoMantenimiento,
            estado: 'Pendiente',
            diasAtraso,
            fechaLimite,
            pagoId: null,
            existe: false
          });
        }
      }
    }

    return mesesPendientes.sort((a, b) => {
      if (a.año !== b.año) return a.año - b.año;
      return a.mes - b.mes;
    });
  };

  // Manejar selección de residente
  const handleSeleccionarResidente = (residente) => {
    setSelectedResidente(residente);
    setSelectedMeses([]);
    setIsModalOpen(true);
  };

  // Manejar selección de mes
  const handleSeleccionarMes = (mes) => {
    setSelectedMeses(prev => {
      const existe = prev.find(m => m.mes === mes.mes && m.año === mes.año);
      if (existe) {
        return prev.filter(m => !(m.mes === mes.mes && m.año === mes.año));
      } else {
        return [...prev, mes];
      }
    });
  };

  // Manejar seleccionar todos
  const handleSeleccionarTodos = () => {
    const mesesPendientes = generarMesesPendientes(selectedResidente);
    if (selectedMeses.length === mesesPendientes.length) {
      setSelectedMeses([]);
    } else {
      setSelectedMeses(mesesPendientes);
    }
  };

  // Calcular total seleccionado
  const calcularTotalSeleccionado = () => {
    return selectedMeses.reduce((total, mes) => {
      const recargo = mes.diasAtraso > 0 ? (mes.monto * 0.1 * Math.ceil(mes.diasAtraso / 30)) : 0;
      return total + mes.saldoPendiente + recargo;
    }, 0);
  };

  // Mutación para pagos múltiples
  const pagosMultiplesMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/api/pagos/pago-multiple', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pagos']);
      queryClient.invalidateQueries(['residentes']);
      setIsModalOpen(false);
      setSelectedResidente(null);
      setSelectedMeses([]);
      setFormData({
        metodoPago: 'Efectivo',
        referenciaPago: '',
        montoPagado: 0
      });
      },
      onError: (error) => {
      console.error('Error al registrar pagos:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error config:', error.config?.data);
    }
  });

  // Manejar pago de meses seleccionados
  const handlePagarSeleccionados = () => {
    if (selectedMeses.length === 0) return;

    const pagoIds = selectedMeses
      .filter(mes => mes.existe)
      .map(mes => mes.pagoId);

    const data = {
      pagoIds,
      metodoPago: formData.metodoPago,
      referenciaPago: formData.referenciaPago || undefined,
      montoPagado: calcularTotalSeleccionado()
    };

    console.log('Datos a enviar:', data);
    console.log('Meses seleccionados:', selectedMeses);

    pagosMultiplesMutation.mutate(data);
  };

  if (loadingResidentes || loadingPagos) {
    return <LoadingSpinner />;
  }

  const mesesPendientes = selectedResidente ? generarMesesPendientes(selectedResidente) : [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Gestión de Pagos</h1>

      {/* Filtros */}
        <div className="flex gap-2 mb-4">
                 <button
            onClick={() => setFilter('todos')}
           className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'todos' 
               ? 'bg-blue-600 text-white'
               : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
           }`}
         >
            Todos
         </button>
        <button
            onClick={() => setFilter('vencidas')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'vencidas' 
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
            Vencidas
        </button>
                 <button
            onClick={() => setFilter('pendientes')}
           className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'pendientes' 
                ? 'bg-yellow-600 text-white' 
               : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
           }`}
         >
            Pendientes
         </button>
         <button
            onClick={() => setFilter('al-dia')}
           className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'al-dia' 
               ? 'bg-green-600 text-white'
               : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
           }`}
         >
            Al día
             </button>
           </div>
      </div>

      {/* Lista de residentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {residentesFiltrados.map((residente) => {
          const mesesPendientesResidente = generarMesesPendientes(residente);
          const totalSaldo = mesesPendientesResidente.reduce((sum, mes) => sum + mes.saldoPendiente, 0);
          const tieneVencidos = mesesPendientesResidente.some(mes => mes.diasAtraso > 0);
          const tienePendientes = mesesPendientesResidente.some(mes => mes.saldoPendiente > 0);
          const estaAlDia = !tienePendientes && !tieneVencidos;

          return (
            <div
              key={residente._id}
              className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleSeleccionarResidente(residente)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {residente.nombre} {residente.apellidos}
                </h3>
                <UserIcon className="h-5 w-5 text-gray-400" />
      </div>

              <div className="text-sm text-gray-600 mb-2">
                <p>Vivienda: {residente.vivienda?.numero}</p>
                <p>Ingreso: {new Date(residente.fechaIngreso).toLocaleDateString()}</p>
           </div>
          
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="text-gray-600">
                    {mesesPendientesResidente.length} mes(es) pendiente(s)
                  </p>
                  <p className={`font-semibold ${tieneVencidos ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatCurrency(totalSaldo)}
                  </p>
                          </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  tieneVencidos 
                    ? 'bg-red-100 text-red-800' 
                    : tienePendientes 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-green-100 text-green-800'
                }`}>
                  {tieneVencidos ? 'Vencido' : tienePendientes ? 'Pendiente' : 'Al día'}
                </div>
                                  </div>
                                </div>
                   );
                 })}
          </div>
          
      {/* Modal de pagos */}
      {isModalOpen && selectedResidente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Pagos de {selectedResidente.nombre} {selectedResidente.apellidos}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
      </div>

            <div className="mb-4">
              <button
                onClick={handleSeleccionarTodos}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {selectedMeses.length === mesesPendientes.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
              </button>
    </div>

            {/* Lista de meses pendientes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {mesesPendientes.map((mes) => {
                const isSelected = selectedMeses.some(m => m.mes === mes.mes && m.año === mes.año);
                const recargo = mes.diasAtraso > 0 ? (mes.monto * 0.1 * Math.ceil(mes.diasAtraso / 30)) : 0;
                const total = mes.saldoPendiente + recargo;

  return (
                  <div
                    key={`${mes.mes}-${mes.año}`}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => handleSeleccionarMes(mes)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSeleccionarMes(mes)}
                          className="mr-3"
                        />
                        <div>
                          <p className="font-medium">
                            {new Date(mes.año, mes.mes - 1).toLocaleDateString('es-ES', { 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {mes.existe ? 'Pago existente' : 'Pago a crear'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(total)}</p>
                        {mes.diasAtraso > 0 && (
                          <p className="text-sm text-red-600">
                            {mes.diasAtraso} días de atraso
                          </p>
                        )}
                        {recargo > 0 && (
                          <p className="text-sm text-orange-600">
                            +{formatCurrency(recargo)} recargo
                          </p>
                        )}
                        </div>
                        </div>
                      </div>
                  );
                })}
              </div>

            {/* Formulario de pago */}
            {selectedMeses.length > 0 && (
              <div className="border-t pt-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Detalles del Pago</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Total a pagar: <span className="font-bold text-lg">{formatCurrency(calcularTotalSeleccionado())}</span>
            </p>
          </div>
          
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Método de Pago
                    </label>
              <select
                value={formData.metodoPago}
                      onChange={(e) => setFormData({...formData, metodoPago: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                value={formData.referenciaPago}
                      onChange={(e) => setFormData({...formData, referenciaPago: e.target.value})}
                      placeholder="Opcional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
              </div>

                <div className="flex justify-end gap-3">
              <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                    onClick={handlePagarSeleccionados}
                    disabled={pagosMultiplesMutation.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {pagosMultiplesMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CreditCardIcon className="h-4 w-4" />
                        Registrar Pago
                      </>
                    )}
              </button>
            </div>
              </div>
            )}
        </div>
      </div>
      )}
    </div>
  );
};

export default Pagos; 