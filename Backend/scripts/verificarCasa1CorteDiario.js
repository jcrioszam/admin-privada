const mongoose = require('mongoose');
const Pago = require('../models/Pago');
const Vivienda = require('../models/Vivienda');
const moment = require('moment');
require('dotenv').config({ path: './config.env' });

async function verificarCasa1CorteDiario() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Obtener Casa 1
    const vivienda = await Vivienda.findOne({ numero: 'Casa 1' });
    if (!vivienda) {
      console.log('No se encontró Casa 1');
      return;
    }

    // Obtener todos los pagos de Casa 1
    const pagosCasa1 = await Pago.find({ vivienda: vivienda._id })
      .populate('vivienda', 'numero')
      .populate('residente', 'nombre apellidos')
      .sort({ fechaPago: -1 });

    console.log('\n=== TODOS LOS PAGOS DE CASA 1 ===');
    pagosCasa1.forEach(pago => {
      const fechaPago = pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString('es-ES') : 'Sin fecha';
      console.log(`${pago.mes}/${pago.año}: ${pago.estado} - Monto: $${pago.monto} - Pagado: $${pago.montoPagado || 0} - Fecha Pago: ${fechaPago}`);
    });

    // Verificar pagos de hoy
    const hoy = new Date().toISOString().split('T')[0];
    console.log(`\n=== PAGOS DE CASA 1 HOY (${hoy}) ===`);
    const pagosHoy = pagosCasa1.filter(p => p.fechaPago && p.fechaPago.toISOString().split('T')[0] === hoy);
    console.log(`Pagos de hoy: ${pagosHoy.length}`);
    pagosHoy.forEach(pago => {
      console.log(`${pago.mes}/${pago.año}: ${pago.estado} - $${pago.monto}`);
    });

    // Verificar pagos que deberían aparecer en corte diario (pagados o con excedente)
    const pagosCorteDiario = pagosCasa1.filter(p => 
      p.fechaPago && 
      p.fechaPago.toISOString().split('T')[0] === hoy &&
      ['Pagado', 'Pagado con excedente'].includes(p.estado)
    );
    console.log(`\n=== PAGOS QUE DEBERÍAN APARECER EN CORTE DIARIO ===`);
    console.log(`Pagos en corte diario: ${pagosCorteDiario.length}`);
    pagosCorteDiario.forEach(pago => {
      console.log(`${pago.mes}/${pago.año}: ${pago.estado} - $${pago.monto}`);
    });

    // Simular la consulta del backend usando moment con ajuste de zona horaria
    const fechaInicio = moment(hoy).subtract(6, 'hours').startOf('day').toDate();
    const fechaFin = moment(hoy).add(6, 'hours').endOf('day').toDate();

    console.log(`\n=== SIMULANDO CONSULTA DEL BACKEND ===`);
    console.log(`Rango de búsqueda: ${fechaInicio.toISOString()} - ${fechaFin.toISOString()}`);

    const pagosBackend = await Pago.find({
      fechaPago: {
        $gte: fechaInicio,
        $lte: fechaFin
      },
      estado: { $in: ['Pagado', 'Pagado con excedente'] }
    })
    .populate('vivienda', 'numero')
    .populate('residente', 'nombre apellidos')
    .sort({ fechaPago: -1 });

    console.log(`Pagos encontrados por backend: ${pagosBackend.length}`);
    pagosBackend.forEach(pago => {
      console.log(`- ${pago.vivienda?.numero}: ${pago.mes}/${pago.año} - ${pago.estado} - ${pago.fechaPago}`);
    });

    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verificarCasa1CorteDiario(); 