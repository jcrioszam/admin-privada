@echo off
echo ========================================
echo Migrando datos de Atlas a Local
echo ========================================

echo.
echo ⚠️  ADVERTENCIA: Este proceso migrará todos los datos
echo    de MongoDB Atlas a MongoDB local.
echo.
echo ¿Estás seguro de continuar? (S/N)
set /p confirm=

if /i "%confirm%"=="S" (
    echo.
    echo 🔄 Iniciando migración...
    echo.
    
    echo 1. Verificando MongoDB local...
    netstat -an | findstr ":27017" >nul
    if %errorlevel% neq 0 (
        echo ❌ MongoDB local NO está ejecutándose
        echo Por favor inicia MongoDB primero
        pause
        exit /b 1
    )
    
    echo ✅ MongoDB local está ejecutándose
    echo.
    
    echo 2. Ejecutando migración...
    node scripts/migrarDatosLocal.js
    
    echo.
    echo 3. Configurando para modo local...
    copy config-local.env config.env >nul
    
    echo.
    echo ✅ Migración completada!
    echo.
    echo Para iniciar en modo local:
    echo start-local.bat
    echo.
    
) else (
    echo.
    echo ❌ Migración cancelada
    echo.
)

pause 