# 🚀 Guía de Despliegue en la Nube

## 📋 **Requisitos Previos**

1. **Cuenta en MongoDB Atlas** (gratuita)
2. **Cuenta en Render** (gratuita)
3. **GitHub** para el repositorio

---

## 🗄️ **Paso 1: Configurar MongoDB Atlas**

### 1.1 Crear Cluster Gratuito
1. Ve a [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crea una cuenta gratuita
3. Crea un nuevo cluster (gratuito)
4. Configura la base de datos

### 1.2 Obtener Connection String
1. En tu cluster, haz clic en "Connect"
2. Selecciona "Connect your application"
3. Copia la URL de conexión
4. Reemplaza `<password>` con tu contraseña

**Ejemplo:**
```
mongodb+srv://usuario:password@cluster.mongodb.net/admin-privada?retryWrites=true&w=majority
```

---

## ☁️ **Paso 2: Desplegar Backend en Render**

### 2.1 Preparar Repositorio
1. Sube tu código a GitHub
2. Asegúrate de que el archivo `Backend/render.yaml` esté presente

### 2.2 Crear Servicio en Render
1. Ve a [Render](https://render.com)
2. Crea una cuenta gratuita
3. Haz clic en "New +" → "Web Service"
4. Conecta tu repositorio de GitHub

### 2.3 Configurar Variables de Entorno
En Render, agrega estas variables de entorno:

```
NODE_ENV=production
MONGODB_URI=tu_url_de_mongodb_atlas
JWT_SECRET=tu_secreto_jwt_super_seguro
PORT=10000
```

### 2.4 Configurar Build
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Root Directory:** `Backend`

### 2.5 Desplegar
1. Haz clic en "Create Web Service"
2. Espera a que se complete el despliegue
3. Copia la URL del backend (ej: `https://admin-privada-backend.onrender.com`)

---

## 🌐 **Paso 3: Desplegar Frontend en Render**

### 3.1 Crear Servicio Estático
1. En Render, haz clic en "New +" → "Static Site"
2. Conecta el mismo repositorio

### 3.2 Configurar Variables de Entorno
```
REACT_APP_API_URL=https://tu-backend-url.onrender.com
```

### 3.3 Configurar Build
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `build`
- **Root Directory:** `Frontend`

### 3.4 Desplegar
1. Haz clic en "Create Static Site"
2. Espera a que se complete el build
3. Tu aplicación estará disponible en la URL proporcionada

---

## 🔧 **Paso 4: Configurar Base de Datos**

### 4.1 Ejecutar Scripts de Inicialización
Una vez desplegado, ejecuta estos scripts en orden:

```bash
# 1. Crear usuario administrador
curl -X POST https://tu-backend.onrender.com/api/usuarios/crear-admin

# 2. Crear configuración inicial
curl -X POST https://tu-backend.onrender.com/api/configuracion \
  -H "Content-Type: application/json" \
  -d '{"cuotaMantenimientoMensual": 500}'
```

### 4.2 Crear Datos de Prueba (Opcional)
```bash
# Generar viviendas de prueba
curl -X POST https://tu-backend.onrender.com/api/viviendas/generar-prueba

# Generar residentes de prueba
curl -X POST https://tu-backend.onrender.com/api/residentes/generar-prueba
```

---

## 🧪 **Paso 5: Probar la Aplicación**

### 5.1 Acceder a la Aplicación
1. Ve a la URL del frontend
2. Inicia sesión con las credenciales del administrador
3. Verifica que todas las funcionalidades trabajen

### 5.2 Credenciales por Defecto
- **Email:** admin@admin.com
- **Contraseña:** admin123

---

## 🔒 **Paso 6: Configuración de Seguridad**

### 6.1 Variables de Entorno Seguras
- Cambia `JWT_SECRET` por un valor único y seguro
- Usa una contraseña fuerte para MongoDB
- Considera usar variables de entorno en producción

### 6.2 CORS (Si es necesario)
Si tienes problemas de CORS, agrega esto al backend:

```javascript
app.use(cors({
  origin: ['https://tu-frontend.onrender.com', 'http://localhost:3000'],
  credentials: true
}));
```

---

## 📊 **Monitoreo y Mantenimiento**

### 6.1 Logs
- Revisa los logs en Render para detectar errores
- Configura alertas si es necesario

### 6.2 Base de Datos
- Monitorea el uso de MongoDB Atlas
- Configura backups automáticos

### 6.3 Actualizaciones
- Para actualizar, simplemente haz push a GitHub
- Render desplegará automáticamente los cambios

---

## 🆘 **Solución de Problemas Comunes**

### Problema: Error de CORS
**Solución:** Verifica que las URLs estén correctamente configuradas

### Problema: Error de conexión a MongoDB
**Solución:** Verifica la URL de conexión y las credenciales

### Problema: Build falla
**Solución:** Revisa los logs de build en Render

---

## 💰 **Costos Estimados**

- **Render (Gratuito):** $0/mes
- **MongoDB Atlas (Gratuito):** $0/mes
- **Total:** $0/mes

---

## 🎯 **Próximos Pasos**

1. **Configurar dominio personalizado** (opcional)
2. **Implementar SSL** (automático en Render)
3. **Configurar backups** de la base de datos
4. **Implementar monitoreo** más avanzado

¡Tu aplicación estará lista para usar en la nube! 🚀 