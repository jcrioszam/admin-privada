const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');

// Cargar variables de entorno
dotenv.config({ path: './config.env' });

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Residente = require('../models/Residente');

// Función para generar clave de acceso única
function generarClaveAcceso() {
  // Generar 8 caracteres alfanuméricos
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Función para verificar si la clave ya existe
async function claveExiste(clave) {
  const residente = await Residente.findOne({ claveAcceso: clave });
  return !!residente;
}

// Función para generar clave única
async function generarClaveUnica() {
  let clave;
  do {
    clave = generarClaveAcceso();
  } while (await claveExiste(clave));
  return clave;
}

async function generarClavesParaResidentes() {
  try {
    console.log('🔑 Iniciando generación de claves de acceso...');
    
    // Obtener todos los residentes activos sin clave de acceso
    const residentes = await Residente.find({ 
      activo: true,
      $or: [
        { claveAcceso: { $exists: false } },
        { claveAcceso: null },
        { claveAcceso: '' }
      ]
    });

    console.log(`📋 Encontrados ${residentes.length} residentes sin clave de acceso`);

    if (residentes.length === 0) {
      console.log('✅ Todos los residentes ya tienen claves de acceso');
      return;
    }

    // Generar claves para cada residente
    for (const residente of residentes) {
      const claveAcceso = await generarClaveUnica();
      
      await Residente.findByIdAndUpdate(residente._id, {
        claveAcceso: claveAcceso
      });

      console.log(`✅ Residente: ${residente.nombre} ${residente.apellidos} - Clave: ${claveAcceso}`);
    }

    console.log('🎉 Generación de claves completada exitosamente');

    // Mostrar resumen
    const totalResidentes = await Residente.countDocuments({ activo: true });
    const residentesConClave = await Residente.countDocuments({ 
      activo: true, 
      claveAcceso: { $exists: true, $ne: null, $ne: '' } 
    });

    console.log('\n📊 Resumen:');
    console.log(`Total residentes activos: ${totalResidentes}`);
    console.log(`Residentes con clave: ${residentesConClave}`);
    console.log(`Residentes sin clave: ${totalResidentes - residentesConClave}`);

  } catch (error) {
    console.error('❌ Error generando claves:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
  }
}

// Ejecutar el script
generarClavesParaResidentes();
