const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// Importar modelos
const Pago = require('../models/Pago');
const Vivienda = require('../models/Vivienda');

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('🔗 Conectado a MongoDB');
    ejecutarCorreccion();
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
    process.exit(1);
  });

async function ejecutarCorreccion() {
  try {
    console.log('🔧 CORRECCIÓN DE MONTOS DE CUOTAS');
    console.log('==================================\n');

    // Definir montos estándar por vivienda
    const montosEstandar = {
      1: 200, // Fabiola - Vivienda 1
      2: 200, // Samantha - Vivienda 2
      3: 200, // Erica - Vivienda 3
      4: 50,  // yadira - Vivienda 4 (mantener $50)
      5: 200, // Vero y Enrique - Vivienda 5
      6: 200, // Emma y Abel - Vivienda 6
      7: 200, // Emanuel - Vivienda 7
      8: 200  // juan - Vivienda 8
    };

    // Obtener todos los pagos
    const pagos = await Pago.find().populate('vivienda').lean();

    console.log(`📋 Total de pagos a revisar: ${pagos.length}\n`);

    let pagosCorregidos = 0;

    for (const pago of pagos) {
      if (pago.vivienda && pago.vivienda.numero) {
        const viviendaNumero = pago.vivienda.numero;
        const montoEstandar = montosEstandar[viviendaNumero];
        
        if (montoEstandar && pago.monto !== montoEstandar) {
          console.log(`🔧 Corrigiendo pago ${pago._id}:`);
          console.log(`   Vivienda: ${viviendaNumero}`);
          console.log(`   Mes: ${pago.mes}/${pago.año}`);
          console.log(`   Monto actual: $${pago.monto} → Monto estándar: $${montoEstandar}`);
          
          // Actualizar el pago
          await Pago.findByIdAndUpdate(pago._id, {
            monto: montoEstandar,
            // Si el pago ya está pagado, ajustar el saldo pendiente
            montoPagado: pago.montoPagado > montoEstandar ? montoEstandar : pago.montoPagado
          });
          
          pagosCorregidos++;
          console.log(`   ✅ Corregido\n`);
        }
      }
    }

    console.log(`\n📊 RESUMEN DE CORRECCIÓN:`);
    console.log(`=========================`);
    console.log(`✅ Pagos corregidos: ${pagosCorregidos}`);
    console.log(`📋 Total pagos revisados: ${pagos.length}`);

    // Verificar corrección
    console.log(`\n🔍 VERIFICACIÓN POST-CORRECCIÓN:`);
    console.log(`=================================`);
    
    const pagosActualizados = await Pago.find().populate('vivienda').lean();
    const montosPorVivienda = {};
    
    for (const pago of pagosActualizados) {
      if (pago.vivienda && pago.vivienda.numero) {
        const viviendaNumero = pago.vivienda.numero;
        if (!montosPorVivienda[viviendaNumero]) {
          montosPorVivienda[viviendaNumero] = new Set();
        }
        montosPorVivienda[viviendaNumero].add(pago.monto);
      }
    }
    
    for (const [vivienda, montos] of Object.entries(montosPorVivienda)) {
      const montosArray = Array.from(montos);
      console.log(`Vivienda ${vivienda}: $${montosArray.join(', $')} ${montosArray.length > 1 ? '⚠️' : '✅'}`);
    }

  } catch (error) {
    console.error('❌ Error en corrección:', error);
  } finally {
    mongoose.connection.close();
  }
}
