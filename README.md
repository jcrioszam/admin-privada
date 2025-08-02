# Sistema de Administración de Fraccionamiento Privado

## Descripción

Aplicación web completa para la gestión administrativa de un fraccionamiento privado. Permite llevar un registro detallado de viviendas, residentes (dueños e inquilinos), pagos de mantenimiento con posibilidad de pagos adelantados, y control de accesos con diferentes tipos de autenticación.

## Características Principales

### 🏠 Gestión de Viviendas
- Registro completo de propiedades con información detallada
- Estados: Ocupada, Desocupada, En construcción, En venta
- Características: superficie, habitaciones, baños, estacionamientos
- Cuotas de mantenimiento personalizadas

### 👥 Gestión de Residentes
- Control de dueños e inquilinos
- Información personal completa (documentos, vehículos, familiares)
- Estados activo/inactivo
- Historial de ingresos y salidas

### 💰 Sistema de Pagos
- Cuotas de mantenimiento mensuales
- Pagos adelantados
- Múltiples métodos de pago (efectivo, transferencia, tarjeta, etc.)
- Estados: Pendiente, Pagado, Vencido, Parcial
- Reportes de pagos vencidos

### 🔐 Control de Accesos
- Diferentes tipos de acceso: RFID, PIN, Huella, Reconocimiento Facial, Llave Física
- Códigos de acceso únicos
- Fechas de vencimiento
- Horarios y zonas permitidas
- Estados activo/inactivo

### 👤 Gestión de Usuarios
- Sistema de autenticación con roles
- Roles: Administrador, Supervisor, Operador
- Control de permisos por módulo
- Historial de accesos

### 📊 Dashboard y Reportes
- Estadísticas en tiempo real
- Gráficos de ocupación y pagos
- Reportes personalizables
- Métricas de rendimiento

## Tecnologías Utilizadas

### Backend
- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB
- **bcryptjs** - Encriptación de contraseñas
- **jsonwebtoken** - Autenticación JWT
- **express-validator** - Validación de datos
- **moment** - Manejo de fechas

### Frontend
- **React** - Biblioteca de interfaz de usuario
- **React Router** - Enrutamiento
- **React Query** - Gestión de estado del servidor
- **React Hook Form** - Formularios
- **Tailwind CSS** - Framework de CSS
- **Recharts** - Gráficos y visualizaciones
- **React Hot Toast** - Notificaciones
- **Heroicons** - Iconos

## Instalación y Configuración

