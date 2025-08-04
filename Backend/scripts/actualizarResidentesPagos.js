require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Pago = require('../models/Pago');
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');

async function actualizarResidentesPagos() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los pagos que no tienen residente asignado
    const pagosSinResidente = await Pago.find({ residente: { $exists: false } });
    console.log(`📊 Encontrados ${pagosSinResidente.length} pagos sin residente`);

    let actualizados = 0;
    let errores = 0;

    for (const pago of pagosSinResidente) {
      try {
        // Buscar el residente de la vivienda
        const residente = await Residente.findOne({ vivienda: pago.vivienda });
        
        if (residente) {
          // Actualizar el pago con el residente
          await Pago.findByIdAndUpdate(pago._id, { residente: residente._id });
          console.log(`✅ Pago ${pago._id} actualizado con residente: ${residente.nombre} ${residente.apellidos}`);
          actualizados++;
        } else {
          console.log(`⚠️ No se encontró residente para vivienda ${pago.vivienda}`);
          errores++;
        }
      } catch (error) {
        console.error(`❌ Error actualizando pago ${pago._id}:`, error.message);
        errores++;
      }
    }

    console.log(`\n📈 Resumen:`);
    console.log(`✅ Pagos actualizados: ${actualizados}`);
    console.log(`❌ Errores: ${errores}`);

  } catch (error) {
    console.error('❌ Error en el script:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
actualizarResidentesPagos(); 