const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// Importar modelos
const Vivienda = require('../models/Vivienda');
const Residente = require('../models/Residente');
const Pago = require('../models/Pago');

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

// Función para analizar pagos pendientes
const analizarPagosPendientes = async () => {
  try {
    console.log('\n🔍 ANÁLISIS DETALLADO DE PAGOS PENDIENTES\n');
    console.log('='.repeat(80));

    const fechaActual = new Date();
    const añoActual = fechaActual.getFullYear();
    const mesActual = fechaActual.getMonth() + 1;
    
    console.log(`📅 Fecha actual: ${mesActual}/${añoActual}`);
    console.log(`📅 Analizando últimos 12 meses desde: ${mesActual}/${añoActual} hacia atrás\n`);

    // Obtener todas las viviendas con residentes
    const viviendas = await Vivienda.find().populate('residentes');
    
    let viviendasConMorosos = 0;
    let totalPagosMorosos = 0;
    let detalleMorosos = [];

    for (const vivienda of viviendas) {
      if (vivienda.residentes.length > 0) {
        for (const residente of vivienda.residentes) {
          console.log(`\n🏠 VIVIENDA ${vivienda.numero} - ${residente.nombre} ${residente.apellidos}`);
          
          // Buscar pagos del residente
          const pagos = await Pago.find({ 
            vivienda: vivienda._id,
            residente: residente._id 
          }).sort({ año: -1, mes: -1 });

          console.log(`   📅 Total pagos registrados: ${pagos.length}`);
          
          // Mostrar últimos pagos registrados
          if (pagos.length > 0) {
            console.log(`   💰 Últimos pagos registrados:`);
            pagos.slice(0, 5).forEach(pago => {
              const fechaPago = pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString() : 'Sin fecha';
              console.log(`      ${pago.mes}/${pago.año} - $${pago.monto} - ${pago.estado} - ${fechaPago}`);
            });
            
            // Encontrar el último pago
            const ultimoPago = pagos[0];
            console.log(`   📅 ÚLTIMO PAGO: ${ultimoPago.mes}/${ultimoPago.año} - $${ultimoPago.monto} - ${ultimoPago.estado}`);
          } else {
            console.log(`   ❌ NO HAY PAGOS REGISTRADOS`);
          }
          
          let pagosMorosos = [];
          let pagosAtrasados = [];
          let mesesPendientes = [];

          // Verificar pagos de los últimos 12 meses
          for (let i = 0; i < 12; i++) {
            const año = añoActual;
            const mes = mesActual - i;
            
            let añoBuscado, mesBuscado;
            
            if (mes <= 0) {
              añoBuscado = año - 1;
              mesBuscado = mes + 12;
            } else {
              añoBuscado = año;
              mesBuscado = mes;
            }
            
            const pago = pagos.find(p => p.año === añoBuscado && p.mes === mesBuscado);
            
            if (!pago) {
              // No hay pago para este mes
              const mesesAtraso = i;
              const infoPago = {
                mes: mesBuscado,
                año: añoBuscado,
                mesesAtraso: mesesAtraso,
                esMoroso: mesesAtraso >= 2,
                monto: 200 // Monto típico de mantenimiento
              };
              
              mesesPendientes.push(infoPago);
              pagosAtrasados.push(infoPago);
              
              if (mesesAtraso >= 2) {
                pagosMorosos.push(infoPago);
              }
            }
          }

          if (pagosMorosos.length > 0) {
            viviendasConMorosos++;
            totalPagosMorosos += pagosMorosos.length;
            
            detalleMorosos.push({
              vivienda: vivienda.numero,
              residente: `${residente.nombre} ${residente.apellidos}`,
              pagosMorosos: pagosMorosos.length,
              pagosAtrasados: pagosAtrasados.length,
              totalPendiente: mesesPendientes.length,
              detalle: pagosMorosos,
              ultimoPago: pagos.length > 0 ? `${pagos[0].mes}/${pagos[0].año}` : 'Nunca'
            });
            
            console.log(`   📊 RESUMEN:`);
            console.log(`      🚨 Pagos morosos (2+ meses): ${pagosMorosos.length}`);
            console.log(`      ⚠️  Pagos atrasados: ${pagosAtrasados.length}`);
            console.log(`      📅 Total meses pendientes: ${mesesPendientes.length}`);
            console.log(`      💰 Total adeudado: $${mesesPendientes.length * 200}`);
            
            console.log(`   📋 MESES PENDIENTES:`);
            mesesPendientes.forEach(pago => {
              const tipo = pago.esMoroso ? '🚨 MOROSO' : '⚠️  ATRASADO';
              console.log(`      ${tipo}: ${pago.mes}/${pago.año} (${pago.mesesAtraso} meses de atraso) - $${pago.monto}`);
            });
          } else {
            console.log(`   ✅ SIN MOROSIDAD`);
          }
        }
      }
    }

    // Resumen detallado
    console.log('\n' + '='.repeat(80));
    console.log('📈 RESUMEN DETALLADO:');
    console.log(`   🏠 Total viviendas: ${viviendas.length}`);
    console.log(`   🚨 Viviendas con morosos: ${viviendasConMorosos}`);
    console.log(`   🚨 Total pagos morosos: ${totalPagosMorosos}`);
    console.log(`   📊 Porcentaje de morosidad: ${((viviendasConMorosos / viviendas.length) * 100).toFixed(2)}%`);

    // Tabla resumen por vivienda
    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUMEN POR VIVIENDA:');
    console.log('┌─────────────┬─────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
    console.log('│ Vivienda    │ Residente           │ Último Pago  │ Pagos Morosos│ Total Pendiente│ Total Adeudado│');
    console.log('├─────────────┼─────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');
    
    detalleMorosos.forEach(item => {
      const vivienda = item.vivienda.toString().padEnd(11);
      const residente = item.residente.padEnd(19);
      const ultimoPago = item.ultimoPago.padEnd(12);
      const morosos = item.pagosMorosos.toString().padEnd(12);
      const pendientes = item.totalPendiente.toString().padEnd(14);
      const adeudado = `$${item.totalPendiente * 200}`.padEnd(14);
      
      console.log(`│ ${vivienda} │ ${residente} │ ${ultimoPago} │ ${morosos} │ ${pendientes} │ ${adeudado} │`);
    });
    
    console.log('└─────────────┴─────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘');

    // Explicación del cálculo
    console.log('\n' + '='.repeat(80));
    console.log('🔍 EXPLICACIÓN DEL CÁLCULO:');
    console.log('   • Se analizan los últimos 12 meses desde la fecha actual');
    console.log('   • Un pago se considera MOROSO si tiene 2+ meses de atraso');
    console.log('   • Un pago se considera ATRASADO si tiene menos de 2 meses de atraso');
    console.log('   • Cada mes sin pago cuenta como 1 pago pendiente');
    console.log(`   • Por eso: ${viviendasConMorosos} viviendas × múltiples meses = ${totalPagosMorosos} pagos morosos`);

    // Recomendaciones
    console.log('\n' + '='.repeat(80));
    console.log('💡 RECOMENDACIONES:');
    console.log('   1. Contactar a los residentes morosos para regularizar pagos');
    console.log('   2. Implementar sistema de recordatorios automáticos');
    console.log('   3. Considerar descuentos por pago adelantado');
    console.log('   4. Revisar políticas de recargos por morosidad');
    console.log('   5. Actualizar fechas de pagos (están en 2025, deberían estar en 2024)');

  } catch (error) {
    console.error('❌ Error en análisis:', error);
  }
};

// Función principal
const main = async () => {
  await conectarDB();
  await analizarPagosPendientes();
  
  console.log('\n✅ Análisis de pagos pendientes completado');
  process.exit(0);
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { analizarPagosPendientes };
