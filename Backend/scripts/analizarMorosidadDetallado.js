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

// Función para analizar morosidad detalladamente
const analizarMorosidadDetallado = async () => {
  try {
    console.log('\n🔍 ANÁLISIS DETALLADO DE MOROSIDAD\n');
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
          
          let pagosMorosos = [];
          let pagosAtrasados = [];

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
                esMoroso: mesesAtraso >= 2
              };
              
              pagosAtrasados.push(infoPago);
              
              if (mesesAtraso >= 2) {
                pagosMorosos.push(infoPago);
                console.log(`      🚨 PAGO MOROSO: ${mesBuscado}/${añoBuscado} (${mesesAtraso} meses de atraso)`);
              } else {
                console.log(`      ⚠️  PAGO ATRASADO: ${mesBuscado}/${añoBuscado} (${mesesAtraso} meses de atraso)`);
              }
            } else {
              console.log(`      ✅ PAGO REGISTRADO: ${mesBuscado}/${añoBuscado} - $${pago.monto} - ${pago.estado}`);
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
              detalle: pagosMorosos
            });
            
            console.log(`   📊 RESUMEN: ${pagosMorosos.length} pagos morosos, ${pagosAtrasados.length} pagos atrasados`);
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

    // Explicación del cálculo
    console.log('\n' + '='.repeat(80));
    console.log('🔍 EXPLICACIÓN DEL CÁLCULO:');
    console.log('   • Se analizan los últimos 12 meses desde la fecha actual');
    console.log('   • Un pago se considera MOROSO si tiene 2+ meses de atraso');
    console.log('   • Un pago se considera ATRASADO si tiene menos de 2 meses de atraso');
    console.log('   • Cada mes sin pago cuenta como 1 pago moroso/atrasado');
    console.log(`   • Por eso: ${viviendasConMorosos} viviendas × múltiples meses = ${totalPagosMorosos} pagos morosos`);

    // Detalle por vivienda
    console.log('\n' + '='.repeat(80));
    console.log('📋 DETALLE POR VIVIENDA:');
    detalleMorosos.forEach(item => {
      console.log(`\n🏠 Vivienda ${item.vivienda} - ${item.residente}:`);
      console.log(`   🚨 Pagos morosos: ${item.pagosMorosos}`);
      console.log(`   ⚠️  Pagos atrasados: ${item.pagosAtrasados}`);
      console.log(`   📅 Meses morosos: ${item.detalle.map(p => `${p.mes}/${p.año}`).join(', ')}`);
    });

    // Ejemplo de cálculo
    console.log('\n' + '='.repeat(80));
    console.log('💡 EJEMPLO DE CÁLCULO:');
    console.log('   Si una vivienda no ha pagado desde hace 10 meses:');
    console.log('   • Meses 0-1: Atrasados (no morosos)');
    console.log('   • Meses 2-9: Morosos (8 pagos morosos)');
    console.log('   • Total: 8 pagos morosos para esa vivienda');
    console.log('   • Si hay 10 viviendas así: 10 × 8 = 80 pagos morosos');

  } catch (error) {
    console.error('❌ Error en análisis:', error);
  }
};

// Función principal
const main = async () => {
  await conectarDB();
  await analizarMorosidadDetallado();
  
  console.log('\n✅ Análisis detallado completado');
  process.exit(0);
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { analizarMorosidadDetallado };
