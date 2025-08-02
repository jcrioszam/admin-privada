const mongoose = require('mongoose');
const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');
const Configuracion = require('../models/Configuracion');
const moment = require('moment');
require('dotenv').config({ path: './config.env' });

async function generarPagosMensuales() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    const fechaActual = moment();
    const mes = fechaActual.month() + 1; // moment usa 0-11, necesitamos 1-12
    const año = fechaActual.year();

    console.log(`Generando pagos para ${mes}/${año}`);

    // Obtener configuración global
    let configuracion = await Configuracion.findOne({ activo: true });
    if (!configuracion) {
      // Crear configuración por defecto si no existe
      configuracion = new Configuracion({
        cuotaMantenimientoMensual: 500,
        nombreFraccionamiento: 'Fraccionamiento Privado',
        diasGraciaPago: 5,
        porcentajeRecargo: 10,
        activo: true
      });
      await configuracion.save();
      console.log('Configuración por defecto creada');
    }

    // Obtener todas las viviendas
    const viviendas = await Vivienda.find({ estado: { $ne: 'En construcción' } });
    console.log(`Encontradas ${viviendas.length} viviendas`);

    let pagosGenerados = 0;
    let pagosExistentes = 0;

    for (const vivienda of viviendas) {
      // Verificar si ya existe un pago para este mes/año
      const pagoExistente = await Pago.findOne({
        vivienda: vivienda._id,
        mes: mes,
        año: año
      });

      if (pagoExistente) {
        console.log(`Pago ya existe para ${vivienda.numero} - ${mes}/${año}`);
        pagosExistentes++;
        continue;
      }

      // Crear nuevo pago
      const fechaInicio = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).toDate();
      const fechaFin = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).endOf('month').toDate();
      const fechaLimite = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).endOf('month').toDate();

      const nuevoPago = new Pago({
        vivienda: vivienda._id,
        residente: vivienda.residente || undefined,
        mes: mes,
        año: año,
        monto: configuracion.cuotaMantenimientoMensual,
        fechaInicioPeriodo: fechaInicio,
        fechaFinPeriodo: fechaFin,
        fechaLimite: fechaLimite,
        estado: 'Pendiente',
        metodoPago: 'Otro',
        registradoPor: new mongoose.Types.ObjectId()
      });

      await nuevoPago.save();
      console.log(`Pago generado para ${vivienda.numero} - ${mes}/${año} ($${configuracion.cuotaMantenimientoMensual})`);
      pagosGenerados++;
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Pagos generados: ${pagosGenerados}`);
    console.log(`Pagos ya existentes: ${pagosExistentes}`);
    console.log(`Total viviendas procesadas: ${viviendas.length}`);
    console.log(`Cuota mensual aplicada: $${configuracion.cuotaMantenimientoMensual}`);

  } catch (error) {
    console.error('Error generando pagos:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar el script
generarPagosMensuales(); 