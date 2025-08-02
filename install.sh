#!/bin/bash

echo "========================================"
echo "Instalando Sistema de Admin Privada"
echo "========================================"

echo ""
echo "Instalando dependencias del Backend..."
cd Backend
npm install
if [ $? -ne 0 ]; then
    echo "Error al instalar dependencias del Backend"
    exit 1
fi

echo ""
echo "Instalando dependencias del Frontend..."
cd ../Frontend
npm install
if [ $? -ne 0 ]; then
    echo "Error al instalar dependencias del Frontend"
    exit 1
fi

echo ""
echo "========================================"
echo "Instalacion completada exitosamente!"
echo "========================================"
echo ""
echo "Para ejecutar la aplicacion:"
echo ""
echo "1. Iniciar MongoDB"
echo "2. En una terminal: cd Backend && npm run dev"
echo "3. En otra terminal: cd Frontend && npm start"
echo ""
echo "La aplicacion estara disponible en:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:5000"
echo "" 