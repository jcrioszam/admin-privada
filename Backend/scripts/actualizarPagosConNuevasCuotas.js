const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: './config.env' });

// Importar modelos
const Pago = require('../models/Pago');
const Vivienda = require('../models/Vivienda');
const Residente = require('../models/Residente');

const actualizarPagosConNuevasCuotas = async () => {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('\n🔧 ACTUALIZANDO PAGOS CON NUEVAS CUOTAS');
    console.log('==========================================');

    // Obtener todas las viviendas con sus cuotas
    const viviendas = await Vivienda.find({}, 'numero cuotaMantenimiento tipoCuota');
    const cuotasPorVivienda = {};
    
    viviendas.forEach(v => {
      cuotasPorVivienda[v.numero] = v.cuotaMantenimiento;
    });

    console.log('📋 Cuotas por vivienda:');
    Object.entries(cuotasPorVivienda).forEach(([numero, cuota]) => {
      console.log(`   Vivienda ${numero}: $${cuota}`);
    });

    // Obtener todos los pagos pendientes
    const pagosPendientes = await Pago.find({ 
      estado: 'Pendiente' 
    }).populate('vivienda', 'numero cuotaMantenimiento');

    console.log(`\n📊 Total de pagos pendientes: ${pagosPendientes.length}`);

    let actualizados = 0;
    let sinCambios = 0;

    for (const pago of pagosPendientes) {
      const vivienda = pago.vivienda;
      
      // Verificar si la vivienda existe
      if (!vivienda || !vivienda.numero) {
        console.log(`⚠️  Pago ${pago._id} sin vivienda asociada - saltando`);
        sinCambios++;
        continue;
      }
      
      const nuevaCuota = cuotasPorVivienda[vivienda.numero];
      const cuotaActual = pago.monto;

      if (nuevaCuota && cuotaActual !== nuevaCuota) {
        console.log(`🔧 Actualizando pago ${pago._id}:`);
        console.log(`   Vivienda ${vivienda.numero}: $${cuotaActual} → $${nuevaCuota}`);
        
        // Actualizar el monto del pago
        await Pago.findByIdAndUpdate(pago._id, {
          monto: nuevaCuota,
          saldoPendiente: nuevaCuota - (pago.montoPagado || 0)
        });

        actualizados++;
        console.log('   ✅ Actualizado');
      } else {
        sinCambios++;
      }
    }

    console.log('\n📊 RESUMEN DE ACTUALIZACIÓN:');
    console.log('=============================');
    console.log(`✅ Pagos actualizados: ${actualizados}`);
    console.log(`📋 Pagos sin cambios: ${sinCambios}`);
    console.log(`📊 Total procesados: ${pagosPendientes.length}`);

    // Verificar algunos pagos actualizados
    console.log('\n🔍 VERIFICACIÓN DE PAGOS ACTUALIZADOS:');
    console.log('=====================================');
    
    const pagosVerificacion = await Pago.find({ estado: 'Pendiente' })
      .populate('vivienda', 'numero cuotaMantenimiento')
      .limit(5);

    pagosVerificacion.forEach(pago => {
      console.log(`   Vivienda ${pago.vivienda.numero}: $${pago.monto} (${pago.estado})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
};

actualizarPagosConNuevasCuotas();
