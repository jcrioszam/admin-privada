require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');

async function analizarMesesPendientes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los residentes activos
    const residentes = await Residente.find({ activo: true }).populate('vivienda');
    
    console.log(`🔍 Analizando ${residentes.length} residentes activos...\n`);

    let totalResidentes = 0;
    let residentesConPagosPendientes = 0;
    let totalMesesPendientes = 0;

    for (const residente of residentes) {
      totalResidentes++;
      
      console.log(`👤 ${residente.nombre} ${residente.apellidos} - Vivienda ${residente.vivienda?.numero || 'Sin vivienda'}`);
      console.log(`   📅 Fecha de ingreso: ${new Date(residente.fechaIngreso).toLocaleDateString()}`);
      
      // Calcular meses desde ingreso
      const fechaActual = new Date();
      const fechaIngreso = new Date(residente.fechaIngreso);
      
      const mesesDesdeIngreso = (fechaActual.getFullYear() - fechaIngreso.getFullYear()) * 12 + 
                               (fechaActual.getMonth() - fechaIngreso.getMonth());
      
      console.log(`   📊 Meses en el sistema: ${mesesDesdeIngreso}`);

      // Buscar pagos del residente
      const pagos = await Pago.find({ 
        vivienda: residente.vivienda._id,
        residente: residente._id 
      }).sort({ año: -1, mes: -1 });

      console.log(`   💰 Pagos registrados: ${pagos.length}`);
      
      // Calcular pagos pendientes
      let pagosPendientes = 0;
      let mesesPendientes = [];
      
      for (let i = 0; i <= mesesDesdeIngreso; i++) {
        const fechaPago = new Date(fechaIngreso);
        fechaPago.setMonth(fechaIngreso.getMonth() + i);
        
        const año = fechaPago.getFullYear();
        const mes = fechaPago.getMonth() + 1;
        
        const pago = pagos.find(p => p.año === año && p.mes === mes);
        
        if (!pago) {
          pagosPendientes++;
          mesesPendientes.push(`${mes}/${año}`);
        }
      }

      if (pagosPendientes > 0) {
        residentesConPagosPendientes++;
        totalMesesPendientes += pagosPendientes;
        console.log(`   ⚠️  MESES PENDIENTES: ${pagosPendientes}`);
        console.log(`   📋 Meses: ${mesesPendientes.join(', ')}`);
      } else {
        console.log(`   ✅ Al día con los pagos`);
      }

      // Mostrar pagos realizados
      if (pagos.length > 0) {
        console.log(`   💳 Pagos realizados:`);
        pagos.forEach(pago => {
          console.log(`      ${pago.mes}/${pago.año} - $${pago.monto} - ${pago.estado}`);
        });
      }

      console.log(''); // Línea en blanco
    }

    console.log('📊 RESUMEN GENERAL:');
    console.log(`   Total residentes analizados: ${totalResidentes}`);
    console.log(`   Residentes con pagos pendientes: ${residentesConPagosPendientes}`);
    console.log(`   Total meses pendientes: ${totalMesesPendientes}`);
    console.log(`   Promedio de meses pendientes por residente: ${residentesConPagosPendientes > 0 ? (totalMesesPendientes / residentesConPagosPendientes).toFixed(1) : 0}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

analizarMesesPendientes();
