const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: './config.env' });

// Importar el modelo de Usuario
const Usuario = require('./models/Usuario');

const crearAdminInicial = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe algún usuario
    const usuarioExistente = await Usuario.findOne();
    if (usuarioExistente) {
      console.log('ℹ️ Ya existe un usuario en el sistema');
      console.log('Usuario existente:', {
        nombre: usuarioExistente.nombre,
        email: usuarioExistente.email,
        rol: usuarioExistente.rol
      });
      return;
    }

    // Crear hash de la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);

    // Crear usuario administrador
    const adminUsuario = new Usuario({
      nombre: 'Administrador',
      apellidos: 'Sistema',
      email: 'admin@admin.com',
      password: hashedPassword,
      rol: 'Administrador',
      permisos: [
        {
          modulo: 'viviendas',
          acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar']
        },
        {
          modulo: 'residentes',
          acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar']
        },
        {
          modulo: 'pagos',
          acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar']
        },
        {
          modulo: 'usuarios',
          acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar']
        },
        {
          modulo: 'accesos',
          acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar']
        },
        {
          modulo: 'configuracion',
          acciones: ['leer', 'actualizar']
        }
      ],
      activo: true,
      ultimoAcceso: new Date()
    });

    await adminUsuario.save();
    console.log('✅ Usuario administrador creado exitosamente');
    console.log('📧 Email: admin@admin.com');
    console.log('🔑 Contraseña: admin123');
    console.log('⚠️ IMPORTANTE: Cambia la contraseña después del primer inicio de sesión');

  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Conexión a MongoDB cerrada');
  }
};

// Ejecutar el script
crearAdminInicial(); 