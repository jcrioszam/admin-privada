const mongoose = require('mongoose');

// URI directa de producción
const MONGODB_URI = 'mongodb+srv://iscjcrios:S0p0rtetecnic0@adminprivada.a2p7okx.mongodb.net/fraccionamiento?retryWrites=true&w=majority&appName=AdminPrivada';

async function diagnosticoBD() {
  try {
    console.log('🔗 Conectando a MongoDB Atlas (Producción)...');
    
    // Conectar a MongoDB Atlas (producción)
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB Atlas (Producción)');

    // Verificar conexión
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Colecciones disponibles:', collections.map(c => c.name));

    // Verificar datos en cada colección
    console.log('\n=== DIAGNÓSTICO DE DATOS ===');
    
    // Verificar residentes directamente en la base de datos
    const residentesCollection = mongoose.connection.db.collection('residentes');
    const residentesCount = await residentesCollection.countDocuments();
    console.log(`📊 Residentes en BD: ${residentesCount}`);
    
    if (residentesCount > 0) {
      const residentes = await residentesCollection.find({}).limit(3).toArray();
      console.log('📋 Primeros 3 residentes:');
      residentes.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.nombre} ${r.apellidos} - Vivienda: ${r.vivienda}`);
      });
    }

    // Verificar viviendas directamente en la base de datos
    const viviendasCollection = mongoose.connection.db.collection('viviendas');
    const viviendasCount = await viviendasCollection.countDocuments();
    console.log(`📊 Viviendas en BD: ${viviendasCount}`);
    
    if (viviendasCount > 0) {
      const viviendas = await viviendasCollection.find({}).limit(3).toArray();
      console.log('📋 Primeras 3 viviendas:');
      viviendas.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.numero} - Residente: ${v.residente || 'null'}`);
      });
    }

    // Probar con el modelo Residente
    console.log('\n=== PRUEBA CON MODELOS ===');
    
    const Residente = require('../models/Residente');
    const Vivienda = require('../models/Vivienda');
    
    try {
      const residentesModel = await Residente.find();
      console.log(`📊 Residentes con modelo: ${residentesModel.length}`);
      
      if (residentesModel.length > 0) {
        console.log('📋 Primeros residentes con modelo:');
        residentesModel.slice(0, 3).forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.nombre} ${r.apellidos}`);
        });
      }
    } catch (error) {
      console.log('❌ Error con modelo Residente:', error.message);
    }

    try {
      const viviendasModel = await Vivienda.find();
      console.log(`📊 Viviendas con modelo: ${viviendasModel.length}`);
    } catch (error) {
      console.log('❌ Error con modelo Vivienda:', error.message);
    }

    console.log('\n✅ Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Detalles del error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
    process.exit(0);
  }
}

diagnosticoBD(); 