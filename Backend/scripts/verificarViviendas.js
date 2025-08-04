const mongoose = require('mongoose');
const Vivienda = require('../models/Vivienda');

// Usar la misma URI que Render
const MONGODB_URI = 'mongodb+srv://iscjcrios:S0p0rtetecnic0@adminprivada.a2p7okx.mongodb.net/fraccionamiento?retryWrites=true&w=majority&appName=AdminPrivada';

async function verificarViviendas() {
  try {
    // Conectar a MongoDB Atlas
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    // Obtener todas las viviendas
    const viviendas = await Vivienda.find().sort({ numero: 1 });
    console.log(`📋 Encontradas ${viviendas.length} viviendas`);

    console.log('\n=== VIVIENDAS DISPONIBLES ===');
    viviendas.forEach(vivienda => {
      console.log(`${vivienda.numero}: ${vivienda.tipo} - ${vivienda.estado} - ${vivienda.tipoOcupacion}`);
      if (vivienda.observaciones) {
        console.log(`  Observaciones: ${vivienda.observaciones}`);
      }
    });

    // Verificar si hay residentes
    const viviendasConResidentes = await Vivienda.find().populate('residente');
    const conResidentes = viviendasConResidentes.filter(v => v.residente);
    const sinResidentes = viviendasConResidentes.filter(v => !v.residente);

    console.log('\n=== RESUMEN ===');
    console.log(`Total de viviendas: ${viviendas.length}`);
    console.log(`Viviendas con residentes: ${conResidentes.length}`);
    console.log(`Viviendas sin residentes: ${sinResidentes.length}`);

    if (sinResidentes.length > 0) {
      console.log('\n=== VIVIENDAS SIN RESIDENTES ===');
      sinResidentes.forEach(vivienda => {
        console.log(`${vivienda.numero}: ${vivienda.observaciones || 'Sin observaciones'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
    process.exit(0);
  }
}

verificarViviendas(); 