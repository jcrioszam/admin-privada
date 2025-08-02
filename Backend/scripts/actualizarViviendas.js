const mongoose = require('mongoose');
const Vivienda = require('../models/Vivienda');
require('dotenv').config({ path: './config.env' });

async function actualizarViviendas() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Obtener todas las viviendas
    const viviendas = await Vivienda.find({});
    console.log(`Encontradas ${viviendas.length} viviendas`);

    let viviendasActualizadas = 0;

    for (const vivienda of viviendas) {
      // Remover campos que ya no se usan
      const camposAEliminar = ['superficie', 'habitaciones', 'baños', 'estacionamientos', 'cuotaMantenimiento'];
      
      let actualizacion = {};
      let necesitaActualizacion = false;

      // Verificar si tiene campos que deben eliminarse
      for (const campo of camposAEliminar) {
        if (vivienda[campo] !== undefined) {
          actualizacion[`$unset`] = actualizacion[`$unset`] || {};
          actualizacion[`$unset`][campo] = "";
          necesitaActualizacion = true;
        }
      }

      if (necesitaActualizacion) {
        await Vivienda.findByIdAndUpdate(vivienda._id, actualizacion);
        console.log(`✅ Vivienda actualizada: ${vivienda.numero}`);
        viviendasActualizadas++;
      } else {
        console.log(`ℹ️  Vivienda ya está actualizada: ${vivienda.numero}`);
      }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Viviendas actualizadas: ${viviendasActualizadas}`);
    console.log(`Total viviendas procesadas: ${viviendas.length}`);

  } catch (error) {
    console.error('Error actualizando viviendas:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar el script
actualizarViviendas(); 