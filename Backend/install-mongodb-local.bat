@echo off
echo ========================================
echo Instalando MongoDB Local...
echo ========================================

echo.
echo 1. Descargando MongoDB Community Server...
echo Visita: https://www.mongodb.com/try/download/community
echo.
echo 2. Instala MongoDB con las opciones por defecto
echo.
echo 3. Creando directorio de datos...
if not exist "C:\data\db" mkdir "C:\data\db"

echo.
echo 4. Iniciando MongoDB...
echo Para iniciar MongoDB manualmente ejecuta:
echo "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
echo.
echo 5. Para que MongoDB inicie automáticamente:
echo - Abre Servicios (services.msc)
echo - Busca "MongoDB"
echo - Configura como "Automático"
echo.
echo ========================================
echo Instalacion completada!
echo ========================================
echo.
echo Para verificar que funciona:
echo mongo
echo.
pause 