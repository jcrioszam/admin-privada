import React from 'react';

const ResidentesTest = () => {
  try {
    console.log('🚀 Componente ResidentesTest se está renderizando...');
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Residentes - Test</h1>
            <p className="mt-1 text-sm text-gray-500">
              Componente de prueba para verificar renderizado
            </p>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <p>Este es un componente de prueba para verificar que la navegación funciona.</p>
          <p>Si ves este mensaje, el problema está en el componente original.</p>
        </div>
      </div>
    );
  } catch (error) {
    console.error('❌ Error en ResidentesTest:', error);
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Error en ResidentesTest</h1>
        <p className="text-red-600">Error: {error.message}</p>
      </div>
    );
  }
};

export default ResidentesTest;
