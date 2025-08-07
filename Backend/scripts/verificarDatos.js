const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

// Importar modelos
const PagoEspecial = require('../models/PagoEspecial');
const Vivienda = require('../models/Vivienda');
const Residente = require('../models/Residente');
const Usuario = require('../models/Usuario');

async function verificarDatos() {
  try {
    console.log('🔍 Verificando datos en la base de datos...');
    
    // Debug: Verificar variables de entorno
    console.log('🔧 Variables de entorno:');
    console.log('   MONGODB_URI:', process.env.MONGODB_URI ? 'Definida' : 'NO DEFINIDA');
    console.log('   PORT:', process.env.PORT);
    console.log('   NODE_ENV:', process.env.NODE_ENV);
    
    if (!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI no está definida');
      console.log('📁 Verificando archivo de configuración...');
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(__dirname, '../config.env');
      console.log('   Ruta del archivo:', configPath);
      console.log('   ¿Existe el archivo?', fs.existsSync(configPath));
      if (fs.existsSync(configPath)) {
        console.log('   Contenido del archivo:');
        const content = fs.readFileSync(configPath, 'utf8');
        console.log(content);
      }
      return;
    }
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Mostrar información de la base de datos
    const db = mongoose.connection.db;
    console.log(`📊 Base de datos: ${db.databaseName}`);
    console.log(`🔗 URI: ${process.env.MONGODB_URI.split('@')[1]?.split('/')[0] || 'MongoDB Atlas'}`);

    // Verificar viviendas
    const totalViviendas = await Vivienda.countDocuments();
    console.log(`📊 Total viviendas: ${totalViviendas}`);
    
    if (totalViviendas > 0) {
      const viviendas = await Vivienda.find({}).sort({ numero: 1 });
      console.log('🏠 Todas las viviendas:');
      viviendas.forEach(v => {
        console.log(`   - ${v.numero} (${v.calle || 'Sin calle'}) - Residente: ${v.residente || 'Sin asignar'}`);
      });
    }

    // Verificar residentes
    const totalResidentes = await Residente.countDocuments();
    console.log(`\n📊 Total residentes: ${totalResidentes}`);
    
    if (totalResidentes > 0) {
      const residentes = await Residente.find({}).limit(5);
      console.log('👥 Primeros residentes:');
      residentes.forEach(r => {
        console.log(`   - ${r.nombre} ${r.apellidos} (${r.email})`);
      });
    }

    // Verificar usuarios
    const totalUsuarios = await Usuario.countDocuments();
    console.log(`\n📊 Total usuarios: ${totalUsuarios}`);
    
    if (totalUsuarios > 0) {
      const usuarios = await Usuario.find({}).limit(3);
      console.log('👤 Primeros usuarios:');
      usuarios.forEach(u => {
        console.log(`   - ${u.nombre} ${u.apellidos} (${u.email})`);
      });
    }

    // Verificar pagos especiales existentes
    const totalPagosEspeciales = await PagoEspecial.countDocuments();
    console.log(`\n📊 Total pagos especiales: ${totalPagosEspeciales}`);

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');
  }
}

verificarDatos(); 