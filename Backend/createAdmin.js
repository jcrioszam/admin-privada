const mongoose = require('mongoose');
const Usuario = require('./models/Usuario');
require('dotenv').config({ path: './config.env' });

async function createAdminUser() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Verificar si ya existe un usuario administrador
    const existingAdmin = await Usuario.findOne({ rol: 'Administrador' });
    if (existingAdmin) {
      console.log('Ya existe un usuario administrador:', existingAdmin.email);
      process.exit(0);
    }

    // Crear usuario administrador
    const adminUser = new Usuario({
      nombre: 'Administrador',
      apellidos: 'Sistema',
      email: 'admin@fraccionamiento.com',
      password: 'admin123',
      rol: 'Administrador',
      activo: true,
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
          modulo: 'accesos',
          acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar']
        },
        {
          modulo: 'usuarios',
          acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar']
        }
      ]
    });

    await adminUser.save();
    console.log('✅ Usuario administrador creado exitosamente');
    console.log('📧 Email: admin@fraccionamiento.com');
    console.log('🔑 Contraseña: admin123');
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login');

  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdminUser(); 