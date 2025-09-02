require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');

async function analizarVivienda7() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('🔍 Analizando Vivienda 7...\n');

    // 1. Buscar la vivienda 7
    const vivienda = await Vivienda.findOne({ numero: 7 });
    if (!vivienda) {
      console.log('❌ Vivienda 7 no encontrada');
      return;
    }

    console.log('🏠 INFORMACIÓN DE LA VIVIENDA 7:');
    console.log(`   ID: ${vivienda._id}`);
    console.log(`   Número: ${vivienda.numero}`);
    console.log(`   Calle: ${vivienda.calle}`);
    console.log(`   Estado: ${vivienda.estado}`);
    console.log(`   Tipo de Ocupación: ${vivienda.tipoOcupacion}`);
    console.log(`   Fecha de Creación: ${vivienda.createdAt}`);
    console.log(`   Fecha de Actualización: ${vivienda.updatedAt}`);

    // 2. Buscar residentes de la vivienda 7
    const residentes = await Residente.find({ vivienda: vivienda._id });
    console.log(`\n👥 RESIDENTES ENCONTRADOS: ${residentes.length}`);
    
    if (residentes.length === 0) {
      console.log('   ❌ No hay residentes asignados a la vivienda 7');
    } else {
      residentes.forEach((residente, index) => {
        console.log(`\n   👤 Residente ${index + 1}:`);
        console.log(`      ID: ${residente._id}`);
        console.log(`      Nombre: ${residente.nombre} ${residente.apellidos}`);
        console.log(`      Tipo: ${residente.tipo}`);
        console.log(`      Teléfono: ${residente.telefono}`);
        console.log(`      Fecha de Ingreso: ${residente.fechaIngreso}`);
        console.log(`      Activo: ${residente.activo}`);
        console.log(`      Fecha de Creación: ${residente.createdAt}`);
        console.log(`      Fecha de Actualización: ${residente.updatedAt}`);
      });
    }

    // 3. Buscar pagos de la vivienda 7
    const pagos = await Pago.find({ vivienda: vivienda._id }).sort({ año: -1, mes: -1 });
    console.log(`\n💰 PAGOS ENCONTRADOS: ${pagos.length}`);
    
    if (pagos.length === 0) {
      console.log('   ❌ No hay pagos registrados para la vivienda 7');
    } else {
      pagos.forEach((pago, index) => {
        console.log(`\n   💳 Pago ${index + 1}:`);
        console.log(`      ID: ${pago._id}`);
        console.log(`      Período: ${pago.mes}/${pago.año}`);
        console.log(`      Monto: $${pago.monto}`);
        console.log(`      Estado: ${pago.estado}`);
        console.log(`      Fecha Límite: ${pago.fechaLimite}`);
        console.log(`      Fecha de Pago: ${pago.fechaPago || 'No pagado'}`);
        console.log(`      Residente ID: ${pago.residente || 'Sin residente'}`);
        console.log(`      Fecha de Creación: ${pago.createdAt}`);
        console.log(`      Fecha de Actualización: ${pago.updatedAt}`);
        
        // Calcular días de atraso
        if (pago.estado !== 'Pagado' && pago.estado !== 'Pagado con excedente') {
          const fechaLimite = new Date(pago.fechaLimite);
          const hoy = new Date();
          const diasAtraso = hoy > fechaLimite ? Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24)) : 0;
          console.log(`      Días de Atraso: ${diasAtraso}`);
        }
      });
    }

    // 4. Verificar inconsistencias
    console.log('\n🔍 ANÁLISIS DE INCONSISTENCIAS:');
    
    // Verificar si hay pagos sin residente
    const pagosSinResidente = pagos.filter(p => !p.residente);
    if (pagosSinResidente.length > 0) {
      console.log(`   ⚠️  ${pagosSinResidente.length} pagos sin residente asignado`);
      pagosSinResidente.forEach(pago => {
        console.log(`      - ${pago.mes}/${pago.año} (ID: ${pago._id})`);
      });
    }

    // Verificar si hay residentes activos pero pagos sin residente
    const residentesActivos = residentes.filter(r => r.activo);
    if (residentesActivos.length > 0 && pagosSinResidente.length > 0) {
      console.log(`   ⚠️  Hay ${residentesActivos.length} residente(s) activo(s) pero ${pagosSinResidente.length} pago(s) sin residente`);
    }

    // Verificar fechas de ingreso vs fechas de pagos
    if (residentesActivos.length > 0) {
      const residentePrincipal = residentesActivos[0];
      const fechaIngreso = new Date(residentePrincipal.fechaIngreso);
      const pagosAntesDeIngreso = pagos.filter(pago => {
        const fechaPago = new Date(pago.año, pago.mes - 1, 1);
        return fechaPago < fechaIngreso;
      });
      
      if (pagosAntesDeIngreso.length > 0) {
        console.log(`   ⚠️  ${pagosAntesDeIngreso.length} pago(s) anteriores a la fecha de ingreso del residente`);
        pagosAntesDeIngreso.forEach(pago => {
          console.log(`      - ${pago.mes}/${pago.año} (antes del ingreso: ${fechaIngreso.toLocaleDateString()})`);
        });
      }
    }

    // 5. Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    
    if (pagosSinResidente.length > 0 && residentesActivos.length > 0) {
      console.log('   1. Asignar el residente activo a los pagos sin residente');
      console.log('   2. Verificar que las fechas de los pagos sean consistentes con la fecha de ingreso');
    }
    
    if (residentesActivos.length === 0) {
      console.log('   1. Asignar un residente a la vivienda 7');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

analizarVivienda7();
