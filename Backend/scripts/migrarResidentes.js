const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// Importar modelos
const Vivienda = require('../models/Vivienda');
const Residente = require('../models/Residente');

// Función para conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB exitosamente');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err.message);
    process.exit(1);
  }
};

// Función principal
const migrarResidentes = async () => {
  try {
    console.log('🔍 Iniciando migración de residentes...');
    
    // Obtener todas las viviendas
    const viviendas = await Vivienda.find({});
    console.log(`📊 Encontradas ${viviendas.length} viviendas`);

    let actualizadas = 0;
    let sinResidente = 0;

    for (const vivienda of viviendas) {
      // Si la vivienda tiene un residente principal, agregarlo al array de residentes
      if (vivienda.residente) {
        // Verificar si el residente ya está en el array
        if (!vivienda.residentes.includes(vivienda.residente)) {
          vivienda.residentes.push(vivienda.residente);
          await vivienda.save();
          actualizadas++;
          console.log(`✅ Vivienda ${vivienda.numero}: Agregado residente principal`);
        }
      } else {
        sinResidente++;
        console.log(`⚠️  Vivienda ${vivienda.numero}: Sin residente principal`);
      }
    }

    console.log('\n📋 Resumen de la migración:');
    console.log(`✅ Viviendas actualizadas: ${actualizadas}`);
    console.log(`⚠️  Viviendas sin residente: ${sinResidente}`);
    console.log(`📊 Total de viviendas procesadas: ${viviendas.length}`);

    // Verificar el resultado
    const viviendasConResidentes = await Vivienda.find({ 'residentes.0': { $exists: true } });
    console.log(`\n🎯 Viviendas con residentes en el array: ${viviendasConResidentes.length}`);

  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
};

// Ejecutar el script
console.log('🚀 Iniciando migración de residentes...\n');
connectDB().then(() => {
  migrarResidentes();
}); 