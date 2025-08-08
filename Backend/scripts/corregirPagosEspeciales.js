const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config-local.env') });

async function conectar() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI no está definido. Revisa Backend/config-local.env');
  }
  console.log(`🔗 Conectando a MongoDB: ${uri}`);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
  });
}

const PagoEspecial = require('../models/PagoEspecial');

async function corregirPagosEspeciales() {
  try {
    console.log('🔍 Buscando pagos especiales para corregir...');
    
    // Obtener SOLO los pagos mal estructurados (documentos con vivienda definida y SIN pagoEspecialOriginal)
    const pagosEspeciales = await PagoEspecial.find({
      vivienda: { $exists: true, $ne: null },
      $or: [
        { pagoEspecialOriginal: { $exists: false } },
        { pagoEspecialOriginal: null }
      ]
    }).populate('vivienda');
    
    console.log(`📊 Total de pagos especiales encontrados: ${pagosEspeciales.length}`);
    
    // Agrupar por tipo
    const pagosPorTipo = {};
    
    pagosEspeciales.forEach(pago => {
      if (!pagosPorTipo[pago.tipo]) {
        pagosPorTipo[pago.tipo] = [];
      }
      pagosPorTipo[pago.tipo].push(pago);
    });
    
    console.log(`📋 Tipos de proyectos encontrados: ${Object.keys(pagosPorTipo).length}`);
    
    // Procesar cada tipo
    for (const [tipo, pagos] of Object.entries(pagosPorTipo)) {
      console.log(`\n🔄 Procesando proyecto: ${tipo}`);
      console.log(`   📝 Pagos individuales: ${pagos.length}`);
      
      if (pagos.length === 0) continue;
      
      // Tomar el primer pago como referencia
      const pagoReferencia = pagos[0];
      
      // Obtener viviendas únicas
      const viviendasUnicas = [...new Set(pagos.map(p => p.vivienda?._id).filter(Boolean))];
      
      console.log(`   🏠 Viviendas únicas: ${viviendasUnicas.length}`);
      
      // Calcular montos
      const montoPorVivienda = pagoReferencia.monto || 0;
      const montoTotal = montoPorVivienda * viviendasUnicas.length;
      
      console.log(`   💰 Monto por vivienda: $${montoPorVivienda.toLocaleString()}`);
      console.log(`   💰 Monto total: $${montoTotal.toLocaleString()}`);
      
      // Crear nuevo proyecto consolidado
      const nuevoProyecto = new PagoEspecial({
        tipo: pagoReferencia.tipo,
        descripcion: pagoReferencia.descripcion,
        monto: montoTotal,
        montoPorVivienda: montoPorVivienda,
        fechaLimite: pagoReferencia.fechaLimite,
        aplicaATodasLasViviendas: false,
        viviendasSeleccionadas: viviendasUnicas,
        cantidadPagar: pagoReferencia.cantidadPagar || 0,
        notas: pagoReferencia.notas,
        registradoPor: pagoReferencia.registradoPor,
        estado: 'Pendiente',
        pagado: false
      });
      
      // Guardar el nuevo proyecto
      await nuevoProyecto.save();
      console.log(`   ✅ Proyecto consolidado creado: ${nuevoProyecto._id}`);
      
      // Eliminar los pagos individuales
      const idsAEliminar = pagos.map(p => p._id);
      await PagoEspecial.deleteMany({ _id: { $in: idsAEliminar } });
      console.log(`   🗑️ Eliminados ${pagos.length} pagos individuales`);
    }
    
    console.log('\n✅ Corrección completada exitosamente');
    
    // Mostrar resumen final
    const pagosFinales = await PagoEspecial.find({});
    console.log(`📊 Total de proyectos después de la corrección: ${pagosFinales.length}`);
    
  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
  }
}

// Ejecutar el script
(async () => {
  try {
    await conectar();
    await corregirPagosEspeciales();
  } catch (err) {
    console.error('❌ Error al conectar/ejecutar:', err);
    mongoose.connection.close();
  }
})();