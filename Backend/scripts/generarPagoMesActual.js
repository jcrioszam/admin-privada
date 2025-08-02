const mongoose = require('mongoose');
const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');
const Configuracion = require('../models/Configuracion');
const moment = require('moment');
require('dotenv').config({ path: './config.env' });

async function generarPagoMesActual() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Obtener configuración
    let configuracion = await Configuracion.findOne({ activo: true });
    if (!configuracion) {
      console.log('❌ No hay configuración activa');
      return;
    }

    // Obtener mes y año actual
    const mesActual = moment().month() + 1;
    const añoActual = moment().year();

    console.log(`\n=== GENERANDO PAGOS DEL MES ACTUAL (${mesActual}/${añoActual}) ===`);

    // Obtener todas las viviendas
    const viviendas = await Vivienda.find();
    console.log(`📋 Total de viviendas: ${viviendas.length}`);

    let pagosGenerados = 0;
    let pagosExistentes = 0;

    for (const vivienda of viviendas) {
      // Verificar si ya existe un pago para el mes actual
      const pagoExistente = await Pago.findOne({
        vivienda: vivienda._id,
        mes: mesActual,
        año: añoActual
      });

      if (pagoExistente) {
        console.log(`ℹ️  Pago ya existe para ${vivienda.numero} - ${mesActual}/${añoActual}`);
        pagosExistentes++;
        continue;
      }

      // Crear pago del mes actual
      const nuevoPago = new Pago({
        vivienda: vivienda._id,
        mes: mesActual,
        año: añoActual,
        monto: configuracion.cuotaMantenimientoMensual,
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
      pagosGenerados++;
    }

    console.log('\n=== RESUMEN ===');
    console.log(`✅ Pagos generados: ${pagosGenerados}`);
    console.log(`ℹ️  Pagos ya existentes: ${pagosExistentes}`);
    console.log(`📊 Total procesado: ${pagosGenerados + pagosExistentes}`);

  } catch (error) {
    console.error('Error generando pagos del mes actual:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
    process.exit(0);
  }
}

generarPagoMesActual(); 