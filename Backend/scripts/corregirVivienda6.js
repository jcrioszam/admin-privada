const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: './config.env' });

// Importar modelos
const Vivienda = require('../models/Vivienda');

const corregirVivienda6 = async () => {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('\n🔧 CORRIGIENDO VIVIENDA 6');
    console.log('==========================');

    // Obtener la vivienda 6
    const vivienda6 = await Vivienda.findOne({ numero: 6 });
    if (!vivienda6) {
      console.log('❌ Vivienda 6 no encontrada');
      return;
    }

    console.log(`📋 Estado actual:`);
    console.log(`   Cuota: $${vivienda6.cuotaMantenimiento}`);
    console.log(`   Tipo: ${vivienda6.tipoCuota}`);

    // Corregir la cuota
    const resultado = await Vivienda.findByIdAndUpdate(
      vivienda6._id,
      {
        cuotaMantenimiento: 200,
        tipoCuota: 'Estandar'
      },
      { new: true }
    );

    console.log(`\n✅ Vivienda 6 actualizada:`);
    console.log(`   Cuota: $${resultado.cuotaMantenimiento}`);
    console.log(`   Tipo: ${resultado.tipoCuota}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
};

corregirVivienda6();
