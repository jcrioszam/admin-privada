const axios = require('axios');

// URL de la API de producción
const API_URL = 'https://admin-privada.onrender.com/api';

async function actualizarViviendasViaAPI() {
  try {
    console.log('🔍 Obteniendo datos desde la API de producción...');
    
    // Obtener residentes desde la API
    const residentesResponse = await axios.get(`${API_URL}/residentes`);
    const residentes = residentesResponse.data;
    
    console.log(`📋 Encontrados ${residentes.length} residentes en producción`);
    
    // Mostrar los residentes existentes
    console.log('\n=== RESIDENTES EXISTENTES ===');
    residentes.forEach(residente => {
      console.log(`${residente.nombre} ${residente.apellidos} - Vivienda: ${residente.vivienda.numero} - Tipo: ${residente.tipo}`);
    });

    // Obtener viviendas desde la API
    const viviendasResponse = await axios.get(`${API_URL}/viviendas`);
    const viviendas = viviendasResponse.data;
    
    console.log(`\n📋 Encontradas ${viviendas.length} viviendas en producción`);

    // Contar viviendas con y sin residentes
    const viviendasConResidentes = viviendas.filter(v => v.residente);
    const viviendasSinResidentes = viviendas.filter(v => !v.residente);

    console.log('\n=== RESUMEN ACTUAL ===');
    console.log(`Total de viviendas: ${viviendas.length}`);
    console.log(`Viviendas con residentes: ${viviendasConResidentes.length}`);
    console.log(`Viviendas sin residentes: ${viviendasSinResidentes.length}`);

    // Crear un endpoint temporal en el backend para actualizar las viviendas
    console.log('\n🔄 Llamando al endpoint de actualización...');
    
    try {
      const actualizacionResponse = await axios.post(`${API_URL}/viviendas/actualizar-con-residentes`);
      const resultado = actualizacionResponse.data;
      
      console.log('\n✅ ACTUALIZACIÓN COMPLETADA');
      console.log(`📊 Total de viviendas: ${resultado.totalViviendas}`);
      console.log(`📊 Viviendas con residentes: ${resultado.viviendasConResidentes}`);
      console.log(`📊 Viviendas sin residentes: ${resultado.viviendasSinResidentes}`);
      console.log(`📊 Viviendas actualizadas: ${resultado.viviendasActualizadas}`);
      
      if (resultado.resultados.length > 0) {
        console.log('\n📋 VIVIENDAS ACTUALIZADAS:');
        resultado.resultados.forEach(item => {
          console.log(`  ✅ ${item.vivienda}: ${item.residente} (${item.tipo})`);
        });
      }
      
      console.log('\n🎉 ¡Proceso completado exitosamente!');
      console.log('Ahora las viviendas deberían mostrar la información de residentes en el frontend.');
      
    } catch (error) {
      console.error('❌ Error al actualizar:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

actualizarViviendasViaAPI(); 