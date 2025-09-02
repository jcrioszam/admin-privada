require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');

async function analizarTodosResidentes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('🔍 Analizando TODOS los residentes...\n');

    // 1. Obtener todos los residentes activos
    const residentes = await Residente.find({ activo: true })
      .populate('vivienda', 'numero calle')
      .sort({ 'vivienda.numero': 1 });
    
    console.log(`👥 Total de residentes activos: ${residentes.length}\n`);

    const problemasEncontrados = [];

    // 2. Analizar cada residente
    for (const residente of residentes) {
      console.log(`\n🏠 VIVIENDA ${residente.vivienda.numero} - ${residente.nombre} ${residente.apellidos}`);
      console.log(`   📅 Fecha de ingreso: ${residente.fechaIngreso}`);
      
      // Buscar pagos de esta vivienda
      const pagos = await Pago.find({ vivienda: residente.vivienda._id });
      console.log(`   💰 Pagos encontrados: ${pagos.length}`);
      
      // Verificar pagos sin residente
      const pagosSinResidente = pagos.filter(p => !p.residente);
      if (pagosSinResidente.length > 0) {
        console.log(`   ⚠️  ${pagosSinResidente.length} pago(s) sin residente`);
        problemasEncontrados.push({
          vivienda: residente.vivienda.numero,
          residente: `${residente.nombre} ${residente.apellidos}`,
          problema: `${pagosSinResidente.length} pago(s) sin residente`,
          tipo: 'pagos_sin_residente'
        });
      }
      
      // Verificar pagos anteriores a la fecha de ingreso
      const fechaIngreso = new Date(residente.fechaIngreso);
      const pagosAnteriores = pagos.filter(p => {
        const fechaPago = new Date(p.año, p.mes - 1, 1);
        return fechaPago < fechaIngreso && p.estado !== 'Pagado';
      });
      
      if (pagosAnteriores.length > 0) {
        console.log(`   ⚠️  ${pagosAnteriores.length} pago(s) anterior(es) al ingreso`);
        problemasEncontrados.push({
          vivienda: residente.vivienda.numero,
          residente: `${residente.nombre} ${residente.apellidos}`,
          problema: `${pagosAnteriores.length} pago(s) anterior(es) al ingreso`,
          tipo: 'pagos_anteriores'
        });
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
        console.log(`   ⚠️  ${pagosFaltantes.length} pago(s) faltante(s): ${pagosFaltantes.map(p => `${p.mes}/${p.año}`).join(', ')}`);
        problemasEncontrados.push({
          vivienda: residente.vivienda.numero,
          residente: `${residente.nombre} ${residente.apellidos}`,
          problema: `${pagosFaltantes.length} pago(s) faltante(s)`,
          tipo: 'pagos_faltantes',
          detalles: pagosFaltantes
        });
      }
      
      // Verificar si la fecha de ingreso es 31 de mayo (problema común)
      const fechaMayo31 = new Date(2025, 4, 31); // 31 de mayo
      if (fechaIngreso.getTime() === fechaMayo31.getTime()) {
        console.log(`   ⚠️  Fecha de ingreso es 31 de mayo (debería ser 1 de junio)`);
        problemasEncontrados.push({
          vivienda: residente.vivienda.numero,
          residente: `${residente.nombre} ${residente.apellidos}`,
          problema: 'Fecha de ingreso incorrecta (31 mayo vs 1 junio)',
          tipo: 'fecha_incorrecta'
        });
      }
      
      // Mostrar resumen de pagos por mes
      if (pagos.length > 0) {
        const pagosPorMes = {};
        pagos.forEach(p => {
          const key = `${p.mes}/${p.año}`;
          pagosPorMes[key] = (pagosPorMes[key] || 0) + 1;
        });
        
        const mesesDuplicados = Object.entries(pagosPorMes).filter(([mes, count]) => count > 1);
        if (mesesDuplicados.length > 0) {
          console.log(`   ⚠️  Meses duplicados: ${mesesDuplicados.map(([mes, count]) => `${mes} (${count})`).join(', ')}`);
          problemasEncontrados.push({
            vivienda: residente.vivienda.numero,
            residente: `${residente.nombre} ${residente.apellidos}`,
            problema: `Meses duplicados: ${mesesDuplicados.map(([mes, count]) => `${mes} (${count})`).join(', ')}`,
            tipo: 'meses_duplicados'
          });
        }
      }
      
      if (pagosSinResidente.length === 0 && pagosAnteriores.length === 0 && pagosFaltantes.length === 0 && fechaIngreso.getTime() !== fechaMayo31.getTime()) {
        console.log(`   ✅ Sin problemas detectados`);
      }
    }
    
    // 3. Resumen de problemas encontrados
    console.log(`\n📊 RESUMEN DE PROBLEMAS ENCONTRADOS:`);
    console.log(`   Total de problemas: ${problemasEncontrados.length}`);
    
    if (problemasEncontrados.length > 0) {
      console.log(`\n🔧 PROBLEMAS POR TIPO:`);
      
      const problemasPorTipo = {};
      problemasEncontrados.forEach(p => {
        problemasPorTipo[p.tipo] = (problemasPorTipo[p.tipo] || 0) + 1;
      });
      
      Object.entries(problemasPorTipo).forEach(([tipo, count]) => {
        console.log(`   ${tipo}: ${count} vivienda(s)`);
      });
      
      console.log(`\n📋 DETALLE DE PROBLEMAS:`);
      problemasEncontrados.forEach((p, index) => {
        console.log(`   ${index + 1}. Vivienda ${p.vivienda} - ${p.residente}`);
        console.log(`      Problema: ${p.problema}`);
        if (p.detalles) {
          console.log(`      Detalles: ${p.detalles.map(d => `${d.mes}/${d.año}`).join(', ')}`);
        }
      });
      
      console.log(`\n💡 RECOMENDACIONES:`);
      console.log(`   🔧 Se recomienda crear scripts de corrección para:`);
      if (problemasPorTipo.fecha_incorrecta) {
        console.log(`      - Corregir fechas de ingreso (${problemasPorTipo.fecha_incorrecta} vivienda(s))`);
      }
      if (problemasPorTipo.pagos_sin_residente) {
        console.log(`      - Asignar residentes a pagos (${problemasPorTipo.pagos_sin_residente} vivienda(s))`);
      }
      if (problemasPorTipo.pagos_faltantes) {
        console.log(`      - Generar pagos faltantes (${problemasPorTipo.pagos_faltantes} vivienda(s))`);
      }
      if (problemasPorTipo.meses_duplicados) {
        console.log(`      - Limpiar pagos duplicados (${problemasPorTipo.meses_duplicados} vivienda(s))`);
      }
    } else {
      console.log(`   ✅ No se encontraron problemas - todos los residentes tienen datos consistentes`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

analizarTodosResidentes();
