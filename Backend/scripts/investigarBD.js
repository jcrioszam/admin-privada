const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

async function investigarBD() {
  try {
    console.log('🔍 Investigando base de datos...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    const db = mongoose.connection.db;
    console.log(`📊 Base de datos: ${db.databaseName}`);
    
    // Listar todas las colecciones
    console.log('\n📋 Todas las colecciones en la base de datos:');
    const collections = await db.listCollections().toArray();
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });
    
    // Verificar cada colección que podría contener viviendas
    console.log('\n🔍 Investigando colecciones relacionadas con viviendas:');
    
    const posiblesColecciones = ['viviendas', 'vivienda', 'houses', 'casas', 'properties'];
    
    for (const nombreColeccion of posiblesColecciones) {
      try {
        const coleccion = db.collection(nombreColeccion);
        const count = await coleccion.countDocuments();
        if (count > 0) {
          console.log(`\n🏠 Colección "${nombreColeccion}": ${count} documentos`);
          
          // Mostrar algunos documentos de ejemplo
          const documentos = await coleccion.find({}).limit(3).toArray();
          documentos.forEach((doc, index) => {
            console.log(`   Documento ${index + 1}:`, JSON.stringify(doc, null, 2));
          });
        }
      } catch (error) {
        // La colección no existe, continuar
      }
    }
    
    // Verificar la colección 'viviendas' específicamente
    console.log('\n🏠 Verificando colección "viviendas" (modelo Mongoose):');
    try {
      const Vivienda = require('../models/Vivienda');
      const totalViviendas = await Vivienda.countDocuments();
      console.log(`   Total viviendas en modelo: ${totalViviendas}`);
      
      if (totalViviendas > 0) {
        const viviendas = await Vivienda.find({}).limit(5);
        console.log('   Primeras viviendas:');
        viviendas.forEach(v => {
          console.log(`     - ID: ${v._id}`);
          console.log(`       Número: ${v.numero}`);
          console.log(`       Calle: ${v.calle || 'Sin calle'}`);
          console.log(`       Residente: ${v.residente || 'Sin asignar'}`);
          console.log(`       Creado: ${v.createdAt}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log(`   Error con modelo Vivienda: ${error.message}`);
    }
    
    // Verificar si hay datos en la colección raw de MongoDB
    console.log('\n🔍 Verificando colección raw "viviendas":');
    try {
      const coleccionRaw = db.collection('viviendas');
      const countRaw = await coleccionRaw.countDocuments();
      console.log(`   Total documentos en colección raw: ${countRaw}`);
      
      if (countRaw > 0) {
        const documentosRaw = await coleccionRaw.find({}).limit(3).toArray();
        console.log('   Documentos raw:');
        documentosRaw.forEach((doc, index) => {
          console.log(`     Documento ${index + 1}:`, JSON.stringify(doc, null, 2));
        });
      }
    } catch (error) {
      console.log(`   Error con colección raw: ${error.message}`);
    }
    
    // Verificar otras bases de datos en el cluster
    console.log('\n🌐 Verificando otras bases de datos en el cluster:');
    try {
      const adminDb = mongoose.connection.db.admin();
      const dbs = await adminDb.listDatabases();
      console.log('   Bases de datos disponibles:');
      dbs.databases.forEach(dbInfo => {
        console.log(`     - ${dbInfo.name} (${dbInfo.sizeOnDisk} bytes)`);
      });
    } catch (error) {
      console.log(`   Error listando bases de datos: ${error.message}`);
    }
    
    console.log('\n✅ Investigación completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');
  }
}

investigarBD(); 