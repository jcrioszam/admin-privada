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

// Función para analizar morosidad
const analizarMorosidad = async () => {
  try {
    console.log('\n🔍 ANÁLISIS DE MOROSIDAD EN BASE DE DATOS\n');
    console.log('='.repeat(60));

    // 1. Obtener todas las viviendas
    const viviendas = await Vivienda.find().populate('residentes');
    console.log(`\n📊 Total de viviendas: ${viviendas.length}`);

    // 2. Analizar cada vivienda
    let viviendasConMorosos = 0;
    let totalMorosos = 0;
    let totalAtrasados = 0;

    for (const vivienda of viviendas) {
      console.log(`\n🏠 VIVIENDA ${vivienda.numero} - ${vivienda.estado}`);
      console.log(`   Tipo: ${vivienda.tipoOcupacion}`);
      console.log(`   Residentes: ${vivienda.residentes.length}`);

      if (vivienda.residentes.length > 0) {
        for (const residente of vivienda.residentes) {
          console.log(`   👤 Residente: ${residente.nombre} ${residente.apellidos}`);
          
          // Buscar pagos del residente
          const pagos = await Pago.find({ 
            vivienda: vivienda._id,
            residente: residente._id 
          }).sort({ año: -1, mes: -1 });

          console.log(`      📅 Total pagos registrados: ${pagos.length}`);

          // Calcular morosidad
          const fechaActual = new Date();
          const añoActual = fechaActual.getFullYear();
          const mesActual = fechaActual.getMonth() + 1;

          let pagosAtrasados = 0;
          let pagosMorosos = 0;

          // Verificar pagos de los últimos 12 meses
          for (let i = 0; i < 12; i++) {
            const año = añoActual;
            const mes = mesActual - i;
            
            if (mes <= 0) {
              const añoAnterior = año - 1;
              const mesAnterior = mes + 12;
              
              const pago = pagos.find(p => p.año === añoAnterior && p.mes === mesAnterior);
              
              if (!pago) {
                pagosAtrasados++;
                if (i >= 2) { // Más de 2 meses de atraso
                  pagosMorosos++;
                }
              }
            } else {
              const pago = pagos.find(p => p.año === año && p.mes === mes);
              
              if (!pago) {
                pagosAtrasados++;
                if (i >= 2) { // Más de 2 meses de atraso
                  pagosMorosos++;
                }
              }
            }
          }

          if (pagosAtrasados > 0) {
            console.log(`      ⚠️  Pagos atrasados: ${pagosAtrasados}`);
            totalAtrasados += pagosAtrasados;
          }

          if (pagosMorosos > 0) {
            console.log(`      🚨 Pagos morosos (2+ meses): ${pagosMorosos}`);
            totalMorosos += pagosMorosos;
            viviendasConMorosos++;
          }

          // Mostrar últimos pagos
          if (pagos.length > 0) {
            console.log(`      💰 Últimos 3 pagos:`);
            pagos.slice(0, 3).forEach(pago => {
              const fechaPago = pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString() : 'Sin fecha';
              console.log(`         ${pago.mes}/${pago.año} - $${pago.monto} - ${fechaPago}`);
            });
          }
        }
      } else {
        console.log(`   🏠 Vivienda sin residentes`);
      }
    }

    // 3. Resumen general
    console.log('\n' + '='.repeat(60));
    console.log('📈 RESUMEN GENERAL:');
    console.log(`   🏠 Total viviendas: ${viviendas.length}`);
    console.log(`   🚨 Viviendas con morosos: ${viviendasConMorosos}`);
    console.log(`   ⚠️  Total pagos atrasados: ${totalAtrasados}`);
    console.log(`   🚨 Total pagos morosos: ${totalMorosos}`);
    console.log(`   📊 Porcentaje de morosidad: ${((viviendasConMorosos / viviendas.length) * 100).toFixed(2)}%`);

    // 4. Análisis de pagos especiales
    console.log('\n' + '='.repeat(60));
    console.log('💳 ANÁLISIS DE PAGOS ESPECIALES:');
    
    const pagosEspeciales = await PagoEspecial.find();
    console.log(`   📋 Total pagos especiales: ${pagosEspeciales.length}`);
    
    const pagosEspecialesPendientes = pagosEspeciales.filter(p => !p.pagado);
    console.log(`   ⏳ Pagos especiales pendientes: ${pagosEspecialesPendientes.length}`);
    
    const pagosEspecialesVencidos = pagosEspeciales.filter(p => {
      if (p.pagado) return false;
      const fechaLimite = new Date(p.fechaLimite);
      return fechaLimite < new Date();
    });
    console.log(`   🚨 Pagos especiales vencidos: ${pagosEspecialesVencidos.length}`);

    // 5. Verificar consistencia de datos
    console.log('\n' + '='.repeat(60));
    console.log('🔍 VERIFICACIÓN DE CONSISTENCIA:');
    
    // Verificar residentes sin vivienda
    const residentesSinVivienda = await Residente.find({ vivienda: { $exists: false } });
    console.log(`   👤 Residentes sin vivienda: ${residentesSinVivienda.length}`);
    
    // Verificar pagos sin residente
    const pagosSinResidente = await Pago.find({ residente: { $exists: false } });
    console.log(`   💰 Pagos sin residente: ${pagosSinResidente.length}`);
    
    // Verificar pagos sin vivienda
    const pagosSinVivienda = await Pago.find({ vivienda: { $exists: false } });
    console.log(`   🏠 Pagos sin vivienda: ${pagosSinVivienda.length}`);

  } catch (error) {
    console.error('❌ Error en análisis:', error);
  }
};

// Función principal
const main = async () => {
  await conectarDB();
  await analizarMorosidad();
  
  console.log('\n✅ Análisis completado');
  process.exit(0);
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { analizarMorosidad };
