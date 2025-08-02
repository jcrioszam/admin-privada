const mongoose = require('mongoose');
const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');
const moment = require('moment');
require('dotenv').config({ path: './config.env' });

async function verificarPagos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Obtener mes y año actual
    const mesActual = moment().month() + 1;
    const añoActual = moment().year();

    console.log(`\n=== MES ACTUAL: ${mesActual}/${añoActual} ===`);

    // Obtener todas las viviendas
    const viviendas = await Vivienda.find();
    console.log(`📋 Total de viviendas: ${viviendas.length}`);

    // Obtener todos los pagos
    const pagos = await Pago.find().populate('vivienda', 'numero').sort({ fechaInicioPeriodo: 1 });
    
    console.log('\n=== PAGOS EXISTENTES ===');
    pagos.forEach(pago => {
      const fecha = new Date(pago.fechaInicioPeriodo);
      console.log(`${pago.vivienda.numero}: ${fecha.getMonth() + 1}/${fecha.getFullYear()} - ${pago.estado} - $${pago.monto}`);
    });

    // Verificar pagos del mes actual
    const pagosMesActual = pagos.filter(p => p.mes === mesActual && p.año === añoActual);
    console.log(`\n📊 Pagos del mes actual (${mesActual}/${añoActual}): ${pagosMesActual.length}`);

    if (pagosMesActual.length === 0) {
      console.log('❌ NO HAY PAGOS DEL MES ACTUAL');
      console.log('🔧 Generando pagos del mes actual...');
      
      // Generar pagos del mes actual para todas las viviendas
      for (const vivienda of viviendas) {
        const nuevoPago = new Pago({
          vivienda: vivienda._id,
          mes: mesActual,
          año: añoActual,
          monto: 500, // Monto por defecto
          montoPagado: 0,
          excedente: 0,
          estado: 'Pendiente',
          metodoPago: 'Otro',
          fechaPago: null,
          fechaInicioPeriodo: moment().startOf('month').toDate(),
          fechaFinPeriodo: moment().endOf('month').toDate(),
          fechaLimite: moment().endOf('month').toDate(),
          registradoPor: new mongoose.Types.ObjectId()
        });

        await nuevoPago.save();
        console.log(`✅ Pago generado para ${vivienda.numero} - ${mesActual}/${añoActual}`);
      }
    } else {
      console.log('✅ Ya existen pagos del mes actual');
      pagosMesActual.forEach(pago => {
        console.log(`  - ${pago.vivienda.numero}: ${pago.estado}`);
      });
    }

    // Mostrar resumen por vivienda
    console.log('\n=== RESUMEN POR VIVIENDA ===');
    for (const vivienda of viviendas) {
      const pagosVivienda = pagos.filter(p => p.vivienda._id.toString() === vivienda._id.toString());
      const pagosPendientes = pagosVivienda.filter(p => p.estado === 'Pendiente' || p.estado === 'Vencido' || p.estado === 'Parcial');
      
      console.log(`${vivienda.numero}:`);
      console.log(`  - Total pagos: ${pagosVivienda.length}`);
      console.log(`  - Pendientes: ${pagosPendientes.length}`);
      
      if (pagosPendientes.length > 0) {
        const totalAdeudo = pagosPendientes.reduce((sum, p) => sum + (p.monto - (p.montoPagado || 0)), 0);
        console.log(`  - Total adeudo: $${totalAdeudo}`);
      }
    }

  } catch (error) {
    console.error('Error verificando pagos:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
    process.exit(0);
  }
}

verificarPagos(); 