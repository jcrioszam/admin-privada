@echo off
echo ========================================
echo Iniciando Admin Privada - Modo Local
echo ========================================

echo.
echo 1. Verificando MongoDB local...
echo.

REM Verificar si MongoDB está ejecutándose
netstat -an | findstr ":27017" >nul
if %errorlevel% equ 0 (
    echo ✅ MongoDB local está ejecutándose
) else (
    echo ❌ MongoDB local NO está ejecutándose
    echo.
    echo Por favor inicia MongoDB:
    echo 1. Abre Servicios (services.msc)
    echo 2. Busca "MongoDB"
    echo 3. Inicia el servicio
    echo.
    echo O ejecuta manualmente:
    echo "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
    echo.
    pause
    exit /b 1
)

echo.
echo 2. Cambiando a configuración local...
copy config-local.env config.env >nul

echo.
echo 3. Instalando dependencias...
npm install

echo.
echo 4. Iniciando servidor...
echo.
echo 🌐 Servidor: http://localhost:5000
echo 📊 Base de datos: MongoDB Local
echo 🔒 Modo: Offline (Sin internet)
echo.
echo Para detener: Ctrl+C
echo.

npm start 