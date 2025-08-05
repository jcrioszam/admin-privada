const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Cargar configuración de Atlas (origen)
dotenv.config({ path: './config.env' });

// Configuración para MongoDB local (destino)
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/fraccionamiento';

// Modelos
const Vivienda = require('../models/Vivienda');
const Residente = require('../models/Residente');
const Pago = require('../models/Pago');
const Acceso = require('../models/Acceso');
const Usuario = require('../models/Usuario');
const Configuracion = require('../models/Configuracion');
const Gasto = require('../models/Gasto');

async function migrarDatos() {
  try {
    console.log('🔄 Iniciando migración de datos...');
    
    // Conectar a MongoDB Atlas (origen)
    console.log('📡 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    // Obtener datos de Atlas
    console.log('📥 Obteniendo datos de Atlas...');
    const viviendas = await Vivienda.find({});
    const residentes = await Residente.find({});
    const pagos = await Pago.find({});
    const accesos = await Acceso.find({});
    const usuarios = await Usuario.find({});
    const configuraciones = await Configuracion.find({});
    const gastos = await Gasto.find({});
    
    console.log(`📊 Datos obtenidos:`);
    console.log(`   - Viviendas: ${viviendas.length}`);
    console.log(`   - Residentes: ${residentes.length}`);
    console.log(`   - Pagos: ${pagos.length}`);
    console.log(`   - Accesos: ${accesos.length}`);
    console.log(`   - Usuarios: ${usuarios.length}`);
    console.log(`   - Configuraciones: ${configuraciones.length}`);
    console.log(`   - Gastos: ${gastos.length}`);
    
    // Desconectar de Atlas
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB Atlas');
    
    // Conectar a MongoDB local
    console.log('🏠 Conectando a MongoDB local...');
    await mongoose.connect(LOCAL_MONGODB_URI);
    console.log('✅ Conectado a MongoDB local');
    
    // Limpiar datos existentes en local
    console.log('🧹 Limpiando datos existentes en local...');
    await Vivienda.deleteMany({});
    await Residente.deleteMany({});
    await Pago.deleteMany({});
    await Acceso.deleteMany({});
    await Usuario.deleteMany({});
    await Configuracion.deleteMany({});
    await Gasto.deleteMany({});
    
    // Insertar datos en local
    console.log('📤 Insertando datos en MongoDB local...');
    
    if (viviendas.length > 0) {
      await Vivienda.insertMany(viviendas);
      console.log(`✅ ${viviendas.length} viviendas migradas`);
    }
    
    if (residentes.length > 0) {
      await Residente.insertMany(residentes);
      console.log(`✅ ${residentes.length} residentes migrados`);
    }
    
    if (pagos.length > 0) {
      await Pago.insertMany(pagos);
      console.log(`✅ ${pagos.length} pagos migrados`);
    }
    
    if (accesos.length > 0) {
      await Acceso.insertMany(accesos);
      console.log(`✅ ${accesos.length} accesos migrados`);
    }
    
    if (usuarios.length > 0) {
      await Usuario.insertMany(usuarios);
      console.log(`✅ ${usuarios.length} usuarios migrados`);
    }
    
    if (configuraciones.length > 0) {
      await Configuracion.insertMany(configuraciones);
      console.log(`✅ ${configuraciones.length} configuraciones migradas`);
    }
    
    if (gastos.length > 0) {
      await Gasto.insertMany(gastos);
      console.log(`✅ ${gastos.length} gastos migrados`);
    }
    
    console.log('🎉 ¡Migración completada exitosamente!');
    console.log('📋 Resumen:');
    console.log(`   - Total de documentos migrados: ${viviendas.length + residentes.length + pagos.length + accesos.length + usuarios.length + configuraciones.length + gastos.length}`);
    console.log('🏠 Los datos ahora están en MongoDB local');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Ejecutar migración
migrarDatos(); 