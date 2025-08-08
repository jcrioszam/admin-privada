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
const eliminarProyectoBarda = async () => {
  try {
    console.log('🔍 Buscando registros de pagos especiales relacionados con "barda"...');
    
    // Buscar todos los pagos especiales que contengan "barda" en el nombre o descripción
    const pagosBarda = await PagoEspecial.find({
      $or: [
        { nombre: { $regex: /barda/i } },
        { descripcion: { $regex: /barda/i } },
        { tipo: { $regex: /barda/i } }
      ]
    });

    console.log(`📊 Encontrados ${pagosBarda.length} registros de barda`);

    if (pagosBarda.length === 0) {
      console.log('✅ No se encontraron registros de barda para eliminar');
      return;
    }

    // Mostrar los registros que se van a eliminar
    console.log('\n📋 Registros que se eliminarán:');
    pagosBarda.forEach((pago, index) => {
      console.log(`${index + 1}. ${pago.nombre || pago.tipo} - ${pago.descripcion} - $${pago.monto}`);
    });

    // Confirmar eliminación
    console.log('\n⚠️  ¿Estás seguro de que quieres eliminar estos registros?');
    console.log('   Esto no se puede deshacer.');
    
    // En un script automático, procedemos directamente
    console.log('\n🗑️  Eliminando registros...');

    // Eliminar todos los registros encontrados
    const resultado = await PagoEspecial.deleteMany({
      $or: [
        { nombre: { $regex: /barda/i } },
        { descripcion: { $regex: /barda/i } },
        { tipo: { $regex: /barda/i } }
      ]
    });

    console.log(`✅ Eliminados ${resultado.deletedCount} registros exitosamente`);
    
    // Verificar que se eliminaron
    const registrosRestantes = await PagoEspecial.find({
      $or: [
        { nombre: { $regex: /barda/i } },
        { descripcion: { $regex: /barda/i } },
        { tipo: { $regex: /barda/i } }
      ]
    });

    if (registrosRestantes.length === 0) {
      console.log('✅ Verificación: No quedan registros de barda');
    } else {
      console.log(`⚠️  Advertencia: Quedan ${registrosRestantes.length} registros de barda`);
    }

    // Mostrar estadísticas finales
    const totalPagosEspeciales = await PagoEspecial.countDocuments();
    console.log(`\n📊 Total de pagos especiales restantes: ${totalPagosEspeciales}`);

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
console.log('🚀 Iniciando limpieza de registros de barda...\n');
connectDB().then(() => {
  eliminarProyectoBarda();
}); 