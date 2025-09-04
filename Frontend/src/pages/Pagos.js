import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCardIcon, CheckIcon, UserIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/currencyFormatter';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Pagos = () => {
  // Deploy trigger - correcciones de filtros aplicadas - v5 - FINAL
  const [selectedResidente, setSelectedResidente] = useState(null);
  const [selectedMeses, setSelectedMeses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('todos');
  const [formData, setFormData] = useState({
    metodoPago: 'Efectivo',
    referenciaPago: '',
    montoPagado: 0
  });
  const [modoAdelanto, setModoAdelanto] = useState(false);
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

      // Si no tiene pagos, no mostrar en ningún filtro
      if (pagosResidente.length === 0) {
        return false;
      }

      // Calcular estado del residente basado en datos reales de la BD
      let tieneSaldoPendiente = false;
      let tieneVencidos = false;
      let tienePendientes = false;

      for (const pago of pagosResidente) {
           const saldoPendiente = pago.monto - (pago.montoPagado || 0);
           const fechaLimite = new Date(pago.fechaLimite);
           const hoy = new Date();
        const diasAtraso = hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));

        // Solo considerar pagos que realmente tienen saldo pendiente
                  if (saldoPendiente > 0) {
            tieneSaldoPendiente = true;
          }
      }

      // Aplicar filtros basados en el estado calculado
      switch (filter) {
        case 'todos':
          return true; // Mostrar todos los residentes
          
        case 'al-dia':
          return !tieneSaldoPendiente; // Solo residentes sin saldo pendiente
          
        default:
          return true;
      }
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

    // Generar meses desde la fecha de ingreso hasta el mes anterior (no generar meses futuros)
    for (let año = añoIngreso; año <= añoActual; año++) {
      const mesInicio = año === añoIngreso ? mesIngreso : 1;
      const mesFin = año === añoActual ? mesActual - 1 : 12; // No generar mes actual automáticamente

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
          // Si el pago está completamente pagado, no incluirlo en pendientes
          if (pagoExistente.estado === 'Pagado' || pagoExistente.estado === 'Pagado con excedente') {
            continue; // Saltar este mes, ya está pagado
          }
          
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

  // Generar meses futuros para adelanto (todos los meses restantes del año)
  const generarMesesFuturos = (residente) => {
    if (!residente || !residente.vivienda) return [];

    const hoy = new Date();
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;

    const mesesFuturos = [];

    // Obtener la cuota de mantenimiento de la vivienda
    const cuotaMantenimiento = residente.vivienda.cuotaMantenimiento || 200; // Valor por defecto

    // Generar todos los meses restantes del año actual
    for (let mes = mesActual; mes <= 12; mes++) {
      // Verificar si ya existe un pago para este mes
      const pagoExistente = pagos?.find(pago => 
        pago.residente && pago.residente._id === residente._id &&
        pago.mes === mes && pago.año === añoActual
      );

      if (!pagoExistente) {
        mesesFuturos.push({
          mes,
          año: añoActual,
          monto: cuotaMantenimiento,
          saldoPendiente: cuotaMantenimiento,
          fechaInicio: new Date(añoActual, mes - 1, 1),
          fechaFin: new Date(añoActual, mes, 0),
          fechaLimite: new Date(añoActual, mes, 0),
          esAdelanto: true
        });
      }
    }

    return mesesFuturos;
  };

  // Manejar selección de residente
  const handleSeleccionarResidente = (residente) => {
    setSelectedResidente(residente);
    setSelectedMeses([]);
    setModoAdelanto(false);
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
    const meses = modoAdelanto ? 
      generarMesesFuturos(selectedResidente) : 
      generarMesesPendientes(selectedResidente);
    
    if (selectedMeses.length === meses.length) {
      setSelectedMeses([]);
    } else {
      setSelectedMeses(meses);
    }
  };

  // Calcular total seleccionado
  const calcularTotalSeleccionado = () => {
    return selectedMeses.reduce((total, mes) => {
      // No aplicar recargos a meses de adelanto
      const recargo = (mes.esAdelanto || !mes.diasAtraso || mes.diasAtraso <= 0) ? 0 : (mes.monto * 0.1 * Math.ceil(mes.diasAtraso / 30));
      return total + mes.monto + recargo;
    }, 0);
  };

    // Estados para mensaje de confirmación y comprobante
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [comprobanteData, setComprobanteData] = useState(null);
  const comprobanteRef = useRef(null);

  // Función para generar PDF del comprobante
  const generarPDF = async () => {
    if (!comprobanteRef.current) return;

    try {
      const canvas = await html2canvas(comprobanteRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Generar nombre del archivo
      const fecha = new Date().toISOString().split('T')[0];
      const residente = comprobanteData?.pagos?.[0]?.residente;
      const nombreArchivo = `comprobante_${residente?.nombre || 'pago'}_${fecha}.pdf`;
      
      pdf.save(nombreArchivo);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Inténtalo de nuevo.');
    }
  };

  // Mutación para pagos múltiples
  const pagosMultiplesMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/api/pagos/pago-multiple', data);
    },
    onSuccess: (response) => {
      console.log('✅ Pago registrado exitosamente:', response.data);
      
      // Mostrar mensaje de confirmación
      setComprobanteData(response.data);
      setShowSuccessMessage(true);
      
      // Actualizar datos - Forzar refetch inmediato
      queryClient.invalidateQueries(['pagos']);
      queryClient.invalidateQueries(['residentes']);
      queryClient.refetchQueries(['pagos']);
      queryClient.refetchQueries(['residentes']);
      
      // Cerrar modal después de un delay
      setTimeout(() => {
        setIsModalOpen(false);
        setSelectedResidente(null);
        setSelectedMeses([]);
        setFormData({
          metodoPago: 'Efectivo',
          referenciaPago: '',
          montoPagado: 0
        });
        
        // Refetch adicional después de cerrar el modal
        queryClient.refetchQueries(['pagos']);
        queryClient.refetchQueries(['residentes']);
      }, 2000);
      },
      onError: (error) => {
      console.error('Error al registrar pagos:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error config:', error.config?.data);
      
      // Mostrar mensaje de error
      alert('Error al registrar el pago: ' + (error.response?.data?.message || 'Error desconocido'));
    }
  });

  // Manejar pago de meses seleccionados
  const handlePagarSeleccionados = () => {
    if (selectedMeses.length === 0) return;

    // Separar meses existentes y no existentes
    const mesesExistentes = selectedMeses.filter(mes => mes.existe);
    const mesesNoExistentes = selectedMeses.filter(mes => !mes.existe);

    console.log('Meses existentes:', mesesExistentes);
    console.log('Meses no existentes:', mesesNoExistentes);

    // Si solo hay meses que no existen, crear pagos primero
    if (mesesExistentes.length === 0 && mesesNoExistentes.length > 0) {
      // Crear pagos para meses que no existen
      crearPagosFaltantes(mesesNoExistentes);
      return;
    }

    // Si hay meses existentes, procesarlos
    if (mesesExistentes.length > 0) {
      const pagoIds = mesesExistentes.map(mes => mes.pagoId);

      const data = {
        pagoIds,
        metodoPago: formData.metodoPago,
        referenciaPago: formData.referenciaPago || undefined,
        montoPagado: calcularTotalSeleccionado()
      };

      console.log('Datos a enviar:', data);
      console.log('Meses seleccionados:', selectedMeses);

      pagosMultiplesMutation.mutate(data);
    }
  };

  // Función para crear pagos faltantes
  const crearPagosFaltantes = async (mesesNoExistentes) => {
    try {
      console.log('Creando pagos faltantes para:', mesesNoExistentes);
      
      // Crear pagos en el backend
      const pagosACrear = mesesNoExistentes.map(mes => ({
        vivienda: selectedResidente.vivienda._id,
        residente: selectedResidente._id,
        mes: mes.mes,
        año: mes.año,
        monto: mes.monto,
        montoPagado: 0,
        fechaInicioPeriodo: new Date(mes.año, mes.mes - 1, 1),
        fechaFinPeriodo: new Date(mes.año, mes.mes, 0),
        fechaLimite: new Date(mes.año, mes.mes, 0),
        estado: 'Pendiente',
        metodoPago: 'Efectivo',
        esAdelanto: mes.esAdelanto || false
        // No incluir registradoPor - se manejará en el backend
      }));

      // Crear pagos uno por uno
      const pagosCreados = [];
      for (const pagoData of pagosACrear) {
        const response = await api.post('/api/pagos', pagoData);
        pagosCreados.push(response.data);
      }

      console.log('Pagos creados:', pagosCreados);

      // Ahora procesar el pago
      const pagoIds = pagosCreados.map(pago => pago._id);
      const data = {
        pagoIds,
        metodoPago: formData.metodoPago,
        referenciaPago: formData.referenciaPago || undefined,
        montoPagado: calcularTotalSeleccionado()
      };

      pagosMultiplesMutation.mutate(data);

    } catch (error) {
      console.error('Error creando pagos faltantes:', error);
      alert('Error al crear los pagos faltantes: ' + (error.response?.data?.message || 'Error desconocido'));
    }
  };

  if (loadingResidentes || loadingPagos) {
    return <LoadingSpinner />;
  }

  // Generar meses pendientes basados en datos reales de la BD
  const mesesPendientes = selectedResidente ? (() => {
    const pagosResidente = pagos?.filter(pago => 
      pago.residente && pago.residente._id === selectedResidente._id
    ) || [];
    
    return pagosResidente
      .filter(pago => {
        const saldoPendiente = pago.monto - (pago.montoPagado || 0);
        return saldoPendiente > 0;
      })
      .map(pago => {
        const saldoPendiente = pago.monto - (pago.montoPagado || 0);
      const fechaLimite = new Date(pago.fechaLimite);
      const hoy = new Date();
        const diasAtraso = hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
    
    return {
          mes: pago.mes,
          año: pago.año,
          monto: pago.monto,
          montoPagado: pago.montoPagado || 0,
          saldoPendiente,
          estado: pago.estado,
          diasAtraso,
          fechaLimite,
          pagoId: pago._id,
          existe: true
        };
      })
      .sort((a, b) => {
        if (a.año !== b.año) return a.año - b.año;
        return a.mes - b.mes;
      });
  })() : [];

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
          // Calcular estado basado en datos reales de la BD (igual que en el filtro)
          const pagosResidente = pagos.filter(pago => 
            pago.residente && pago.residente._id === residente._id
          );
          
          let totalSaldo = 0;
          let tieneVencidos = false;
          let tienePendientes = false;
          let mesesPendientesCount = 0;
          
          for (const pago of pagosResidente) {
            const saldoPendiente = pago.monto - (pago.montoPagado || 0);
            const fechaLimite = new Date(pago.fechaLimite);
            const hoy = new Date();
            const diasAtraso = hoy <= fechaLimite ? 0 : Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
            
            if (saldoPendiente > 0) {
              totalSaldo += saldoPendiente;
              mesesPendientesCount++;
              
              if (diasAtraso > 0) {
                tieneVencidos = true;
              } else {
                tienePendientes = true;
              }
            }
          }

          // Determinar color del borde y estado
          let borderColor = 'border-blue-500';
          let estadoTexto = 'Al día';
          let estadoColor = 'bg-green-100 text-green-800';
          let montoColor = 'text-gray-900';

          if (tieneVencidos) {
            borderColor = 'border-red-500';
            estadoTexto = 'Vencido';
            estadoColor = 'bg-red-100 text-red-800';
            montoColor = 'text-red-600';
          } else if (tienePendientes) {
            borderColor = 'border-yellow-500';
            estadoTexto = 'Pendiente';
            estadoColor = 'bg-yellow-100 text-yellow-800';
            montoColor = 'text-yellow-600';
          }
                            
                            return (
            <div
              key={residente._id}
              className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${borderColor} hover:shadow-lg transition-shadow cursor-pointer`}
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
                    {mesesPendientesCount} mes(es) pendiente(s)
                  </p>
                  <p className={`font-semibold ${montoColor}`}>
                    {formatCurrency(totalSaldo)}
                  </p>
                              </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColor}`}>
                  {estadoTexto}
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

            {/* Controles de modo de pago */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="modoPago"
                    checked={!modoAdelanto}
                    onChange={() => {
                      setModoAdelanto(false);
                      setSelectedMeses([]);
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">Pagos Pendientes</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="modoPago"
                    checked={modoAdelanto}
                    onChange={() => {
                      setModoAdelanto(true);
                      setSelectedMeses([]);
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">Pagos Adelantados</span>
                </label>
              </div>
              
              {modoAdelanto && (
                <div className="text-sm text-blue-600">
                  💡 Selecciona los meses que quieres adelantar del año actual
                </div>
              )}
            </div>

            <div className="mb-4">
              <button
                onClick={handleSeleccionarTodos}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {selectedMeses.length === (modoAdelanto ? generarMesesFuturos(selectedResidente).length : mesesPendientes.length) ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
              </button>
    </div>

            {/* Lista de meses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {(modoAdelanto ? generarMesesFuturos(selectedResidente) : mesesPendientes).map((mes) => {
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
                            {mes.esAdelanto && (
                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Adelanto
                              </span>
                            )}
            </p>
            <p className="text-sm text-gray-600">
                            {mes.existe ? 'Pago existente' : mes.esAdelanto ? 'Pago adelantado' : 'Pago a crear'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(total)}</p>
                        {mes.diasAtraso > 0 && !mes.esAdelanto && (
              <p className="text-sm text-red-600">
                            {mes.diasAtraso} días de atraso
              </p>
            )}
                        {recargo > 0 && !mes.esAdelanto && (
                          <p className="text-sm text-orange-600">
                            +{formatCurrency(recargo)} recargo
                          </p>
                        )}
                        {mes.esAdelanto && (
                          <p className="text-sm text-blue-600">
                            Pago adelantado
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
                  <p className="text-sm text-gray-600 mb-2">
                    Total a pagar: <span className="font-bold text-lg">{formatCurrency(calcularTotalSeleccionado())}</span>
                  </p>
                  {modoAdelanto && (
                    <p className="text-sm text-blue-600 mb-4">
                      💡 Pago adelantado - No se aplicarán recargos por atraso
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {selectedMeses.length} mes(es) seleccionado(s)
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

      {/* Modal de confirmación y comprobante */}
      {showSuccessMessage && comprobanteData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckIcon className="h-6 w-6 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Pago Registrado Exitosamente!
              </h2>
              
              <p className="text-gray-600 mb-6">
                Gracias por su pago. A continuación se muestra el comprobante:
              </p>
            </div>

            {/* Comprobante */}
            <div ref={comprobanteRef} className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6 max-w-md mx-auto">
              {/* Header del ticket */}
              <div className="text-center mb-6 border-b-2 border-dashed border-gray-400 pb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">COMPROBANTE DE PAGO</h3>
                <p className="text-sm text-gray-600">Administración de Condominios</p>
                <p className="text-xs text-gray-500">Fecha: {new Date().toLocaleDateString('es-ES')}</p>
                <p className="text-xs text-gray-500">Hora: {new Date().toLocaleTimeString('es-ES')}</p>
              </div>

              {/* Información del residente */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Residente:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {comprobanteData?.pagos?.[0]?.residente?.nombre} {comprobanteData?.pagos?.[0]?.residente?.apellidos}
                    </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Vivienda:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {comprobanteData?.pagos?.[0]?.vivienda?.numero}
                  </span>
              </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Dirección:</span>
                  <span className="text-sm text-gray-900">
                    {comprobanteData?.pagos?.[0]?.vivienda?.calle}
                  </span>
                </div>
              </div>

              {/* Detalle de pagos */}
              <div className="mb-4 border-t border-gray-300 pt-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3">DETALLE DE PAGOS:</h4>
                <div className="space-y-2">
                  {comprobanteData?.pagos?.map((pago, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-semibold">
                          {new Date(pago.año, pago.mes - 1).toLocaleDateString('es-ES', { 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </span>
                        {pago.recargo > 0 && (
                          <span className="text-xs text-red-600 ml-2">(+ recargo)</span>
                        )}
                      </div>
                      <span className="font-bold">{formatCurrency(pago.monto + (pago.recargo || 0))}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Información de pago */}
              <div className="mb-4 border-t border-gray-300 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Método de pago:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {comprobanteData?.pagos?.[0]?.metodoPago}
                  </span>
                </div>
                {comprobanteData?.pagos?.[0]?.referenciaPago && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">Referencia:</span>
                    <span className="text-sm font-bold text-gray-900">
                      {comprobanteData.pagos[0].referenciaPago}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Fecha de pago:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {new Date(comprobanteData?.pagos?.[0]?.fechaPago).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="border-t-2 border-dashed border-gray-400 pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>TOTAL PAGADO:</span>
                  <span className="text-green-600">{formatCurrency(comprobanteData?.totalPagado || 0)}</span>
                </div>
                {comprobanteData?.excedente > 0 && (
                  <div className="flex justify-between items-center text-sm text-blue-600 mt-1">
                    <span>Excedente:</span>
                    <span>{formatCurrency(comprobanteData.excedente)}</span>
                  </div>
                )}
              </div>

              {/* Footer del ticket */}
              <div className="text-center mt-6 pt-4 border-t border-gray-300">
                <p className="text-xs text-gray-500">¡Gracias por su pago!</p>
                <p className="text-xs text-gray-500">Conserve este comprobante</p>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={generarPDF}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                <span>Descargar PDF</span>
              </button>
              <button
                onClick={() => {
                  setShowSuccessMessage(false);
                  setComprobanteData(null);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Cerrar
              </button>
            </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default Pagos; 
