require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');

async function corregirFechaVivienda7() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('🔧 Corrigiendo fecha de ingreso de la Vivienda 7...\n');

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

    console.log(`👤 Residente encontrado: ${residente.nombre} ${residente.apellidos}`);
    console.log(`📅 Fecha actual de ingreso: ${residente.fechaIngreso}`);
    
    // 3. Corregir la fecha de ingreso a 1 de junio de 2025
    const nuevaFechaIngreso = new Date(2025, 5, 1); // Mes 5 = junio (0-indexado)
    
    console.log(`📅 Nueva fecha de ingreso: ${nuevaFechaIngreso}`);
    
    // 4. Actualizar la fecha de ingreso del residente
    residente.fechaIngreso = nuevaFechaIngreso;
    await residente.save();
    
    console.log('✅ Fecha de ingreso actualizada exitosamente');
    
    // 5. Verificar si hay pagos que necesiten ajuste
    const pagos = await Pago.find({ 
      vivienda: vivienda._id,
      residente: residente._id 
    });
    
    console.log(`\n💰 Pagos encontrados: ${pagos.length}`);
    
    // 6. Verificar cada pago
    for (const pago of pagos) {
      const fechaPago = new Date(pago.año, pago.mes - 1, 1);
      
      console.log(`\n📅 Pago ${pago.mes}/${pago.año}:`);
      console.log(`   Fecha del pago: ${fechaPago.toLocaleDateString()}`);
      console.log(`   Fecha de ingreso: ${nuevaFechaIngreso.toLocaleDateString()}`);
      
      if (fechaPago < nuevaFechaIngreso) {
        console.log(`   ⚠️  Pago anterior a la fecha de ingreso - marcando como pagado`);
        pago.estado = 'Pagado';
        pago.fechaPago = nuevaFechaIngreso;
        pago.metodoPago = 'Otro'; // Valor válido del enum
        pago.referenciaPago = 'Pago anterior al ingreso - ajustado automáticamente';
        await pago.save();
        console.log(`   ✅ Pago ${pago.mes}/${pago.año} marcado como pagado`);
      } else {
        console.log(`   ✅ Pago posterior a la fecha de ingreso - manteniendo como pendiente`);
      }
    }
    
    // 7. Generar pagos faltantes desde la nueva fecha de ingreso
    const fechaActual = new Date();
    const mesesDesdeIngreso = (fechaActual.getFullYear() - nuevaFechaIngreso.getFullYear()) * 12 + 
                             (fechaActual.getMonth() - nuevaFechaIngreso.getMonth());
    
    console.log(`\n📊 Meses desde ingreso: ${mesesDesdeIngreso}`);
    
    const pagosFaltantes = [];
    for (let i = 0; i <= mesesDesdeIngreso; i++) {
      const fechaPago = new Date(nuevaFechaIngreso);
      fechaPago.setMonth(nuevaFechaIngreso.getMonth() + i);
      
      const año = fechaPago.getFullYear();
      const mes = fechaPago.getMonth() + 1;
      
      // Verificar si ya existe un pago para este mes/año
      const pagoExistente = pagos.find(p => p.año === año && p.mes === mes);
      
      if (!pagoExistente) {
        pagosFaltantes.push({ mes, año });
      }
    }
    
    if (pagosFaltantes.length > 0) {
      console.log(`\n📝 Generando ${pagosFaltantes.length} pagos faltantes:`);
      
      for (const { mes, año } of pagosFaltantes) {
        const fechaLimite = new Date(año, mes, 0); // Último día del mes
        
                 // Buscar un usuario administrador para usar como registradoPor
         const Usuario = require('../models/Usuario');
         const usuarioAdmin = await Usuario.findOne({ rol: 'Administrador' });
         
         if (!usuarioAdmin) {
           console.log('   ❌ No se encontró usuario administrador para registradoPor');
           continue;
         }
         
         const nuevoPago = new Pago({
           vivienda: vivienda._id,
           residente: residente._id,
           mes: mes,
           año: año,
           monto: 200, // Monto por defecto
           estado: 'Pendiente',
           fechaLimite: fechaLimite,
           fechaInicioPeriodo: new Date(año, mes - 1, 1),
           fechaFinPeriodo: fechaLimite,
           registradoPor: usuarioAdmin._id, // ObjectId válido
           metodoPago: 'Efectivo' // Valor válido del enum
         });
        
        await nuevoPago.save();
        console.log(`   ✅ Pago ${mes}/${año} generado`);
      }
    } else {
      console.log(`\n✅ Todos los pagos necesarios ya existen`);
    }
    
    // 8. Resumen final
    console.log('\n📊 RESUMEN DE CORRECCIONES:');
    console.log(`   ✅ Fecha de ingreso corregida a: ${nuevaFechaIngreso.toLocaleDateString()}`);
    console.log(`   ✅ ${pagosFaltantes.length} pago(s) faltante(s) generado(s)`);
    console.log(`   ✅ Vivienda 7 ahora tiene fechas consistentes`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

corregirFechaVivienda7();
