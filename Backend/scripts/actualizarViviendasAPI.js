const axios = require('axios');

// URL de la API de producción
const API_URL = 'https://admin-privada.onrender.com/api';

async function actualizarViviendasAPI() {
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

    if (viviendasConResidentes.length > 0) {
      console.log('\n=== VIVIENDAS CON RESIDENTES ===');
      viviendasConResidentes.forEach(vivienda => {
        console.log(`${vivienda.numero}: ${vivienda.residente.nombre} ${vivienda.residente.apellidos} (${vivienda.residente.tipo})`);
      });
    }

    if (viviendasSinResidentes.length > 0) {
      console.log('\n=== VIVIENDAS SIN RESIDENTES ===');
      viviendasSinResidentes.forEach(vivienda => {
        console.log(`${vivienda.numero}: ${vivienda.observaciones || 'Sin observaciones'}`);
      });
    }

    console.log('\n⚠️ NOTA: Este script solo muestra el estado actual.');
    console.log('Para actualizar las viviendas, necesitamos acceso directo a la base de datos de producción.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

actualizarViviendasAPI(); 