const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// Importar modelos
const PagoEspecial = require('../models/PagoEspecial');

// Función para conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB exitosamente');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err.message);
    process.exit(1);
  }
};

// Función principal
const limpiarPagosEspeciales = async () => {
  try {
    console.log('🔍 Verificando registros de pagos especiales...');
    
    // Contar todos los registros
    const totalRegistros = await PagoEspecial.countDocuments();
    console.log(`📊 Total de registros encontrados: ${totalRegistros}`);

    if (totalRegistros === 0) {
      console.log('✅ La tabla ya está vacía');
      return;
    }

    // Mostrar algunos registros como ejemplo
    const registrosEjemplo = await PagoEspecial.find().limit(5);
    console.log('\n📋 Ejemplos de registros que se eliminarán:');
    registrosEjemplo.forEach((pago, index) => {
      console.log(`${index + 1}. ${pago.nombre || pago.tipo} - ${pago.descripcion} - $${pago.monto}`);
    });

    if (totalRegistros > 5) {
      console.log(`   ... y ${totalRegistros - 5} registros más`);
    }

    // Confirmar eliminación
    console.log('\n⚠️  ¿Estás seguro de que quieres eliminar TODOS los registros?');
    console.log('   Esto no se puede deshacer y dejará la tabla completamente vacía.');
    
    // En un script automático, procedemos directamente
    console.log('\n🗑️  Eliminando todos los registros...');

    // Eliminar TODOS los registros
    const resultado = await PagoEspecial.deleteMany({});

    console.log(`✅ Eliminados ${resultado.deletedCount} registros exitosamente`);
    
    // Verificar que se eliminaron todos
    const registrosRestantes = await PagoEspecial.countDocuments();
    
    if (registrosRestantes === 0) {
      console.log('✅ Verificación: La tabla está completamente vacía');
    } else {
      console.log(`⚠️  Advertencia: Quedan ${registrosRestantes} registros`);
    }

    console.log('\n🎉 Limpieza completada exitosamente');

  } catch (error) {
    console.error('❌ Error eliminando registros:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
};

// Ejecutar el script
console.log('🚀 Iniciando limpieza completa de pagos especiales...\n');
connectDB().then(() => {
  limpiarPagosEspeciales();
}); 