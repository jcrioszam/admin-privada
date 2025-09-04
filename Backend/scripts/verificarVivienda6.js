const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: './config.env' });

// Importar modelos
const Pago = require('../models/Pago');
const Vivienda = require('../models/Vivienda');
const Residente = require('../models/Residente');

const verificarVivienda6 = async () => {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('\n🔍 VERIFICANDO VIVIENDA 6 (Emma y Abel)');
    console.log('=======================================');

    // Obtener la vivienda 6
    const vivienda6 = await Vivienda.findOne({ numero: 6 });
    if (!vivienda6) {
      console.log('❌ Vivienda 6 no encontrada');
      return;
    }

    console.log(`💰 Cuota configurada: $${vivienda6.cuotaMantenimiento}`);
    console.log(`🏷️  Tipo de cuota: ${vivienda6.tipoCuota}`);

    // Obtener el residente de la vivienda 6
    const residente = await Residente.findOne({ vivienda: vivienda6._id });
    if (residente) {
      console.log(`👤 Residente: ${residente.nombre} ${residente.apellidos}`);
    } else {
      console.log('❌ No hay residente asignado a la vivienda 6');
    }

    // Obtener todos los pagos de la vivienda 6
    const pagos = await Pago.find({ vivienda: vivienda6._id })
      .sort({ año: -1, mes: -1 });

    console.log(`\n📊 Total de pagos: ${pagos.length}`);

    if (pagos.length > 0) {
      console.log('\n📋 Lista de pagos:');
      pagos.forEach(pago => {
        console.log(`   - ${pago.mes}/${pago.año}: $${pago.monto} (${pago.estado}) - Saldo: $${pago.saldoPendiente}`);
      });

      // Verificar pagos pendientes
      const pagosPendientes = pagos.filter(p => p.estado === 'Pendiente');
      console.log(`\n⏳ Pagos pendientes: ${pagosPendientes.length}`);
      
      if (pagosPendientes.length > 0) {
        const totalPendiente = pagosPendientes.reduce((sum, p) => sum + p.monto, 0);
        console.log(`💰 Total pendiente: $${totalPendiente}`);
      }
    } else {
      console.log('❌ No hay pagos para la vivienda 6');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
};

verificarVivienda6();
