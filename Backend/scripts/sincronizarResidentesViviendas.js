const mongoose = require('mongoose');
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/admin-privada', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const sincronizarResidentesViviendas = async () => {
  try {
    console.log('🔄 Iniciando sincronización de residentes y viviendas...');

    // Obtener todos los residentes activos
    const residentes = await Residente.find({ activo: true }).populate('vivienda');
    console.log(`📋 Encontrados ${residentes.length} residentes activos`);

    // Agrupar residentes por vivienda
    const residentesPorVivienda = {};
    residentes.forEach(residente => {
      if (residente.vivienda) {
        const viviendaId = residente.vivienda._id.toString();
        if (!residentesPorVivienda[viviendaId]) {
          residentesPorVivienda[viviendaId] = [];
        }
        residentesPorVivienda[viviendaId].push(residente);
      }
    });

    console.log(`🏠 Viviendas con residentes: ${Object.keys(residentesPorVivienda).length}`);

    // Actualizar cada vivienda
    for (const [viviendaId, residentesVivienda] of Object.entries(residentesPorVivienda)) {
      const vivienda = await Vivienda.findById(viviendaId);
      if (!vivienda) {
        console.log(`⚠️  Vivienda ${viviendaId} no encontrada`);
        continue;
      }

      // Obtener el primer residente como residente principal
      const residentePrincipal = residentesVivienda[0];
      
      // Actualizar la vivienda
      await Vivienda.findByIdAndUpdate(viviendaId, {
        estado: 'Ocupada',
        tipoOcupacion: residentePrincipal.tipo,
        residente: residentePrincipal._id,
        residentes: residentesVivienda.map(r => r._id)
      });

      console.log(`✅ Vivienda ${vivienda.numero} actualizada con ${residentesVivienda.length} residentes`);
    }

    // Actualizar viviendas sin residentes activos
    const viviendasOcupadas = Object.keys(residentesPorVivienda);
    const viviendasSinResidentes = await Vivienda.find({
      _id: { $nin: viviendasOcupadas }
    });

    for (const vivienda of viviendasSinResidentes) {
      await Vivienda.findByIdAndUpdate(vivienda._id, {
        estado: 'Desocupada',
        tipoOcupacion: 'Vacante',
        residente: null,
        residentes: []
      });
      console.log(`🏚️  Vivienda ${vivienda.numero} marcada como desocupada`);
    }

    console.log('✅ Sincronización completada exitosamente');
    
    // Mostrar resumen
    const totalViviendas = await Vivienda.countDocuments();
    const viviendasOcupadasCount = await Vivienda.countDocuments({ estado: 'Ocupada' });
    const viviendasDesocupadasCount = await Vivienda.countDocuments({ estado: 'Desocupada' });
    
    console.log('\n📊 Resumen:');
    console.log(`Total viviendas: ${totalViviendas}`);
    console.log(`Viviendas ocupadas: ${viviendasOcupadasCount}`);
    console.log(`Viviendas desocupadas: ${viviendasDesocupadasCount}`);
    console.log(`Total residentes activos: ${residentes.length}`);

  } catch (error) {
    console.error('❌ Error durante la sincronización:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
};

// Ejecutar el script
sincronizarResidentesViviendas();
