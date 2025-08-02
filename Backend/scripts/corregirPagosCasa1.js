const mongoose = require('mongoose');
const Pago = require('../models/Pago');
const Vivienda = require('../models/Vivienda');
require('dotenv').config({ path: './config.env' });

async function corregirPagosCasa1() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Buscar Casa 1
    const vivienda = await Vivienda.findOne({ numero: 'Casa 1' });
    if (!vivienda) {
      console.log('❌ No se encontró Casa 1');
      return;
    }

    console.log('✅ Vivienda encontrada:', vivienda._id);

    // Obtener pagos de Casa 1
    const pagosCasa1 = await Pago.find({ vivienda: vivienda._id })
      .populate('vivienda', 'numero')
      .populate('residente', 'nombre apellidos')
      .sort({ mes: 1, año: 1 });

    console.log('\n=== PAGOS ACTUALES DE CASA 1 ===');
    pagosCasa1.forEach(pago => {
      console.log(`${pago.mes}/${pago.año}: ${pago.estado} - Monto: $${pago.monto} - Pagado: $${pago.montoPagado || 0} - Saldo: $${pago.monto - (pago.montoPagado || 0)}`);
    });

    // Corregir pagos que están marcados como Parcial pero están completamente pagados
    let correcciones = 0;
    for (const pago of pagosCasa1) {
      const saldoPendiente = pago.monto - (pago.montoPagado || 0);
      
      if (pago.estado === 'Parcial' && saldoPendiente === 0) {
        console.log(`\n🔧 Corrigiendo pago ${pago.mes}/${pago.año}:`);
        console.log(`  - Estado actual: ${pago.estado}`);
        console.log(`  - Monto: $${pago.monto}`);
        console.log(`  - Pagado: $${pago.montoPagado}`);
        console.log(`  - Saldo: $${saldoPendiente}`);
        
        // Cambiar estado a Pagado
        pago.estado = 'Pagado';
        await pago.save();
        
        console.log(`  ✅ Estado cambiado a: ${pago.estado}`);
        correcciones++;
      }
    }

    if (correcciones === 0) {
      console.log('\n✅ No se encontraron pagos que necesiten corrección');
    } else {
      console.log(`\n✅ Se corrigieron ${correcciones} pagos`);
    }

    // Mostrar estado final
    console.log('\n=== ESTADO FINAL DE CASA 1 ===');
    const pagosFinales = await Pago.find({ vivienda: vivienda._id })
      .populate('vivienda', 'numero')
      .populate('residente', 'nombre apellidos')
      .sort({ mes: 1, año: 1 });

    pagosFinales.forEach(pago => {
      console.log(`${pago.mes}/${pago.año}: ${pago.estado} - Monto: $${pago.monto} - Pagado: $${pago.montoPagado || 0} - Saldo: $${pago.monto - (pago.montoPagado || 0)}`);
    });

  } catch (error) {
    console.error('Error corrigiendo pagos:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
    process.exit(0);
  }
}

corregirPagosCasa1(); 