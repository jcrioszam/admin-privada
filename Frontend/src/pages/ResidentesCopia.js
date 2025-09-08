import React from 'react';

const ResidentesCopia = () => {
  console.log('🚀 Componente ResidentesCopia se está renderizando...');
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Residentes - Copia de Prueba</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-700">
          Este es un componente de prueba para verificar si el problema está en el componente específico o en el routing.
        </p>
        <p className="text-green-600 mt-2">
          Si ves este mensaje, el componente se está renderizando correctamente.
        </p>
      </div>
    </div>
  );
};

export default ResidentesCopia;
