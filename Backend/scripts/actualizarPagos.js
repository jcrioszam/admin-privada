const mongoose = require('mongoose');
const Pago = require('../models/Pago');
const moment = require('moment');
require('dotenv').config({ path: './config.env' });

async function actualizarPagos() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Obtener todos los pagos existentes
    const pagos = await Pago.find({});
    console.log(`Encontrados ${pagos.length} pagos`);

    let pagosActualizados = 0;

    for (const pago of pagos) {
      let necesitaActualizacion = false;
      let actualizacion = {};

      // Verificar si necesita los nuevos campos
      if (!pago.fechaInicioPeriodo || !pago.fechaFinPeriodo) {
        const fechaInicio = moment(`${pago.año}-${pago.mes.toString().padStart(2, '0')}-01`).toDate();
        const fechaFin = moment(`${pago.año}-${pago.mes.toString().padStart(2, '0')}-01`).endOf('month').toDate();
        
        actualizacion.fechaInicioPeriodo = fechaInicio;
        actualizacion.fechaFinPeriodo = fechaFin;
        necesitaActualizacion = true;
      }

      // Agregar campos por defecto si no existen
      if (pago.montoPagado === undefined) {
        actualizacion.montoPagado = 0;
        necesitaActualizacion = true;
      }

      if (pago.excedente === undefined) {
        actualizacion.excedente = 0;
        necesitaActualizacion = true;
      }

      if (pago.abonosAMesesFuturos === undefined) {
        actualizacion.abonosAMesesFuturos = [];
        necesitaActualizacion = true;
      }

      if (necesitaActualizacion) {
        await Pago.findByIdAndUpdate(pago._id, actualizacion);
        console.log(`✅ Pago actualizado: ${pago.vivienda} - ${pago.mes}/${pago.año}`);
        pagosActualizados++;
      } else {
        console.log(`ℹ️  Pago ya está actualizado: ${pago.vivienda} - ${pago.mes}/${pago.año}`);
      }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Pagos actualizados: ${pagosActualizados}`);
    console.log(`Total pagos procesados: ${pagos.length}`);

  } catch (error) {
    console.error('Error actualizando pagos:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar el script
actualizarPagos(); 