# ☁️ Despliegue en la Nube - Guía Rápida

## 🎯 **Objetivo**
Desplegar tu aplicación administrativa para que sea accesible desde cualquier lugar del mundo.

## 📋 **Requisitos**
- Cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas) (gratuita)
- Cuenta en [Render](https://render.com) (gratuita)
- Repositorio en GitHub

---

## 🗄️ **Paso 1: MongoDB Atlas**

### 1.1 Crear cuenta y cluster
1. Ve a [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crea una cuenta gratuita
3. Crea un nuevo cluster (gratuito)
4. Configura la base de datos

### 1.2 Obtener URL de conexión
1. En tu cluster, haz clic en "Connect"
2. Selecciona "Connect your application"
3. Copia la URL de conexión
4. Reemplaza `<password>` con tu contraseña

**Ejemplo:**
```
mongodb+srv://usuario:password@cluster.mongodb.net/admin-privada?retryWrites=true&w=majority
```

---

## ☁️ **Paso 2: Render - Backend**

### 2.1 Crear servicio web
1. Ve a [Render](https://render.com)
2. Crea una cuenta gratuita
3. Haz clic en "New +" → "Web Service"
4. Conecta tu repositorio de GitHub

### 2.2 Configurar el servicio
- **Name:** `admin-privada-backend`
- **Root Directory:** `Backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### 2.3 Variables de entorno
Agrega estas variables en Render:

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `tu_url_de_mongodb_atlas` |
| `JWT_SECRET` | `tu_secreto_jwt_super_seguro` |
| `PORT` | `10000` |

### 2.4 Desplegar
1. Haz clic en "Create Web Service"
2. Espera a que se complete el despliegue
3. Copia la URL del backend (ej: `https://admin-privada-backend.onrender.com`)

---

## 🌐 **Paso 3: Render - Frontend**

### 3.1 Crear sitio estático
1. En Render, haz clic en "New +" → "Static Site"
2. Conecta el mismo repositorio

### 3.2 Configurar el sitio
- **Name:** `admin-privada-frontend`
- **Root Directory:** `Frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `build`

### 3.3 Variables de entorno
Agrega esta variable:

| Variable | Valor |
|----------|-------|
| `REACT_APP_API_URL` | `https://tu-backend-url.onrender.com` |

### 3.4 Desplegar
1. Haz clic en "Create Static Site"
2. Espera a que se complete el build
3. Tu aplicación estará disponible en la URL proporcionada

---

## 🔧 **Paso 4: Configurar Base de Datos**

### 4.1 Crear usuario administrador
Una vez desplegado, ejecuta este comando (reemplaza la URL):

```bash
curl -X POST https://tu-backend.onrender.com/api/usuarios/crear-admin
```

### 4.2 Crear configuración inicial
```bash
curl -X POST https://tu-backend.onrender.com/api/configuracion \
  -H "Content-Type: application/json" \
  -d '{"cuotaMantenimientoMensual": 500}'
```

### 4.3 Crear datos de prueba (opcional)
```bash
# Generar viviendas de prueba
curl -X POST https://tu-backend.onrender.com/api/viviendas/generar-prueba

# Generar residentes de prueba
curl -X POST https://tu-backend.onrender.com/api/residentes/generar-prueba
```

---

## 🧪 **Paso 5: Probar la Aplicación**

### 5.1 Acceder
1. Ve a la URL del frontend
2. Inicia sesión con las credenciales por defecto

### 5.2 Credenciales por defecto
- **Email:** `admin@admin.com`
- **Contraseña:** `admin123`

---

## 🔒 **Seguridad**

### Variables importantes
- Cambia `JWT_SECRET` por un valor único y seguro
- Usa una contraseña fuerte para MongoDB
- Considera usar variables de entorno en producción

### CORS (si es necesario)
Si tienes problemas de CORS, agrega esto al backend:

```javascript
app.use(cors({
  origin: ['https://tu-frontend.onrender.com', 'http://localhost:3000'],
  credentials: true
}));
```

---

## 💰 **Costos**
- **Render (Gratuito):** $0/mes
- **MongoDB Atlas (Gratuito):** $0/mes
- **Total:** $0/mes

---

## 🆘 **Solución de Problemas**

### Error de CORS
- Verifica que las URLs estén correctamente configuradas
- Asegúrate de que el frontend use HTTPS

### Error de conexión a MongoDB
- Verifica la URL de conexión
- Asegúrate de que las credenciales sean correctas

### Build falla
- Revisa los logs de build en Render
- Verifica que todas las dependencias estén instaladas

---

## ✅ **¡Listo!**

Tu aplicación estará disponible en la URL del frontend y podrás acceder a ella desde cualquier lugar del mundo.

**Próximos pasos opcionales:**
1. Configurar dominio personalizado
2. Implementar SSL (automático en Render)
3. Configurar backups de la base de datos
4. Implementar monitoreo más avanzado 