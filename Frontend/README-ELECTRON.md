# 🖥️ Admin Privada - Aplicación de Escritorio

## 📋 **Opciones de Uso**

### **Opción 1: Ejecutar Localmente (Recomendado)**
```bash
# Terminal 1 - Backend
cd Backend
npm start

# Terminal 2 - Frontend  
cd Frontend
npm start
```
- ✅ **Más simple**
- ✅ **No requiere cambios**
- ✅ **Acceso desde navegador: http://localhost:3000**

---

### **Opción 2: Aplicación de Escritorio (Electron)**

## 🚀 **Instalación**

### **Paso 1: Instalar dependencias**
```bash
cd Frontend
npm install --save-dev electron electron-builder concurrently wait-on electron-is-dev
```

### **Paso 2: Ejecutar en modo desarrollo**
```bash
# Terminal 1 - Backend
cd Backend
npm start

# Terminal 2 - Aplicación de escritorio
cd Frontend
npm run electron-dev
```

### **Paso 3: Crear ejecutable**
```bash
cd Frontend
npm run dist
```

## 📁 **Archivos Generados**

Después de ejecutar `npm run dist`, encontrarás:
- **Windows**: `dist/Admin Privada Setup.exe`
- **macOS**: `dist/Admin Privada.dmg`
- **Linux**: `dist/Admin Privada.AppImage`

## ⚙️ **Configuración**

### **Backend Local**
Para que la app de escritorio funcione, el backend debe estar ejecutándose en:
- **URL**: `http://localhost:5000`
- **Puerto**: `5000`

### **Base de Datos**
- Asegúrate de que MongoDB esté ejecutándose
- La base de datos debe estar configurada correctamente

## 🔧 **Comandos Disponibles**

| Comando | Descripción |
|---------|-------------|
| `npm run electron-dev` | Ejecutar en modo desarrollo |
| `npm run electron` | Ejecutar solo Electron |
| `npm run dist` | Crear ejecutable |
| `npm run electron-pack` | Empaquetar aplicación |

## 🎯 **Ventajas de la Aplicación de Escritorio**

### ✅ **Beneficios:**
- **Icono en el escritorio**
- **Menú nativo del sistema**
- **Atajos de teclado**
- **Mejor experiencia de usuario**
- **No depende del navegador**
- **Funciona offline (si el backend está local)**

### ⚠️ **Consideraciones:**
- **Requiere más espacio en disco**
- **Necesita actualizaciones manuales**
- **El backend debe estar ejecutándose**

## 🛠️ **Solución de Problemas**

### **Error: "Cannot find module 'electron-is-dev'"**
```bash
npm install electron-is-dev
```

### **Error: "Backend no disponible"**
- Verifica que el backend esté ejecutándose en `localhost:5000`
- Revisa la configuración de la base de datos

### **La aplicación no se abre**
- Verifica que todas las dependencias estén instaladas
- Ejecuta `npm install` en la carpeta Frontend

## 📞 **Soporte**

Si tienes problemas:
1. Verifica que Node.js esté actualizado
2. Revisa que todas las dependencias estén instaladas
3. Asegúrate de que el backend esté ejecutándose

---

## 🎉 **¡Listo para usar!**

Tu sistema de administración de fraccionamiento ahora puede funcionar como:
- **Aplicación web local** (más simple)
- **Aplicación de escritorio** (más profesional)

¡Elige la opción que mejor se adapte a tus necesidades! 