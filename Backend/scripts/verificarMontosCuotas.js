const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// Importar modelos
const Residente = require('../models/Residente');
const Pago = require('../models/Pago');
const Vivienda = require('../models/Vivienda');

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('🔗 Conectado a MongoDB');
    ejecutarVerificacion();
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
    process.exit(1);
  });

async function ejecutarVerificacion() {
  try {
    console.log('🔍 VERIFICACIÓN DE MONTOS DE CUOTAS');
    console.log('=====================================\n');

    // 1. Obtener todos los residentes con vivienda
    const residentes = await Residente.find({ vivienda: { $exists: true } })
      .populate('vivienda')
      .lean();

    console.log(`👥 Total de residentes con vivienda: ${residentes.length}\n`);

    // 2. Obtener todos los pagos
    const pagos = await Pago.find()
      .populate('residente')
      .populate('vivienda')
      .lean();

    console.log(`📋 Total de pagos: ${pagos.length}\n`);

    // 3. Analizar montos por residente
    const montosPorResidente = {};

    for (const residente of residentes) {
      const pagosResidente = pagos.filter(pago => 
        pago.residente && pago.residente._id.toString() === residente._id.toString()
      );

      if (pagosResidente.length > 0) {
        const montos = pagosResidente.map(pago => pago.monto);
        const montosUnicos = [...new Set(montos)];
        
        montosPorResidente[residente.nombre] = {
          vivienda: residente.vivienda?.numero,
          montos: montosUnicos,
          pagos: pagosResidente.length,
          montosDetalle: pagosResidente.map(pago => ({
            mes: `${pago.mes}/${pago.año}`,
            monto: pago.monto,
            estado: pago.estado,
            montoPagado: pago.montoPagado || 0,
            saldoPendiente: pago.monto - (pago.montoPagado || 0)
          }))
        };
      }
    }

    // 4. Mostrar resumen por residente
    console.log('📊 RESUMEN DE MONTOS POR RESIDENTE:');
    console.log('=====================================');

    for (const [nombre, datos] of Object.entries(montosPorResidente)) {
      console.log(`\n👤 ${nombre} (Vivienda ${datos.vivienda}):`);
      console.log(`   📋 Total pagos: ${datos.pagos}`);
      console.log(`   💰 Montos únicos: $${datos.montos.join(', $')}`);
      
      if (datos.montos.length > 1) {
        console.log(`   ⚠️  INCONSISTENCIA: Múltiples montos diferentes`);
      }
      
      console.log(`   📄 Detalle de pagos:`);
      datos.montosDetalle.forEach(pago => {
        console.log(`      - ${pago.mes}: $${pago.monto} (${pago.estado}) - Saldo: $${pago.saldoPendiente}`);
      });
    }

    // 5. Resumen general de montos
    console.log('\n📊 RESUMEN GENERAL DE MONTOS:');
    console.log('==============================');
    
    const todosLosMontos = Object.values(montosPorResidente)
      .flatMap(datos => datos.montos);
    
    const montosUnicos = [...new Set(todosLosMontos)].sort((a, b) => a - b);
    
    console.log(`💰 Montos únicos encontrados: $${montosUnicos.join(', $')}`);
    
    // Contar frecuencia de cada monto
    const frecuenciaMontos = {};
    todosLosMontos.forEach(monto => {
      frecuenciaMontos[monto] = (frecuenciaMontos[monto] || 0) + 1;
    });
    
    console.log('\n📈 Frecuencia de montos:');
    for (const [monto, frecuencia] of Object.entries(frecuenciaMontos)) {
      console.log(`   $${monto}: ${frecuencia} pagos`);
    }

  } catch (error) {
    console.error('❌ Error en verificación:', error);
  } finally {
    mongoose.connection.close();
  }
}
