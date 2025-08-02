import React from 'react';
import { useNavigate } from 'react-router-dom';

const TestNavigation = () => {
  const navigate = useNavigate();

  const handleClick = (path) => {
    console.log('Test click:', path);
    alert(`Navegando a: ${path}`);
    navigate(path);
  };

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-4">Test Navigation</h3>
      <div className="space-y-2">
        <button
          onClick={() => handleClick('/dashboard')}
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Dashboard
        </button>
        <button
          onClick={() => handleClick('/viviendas')}
          className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Viviendas
        </button>
        <button
          onClick={() => handleClick('/residentes')}
          className="w-full p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Residentes
        </button>
      </div>
    </div>
  );
};

export default TestNavigation; 