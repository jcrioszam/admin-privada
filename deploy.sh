#!/bin/bash

echo "🚀 Iniciando proceso de despliegue..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "README.md" ]; then
    print_error "Debes ejecutar este script desde el directorio raíz del proyecto"
    exit 1
fi

print_status "Verificando estructura del proyecto..."

# Verificar que existen los directorios necesarios
if [ ! -d "Backend" ] || [ ! -d "Frontend" ]; then
    print_error "No se encontraron los directorios Backend y Frontend"
    exit 1
fi

print_status "Estructura del proyecto verificada ✅"

# Verificar que los archivos de configuración existen
if [ ! -f "Backend/render.yaml" ] || [ ! -f "Frontend/render.yaml" ]; then
    print_error "Faltan archivos de configuración para Render"
    print_warning "Asegúrate de que Backend/render.yaml y Frontend/render.yaml existan"
    exit 1
fi

print_status "Archivos de configuración verificados ✅"

# Verificar que estamos en un repositorio Git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_warning "No se detectó un repositorio Git"
    print_status "Inicializando repositorio Git..."
    git init
    git add .
    git commit -m "Initial commit for deployment"
fi

print_status "Repositorio Git verificado ✅"

# Mostrar instrucciones de despliegue
echo ""
echo "📋 INSTRUCCIONES PARA EL DESPLIEGUE:"
echo "======================================"
echo ""
echo "1. 🗄️  CONFIGURAR MONGODB ATLAS:"
echo "   - Ve a https://www.mongodb.com/atlas"
echo "   - Crea una cuenta gratuita"
echo "   - Crea un cluster gratuito"
echo "   - Obtén la URL de conexión"
echo ""
echo "2. ☁️  DESPLEGAR BACKEND EN RENDER:"
echo "   - Ve a https://render.com"
echo "   - Crea una cuenta gratuita"
echo "   - Haz clic en 'New +' → 'Web Service'"
echo "   - Conecta tu repositorio de GitHub"
echo "   - Configura las variables de entorno:"
echo "     * NODE_ENV=production"
echo "     * MONGODB_URI=tu_url_de_mongodb"
echo "     * JWT_SECRET=tu_secreto_jwt"
echo "     * PORT=10000"
echo "   - Build Command: npm install"
echo "   - Start Command: npm start"
echo "   - Root Directory: Backend"
echo ""
echo "3. 🌐 DESPLEGAR FRONTEND EN RENDER:"
echo "   - En Render, haz clic en 'New +' → 'Static Site'"
echo "   - Conecta el mismo repositorio"
echo "   - Variable de entorno:"
echo "     * REACT_APP_API_URL=https://tu-backend-url.onrender.com"
echo "   - Build Command: npm install && npm run build"
echo "   - Publish Directory: build"
echo "   - Root Directory: Frontend"
echo ""
echo "4. 🔧 CONFIGURAR BASE DE DATOS:"
echo "   - Una vez desplegado, ejecuta:"
echo "   curl -X POST https://tu-backend.onrender.com/api/usuarios/crear-admin"
echo ""
echo "5. 🧪 PROBAR LA APLICACIÓN:"
echo "   - Ve a la URL del frontend"
echo "   - Inicia sesión con: admin@admin.com / admin123"
echo ""
echo "📖 Para más detalles, consulta DEPLOYMENT.md"
echo ""
print_status "¡Listo para desplegar! 🚀" 