const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: './config.env' });

// Importar modelos
const Pago = require('../models/Pago');
const Vivienda = require('../models/Vivienda');

const verificarPagosActualizados = async () => {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('\n🔍 VERIFICANDO PAGOS ACTUALIZADOS');
    console.log('==================================');

    // Obtener pagos pendientes de viviendas específicas
    const viviendasVerificar = [1, 4, 6, 8]; // Las que vimos en la imagen
    
    for (const numeroVivienda of viviendasVerificar) {
      console.log(`\n📋 Vivienda ${numeroVivienda}:`);
      
      // Obtener la vivienda
      const vivienda = await Vivienda.findOne({ numero: numeroVivienda });
      if (!vivienda) {
        console.log('   ❌ Vivienda no encontrada');
        continue;
      }
      
      console.log(`   💰 Cuota configurada: $${vivienda.cuotaMantenimiento}`);
      
      // Obtener pagos pendientes de esta vivienda
      const pagosPendientes = await Pago.find({
        vivienda: vivienda._id,
        estado: 'Pendiente'
      }).sort({ año: -1, mes: -1 });
      
      console.log(`   📊 Pagos pendientes: ${pagosPendientes.length}`);
      
      pagosPendientes.forEach(pago => {
        console.log(`      - ${pago.mes}/${pago.año}: $${pago.monto} (${pago.estado})`);
      });
    }

    // Verificar pagos específicos que vimos en la imagen
    console.log('\n🔍 VERIFICACIÓN ESPECÍFICA:');
    console.log('==========================');
    
    const pagosEspecificos = await Pago.find({
      estado: 'Pendiente',
      $or: [
        { vivienda: (await Vivienda.findOne({ numero: 1 }))?._id },
        { vivienda: (await Vivienda.findOne({ numero: 4 }))?._id },
        { vivienda: (await Vivienda.findOne({ numero: 6 }))?._id },
        { vivienda: (await Vivienda.findOne({ numero: 8 }))?._id }
      ]
    }).populate('vivienda', 'numero cuotaMantenimiento');

    pagosEspecificos.forEach(pago => {
      const vivienda = pago.vivienda;
      if (vivienda) {
        console.log(`   Vivienda ${vivienda.numero}: $${pago.monto} (debería ser $${vivienda.cuotaMantenimiento})`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
};

verificarPagosActualizados();
