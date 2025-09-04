const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const Vivienda = require('../models/Vivienda');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('🔗 Conectado a MongoDB');
    
    console.log('🔧 FORZANDO ACTUALIZACIÓN DE CUOTAS DE VIVIENDAS');
    console.log('================================================');
    
    const viviendas = await Vivienda.find();
    console.log(`📋 Total de viviendas a actualizar: ${viviendas.length}`);
    
    let viviendasActualizadas = 0;
    
    for (const vivienda of viviendas) {
      const numeroVivienda = parseInt(vivienda.numero);
      let tipoCuota = 'Estandar';
      let cuotaMantenimiento = 200;
      
      // Determinar tipo de cuota basado en el número de vivienda
      if (numeroVivienda === 4 || (numeroVivienda >= 16 && numeroVivienda <= 25)) {
        tipoCuota = 'Economica';
        cuotaMantenimiento = 50;
      } else if (numeroVivienda >= 1 && numeroVivienda <= 15) {
        tipoCuota = 'Estandar';
        cuotaMantenimiento = 200;
      } else {
        // Para viviendas fuera del rango, usar estándar
        tipoCuota = 'Estandar';
        cuotaMantenimiento = 200;
      }
      
      // Forzar actualización de todas las viviendas
      console.log(`🔧 Actualizando vivienda ${vivienda.numero}:`);
      console.log(`   Tipo: ${vivienda.tipoCuota || 'No definido'} → ${tipoCuota}`);
      console.log(`   Cuota: $${vivienda.cuotaMantenimiento || 'No definido'} → $${cuotaMantenimiento}`);
      
      vivienda.cuotaMantenimiento = cuotaMantenimiento;
      vivienda.tipoCuota = tipoCuota;
      
      await vivienda.save();
      viviendasActualizadas++;
      console.log('   ✅ Actualizada');
    }
    
    console.log('\n📊 RESUMEN DE ACTUALIZACIÓN:');
    console.log('=============================');
    console.log(`✅ Viviendas actualizadas: ${viviendasActualizadas}`);
    console.log(`📋 Total viviendas revisadas: ${viviendas.length}`);
    
    // Verificar configuración final
    console.log('\n🔍 VERIFICACIÓN FINAL:');
    console.log('======================');
    const viviendasEstandar = await Vivienda.find({ tipoCuota: 'Estandar' });
    const viviendasEconomicas = await Vivienda.find({ tipoCuota: 'Economica' });
    
    console.log(`🏠 Viviendas Estándar ($200): ${viviendasEstandar.length}`);
    viviendasEstandar.forEach(v => console.log(`   - Vivienda ${v.numero}: $${v.cuotaMantenimiento}`));
    
    console.log(`🏠 Viviendas Económicas ($50): ${viviendasEconomicas.length}`);
    viviendasEconomicas.forEach(v => console.log(`   - Vivienda ${v.numero}: $${v.cuotaMantenimiento}`));
    
  })
  .catch(err => {
    console.error('❌ Error en actualización:', err);
  })
  .finally(() => {
    mongoose.disconnect();
  });
