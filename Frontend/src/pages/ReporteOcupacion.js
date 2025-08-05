import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ReporteOcupacion = () => {
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState('todas');

  // Obtener viviendas con residentes
  const { data: viviendas, isLoading: isLoadingViviendas } = useQuery({
    queryKey: ['viviendas-ocupacion'],
    queryFn: async () => {
      try {
        console.log('🔍 Intentando obtener viviendas para reporte de ocupación...');
        const response = await api.get('/api/viviendas');
        console.log('✅ Viviendas obtenidas para reporte:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Error cargando viviendas para reporte:', error);
        throw error;
      }
    }
  });

  // Obtener residentes
  const { data: residentes, isLoading: isLoadingResidentes } = useQuery({
    queryKey: ['residentes-ocupacion'],
    queryFn: async () => {
      try {
        console.log('🔍 Intentando obtener residentes para reporte de ocupación...');
        const response = await api.get('/api/residentes');
        console.log('✅ Residentes obtenidos para reporte:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Error cargando residentes para reporte:', error);
        throw error;
      }
    }
  });

  // Función para calcular tiempo de ocupación
  const calcularTiempoOcupacion = (fechaInicio) => {
    if (!fechaInicio) return null;
    
    const inicio = new Date(fechaInicio);
    const ahora = new Date();
    const diferencia = ahora - inicio;
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    
    if (dias < 30) return `${dias} días`;
    if (dias < 365) return `${Math.floor(dias / 30)} meses`;
    return `${Math.floor(dias / 365)} años`;
  };

  // Función para calcular tiempo promedio de ocupación
  const calcularTiempoPromedioOcupacion = (viviendasOcupadas) => {
    const tiempos = viviendasOcupadas
      .map(v => v.tiempoOcupacion)
      .filter(tiempo => tiempo !== null);
    
    if (tiempos.length === 0) return 'N/A';
    
    // Convertir a días para calcular promedio
    const diasPromedio = tiempos.reduce((sum, tiempo) => {
      if (tiempo.includes('años')) {
        return sum + (parseInt(tiempo) * 365);
      } else if (tiempo.includes('meses')) {
        return sum + (parseInt(tiempo) * 30);
      } else {
        return sum + parseInt(tiempo);
      }
    }, 0) / tiempos.length;
    
    if (diasPromedio < 30) return `${Math.round(diasPromedio)} días`;
    if (diasPromedio < 365) return `${Math.round(diasPromedio / 30)} meses`;
    return `${Math.round(diasPromedio / 365)} años`;
  };

  // Calcular estadísticas de ocupación
  const estadisticasOcupacion = useMemo(() => {
    if (!viviendas || !residentes) return null;

    console.log('🔍 Analizando datos para reporte de ocupación...');
    console.log('📊 Viviendas disponibles:', viviendas);
    console.log('👥 Residentes disponibles:', residentes);

    const viviendasConResidentes = viviendas.map(vivienda => {
      // Buscar residente que coincida con esta vivienda
      let residente = null;
      
      // Primero buscar por el residente que ya está en la vivienda
      if (vivienda.residente) {
        residente = vivienda.residente;
        console.log(`🏠 Vivienda ${vivienda.numero}: Usando residente existente en vivienda`);
      } else {
        // Si no hay residente en la vivienda, buscar en la lista de residentes
        residente = residentes.find(r => {
          if (!r.vivienda) return false;
          
          // Verificar múltiples formas de coincidencia
          const coincidePorId = r.vivienda._id === vivienda._id;
          const coincidePorReferencia = r.vivienda === vivienda._id;
          const coincidePorNumero = r.vivienda.numero === vivienda.numero;
          
          return coincidePorId || coincidePorReferencia || coincidePorNumero;
        });
        
        if (residente) {
          console.log(`🏠 Vivienda ${vivienda.numero}: Encontrado residente en lista separada`);
        } else {
          console.log(`🏠 Vivienda ${vivienda.numero}: No se encontró residente`);
        }
      }
      
      console.log(`🏠 Vivienda ${vivienda.numero}:`, { 
        viviendaId: vivienda._id, 
        residenteEncontrado: !!residente,
        residenteId: residente?._id,
        fechaIngreso: residente?.fechaIngreso,
        tipoResidente: residente?.tipo,
        nombreResidente: residente?.nombre
      });
      
      return {
        ...vivienda,
        residente,
        ocupada: !!residente,
        tiempoOcupacion: residente ? calcularTiempoOcupacion(residente.fechaIngreso) : null
      };
    });

    const viviendasOcupadas = viviendasConResidentes.filter(v => v.ocupada);
    const viviendasVacias = viviendasConResidentes.filter(v => !v.ocupada);
    const viviendasPropietarias = viviendasConResidentes.filter(v => v.residente?.tipo === 'Dueño');
    const viviendasInquilinas = viviendasConResidentes.filter(v => v.residente?.tipo === 'Inquilino');

    console.log('✅ Estadísticas calculadas:', {
      totalViviendas: viviendasConResidentes.length,
      viviendasOcupadas: viviendasOcupadas.length,
      viviendasVacias: viviendasVacias.length,
      viviendasPropietarias: viviendasPropietarias.length,
      viviendasInquilinas: viviendasInquilinas.length
    });

    return {
      totalViviendas: viviendasConResidentes.length,
      viviendasOcupadas: viviendasOcupadas.length,
      viviendasVacias: viviendasVacias.length,
      viviendasPropietarias: viviendasPropietarias.length,
      viviendasInquilinas: viviendasInquilinas.length,
      porcentajeOcupacion: ((viviendasOcupadas.length / viviendasConResidentes.length) * 100).toFixed(1),
      tiempoPromedioOcupacion: calcularTiempoPromedioOcupacion(viviendasOcupadas),
      viviendasConResidentes
    };
  }, [viviendas, residentes]);

  // Filtrar viviendas según criterios
  const viviendasFiltradas = useMemo(() => {
    if (!estadisticasOcupacion) return [];

    let filtradas = estadisticasOcupacion.viviendasConResidentes;

    // Filtro por estado
    if (filtroEstado === 'ocupadas') {
      filtradas = filtradas.filter(v => v.ocupada);
    } else if (filtroEstado === 'vacias') {
      filtradas = filtradas.filter(v => !v.ocupada);
    }

    // Filtro por tipo
    if (filtroTipo === 'propietarios') {
      filtradas = filtradas.filter(v => v.residente?.tipo === 'Dueño');
    } else if (filtroTipo === 'inquilinos') {
      filtradas = filtradas.filter(v => v.residente?.tipo === 'Inquilino');
    }

    return filtradas.sort((a, b) => parseInt(a.numero) - parseInt(b.numero));
  }, [estadisticasOcupacion, filtroEstado, filtroTipo]);

  // Función para imprimir reporte
  const imprimirReporte = () => {
    if (!estadisticasOcupacion) return;

    const contenido = `
      <html>
        <head>
          <title>Reporte de Ocupación</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .stats { display: flex; justify-content: space-around; margin-bottom: 30px; }
            .stat { text-align: center; padding: 10px; border: 1px solid #ccc; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .ocupada { color: green; font-weight: bold; }
            .vacia { color: red; }
            .propietario { background-color: #e8f5e8; }
            .inquilino { background-color: #fff3cd; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reporte de Ocupación</h1>
            <p>Fecha del reporte: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          </div>
          
          <div class="stats">
            <div class="stat">
              <h3>${estadisticasOcupacion.totalViviendas}</h3>
              <p>Total Viviendas</p>
            </div>
            <div class="stat">
              <h3>${estadisticasOcupacion.viviendasOcupadas}</h3>
              <p>Ocupadas</p>
            </div>
            <div class="stat">
              <h3>${estadisticasOcupacion.viviendasVacias}</h3>
              <p>Vacías</p>
            </div>
            <div class="stat">
              <h3>${estadisticasOcupacion.porcentajeOcupacion}%</h3>
              <p>Ocupación</p>
            </div>
          </div>

          <h2>Desglose por Tipo</h2>
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              <tr class="propietario">
                <td>Propietarios</td>
                <td>${estadisticasOcupacion.viviendasPropietarias}</td>
                <td>${((estadisticasOcupacion.viviendasPropietarias / estadisticasOcupacion.totalViviendas) * 100).toFixed(1)}%</td>
              </tr>
              <tr class="inquilino">
                <td>Inquilinos</td>
                <td>${estadisticasOcupacion.viviendasInquilinas}</td>
                <td>${((estadisticasOcupacion.viviendasInquilinas / estadisticasOcupacion.totalViviendas) * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td>Vacías</td>
                <td>${estadisticasOcupacion.viviendasVacias}</td>
                <td>${((estadisticasOcupacion.viviendasVacias / estadisticasOcupacion.totalViviendas) * 100).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>

          <h2>Detalle de Viviendas</h2>
          <table>
            <thead>
              <tr>
                <th>Vivienda</th>
                <th>Estado</th>
                <th>Residente</th>
                <th>Tipo</th>
                <th>Teléfono</th>
                <th>Tiempo Ocupación</th>
              </tr>
            </thead>
            <tbody>
              ${viviendasFiltradas.map(vivienda => `
                <tr class="${vivienda.ocupada ? 'ocupada' : 'vacia'}">
                  <td>${vivienda.numero}</td>
                  <td>${vivienda.ocupada ? 'Ocupada' : 'Vacía'}</td>
                  <td>${vivienda.residente?.nombre || 'N/A'}</td>
                  <td>${vivienda.residente?.tipo || 'N/A'}</td>
                  <td>${vivienda.residente?.telefono || 'N/A'}</td>
                  <td>${vivienda.tiempoOcupacion || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const ventana = window.open('', '_blank');
    ventana.document.write(contenido);
    ventana.document.close();
    ventana.print();
  };

  if (isLoadingViviendas || isLoadingResidentes) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Reporte de Ocupación</h1>
        <button
          onClick={imprimirReporte}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir Reporte
        </button>
      </div>

      {/* Estadísticas */}
      {estadisticasOcupacion && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-blue-600">{estadisticasOcupacion.totalViviendas}</h3>
            <p className="text-blue-700">Total Viviendas</p>
          </div>
          <div className="bg-green-100 border border-green-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-green-600">{estadisticasOcupacion.viviendasOcupadas}</h3>
            <p className="text-green-700">Ocupadas</p>
          </div>
          <div className="bg-red-100 border border-red-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-red-600">{estadisticasOcupacion.viviendasVacias}</h3>
            <p className="text-red-700">Vacías</p>
          </div>
          <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
            <h3 className="text-2xl font-bold text-purple-600">{estadisticasOcupacion.porcentajeOcupacion}%</h3>
            <p className="text-purple-700">Ocupación</p>
          </div>
        </div>
      )}

      {/* Desglose por tipo */}
      {estadisticasOcupacion && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Propietarios</h3>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {estadisticasOcupacion.viviendasPropietarias}
            </div>
            <p className="text-sm text-gray-600">
              {((estadisticasOcupacion.viviendasPropietarias / estadisticasOcupacion.totalViviendas) * 100).toFixed(1)}% del total
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Inquilinos</h3>
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {estadisticasOcupacion.viviendasInquilinas}
            </div>
            <p className="text-sm text-gray-600">
              {((estadisticasOcupacion.viviendasInquilinas / estadisticasOcupacion.totalViviendas) * 100).toFixed(1)}% del total
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Tiempo Promedio</h3>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {estadisticasOcupacion.tiempoPromedioOcupacion}
            </div>
            <p className="text-sm text-gray-600">Ocupación promedio</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="todas">Todas</option>
              <option value="ocupadas">Ocupadas</option>
              <option value="vacias">Vacías</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="todas">Todos</option>
              <option value="propietarios">Propietarios</option>
              <option value="inquilinos">Inquilinos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de viviendas */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Detalle de Viviendas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vivienda
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Residente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiempo Ocupación
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {viviendasFiltradas.map((vivienda) => (
                <tr key={vivienda._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {vivienda.numero}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      vivienda.ocupada 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {vivienda.ocupada ? 'Ocupada' : 'Vacía'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vivienda.residente?.nombre || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {vivienda.residente?.tipo ? (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        vivienda.residente.tipo === 'Dueño'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {vivienda.residente.tipo}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vivienda.residente?.telefono || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vivienda.tiempoOcupacion || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viviendasFiltradas.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron viviendas con los filtros aplicados.
        </div>
      )}
    </div>
  );
};

export default ReporteOcupacion; 