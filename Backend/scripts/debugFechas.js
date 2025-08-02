const mongoose = require('mongoose');
const Pago = require('../models/Pago');
const Vivienda = require('../models/Vivienda');
const moment = require('moment');
require('dotenv').config({ path: './config.env' });

async function debugFechas() {
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
      .sort({ fechaPago: -1 });

    console.log('\n=== DEBUG DE FECHAS ===');
    const hoy = new Date().toISOString().split('T')[0];
    console.log(`Fecha de hoy: ${hoy}`);
    
    pagosCasa1.forEach(pago => {
      if (pago.fechaPago) {
        const fechaLocal = new Date(pago.fechaPago);
        const fechaUTC = fechaLocal.toISOString();
        const fechaLocalString = fechaLocal.toLocaleString('es-ES', { timeZone: 'America/Mexico_City' });
        
        console.log(`\nPago ${pago.mes}/${pago.año}:`);
        console.log(`- Fecha original: ${pago.fechaPago}`);
        console.log(`- Fecha local: ${fechaLocalString}`);
        console.log(`- Fecha UTC: ${fechaUTC}`);
        console.log(`- Día en local: ${fechaLocal.getDate()}`);
        console.log(`- Día en UTC: ${new Date(fechaUTC).getUTCDate()}`);
      }
    });

    // Probar diferentes rangos de búsqueda
    console.log('\n=== PRUEBAS DE RANGOS ===');
    
    // Rango 1: Usando moment
    const fechaInicio1 = moment(hoy).startOf('day').toDate();
    const fechaFin1 = moment(hoy).endOf('day').toDate();
    console.log(`Rango 1 (moment): ${fechaInicio1.toISOString()} - ${fechaFin1.toISOString()}`);
    
    // Rango 2: Usando Date con hora local
    const fechaInicio2 = new Date(hoy + 'T00:00:00');
    const fechaFin2 = new Date(hoy + 'T23:59:59.999');
    console.log(`Rango 2 (Date local): ${fechaInicio2.toISOString()} - ${fechaFin2.toISOString()}`);
    
    // Rango 3: Usando moment con zona horaria específica
    const fechaInicio3 = moment.tz(hoy, 'America/Mexico_City').startOf('day').toDate();
    const fechaFin3 = moment.tz(hoy, 'America/Mexico_City').endOf('day').toDate();
    console.log(`Rango 3 (moment tz): ${fechaInicio3.toISOString()} - ${fechaFin3.toISOString()}`);

    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugFechas(); 