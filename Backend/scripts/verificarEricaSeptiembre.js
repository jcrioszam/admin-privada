const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');
const Residente = require('../models/Residente');

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('🔗 Conectado a MongoDB');
    await verificarEricaSeptiembre();
  })
  .catch(error => {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  });

async function verificarEricaSeptiembre() {
  try {
    console.log('🔍 VERIFICANDO ERICA - SEPTIEMBRE 2025');
    console.log('=====================================');

    // 1. Verificar vivienda 3
    const vivienda3 = await Vivienda.findOne({ numero: 3 });
    console.log('\n🏠 VIVIENDA 3:');
    console.log(`- Número: ${vivienda3?.numero}`);
    console.log(`- Cuota: $${vivienda3?.cuotaMantenimiento}`);

    // 2. Verificar residente de vivienda 3
    const residente = await Residente.findOne({ vivienda: vivienda3?._id });
    console.log('\n👤 RESIDENTE:');
    console.log(`- Nombre: ${residente?.nombre} ${residente?.apellidos}`);

    // 3. Verificar TODOS los pagos de vivienda 3 (incluyendo septiembre)
    const pagos = await Pago.find({ vivienda: vivienda3?._id })
      .sort({ año: -1, mes: -1 });
    
    console.log('\n💰 TODOS LOS PAGOS:');
    pagos.forEach(pago => {
      const fechaPago = pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString() : 'No pagado';
      console.log(`- ${pago.mes}/${pago.año}: $${pago.monto} (${pago.estado}) - Fecha: ${fechaPago}`);
    });

    // 4. Verificar específicamente septiembre 2025
    const pagoSeptiembre = await Pago.findOne({ 
      vivienda: vivienda3?._id, 
      mes: 9, 
      año: 2025 
    });

    console.log('\n🔍 PAGO SEPTIEMBRE 2025:');
    if (pagoSeptiembre) {
      console.log(`- Existe: ${pagoSeptiembre.mes}/${pagoSeptiembre.año}`);
      console.log(`- Monto: $${pagoSeptiembre.monto}`);
      console.log(`- Estado: ${pagoSeptiembre.estado}`);
      console.log(`- Fecha pago: ${pagoSeptiembre.fechaPago ? new Date(pagoSeptiembre.fechaPago).toLocaleDateString() : 'No pagado'}`);
      console.log(`- Saldo pendiente: $${pagoSeptiembre.saldoPendiente || pagoSeptiembre.monto}`);
    } else {
      console.log('- No existe pago para septiembre 2025');
    }

    // 5. Verificar pagos pendientes
    const pagosPendientes = pagos.filter(p => p.estado === 'Pendiente');
    console.log('\n⏳ PAGOS PENDIENTES:');
    if (pagosPendientes.length === 0) {
      console.log('- No hay pagos pendientes');
    } else {
      pagosPendientes.forEach(pago => {
        console.log(`- ${pago.mes}/${pago.año}: $${pago.monto} - Saldo: $${pago.saldoPendiente || pago.monto}`);
      });
    }

    // 6. Verificar pagos atrasados
    const hoy = new Date();
    const pagosAtrasados = pagos.filter(pago => {
      if (pago.estado !== 'Pendiente') return false;
      
      const fechaLimite = new Date(pago.año, pago.mes - 1, 0); // Último día del mes
      return fechaLimite < hoy;
    });

    console.log('\n⚠️ PAGOS ATRASADOS:');
    if (pagosAtrasados.length === 0) {
      console.log('- No hay pagos atrasados');
    } else {
      pagosAtrasados.forEach(pago => {
        const fechaLimite = new Date(pago.año, pago.mes - 1, 0);
        const diasAtraso = Math.floor((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
        console.log(`- ${pago.mes}/${pago.año}: $${pago.monto} - ${diasAtraso} días de atraso`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}
