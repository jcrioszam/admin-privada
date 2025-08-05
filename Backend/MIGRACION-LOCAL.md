# 🏠 Migración a MongoDB Local - Guía Completa

## 📋 **Resumen**

Esta guía te ayudará a migrar tu sistema de **MongoDB Atlas** (en la nube) a **MongoDB local** para funcionar completamente offline.

---

## 🎯 **Beneficios del Modo Local**

### ✅ **Ventajas:**
- **Sin dependencia de internet**
- **Datos completamente privados**
- **Sin costos mensuales**
- **Control total de la base de datos**
- **Mejor rendimiento local**

### ⚠️ **Consideraciones:**
- **Responsabilidad de backups**
- **Mantenimiento del servidor**
- **Sin acceso remoto**

---

## 🚀 **Pasos para Migrar**

### **Paso 1: Instalar MongoDB Local**

#### **Opción A: Instalación Automática**
```bash
# Ejecutar el script de instalación
install-mongodb-local.bat
```

#### **Opción B: Instalación Manual**
1. **Descargar MongoDB Community Server:**
   - Visita: https://www.mongodb.com/try/download/community
   - Selecciona: Windows x64
   - Descarga e instala

2. **Crear directorio de datos:**
   ```bash
   mkdir C:\data\db
   ```

3. **Configurar como servicio:**
   - Abre `services.msc`
   - Busca "MongoDB"
   - Configura como "Automático"

### **Paso 2: Migrar Datos**

#### **Ejecutar Migración Automática:**
```bash
# Ejecutar el script de migración
migrar-a-local.bat
```

#### **Migración Manual:**
```bash
# 1. Verificar que MongoDB local esté ejecutándose
# 2. Ejecutar script de migración
node scripts/migrarDatosLocal.js
```

### **Paso 3: Configurar Modo Local**

#### **Cambiar Configuración:**
```bash
# Copiar configuración local
copy config-local.env config.env
```

#### **Verificar Configuración:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fraccionamiento
JWT_SECRET=mi_secreto_super_seguro_para_jwt_2024
NODE_ENV=development
```

### **Paso 4: Iniciar Sistema Local**

#### **Inicio Automático:**
```bash
# Ejecutar script de inicio local
start-local.bat
```

#### **Inicio Manual:**
```bash
# Terminal 1 - Backend
cd Backend
npm start

# Terminal 2 - Frontend
cd Frontend
npm start
```

---

## 🔧 **Comandos Útiles**

### **Verificar MongoDB Local:**
```bash
# Verificar si está ejecutándose
netstat -an | findstr ":27017"

# Conectar a MongoDB
mongo
```

### **Backup de Datos:**
```bash
# Crear backup
mongodump --db fraccionamiento --out C:\backup

# Restaurar backup
mongorestore --db fraccionamiento C:\backup\fraccionamiento
```

### **Verificar Conexión:**
```bash
# Probar conexión local
node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/fraccionamiento')
  .then(() => console.log('✅ Conectado a MongoDB local'))
  .catch(err => console.log('❌ Error:', err.message));
"
```

---

## 📊 **Verificación de Migración**

### **Verificar Datos Migrados:**
```javascript
// En MongoDB shell
use fraccionamiento
db.viviendas.count()
db.residentes.count()
db.pagos.count()
db.usuarios.count()
db.configuraciones.count()
db.gastos.count()
```

### **Verificar Aplicación:**
1. **Backend:** http://localhost:5000
2. **Frontend:** http://localhost:3000
3. **Health Check:** http://localhost:5000/health

---

## 🔄 **Volver a Atlas (Si es necesario)**

### **Restaurar Configuración Atlas:**
```bash
# Restaurar configuración original
copy config-atlas.env config.env
```

### **Migrar de Local a Atlas:**
```javascript
// Crear script inverso
// migrarDatosAtlas.js
```

---

## 🛠️ **Solución de Problemas**

### **Error: "MongoDB no está ejecutándose"**
```bash
# Verificar servicio
services.msc
# Buscar "MongoDB" y iniciar

# O ejecutar manualmente
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
```

### **Error: "Puerto 27017 ocupado"**
```bash
# Verificar qué usa el puerto
netstat -ano | findstr :27017

# Terminar proceso si es necesario
taskkill /PID [PID_NUMBER]
```

### **Error: "No se puede conectar"**
```bash
# Verificar configuración
cat config.env

# Probar conexión
mongo mongodb://localhost:27017/fraccionamiento
```

### **Error: "Datos no migrados"**
```bash
# Verificar datos en Atlas
# Ejecutar migración nuevamente
node scripts/migrarDatosLocal.js
```

---

## 📁 **Estructura de Archivos**

```
Backend/
├── config.env              # Configuración actual
├── config-local.env        # Configuración local
├── config-atlas.env        # Configuración Atlas (backup)
├── start-local.bat         # Inicio modo local
├── migrar-a-local.bat      # Script de migración
├── install-mongodb-local.bat # Instalación MongoDB
└── scripts/
    └── migrarDatosLocal.js # Script de migración
```

---

## 🎉 **¡Listo para Usar Offline!**

### **Después de la migración:**
- ✅ **Sistema funciona sin internet**
- ✅ **Datos completamente privados**
- ✅ **Mejor rendimiento**
- ✅ **Sin costos mensuales**

### **Para usar:**
1. **Iniciar MongoDB local**
2. **Ejecutar:** `start-local.bat`
3. **Acceder:** http://localhost:3000

---

## 📞 **Soporte**

Si tienes problemas:
1. Verifica que MongoDB esté instalado y ejecutándose
2. Revisa la configuración en `config.env`
3. Ejecuta los scripts de verificación
4. Consulta los logs del servidor

¡Tu sistema ahora funciona completamente offline! 🏠✨ 