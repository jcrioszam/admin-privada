@echo off
echo ========================================
echo Instalando dependencias de Electron...
echo ========================================

echo.
echo Instalando dependencias de desarrollo...
npm install --save-dev electron electron-builder concurrently wait-on electron-is-dev

echo.
echo ========================================
echo Instalacion completada!
echo ========================================
echo.
echo Para ejecutar la aplicacion de escritorio:
echo npm run electron-dev
echo.
echo Para crear el ejecutable:
echo npm run dist
echo.
pause 