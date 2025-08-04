const mongoose = require('mongoose');
const Vivienda = require('../models/Vivienda');
const Residente = require('../models/Residente');

// Usar la misma URI que Render (producción)
const MONGODB_URI = 'mongodb+srv://iscjcrios:S0p0rtetecnic0@adminprivada.a2p7okx.mongodb.net/fraccionamiento?retryWrites=true&w=majority&appName=AdminPrivada';

async function actualizarViviendasConResidentes() {
  try {
    // Conectar a MongoDB Atlas (producción)
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas (Producción)');

    // Obtener todos los residentes
    const residentes = await Residente.find().populate('vivienda');
    console.log(`📋 Encontrados ${residentes.length} residentes`);

    console.log('\n=== RESIDENTES EXISTENTES ===');
    residentes.forEach(residente => {
      console.log(`${residente.nombre} ${residente.apellidos} - Vivienda: ${residente.vivienda.numero} - Tipo: ${residente.tipo}`);
    });

    // Actualizar viviendas con residentes
    console.log('\n🏠 Actualizando viviendas con residentes...');
    let actualizadas = 0;

    for (const residente of residentes) {
      if (residente.vivienda) {
        // Buscar la vivienda por ID
        const vivienda = await Vivienda.findById(residente.vivienda._id);
        
        if (vivienda) {
          // Actualizar la vivienda con el residente
          vivienda.residente = residente._id;
          await vivienda.save();
          
          console.log(`✅ Vivienda ${vivienda.numero} actualizada con residente: ${residente.nombre} ${residente.apellidos}`);
          actualizadas++;
        } else {
          console.log(`❌ No se encontró vivienda para residente: ${residente.nombre} ${residente.apellidos}`);
        }
      }
    }

    // Verificar el resultado
    console.log('\n📊 Verificando resultado...');
    const viviendasConResidentes = await Vivienda.find().populate('residente');
    
    console.log('\n=== RESUMEN ===');
    console.log(`Total de viviendas: ${viviendasConResidentes.length}`);
    console.log(`Viviendas con residentes: ${viviendasConResidentes.filter(v => v.residente).length}`);
    console.log(`Viviendas sin residentes: ${viviendasConResidentes.filter(v => !v.residente).length}`);
    console.log(`Viviendas actualizadas: ${actualizadas}`);

    console.log('\n=== VIVIENDAS CON RESIDENTES ===');
    viviendasConResidentes.forEach(vivienda => {
      if (vivienda.residente) {
        console.log(`${vivienda.numero}: ${vivienda.residente.nombre} ${vivienda.residente.apellidos} (${vivienda.residente.tipo})`);
      }
    });

    console.log('\n✅ Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
    process.exit(0);
  }
}

actualizarViviendasConResidentes(); 