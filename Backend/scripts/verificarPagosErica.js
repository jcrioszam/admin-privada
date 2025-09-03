const mongoose = require('mongoose');
const Pago = require('../models/Pago');
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');

// Cargar variables de entorno
require('dotenv').config({ path: './config.env' });

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function verificarPagosErica() {
  try {
    console.log('🔍 Verificando pagos de Erica...\n');

    // Buscar residente Erica
    const erica = await Residente.findOne({ 
      $or: [
        { nombre: { $regex: /erica/i } },
        { apellidos: { $regex: /erica/i } }
      ]
    }).populate('vivienda');

    if (!erica) {
      console.log('❌ No se encontró residente Erica');
      return;
    }

    console.log('👤 Residente encontrado:');
    console.log(`   Nombre: ${erica.nombre} ${erica.apellidos}`);
    console.log(`   Vivienda: ${erica.vivienda?.numero || 'Sin vivienda'}`);
    console.log(`   Fecha ingreso: ${erica.fechaIngreso}`);
    console.log('');

    // Buscar todos los pagos de Erica
    const pagosErica = await Pago.find({ 
      residente: erica._id 
    }).populate('vivienda').sort({ año: 1, mes: 1 });

    console.log(`📋 Pagos encontrados: ${pagosErica.length}\n`);

    if (pagosErica.length === 0) {
      console.log('❌ No se encontraron pagos para Erica');
      return;
    }

    // Mostrar detalles de cada pago
    pagosErica.forEach((pago, index) => {
      console.log(`📄 Pago ${index + 1}:`);
      console.log(`   ID: ${pago._id}`);
      console.log(`   Mes/Año: ${pago.mes}/${pago.año}`);
      console.log(`   Monto: $${pago.monto}`);
      console.log(`   Estado: ${pago.estado}`);
      console.log(`   Fecha límite: ${pago.fechaLimite}`);
      console.log(`   Fecha pago: ${pago.fechaPago || 'No pagado'}`);
      console.log(`   Método pago: ${pago.metodoPago || 'No especificado'}`);
      console.log(`   Monto pagado: $${pago.montoPagado || 0}`);
      console.log(`   Monto adicional: $${pago.montoAdicional || 0}`);
      console.log(`   Concepto adicional: ${pago.conceptoAdicional || 'N/A'}`);
      console.log(`   Referencia: ${pago.referenciaPago || 'N/A'}`);
      console.log(`   Registrado por: ${pago.registradoPor}`);
      console.log(`   Creado: ${pago.createdAt}`);
      console.log(`   Actualizado: ${pago.updatedAt}`);
      console.log('');
    });

    // Resumen de estados
    const estados = pagosErica.reduce((acc, pago) => {
      acc[pago.estado] = (acc[pago.estado] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Resumen de estados:');
    Object.entries(estados).forEach(([estado, cantidad]) => {
      console.log(`   ${estado}: ${cantidad} pagos`);
    });

    // Verificar pagos recientes (últimos 30 días)
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    
    const pagosRecientes = pagosErica.filter(pago => 
      pago.updatedAt > hace30Dias
    );

    console.log(`\n🕒 Pagos actualizados en los últimos 30 días: ${pagosRecientes.length}`);
    pagosRecientes.forEach(pago => {
      console.log(`   ${pago.mes}/${pago.año} - ${pago.estado} - Actualizado: ${pago.updatedAt}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

verificarPagosErica();
