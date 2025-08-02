@echo off
echo 🚀 Iniciando despliegue en la nube...
echo.

echo 📋 Pasos para desplegar en la nube:
echo.
echo 1. MongoDB Atlas:
echo    - Ve a https://www.mongodb.com/atlas
echo    - Crea una cuenta gratuita
echo    - Crea un cluster gratuito
echo    - Obtén la URL de conexión
echo.
echo 2. Render - Backend:
echo    - Ve a https://render.com
echo    - Crea una cuenta gratuita
echo    - Haz clic en "New +" ^> "Web Service"
echo    - Conecta tu repositorio de GitHub
echo    - Configuración:
echo      * Root Directory: Backend
echo      * Build Command: npm install
echo      * Start Command: npm start
echo    - Variables de entorno:
echo      * NODE_ENV=production
echo      * MONGODB_URI=tu_url_de_mongodb
echo      * JWT_SECRET=tu_secreto_jwt
echo      * PORT=10000
echo.
echo 3. Render - Frontend:
echo    - En Render, haz clic en "New +" ^> "Static Site"
echo    - Conecta el mismo repositorio
echo    - Configuración:
echo      * Root Directory: Frontend
echo      * Build Command: npm install ^&^& npm run build
echo      * Publish Directory: build
echo    - Variables de entorno:
echo      * REACT_APP_API_URL=https://tu-backend-url.onrender.com
echo.
echo 4. Configurar base de datos:
echo    Una vez desplegado, ejecuta:
echo    curl -X POST https://tu-backend.onrender.com/api/usuarios/crear-admin
echo    curl -X POST https://tu-backend.onrender.com/api/configuracion -H "Content-Type: application/json" -d "{\"cuotaMantenimientoMensual\": 500}"
echo.
echo 5. Credenciales por defecto:
echo    - Email: admin@admin.com
echo    - Contraseña: admin123
echo.
echo ✅ ¡Tu aplicación estará disponible en la URL del frontend!
echo.
pause 