const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// Importar modelos
const Vivienda = require('../models/Vivienda');
const Residente = require('../models/Residente');
const Pago = require('../models/Pago');
const PagoEspecial = require('../models/PagoEspecial');

// Conectar a la base de datos
const conectarDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Función para verificar datos del dashboard
const verificarDashboard = async () => {
  try {
    console.log('\n🔍 VERIFICACIÓN DE DATOS DEL DASHBOARD\n');
    console.log('='.repeat(60));

    // 1. Verificar estadísticas generales
    console.log('\n📊 ESTADÍSTICAS GENERALES:');
    
    const totalViviendas = await Vivienda.countDocuments();
    const viviendasOcupadas = await Vivienda.countDocuments({ estado: 'Ocupada' });
    const viviendasDisponibles = await Vivienda.countDocuments({ estado: 'Disponible' });
    const totalResidentes = await Residente.countDocuments();
    
    console.log(`   🏠 Total viviendas: ${totalViviendas}`);
    console.log(`   🏠 Viviendas ocupadas: ${viviendasOcupadas}`);
    console.log(`   🏠 Viviendas disponibles: ${viviendasDisponibles}`);
    console.log(`   👤 Total residentes: ${totalResidentes}`);

    // 2. Verificar pagos del mes actual
    console.log('\n💰 PAGOS DEL MES ACTUAL:');
    
    const fechaActual = new Date();
    const añoActual = fechaActual.getFullYear();
    const mesActual = fechaActual.getMonth() + 1;
    
    const pagosMesActual = await Pago.find({ 
      año: añoActual, 
      mes: mesActual 
    });
    
    const pagosPagados = pagosMesActual.filter(p => p.estado === 'Pagado' || p.estado === 'Pagado con excedente');
    const pagosPendientes = pagosMesActual.filter(p => p.estado === 'Pendiente' || p.estado === 'Parcial');
    const pagosVencidos = pagosMesActual.filter(p => p.estado === 'Vencido');
    
    console.log(`   📅 Mes: ${mesActual}/${añoActual}`);
    console.log(`   ✅ Pagos completados: ${pagosPagados.length}`);
    console.log(`   ⏳ Pagos pendientes: ${pagosPendientes.length}`);
    console.log(`   🚨 Pagos vencidos: ${pagosVencidos.length}`);
    console.log(`   📊 Total pagos del mes: ${pagosMesActual.length}`);

    // 3. Verificar morosidad
    console.log('\n🚨 ANÁLISIS DE MOROSIDAD:');
    
    let viviendasConMorosos = 0;
    let totalMorosos = 0;
    
    const viviendas = await Vivienda.find().populate('residentes');
    
    for (const vivienda of viviendas) {
      if (vivienda.residentes.length > 0) {
        for (const residente of vivienda.residentes) {
          const pagos = await Pago.find({ 
            vivienda: vivienda._id,
            residente: residente._id 
          }).sort({ año: -1, mes: -1 });

          let pagosMorosos = 0;
          
          // Verificar pagos de los últimos 12 meses
          for (let i = 0; i < 12; i++) {
            const año = añoActual;
            const mes = mesActual - i;
            
            if (mes <= 0) {
              const añoAnterior = año - 1;
              const mesAnterior = mes + 12;
              
              const pago = pagos.find(p => p.año === añoAnterior && p.mes === mesAnterior);
              
              if (!pago && i >= 2) { // Más de 2 meses de atraso
                pagosMorosos++;
              }
            } else {
              const pago = pagos.find(p => p.año === año && p.mes === mes);
              
              if (!pago && i >= 2) { // Más de 2 meses de atraso
                pagosMorosos++;
              }
            }
          }

          if (pagosMorosos > 0) {
            totalMorosos += pagosMorosos;
            viviendasConMorosos++;
          }
        }
      }
    }
    
    console.log(`   🏠 Viviendas con morosos: ${viviendasConMorosos}`);
    console.log(`   🚨 Total pagos morosos: ${totalMorosos}`);
    console.log(`   📊 Porcentaje de morosidad: ${((viviendasConMorosos / totalViviendas) * 100).toFixed(2)}%`);

    // 4. Verificar pagos especiales
    console.log('\n💳 PAGOS ESPECIALES:');
    
    const pagosEspeciales = await PagoEspecial.find();
    const pagosEspecialesPendientes = pagosEspeciales.filter(p => !p.pagado);
    const pagosEspecialesVencidos = pagosEspeciales.filter(p => {
      if (p.pagado) return false;
      const fechaLimite = new Date(p.fechaLimite);
      return fechaLimite < new Date();
    });
    
    console.log(`   📋 Total pagos especiales: ${pagosEspeciales.length}`);
    console.log(`   ⏳ Pagos especiales pendientes: ${pagosEspecialesPendientes.length}`);
    console.log(`   🚨 Pagos especiales vencidos: ${pagosEspecialesVencidos.length}`);

    // 5. Verificar ingresos
    console.log('\n💵 ANÁLISIS DE INGRESOS:');
    
    const pagosPagadosTotal = await Pago.find({ 
      estado: { $in: ['Pagado', 'Pagado con excedente'] }
    });
    
    const totalIngresos = pagosPagadosTotal.reduce((sum, pago) => sum + (pago.montoPagado || pago.monto), 0);
    const ingresosMesActual = pagosPagados.filter(p => p.fechaPago && new Date(p.fechaPago).getMonth() === mesActual - 1).reduce((sum, pago) => sum + (pago.montoPagado || pago.monto), 0);
    
    console.log(`   💰 Total ingresos históricos: $${totalIngresos.toLocaleString()}`);
    console.log(`   💰 Ingresos del mes actual: $${ingresosMesActual.toLocaleString()}`);

    // 6. Verificar consistencia de datos
    console.log('\n🔍 VERIFICACIÓN DE CONSISTENCIA:');
    
    // Verificar residentes sin vivienda
    const residentesSinVivienda = await Residente.find({ vivienda: { $exists: false } });
    console.log(`   👤 Residentes sin vivienda: ${residentesSinVivienda.length}`);
    
    // Verificar pagos sin residente
    const pagosSinResidente = await Pago.find({ residente: { $exists: false } });
    console.log(`   💰 Pagos sin residente: ${pagosSinResidente.length}`);
    
    // Verificar pagos sin vivienda
    const pagosSinVivienda = await Pago.find({ vivienda: { $exists: false } });
    console.log(`   🏠 Pagos sin vivienda: ${pagosSinVivienda.length}`);

    // 7. Resumen para el dashboard
    console.log('\n' + '='.repeat(60));
    console.log('📈 RESUMEN PARA DASHBOARD:');
    console.log(`   🏠 Viviendas: ${totalViviendas} (${viviendasOcupadas} ocupadas, ${viviendasDisponibles} disponibles)`);
    console.log(`   👤 Residentes: ${totalResidentes}`);
    console.log(`   💰 Pagos del mes: ${pagosPagados.length}/${pagosMesActual.length} completados`);
    console.log(`   🚨 Morosidad: ${viviendasConMorosos} viviendas (${((viviendasConMorosos / totalViviendas) * 100).toFixed(1)}%)`);
    console.log(`   💳 Pagos especiales: ${pagosEspecialesPendientes.length} pendientes`);

  } catch (error) {
    console.error('❌ Error en verificación:', error);
  }
};

// Función principal
const main = async () => {
  await conectarDB();
  await verificarDashboard();
  
  console.log('\n✅ Verificación completada');
  process.exit(0);
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { verificarDashboard };
