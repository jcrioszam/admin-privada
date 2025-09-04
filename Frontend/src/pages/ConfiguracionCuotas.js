import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { 
  CurrencyDollarIcon, 
  HomeIcon, 
  CogIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

const ConfiguracionCuotas = () => {
  const [selectedViviendas, setSelectedViviendas] = useState([]);
  const [tipoCuotaSeleccionado, setTipoCuotaSeleccionado] = useState('Estandar');
  const [montoPersonalizado, setMontoPersonalizado] = useState('');
  const [editingVivienda, setEditingVivienda] = useState(null);
  const [montoEdicion, setMontoEdicion] = useState('');
  const queryClient = useQueryClient();

  // Obtener configuración de cuotas
  const { data: configuracion, isLoading, error } = useQuery({
    queryKey: ['configuracion-cuotas'],
    queryFn: async () => {
      const response = await api.get('/viviendas/configuracion/cuotas');
      return response.data;
    }
  });

  // Mutación para actualizar cuota individual
  const actualizarCuotaMutation = useMutation({
    mutationFn: async ({ viviendaId, cuotaMantenimiento, tipoCuota }) => {
      const response = await api.put(`/viviendas/${viviendaId}/cuota`, {
        cuotaMantenimiento,
        tipoCuota
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['configuracion-cuotas']);
      setEditingVivienda(null);
      setMontoEdicion('');
    }
  });

  // Mutación para actualización masiva
  const actualizacionMasivaMutation = useMutation({
    mutationFn: async ({ tipoCuota, cuotaMantenimiento, viviendas }) => {
      const response = await api.put('/viviendas/configuracion/cuotas-masivo', {
        tipoCuota,
        cuotaMantenimiento,
        viviendas
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['configuracion-cuotas']);
      setSelectedViviendas([]);
      setMontoPersonalizado('');
    }
  });

  const handleSelectVivienda = (viviendaId) => {
    setSelectedViviendas(prev => 
      prev.includes(viviendaId) 
        ? prev.filter(id => id !== viviendaId)
        : [...prev, viviendaId]
    );
  };

  const handleSelectAll = () => {
    if (selectedViviendas.length === configuracion?.viviendas.length) {
      setSelectedViviendas([]);
    } else {
      setSelectedViviendas(configuracion?.viviendas.map(v => v._id) || []);
    }
  };

  const handleActualizacionMasiva = () => {
    if (selectedViviendas.length === 0) {
      alert('Selecciona al menos una vivienda');
      return;
    }

    const cuotaMantenimiento = montoPersonalizado || 
      configuracion?.tiposCuota.find(t => t.valor === tipoCuotaSeleccionado)?.monto;

    if (!cuotaMantenimiento) {
      alert('Selecciona un tipo de cuota o ingresa un monto personalizado');
      return;
    }

    actualizacionMasivaMutation.mutate({
      tipoCuota: tipoCuotaSeleccionado,
      cuotaMantenimiento: Number(cuotaMantenimiento),
      viviendas: selectedViviendas
    });
  };

  const handleEditarVivienda = (vivienda) => {
    setEditingVivienda(vivienda._id);
    setMontoEdicion(vivienda.cuotaMantenimiento.toString());
  };

  const handleGuardarEdicion = () => {
    if (!montoEdicion || isNaN(montoEdicion)) {
      alert('Ingresa un monto válido');
      return;
    }

    const vivienda = configuracion.viviendas.find(v => v._id === editingVivienda);
    if (!vivienda) return;

    actualizarCuotaMutation.mutate({
      viviendaId: editingVivienda,
      cuotaMantenimiento: Number(montoEdicion),
      tipoCuota: vivienda.tipoCuota
    });
  };

  const getTipoCuotaInfo = (tipoCuota) => {
    return configuracion?.tiposCuota.find(t => t.valor === tipoCuota) || 
           { nombre: 'No definido', monto: 0 };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">Error al cargar la configuración de cuotas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <CogIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración de Cuotas</h1>
            <p className="text-gray-600">Gestiona los montos de mantenimiento por vivienda</p>
          </div>
        </div>
      </div>

      {/* Actualización Masiva */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <HomeIcon className="h-5 w-5 mr-2" />
          Actualización Masiva
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Cuota
            </label>
            <select
              value={tipoCuotaSeleccionado}
              onChange={(e) => setTipoCuotaSeleccionado(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {configuracion?.tiposCuota.map(tipo => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.nombre} (${tipo.monto})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto Personalizado (opcional)
            </label>
            <input
              type="number"
              value={montoPersonalizado}
              onChange={(e) => setMontoPersonalizado(e.target.value)}
              placeholder="Dejar vacío para usar el monto del tipo"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleActualizacionMasiva}
              disabled={actualizacionMasivaMutation.isPending || selectedViviendas.length === 0}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {actualizacionMasivaMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                  Actualizar Seleccionadas
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleSelectAll}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {selectedViviendas.length === configuracion?.viviendas.length ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
          </button>
          <span className="text-sm text-gray-600">
            {selectedViviendas.length} vivienda(s) seleccionada(s)
          </span>
        </div>
      </div>

      {/* Lista de Viviendas */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Viviendas</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedViviendas.length === configuracion?.viviendas.length && configuracion?.viviendas.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vivienda
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo de Cuota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {configuracion?.viviendas.map((vivienda) => {
                const tipoInfo = getTipoCuotaInfo(vivienda.tipoCuota);
                const isSelected = selectedViviendas.includes(vivienda._id);
                const isEditing = editingVivienda === vivienda._id;
                
                return (
                  <tr key={vivienda._id} className={isSelected ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectVivienda(vivienda._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <HomeIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          Vivienda {vivienda.numero}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        vivienda.tipoCuota === 'Estandar' ? 'bg-blue-100 text-blue-800' :
                        vivienda.tipoCuota === 'Economica' ? 'bg-green-100 text-green-800' :
                        vivienda.tipoCuota === 'Premium' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {tipoInfo.nombre}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={montoEdicion}
                            onChange={(e) => setMontoEdicion(e.target.value)}
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={handleGuardarEdicion}
                            disabled={actualizarCuotaMutation.isPending}
                            className="text-green-600 hover:text-green-800"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingVivienda(null);
                              setMontoEdicion('');
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            ${vivienda.cuotaMantenimiento}
                          </span>
                          <button
                            onClick={() => handleEditarVivienda(vivienda)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {actualizarCuotaMutation.isPending && editingVivienda === vivienda._id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Configuración</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {configuracion?.tiposCuota.map(tipo => {
            const count = configuracion.viviendas.filter(v => v.tipoCuota === tipo.valor).length;
            return (
              <div key={tipo.valor} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{tipo.nombre}</span>
                  <span className="text-2xl font-bold text-blue-600">${tipo.monto}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{count} vivienda(s)</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionCuotas;
