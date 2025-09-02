require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');

async function analizarYadira() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('🔍 Analizando residente Yadira...\n');

    // 1. Buscar a Yadira
    const residente = await Residente.findOne({ 
      $or: [
        { nombre: { $regex: /yadira/i } },
        { apellidos: { $regex: /yadira/i } }
      ]
    });
    
    if (!residente) {
      console.log('❌ Residente Yadira no encontrado');
      return;
    }

    console.log(`👤 RESIDENTE ENCONTRADO:`);
    console.log(`   ID: ${residente._id}`);
    console.log(`   Nombre: ${residente.nombre} ${residente.apellidos}`);
    console.log(`   Teléfono: ${residente.telefono}`);
    console.log(`   Tipo: ${residente.tipo}`);
    console.log(`   Fecha de Ingreso: ${residente.fechaIngreso}`);
    console.log(`   Activo: ${residente.activo}`);
    console.log(`   Fecha de Creación: ${residente.createdAt}`);
    console.log(`   Fecha de Actualización: ${residente.updatedAt}`);

    // 2. Buscar la vivienda asociada
    const vivienda = await Vivienda.findById(residente.vivienda);
    if (vivienda) {
      console.log(`\n🏠 VIVIENDA ASOCIADA:`);
      console.log(`   ID: ${vivienda._id}`);
      console.log(`   Número: ${vivienda.numero}`);
      console.log(`   Calle: ${vivienda.calle}`);
      console.log(`   Estado: ${vivienda.estado}`);
      console.log(`   Tipo de Ocupación: ${vivienda.tipoOcupacion}`);
    }

    // 3. Buscar todos los pagos de esta vivienda
    const pagos = await Pago.find({ vivienda: vivienda._id });
    
    console.log(`\n💰 PAGOS ENCONTRADOS: ${pagos.length}`);

    if (pagos.length > 0) {
      for (let i = 0; i < pagos.length; i++) {
        const pago = pagos[i];
        console.log(`\n   💳 Pago ${i + 1}:`);
        console.log(`      ID: ${pago._id}`);
        console.log(`      Período: ${pago.mes}/${pago.año}`);
        console.log(`      Monto: $${pago.monto}`);
        console.log(`      Estado: ${pago.estado}`);
        console.log(`      Fecha Límite: ${pago.fechaLimite}`);
        console.log(`      Fecha de Pago: ${pago.fechaPago || 'No pagado'}`);
        console.log(`      Residente ID: ${pago.residente || 'Sin residente'}`);
        console.log(`      Método de Pago: ${pago.metodoPago || 'No especificado'}`);
        console.log(`      Registrado Por: ${pago.registradoPor || 'No especificado'}`);
        console.log(`      Días de Atraso: ${pago.diasAtraso ? pago.diasAtraso() : 'N/A'}`);
        console.log(`      Fecha de Creación: ${pago.createdAt}`);
        console.log(`      Fecha de Actualización: ${pago.updatedAt}`);
      }
    }

    // 4. Análisis de inconsistencias
    console.log(`\n🔍 ANÁLISIS DE INCONSISTENCIAS:`);
    
    // Verificar pagos sin residente
    const pagosSinResidente = pagos.filter(p => !p.residente);
    if (pagosSinResidente.length > 0) {
      console.log(`   ⚠️  ${pagosSinResidente.length} pago(s) sin residente asignado`);
    } else {
      console.log(`   ✅ Todos los pagos tienen residente asignado`);
    }

    // Verificar pagos anteriores a la fecha de ingreso
    const fechaIngreso = new Date(residente.fechaIngreso);
    const pagosAnteriores = pagos.filter(p => {
      const fechaPago = new Date(p.año, p.mes - 1, 1);
      return fechaPago < fechaIngreso && p.estado !== 'Pagado';
    });
    
    if (pagosAnteriores.length > 0) {
      console.log(`   ⚠️  ${pagosAnteriores.length} pago(s) anterior(es) a la fecha de ingreso y no pagado(s)`);
      pagosAnteriores.forEach(p => {
        const fechaPago = new Date(p.año, p.mes - 1, 1);
        console.log(`      - Pago ${p.mes}/${p.año} (${fechaPago.toLocaleDateString()}) vs Ingreso (${fechaIngreso.toLocaleDateString()})`);
      });
    } else {
      console.log(`   ✅ No hay pagos anteriores a la fecha de ingreso sin pagar`);
    }

    // Verificar pagos faltantes
    const fechaActual = new Date();
    const mesesDesdeIngreso = (fechaActual.getFullYear() - fechaIngreso.getFullYear()) * 12 + 
                             (fechaActual.getMonth() - fechaIngreso.getMonth());
    
    const pagosFaltantes = [];
    for (let i = 0; i <= mesesDesdeIngreso; i++) {
      const fechaPago = new Date(fechaIngreso);
      fechaPago.setMonth(fechaIngreso.getMonth() + i);
      
      const año = fechaPago.getFullYear();
      const mes = fechaPago.getMonth() + 1;
      
      const pagoExistente = pagos.find(p => p.año === año && p.mes === mes);
      if (!pagoExistente) {
        pagosFaltantes.push({ mes, año });
      }
    }
    
    if (pagosFaltantes.length > 0) {
      console.log(`   ⚠️  ${pagosFaltantes.length} pago(s) faltante(s):`);
      pagosFaltantes.forEach(p => {
        console.log(`      - ${p.mes}/${p.año}`);
      });
    } else {
      console.log(`   ✅ Todos los pagos necesarios existen`);
    }

    // 5. Recomendaciones
    console.log(`\n💡 RECOMENDACIONES:`);
    if (pagosSinResidente.length > 0 || pagosAnteriores.length > 0 || pagosFaltantes.length > 0) {
      console.log(`   🔧 Se recomienda ejecutar un script de corrección para:`);
      if (pagosSinResidente.length > 0) console.log(`      - Asignar residente a ${pagosSinResidente.length} pago(s)`);
      if (pagosAnteriores.length > 0) console.log(`      - Ajustar ${pagosAnteriores.length} pago(s) anterior(es) al ingreso`);
      if (pagosFaltantes.length > 0) console.log(`      - Generar ${pagosFaltantes.length} pago(s) faltante(s)`);
    } else {
      console.log(`   ✅ No se requieren correcciones - datos consistentes`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

analizarYadira();
