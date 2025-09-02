require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');

async function corregirVivienda7() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('🔧 Corrigiendo problemas de la Vivienda 7...\n');

    // 1. Buscar la vivienda 7
    const vivienda = await Vivienda.findOne({ numero: 7 });
    if (!vivienda) {
      console.log('❌ Vivienda 7 no encontrada');
      return;
    }

    // 2. Buscar el residente activo
    const residente = await Residente.findOne({ 
      vivienda: vivienda._id, 
      activo: true 
    });
    
    if (!residente) {
      console.log('❌ No hay residente activo en la vivienda 7');
      return;
    }

    console.log(`👤 Residente encontrado: ${residente.nombre} ${residente.apellidos} (ID: ${residente._id})`);
    console.log(`📅 Fecha de ingreso: ${residente.fechaIngreso}`);

    // 3. Buscar pagos sin residente
    const pagosSinResidente = await Pago.find({ 
      vivienda: vivienda._id,
      residente: { $exists: false }
    });

    console.log(`\n💰 Pagos sin residente encontrados: ${pagosSinResidente.length}`);

    if (pagosSinResidente.length === 0) {
      console.log('✅ No hay pagos sin residente que corregir');
      return;
    }

    // 4. Corregir cada pago
    for (const pago of pagosSinResidente) {
      console.log(`\n🔧 Corrigiendo pago ${pago.mes}/${pago.año}...`);
      
      // Asignar el residente
      pago.residente = residente._id;
      
      // Verificar si el pago es anterior a la fecha de ingreso
      const fechaIngreso = new Date(residente.fechaIngreso);
      const fechaPago = new Date(pago.año, pago.mes - 1, 1);
      
      if (fechaPago < fechaIngreso) {
        console.log(`   ⚠️  Pago ${pago.mes}/${pago.año} es anterior a la fecha de ingreso (${fechaIngreso.toLocaleDateString()})`);
        console.log(`   💡 Marcando como pagado automáticamente (no debería existir)`);
        pago.estado = 'Pagado';
        pago.fechaPago = fechaIngreso; // Fecha de ingreso como fecha de pago
        pago.metodoPago = 'Ajuste automático';
        pago.referenciaPago = 'Pago anterior al ingreso - ajustado automáticamente';
      } else {
        console.log(`   ✅ Pago ${pago.mes}/${pago.año} es posterior a la fecha de ingreso - manteniendo como pendiente`);
      }
      
      // Guardar el pago corregido
      await pago.save();
      console.log(`   ✅ Pago ${pago.mes}/${pago.año} corregido exitosamente`);
    }

    // 5. Verificar si necesitamos generar pagos faltantes
    const fechaIngreso = new Date(residente.fechaIngreso);
    const fechaActual = new Date();
    
    // Calcular meses desde el ingreso hasta ahora
    const mesesDesdeIngreso = (fechaActual.getFullYear() - fechaIngreso.getFullYear()) * 12 + 
                             (fechaActual.getMonth() - fechaIngreso.getMonth());
    
    console.log(`\n📊 Meses desde ingreso: ${mesesDesdeIngreso}`);
    
    // Verificar qué pagos deberían existir
    const pagosExistentes = await Pago.find({ 
      vivienda: vivienda._id,
      residente: residente._id 
    });
    
    console.log(`💰 Pagos existentes con residente: ${pagosExistentes.length}`);
    
    // Generar pagos faltantes desde la fecha de ingreso
    const pagosFaltantes = [];
    for (let i = 0; i <= mesesDesdeIngreso; i++) {
      const fechaPago = new Date(fechaIngreso);
      fechaPago.setMonth(fechaIngreso.getMonth() + i);
      
      const año = fechaPago.getFullYear();
      const mes = fechaPago.getMonth() + 1;
      
      // Verificar si ya existe un pago para este mes/año
      const pagoExistente = pagosExistentes.find(p => p.año === año && p.mes === mes);
      
      if (!pagoExistente) {
        pagosFaltantes.push({ mes, año });
      }
    }
    
    if (pagosFaltantes.length > 0) {
      console.log(`\n📝 Generando ${pagosFaltantes.length} pagos faltantes:`);
      
      for (const { mes, año } of pagosFaltantes) {
        const fechaLimite = new Date(año, mes, 0); // Último día del mes
        
        const nuevoPago = new Pago({
          vivienda: vivienda._id,
          residente: residente._id,
          mes: mes,
          año: año,
          monto: 200, // Monto por defecto
          estado: 'Pendiente',
          fechaLimite: fechaLimite,
          fechaInicioPeriodo: new Date(año, mes - 1, 1),
          fechaFinPeriodo: fechaLimite
        });
        
        await nuevoPago.save();
        console.log(`   ✅ Pago ${mes}/${año} generado`);
      }
    } else {
      console.log(`\n✅ Todos los pagos necesarios ya existen`);
    }

    // 6. Resumen final
    console.log('\n📊 RESUMEN DE CORRECCIONES:');
    console.log(`   ✅ ${pagosSinResidente.length} pago(s) corregido(s) con residente asignado`);
    console.log(`   ✅ ${pagosFaltantes.length} pago(s) faltante(s) generado(s)`);
    console.log(`   ✅ Vivienda 7 ahora tiene datos consistentes`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

corregirVivienda7();
