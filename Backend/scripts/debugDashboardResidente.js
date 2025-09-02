require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');
const PagoEspecial = require('../models/PagoEspecial');
const ProyectoPagoEspecial = require('../models/ProyectoPagoEspecial');

async function debugDashboardResidente() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const residenteId = '688fe404704bff74ebfb9444';
    console.log(`🔍 Analizando residente: ${residenteId}`);

    // Buscar el residente
    const residente = await Residente.findById(residenteId).populate('vivienda');
    
    if (!residente) {
      console.log('❌ Residente no encontrado');
      return;
    }

    console.log('👤 Residente encontrado:');
    console.log(`   Nombre: ${residente.nombre} ${residente.apellidos}`);
    console.log(`   Vivienda: ${residente.vivienda?.numero || 'Sin vivienda'}`);
    console.log(`   Fecha de ingreso: ${residente.fechaIngreso}`);
    console.log(`   Activo: ${residente.activo}`);

    // Calcular meses desde ingreso
    const fechaActual = new Date();
    const fechaIngreso = new Date(residente.fechaIngreso);
    
    console.log(`📅 Fecha actual: ${fechaActual.toISOString()}`);
    console.log(`📅 Fecha ingreso: ${fechaIngreso.toISOString()}`);
    
    const mesesDesdeIngreso = (fechaActual.getFullYear() - fechaIngreso.getFullYear()) * 12 + 
                             (fechaActual.getMonth() - fechaIngreso.getMonth());
    
    console.log(`📊 Meses desde ingreso: ${mesesDesdeIngreso}`);

    // Buscar pagos del residente
    const pagos = await Pago.find({ 
      vivienda: residente.vivienda._id,
      residente: residente._id 
    }).sort({ año: -1, mes: -1 });

    console.log(`💰 Pagos encontrados: ${pagos.length}`);
    pagos.forEach(pago => {
      console.log(`   ${pago.mes}/${pago.año} - $${pago.monto} - ${pago.estado}`);
    });

    // Calcular estadísticas
    let totalPagos = 0;
    let totalAtrasados = 0;
    let totalMorosos = 0;
    let pagosAtrasados = [];
    let pagosMorosos = [];

    console.log('\n📋 Calculando pagos esperados desde fecha de ingreso:');
    
    // Verificar pagos desde la fecha de ingreso
    for (let i = 0; i <= mesesDesdeIngreso; i++) {
      const fechaPago = new Date(fechaIngreso);
      fechaPago.setMonth(fechaIngreso.getMonth() + i);
      
      const año = fechaPago.getFullYear();
      const mes = fechaPago.getMonth() + 1;
      
      const pago = pagos.find(p => p.año === año && p.mes === mes);
      
      console.log(`   ${mes}/${año}: ${pago ? '✅ Pagado' : '❌ Pendiente'}`);
      
      if (!pago) {
        totalAtrasados++;
        const mesesAtraso = mesesDesdeIngreso - i;
        
        if (mesesAtraso >= 2) {
          totalMorosos++;
          pagosMorosos.push({
            mes: mes,
            año: año,
            mesesAtraso: mesesAtraso,
            monto: 200
          });
        } else {
          pagosAtrasados.push({
            mes: mes,
            año: año,
            mesesAtraso: mesesAtraso,
            monto: 200
          });
        }
      } else {
        totalPagos++;
      }
    }

    console.log('\n📊 Estadísticas calculadas:');
    console.log(`   Total pagos realizados: ${totalPagos}`);
    console.log(`   Total pagos atrasados: ${totalAtrasados}`);
    console.log(`   Total pagos morosos: ${totalMorosos}`);
    console.log(`   Pagos atrasados: ${pagosAtrasados.length}`);
    console.log(`   Pagos morosos: ${pagosMorosos.length}`);

    // Verificar proyectos especiales
    const pagosEspeciales = await PagoEspecial.find({ 
      residente: residente._id 
    }).populate('proyecto');

    console.log(`\n🏗️ Proyectos especiales: ${pagosEspeciales.length}`);
    pagosEspeciales.forEach(pago => {
      console.log(`   ${pago.proyecto?.nombre || 'Sin nombre'} - $${pago.monto} - ${pago.pagado ? 'Pagado' : 'Pendiente'}`);
    });

    const proyectosPendientes = pagosEspeciales.filter(p => !p.pagado).length;
    const proyectosVencidos = pagosEspeciales.filter(p => {
      if (p.pagado) return false;
      const fechaLimite = new Date(p.fechaLimite);
      return fechaLimite < fechaActual;
    }).length;

    console.log(`   Proyectos pendientes: ${proyectosPendientes}`);
    console.log(`   Proyectos vencidos: ${proyectosVencidos}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

debugDashboardResidente();
