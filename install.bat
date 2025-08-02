@echo off
echo ========================================
echo Instalando Sistema de Admin Privada
echo ========================================

echo.
echo Instalando dependencias del Backend...
cd Backend
call npm install
if %errorlevel% neq 0 (
    echo Error al instalar dependencias del Backend
    pause
    exit /b 1
)

echo.
echo Instalando dependencias del Frontend...
cd ../Frontend
call npm install
if %errorlevel% neq 0 (
    echo Error al instalar dependencias del Frontend
    pause
    exit /b 1
)

echo.
echo ========================================
echo Instalacion completada exitosamente!
echo ========================================
echo.
echo Para ejecutar la aplicacion:
echo.
echo 1. Iniciar MongoDB
echo 2. En una terminal: cd Backend && npm run dev
echo 3. En otra terminal: cd Frontend && npm start
echo.
echo La aplicacion estara disponible en:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:5000
echo.
pause 