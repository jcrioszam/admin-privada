const mongoose = require('mongoose');
const Pago = require('../models/Pago');
const Vivienda = require('../models/Vivienda');
require('dotenv').config({ path: './config.env' });

async function verificarCorteDiario() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    const pagos = await Pago.find()
      .populate('vivienda', 'numero')
      .populate('residente', 'nombre apellidos')
      .sort({ fechaPago: -1 });

    console.log('\n=== TODOS LOS PAGOS ===');
    pagos.forEach(pago => {
      const fechaPago = pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString('es-ES') : 'Sin fecha';
      console.log(`${pago.vivienda?.numero || 'Sin vivienda'}: ${pago.mes}/${pago.año} - ${pago.estado} - Monto: $${pago.monto} - Pagado: $${pago.montoPagado || 0} - Fecha Pago: ${fechaPago}`);
    });

    const hoy = new Date().toISOString().split('T')[0];
    console.log(`\n=== PAGOS DE HOY (${hoy}) ===`);
    const pagosHoy = pagos.filter(p => p.fechaPago && p.fechaPago.toISOString().split('T')[0] === hoy);
    console.log(`Pagos de hoy: ${pagosHoy.length}`);
    pagosHoy.forEach(pago => {
      console.log(`${pago.vivienda?.numero}: ${pago.mes}/${pago.año} - ${pago.estado} - $${pago.monto}`);
    });

    // Verificar pagos pagados o con excedente de hoy
    const pagosPagadosHoy = pagos.filter(p => 
      p.fechaPago && 
      p.fechaPago.toISOString().split('T')[0] === hoy &&
      ['Pagado', 'Pagado con excedente'].includes(p.estado)
    );
    console.log(`\n=== PAGOS PAGADOS DE HOY (${hoy}) ===`);
    console.log(`Pagos pagados de hoy: ${pagosPagadosHoy.length}`);
    pagosPagadosHoy.forEach(pago => {
      console.log(`${pago.vivienda?.numero}: ${pago.mes}/${pago.año} - ${pago.estado} - $${pago.monto}`);
    });

    // Verificar el mes actual
    const mesActual = new Date().getMonth() + 1;
    const añoActual = new Date().getFullYear();
    console.log(`\n=== PAGOS DEL MES ACTUAL (${mesActual}/${añoActual}) ===`);
    const pagosMesActual = pagos.filter(p => p.mes === mesActual && p.año === añoActual);
    pagosMesActual.forEach(pago => {
      const fechaPago = pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString('es-ES') : 'Sin fecha';
      console.log(`${pago.vivienda?.numero}: ${pago.estado} - Monto: $${pago.monto} - Pagado: $${pago.montoPagado || 0} - Fecha Pago: ${fechaPago}`);
    });

    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verificarCorteDiario(); 