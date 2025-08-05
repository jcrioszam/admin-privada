# 🚀 Despliegue en Render - Guía Completa

## 🎯 **¿Por qué Render?**

### **✅ Ventajas:**
- **Gratis** para proyectos pequeños
- **Soporte nativo** para Node.js y MongoDB
- **Despliegue automático** desde GitHub
- **SSL gratuito**
- **Muy fácil de configurar**
- **Excelente documentación**

### **💰 Precios:**
```
Plan Gratuito:
- 750 horas/mes
- 512MB RAM
- MongoDB incluido
- SSL gratuito

Plan Pago: $7 USD/mes
- Sin límites
- 1GB RAM
- MongoDB incluido
```

---

## 🚀 **Paso 1: Preparar el Proyecto**

### **1.1 Crear archivo render.yaml**
```yaml
services:
  - type: web
    name: admin-privada-backend
    env: node
    plan: free
    buildCommand: cd Backend && npm install
    startCommand: cd Backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: JWT_SECRET
        generateValue: true
      - key: MONGODB_URI
        fromDatabase:
          name: admin-privada-db
          property: connectionString

  - type: web
    name: admin-privada-frontend
    env: static
    plan: free
    buildCommand: cd Frontend && npm install && npm run build
    staticPublishPath: ./Frontend/build
    envVars:
      - key: REACT_APP_API_URL
        value: https://admin-privada-backend.onrender.com

databases:
  - name: admin-privada-db
    databaseName: fraccionamiento
    plan: free
```

### **1.2 Modificar configuración del frontend**
```javascript
// Frontend/src/services/api.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});
```

---

## 📁 **Paso 2: Subir a GitHub**

### **2.1 Crear repositorio en GitHub**
```bash
# Inicializar git
git init
git add .
git commit -m "Preparar para despliegue en Render"

# Crear repositorio en GitHub y subir
git remote add origin https://github.com/tu-usuario/admin-privada.git
git push -u origin main
```

---

## 🌐 **Paso 3: Configurar Render**

### **3.1 Crear cuenta en Render**
1. **Ir a:** https://render.com
2. **Registrarse** con GitHub
3. **Conectar** tu repositorio

### **3.2 Crear Base de Datos**
1. **Ir a:** "New" → "PostgreSQL"
2. **Configurar:**
   - **Name:** admin-privada-db
   - **Database:** fraccionamiento
   - **Plan:** Free

### **3.3 Crear Servicio Backend**
1. **Ir a:** "New" → "Web Service"
2. **Conectar** tu repositorio de GitHub
3. **Configurar:**
   - **Name:** admin-privada-backend
   - **Environment:** Node
   - **Build Command:** `cd Backend && npm install`
   - **Start Command:** `cd Backend && npm start`
   - **Plan:** Free

### **3.4 Configurar Variables de Entorno**
```env
NODE_ENV=production
PORT=10000
JWT_SECRET=tu_secreto_super_seguro_2024
MONGODB_URI=mongodb://localhost:27017/fraccionamiento
```

### **3.5 Crear Servicio Frontend**
1. **Ir a:** "New" → "Static Site"
2. **Conectar** tu repositorio de GitHub
3. **Configurar:**
   - **Name:** admin-privada-frontend
   - **Build Command:** `cd Frontend && npm install && npm run build`
   - **Publish Directory:** `Frontend/build`
   - **Plan:** Free

---

## 🔧 **Paso 4: Configurar CORS**

### **4.1 Modificar Backend/server.js**
```javascript
// Middleware CORS más permisivo
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como mobile apps o Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://admin-privada-frontend.onrender.com',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

---

## 🚀 **Paso 5: Desplegar**

### **5.1 Desplegar Backend**
1. **Ir al servicio backend** en Render
2. **Hacer clic en "Deploy"**
3. **Esperar** a que termine el despliegue
4. **Copiar la URL** del backend

### **5.2 Configurar Frontend**
1. **Ir al servicio frontend** en Render
2. **Agregar variable de entorno:**
   ```
   REACT_APP_API_URL=https://admin-privada-backend.onrender.com
   ```
3. **Hacer clic en "Deploy"**

### **5.3 Verificar Despliegue**
1. **Backend:** https://admin-privada-backend.onrender.com
2. **Frontend:** https://admin-privada-frontend.onrender.com
3. **Health Check:** https://admin-privada-backend.onrender.com/health

---

## 🔒 **Paso 6: Configurar Dominio Personalizado**

### **6.1 En Render:**
1. **Ir al servicio frontend**
2. **Sección "Settings"**
3. **"Custom Domains"**
4. **Agregar tu dominio**

### **6.2 Configurar DNS:**
```
Tipo: CNAME
Nombre: @
Valor: admin-privada-frontend.onrender.com
TTL: 300
```

---

## 📊 **Paso 7: Monitoreo**

### **7.1 Verificar Logs**
1. **Ir al servicio backend**
2. **Pestaña "Logs"**
3. **Verificar** que no hay errores

### **7.2 Verificar Base de Datos**
1. **Ir a la base de datos**
2. **Pestaña "Connect"**
3. **Verificar** conexión

---

## 🛠️ **Solución de Problemas**

### **Error: "Build failed"**
```bash
# Verificar package.json
# Asegurar que todas las dependencias están listadas
npm install
```

### **Error: "CORS error"**
```javascript
// Verificar configuración CORS en server.js
// Asegurar que la URL del frontend está en allowedOrigins
```

### **Error: "Database connection failed"**
```bash
# Verificar variable MONGODB_URI
# Asegurar que la base de datos está creada
```

---

## 💰 **Costos Finales**

### **Render Gratuito:**
- **Backend:** $0/mes
- **Frontend:** $0/mes
- **Base de datos:** $0/mes
- **SSL:** Gratuito
- **Dominio:** $10-15 USD/año (opcional)

### **Total:** $0 USD/mes (con límites)

---

## 🎉 **¡Listo para Producción!**

### **URLs de Acceso:**
- **Frontend:** https://admin-privada-frontend.onrender.com
- **Backend:** https://admin-privada-backend.onrender.com
- **API:** https://admin-privada-backend.onrender.com/api

### **Ventajas del Despliegue:**
- ✅ **Completamente gratuito**
- ✅ **SSL automático**
- ✅ **Despliegue automático**
- ✅ **Base de datos incluida**
- ✅ **Muy fácil de mantener**

¡Tu sistema está listo para producción en Render! 🚀 