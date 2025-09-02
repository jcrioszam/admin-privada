require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');

async function corregirJuan() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('🔧 Corrigiendo problemas de Juan (Vivienda 8)...\n');

    // 1. Buscar a Juan en la vivienda 8
    const vivienda = await Vivienda.findOne({ numero: 8 });
    if (!vivienda) {
      console.log('❌ Vivienda 8 no encontrada');
      return;
    }

    const residente = await Residente.findOne({ 
      vivienda: vivienda._id, 
      activo: true 
    });
    
    if (!residente) {
      console.log('❌ No hay residente activo en la vivienda 8');
      return;
    }

    console.log(`👤 Residente encontrado: ${residente.nombre} ${residente.apellidos}`);
    console.log(`📅 Fecha actual de ingreso: ${residente.fechaIngreso}`);
    
    // 2. Corregir la fecha de ingreso a 1 de junio de 2025
    const nuevaFechaIngreso = new Date(2025, 5, 1); // Mes 5 = junio (0-indexado)
    
    console.log(`📅 Nueva fecha de ingreso: ${nuevaFechaIngreso}`);
    
    // 3. Actualizar la fecha de ingreso del residente
    residente.fechaIngreso = nuevaFechaIngreso;
    await residente.save();
    
    console.log('✅ Fecha de ingreso actualizada exitosamente');
    
    // 4. Buscar todos los pagos de esta vivienda
    const pagos = await Pago.find({ vivienda: vivienda._id });
    
    console.log(`\n💰 Pagos encontrados: ${pagos.length}`);
    
    // 5. Corregir pagos sin residente
    const pagosSinResidente = pagos.filter(p => !p.residente);
    
    if (pagosSinResidente.length > 0) {
      console.log(`\n🔧 Corrigiendo ${pagosSinResidente.length} pago(s) sin residente:`);
      
      for (const pago of pagosSinResidente) {
        console.log(`   📅 Pago ${pago.mes}/${pago.año}:`);
        
        // Asignar el residente
        pago.residente = residente._id;
        
        // Verificar si el pago es anterior a la fecha de ingreso
        const fechaPago = new Date(pago.año, pago.mes - 1, 1);
        
        if (fechaPago < nuevaFechaIngreso) {
          console.log(`      ⚠️  Pago anterior a la fecha de ingreso - marcando como pagado`);
          pago.estado = 'Pagado';
          pago.fechaPago = nuevaFechaIngreso;
          pago.metodoPago = 'Otro';
          pago.referenciaPago = 'Pago anterior al ingreso - ajustado automáticamente';
        } else {
          console.log(`      ✅ Pago posterior a la fecha de ingreso - manteniendo estado actual`);
        }
        
        // Guardar el pago corregido
        await pago.save();
        console.log(`      ✅ Pago ${pago.mes}/${pago.año} corregido exitosamente`);
      }
    }
    
    // 6. Generar pagos faltantes desde la nueva fecha de ingreso
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
      
      // Buscar un usuario administrador para usar como registradoPor
      const Usuario = require('../models/Usuario');
      const usuarioAdmin = await Usuario.findOne({ rol: 'Administrador' });
      
      if (!usuarioAdmin) {
        console.log('   ❌ No se encontró usuario administrador para registradoPor');
        return;
      }
      
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
          fechaFinPeriodo: fechaLimite,
          registradoPor: usuarioAdmin._id,
          metodoPago: 'Efectivo'
        });
        
        await nuevoPago.save();
        console.log(`   ✅ Pago ${mes}/${año} generado`);
      }
    } else {
      console.log(`\n✅ Todos los pagos necesarios ya existen`);
    }
    
    // 7. Resumen final
    console.log('\n📊 RESUMEN DE CORRECCIONES:');
    console.log(`   ✅ Fecha de ingreso corregida a: ${nuevaFechaIngreso.toLocaleDateString()}`);
    console.log(`   ✅ ${pagosSinResidente.length} pago(s) corregido(s) con residente asignado`);
    console.log(`   ✅ ${pagosFaltantes.length} pago(s) faltante(s) generado(s)`);
    console.log(`   ✅ Juan (Vivienda 8) ahora tiene datos consistentes`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

corregirJuan();
