# Backend - Sistema de Administración de Fraccionamiento Privado

## Descripción

Backend desarrollado en Node.js con Express y MongoDB para la gestión administrativa de un fraccionamiento privado. Incluye funcionalidades completas para manejo de viviendas, residentes, pagos de mantenimiento y control de accesos.

## Características Principales

- **Gestión de Viviendas**: Registro completo de propiedades con información detallada
- **Gestión de Residentes**: Control de dueños e inquilinos con información personal
- **Sistema de Pagos**: Manejo de cuotas de mantenimiento con pagos adelantados
- **Control de Accesos**: Diferentes tipos de acceso (RFID, PIN, Huella, etc.)
- **Autenticación**: Sistema de usuarios con roles y permisos
- **API RESTful**: Endpoints completos para todas las operaciones
- **Validaciones**: Validación de datos con express-validator
- **Estadísticas**: Reportes y métricas del sistema

## Tecnologías Utilizadas

- **Node.js**: Runtime de JavaScript
- **Express**: Framework web
- **MongoDB**: Base de datos NoSQL
- **Mongoose**: ODM para MongoDB
- **bcryptjs**: Encriptación de contraseñas
- **jsonwebtoken**: Autenticación JWT
- **express-validator**: Validación de datos
- **moment**: Manejo de fechas

## Instalación

1. **Clonar el repositorio**
```bash
cd Backend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
# Copiar config.env y modificar según tu configuración
cp config.env.example config.env
```

4. **Configurar MongoDB**
- Instalar MongoDB localmente o usar MongoDB Atlas
- Crear la base de datos `fraccionamiento_privada`

5. **Ejecutar el servidor**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## Estructura del Proyecto

```
Backend/
├── models/           # Modelos de MongoDB
│   ├── Vivienda.js
│   ├── Residente.js
│   ├── Pago.js
│   ├── Acceso.js
│   └── Usuario.js
├── routes/           # Rutas de la API
│   ├── viviendas.js
│   ├── residentes.js
│   ├── pagos.js
│   ├── accesos.js
│   └── usuarios.js
├── server.js         # Servidor principal
├── package.json      # Dependencias
└── config.env        # Variables de entorno
```

## API Endpoints

### Autenticación
- `POST /api/usuarios/login` - Iniciar sesión
- `GET /api/usuarios/perfil` - Obtener perfil del usuario

### Viviendas
- `GET /api/viviendas` - Obtener todas las viviendas
- `GET /api/viviendas/:id` - Obtener vivienda específica
- `POST /api/viviendas` - Crear nueva vivienda
- `PUT /api/viviendas/:id` - Actualizar vivienda
- `DELETE /api/viviendas/:id` - Eliminar vivienda
- `GET /api/viviendas/estadisticas/resumen` - Estadísticas de viviendas

### Residentes
- `GET /api/residentes` - Obtener todos los residentes
- `GET /api/residentes/:id` - Obtener residente específico
- `POST /api/residentes` - Crear nuevo residente
- `PUT /api/residentes/:id` - Actualizar residente
- `DELETE /api/residentes/:id` - Eliminar residente
- `GET /api/residentes/vivienda/:viviendaId` - Residentes por vivienda
- `GET /api/residentes/estadisticas/resumen` - Estadísticas de residentes

### Pagos
- `GET /api/pagos` - Obtener todos los pagos
- `GET /api/pagos/:id` - Obtener pago específico
- `POST /api/pagos` - Crear nuevo pago
- `PUT /api/pagos/:id` - Actualizar pago
- `POST /api/pagos/:id/registrar-pago` - Registrar pago
- `POST /api/pagos/:id/pago-adelantado` - Registrar pago adelantado
- `GET /api/pagos/vencidos/listado` - Pagos vencidos
- `GET /api/pagos/estadisticas/resumen` - Estadísticas de pagos

### Accesos
- `GET /api/accesos` - Obtener todos los accesos
- `GET /api/accesos/:id` - Obtener acceso específico
- `POST /api/accesos` - Crear nuevo acceso
- `PUT /api/accesos/:id` - Actualizar acceso
- `PUT /api/accesos/:id/activar` - Activar acceso
- `PUT /api/accesos/:id/desactivar` - Desactivar acceso
- `DELETE /api/accesos/:id` - Eliminar acceso
- `GET /api/accesos/residente/:residenteId` - Accesos por residente
- `GET /api/accesos/vivienda/:viviendaId` - Accesos por vivienda
- `GET /api/accesos/vencidos/listado` - Accesos vencidos
- `GET /api/accesos/estadisticas/resumen` - Estadísticas de accesos

### Usuarios (Administradores)
- `GET /api/usuarios` - Obtener todos los usuarios
- `GET /api/usuarios/:id` - Obtener usuario específico
- `POST /api/usuarios` - Crear nuevo usuario
- `PUT /api/usuarios/:id` - Actualizar usuario
- `PUT /api/usuarios/:id/cambiar-password` - Cambiar contraseña
- `DELETE /api/usuarios/:id` - Eliminar usuario
- `GET /api/usuarios/estadisticas/resumen` - Estadísticas de usuarios

## Modelos de Datos

### Vivienda
- Número y calle
- Tipo (Casa, Departamento, Townhouse)
- Características (superficie, habitaciones, baños)
- Estado (Ocupada, Desocupada, En construcción, En venta)
- Cuota de mantenimiento

### Residente
- Información personal (nombre, email, teléfono)
- Tipo (Dueño o Inquilino)
- Documento de identidad
- Vehículos y familiares
- Estado activo/inactivo

### Pago
- Vivienda y residente asociados
- Mes y año
- Monto y estado
- Método de pago
- Pagos adelantados
- Fechas de vencimiento y pago

### Acceso
- Tipo de acceso (RFID, PIN, Huella, etc.)
- Código de acceso
- Fechas de asignación y vencimiento
- Horarios y zonas permitidas
- Estado activo/inactivo

### Usuario
- Información personal
- Rol (Administrador, Operador, Supervisor)
- Permisos por módulo
- Estado activo/inactivo

## Variables de Entorno

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fraccionamiento_privada
JWT_SECRET=tu_jwt_secret_super_seguro_aqui
NODE_ENV=development
```

## Scripts Disponibles

```bash
npm start          # Ejecutar en producción
npm run dev        # Ejecutar en desarrollo con nodemon
npm test           # Ejecutar pruebas
```

## Seguridad

- Contraseñas encriptadas con bcrypt
- Autenticación JWT
- Validación de datos en todos los endpoints
- Control de acceso basado en roles
- Sanitización de datos de entrada

## Base de Datos

El sistema utiliza MongoDB con las siguientes colecciones:
- `viviendas` - Información de las propiedades
- `residentes` - Información de los habitantes
- `pagos` - Registro de cuotas de mantenimiento
- `accesos` - Control de accesos al fraccionamiento
- `usuarios` - Usuarios del sistema administrativo

## Próximas Mejoras

- [ ] Implementación de notificaciones por email
- [ ] Generación de reportes en PDF
- [ ] Integración con sistemas de pago externos
- [ ] API para aplicaciones móviles
- [ ] Logs de auditoría detallados
- [ ] Backup automático de la base de datos

## Soporte

Para soporte técnico o consultas sobre el sistema, contactar al equipo de desarrollo. 