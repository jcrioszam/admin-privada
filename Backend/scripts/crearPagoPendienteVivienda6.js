const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const moment = require('moment');

// Cargar variables de entorno
dotenv.config({ path: './config.env' });

// Importar modelos
const Pago = require('../models/Pago');
const Vivienda = require('../models/Vivienda');
const Residente = require('../models/Residente');

const crearPagoPendienteVivienda6 = async () => {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('\n🔧 CREANDO PAGO PENDIENTE PARA VIVIENDA 6');
    console.log('==========================================');

    // Obtener la vivienda 6
    const vivienda6 = await Vivienda.findOne({ numero: 6 });
    if (!vivienda6) {
      console.log('❌ Vivienda 6 no encontrada');
      return;
    }

    // Obtener el residente de la vivienda 6
    const residente = await Residente.findOne({ vivienda: vivienda6._id });
    if (!residente) {
      console.log('❌ No hay residente asignado a la vivienda 6');
      return;
    }

    console.log(`👤 Residente: ${residente.nombre} ${residente.apellidos}`);
    console.log(`💰 Cuota: $${vivienda6.cuotaMantenimiento}`);

    // Crear un pago pendiente para el mes actual
    const ahora = moment();
    const mes = ahora.month() + 1; // moment usa 0-11, nosotros usamos 1-12
    const año = ahora.year();

    // Verificar si ya existe un pago para este mes
    const pagoExistente = await Pago.findOne({
      vivienda: vivienda6._id,
      mes: mes,
      año: año
    });

    if (pagoExistente) {
      console.log(`⚠️  Ya existe un pago para ${mes}/${año}`);
      return;
    }

    // Crear el pago pendiente
    const fechaInicio = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).toDate();
    const fechaFin = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).endOf('month').toDate();
    const fechaLimite = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).endOf('month').toDate();

    const nuevoPago = new Pago({
      vivienda: vivienda6._id,
      residente: residente._id,
      mes: mes,
      año: año,
      monto: vivienda6.cuotaMantenimiento,
      montoPagado: 0,
      excedente: 0,
      estado: 'Pendiente',
      metodoPago: 'Otro',
      fechaPago: null,
      fechaInicioPeriodo: fechaInicio,
      fechaFinPeriodo: fechaFin,
      fechaLimite: fechaLimite,
      registradoPor: new mongoose.Types.ObjectId()
    });

    await nuevoPago.save();

    console.log(`✅ Pago pendiente creado:`);
    console.log(`   Mes: ${mes}/${año}`);
    console.log(`   Monto: $${nuevoPago.monto}`);
    console.log(`   Estado: ${nuevoPago.estado}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
};

crearPagoPendienteVivienda6();