### Prerrequisitos
- Node.js (v14 o superior)
- MongoDB (local o Atlas)
- npm o yarn

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd admin-privada
```

### 2. Configurar Backend
```bash
cd Backend
npm install
```

Crear archivo `config.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fraccionamiento_privada
JWT_SECRET=tu_jwt_secret_super_seguro_aqui
NODE_ENV=development
```

### 3. Configurar Frontend
```bash
cd Frontend
npm install
```

### 4. Ejecutar la aplicación

#### Backend
```bash
cd Backend
npm run dev
```

#### Frontend
```bash
cd Frontend
npm start
```

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Estructura del Proyecto

```
admin-privada/
├── Backend/
│   ├── models/           # Modelos de MongoDB
│   ├── routes/           # Rutas de la API
│   ├── server.js         # Servidor principal
│   ├── package.json      # Dependencias del backend
│   └── config.env        # Variables de entorno
├── Frontend/
│   ├── src/
│   │   ├── components/   # Componentes reutilizables
│   │   ├── pages/        # Páginas de la aplicación
│   │   ├── hooks/        # Hooks personalizados
│   │   ├── services/     # Servicios de API
│   │   └── App.js        # Componente principal
│   ├── public/           # Archivos públicos
│   └── package.json      # Dependencias del frontend
└── README.md
```

## API Endpoints

### Autenticación
- `POST /api/usuarios/login` - Iniciar sesión
- `GET /api/usuarios/perfil` - Obtener perfil del usuario

### Viviendas
- `GET /api/viviendas` - Obtener todas las viviendas
- `POST /api/viviendas` - Crear nueva vivienda
- `PUT /api/viviendas/:id` - Actualizar vivienda
- `DELETE /api/viviendas/:id` - Eliminar vivienda

### Residentes
- `GET /api/residentes` - Obtener todos los residentes
- `POST /api/residentes` - Crear nuevo residente
- `PUT /api/residentes/:id` - Actualizar residente
- `DELETE /api/residentes/:id` - Eliminar residente

### Pagos
- `GET /api/pagos` - Obtener todos los pagos
- `POST /api/pagos` - Crear nuevo pago
- `POST /api/pagos/:id/registrar-pago` - Registrar pago
- `POST /api/pagos/:id/pago-adelantado` - Registrar pago adelantado

### Accesos
- `GET /api/accesos` - Obtener todos los accesos
- `POST /api/accesos` - Crear nuevo acceso
- `PUT /api/accesos/:id/activar` - Activar acceso
- `PUT /api/accesos/:id/desactivar` - Desactivar acceso

### Usuarios
- `GET /api/usuarios` - Obtener todos los usuarios
- `POST /api/usuarios` - Crear nuevo usuario
- `PUT /api/usuarios/:id` - Actualizar usuario
- `DELETE /api/usuarios/:id` - Eliminar usuario

## Funcionalidades Destacadas

### 🔄 Pagos Adelantados
- Los residentes pueden realizar pagos por adelantado
- Sistema automático de registro de pagos adelantados
- Historial completo de pagos por vivienda

### 🔐 Control de Accesos Avanzado
- Múltiples tipos de autenticación
- Códigos únicos por residente
- Fechas de vencimiento configurables
- Horarios y zonas de acceso específicas

### 📈 Dashboard Interactivo
- Estadísticas en tiempo real
- Gráficos de ocupación y pagos
- Métricas de rendimiento
- Alertas de pagos vencidos

### 👥 Gestión Completa de Residentes
- Información personal detallada
- Vehículos registrados
- Familiares autorizados
- Historial de cambios

## Seguridad

- **Autenticación JWT** - Tokens seguros para sesiones
- **Encriptación de contraseñas** - bcrypt para seguridad
- **Validación de datos** - Sanitización de entradas
- **Control de acceso basado en roles** - Permisos granulares
- **CORS configurado** - Seguridad de origen cruzado

## Base de Datos

### Colecciones MongoDB
- `viviendas` - Información de las propiedades
- `residentes` - Información de los habitantes
- `pagos` - Registro de cuotas de mantenimiento
- `accesos` - Control de accesos al fraccionamiento
- `usuarios` - Usuarios del sistema administrativo

### Índices Optimizados
- Búsquedas rápidas por número de vivienda
- Consultas eficientes por residente
- Filtros por estado y tipo
- Agregaciones para estadísticas

## Despliegue

### Backend (Producción)
```bash
cd Backend
npm install --production
npm start
```

### Frontend (Producción)
```bash
cd Frontend
npm run build
```

### Variables de Entorno de Producción
```env
PORT=5000
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/fraccionamiento_privada
JWT_SECRET=secret_muy_seguro_para_produccion
NODE_ENV=production
```

## Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Soporte

Para soporte técnico o consultas sobre el sistema:
- Crear un issue en el repositorio
- Contactar al equipo de desarrollo
- Revisar la documentación de la API

## Próximas Mejoras

- [ ] Notificaciones por email
- [ ] Generación de reportes en PDF
- [ ] Integración con sistemas de pago externos
- [ ] API para aplicaciones móviles
- [ ] Logs de auditoría detallados
- [ ] Backup automático de la base de datos
- [ ] Dashboard con más métricas
- [ ] Sistema de notificaciones push
- [ ] Integración con sistemas de vigilancia
- [ ] App móvil para residentes

---

**Desarrollado con ❤️ para la gestión eficiente de fraccionamientos privados** 