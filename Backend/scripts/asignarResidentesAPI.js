const axios = require('axios');

// URL de la API de producción
const API_URL = 'https://admin-privada.onrender.com/api';

async function asignarResidentesAPI() {
  try {
    console.log('🔍 Obteniendo viviendas desde la API de producción...');
    
    // Obtener viviendas desde la API de producción
    const response = await axios.get(`${API_URL}/viviendas`);
    const viviendas = response.data;
    
    console.log(`📋 Encontradas ${viviendas.length} viviendas en producción`);
    
    // Mostrar las viviendas disponibles
    console.log('\n=== VIVIENDAS DISPONIBLES ===');
    viviendas.forEach(vivienda => {
      console.log(`${vivienda.numero}: ${vivienda.tipo} - ${vivienda.estado} - ${vivienda.tipoOcupacion}`);
      if (vivienda.observaciones) {
        console.log(`  Observaciones: ${vivienda.observaciones}`);
      }
    });

    // Crear residentes basándose en las observaciones
    const residentesData = [
      { numero: '1', nombre: 'Faby', apellidos: 'García', telefono: '555-0101', tipo: 'Dueño' },
      { numero: '2', nombre: 'Samantha', apellidos: 'López', telefono: '555-0102', tipo: 'Inquilino' },
      { numero: '3', nombre: 'Erica', apellidos: 'Armenta', telefono: '555-0103', tipo: 'Dueño' },
      { numero: '4', nombre: 'Yadira', apellidos: 'Martínez', telefono: '555-0104', tipo: 'Dueño' },
      { numero: '5', nombre: 'Vero y Enrique', apellidos: 'Rodríguez', telefono: '555-0105', tipo: 'Dueño' },
      { numero: '6', nombre: 'Emma y Abel', apellidos: 'Hernández', telefono: '555-0106', tipo: 'Dueño' },
      { numero: '8', nombre: 'Juan', apellidos: 'Fernández', telefono: '555-0108', tipo: 'Inquilino' },
      { numero: '9', nombre: 'Anahí', apellidos: 'Sarabia', telefono: '555-0109', tipo: 'Inquilino' },
      { numero: '10', nombre: 'Asusan', apellidos: 'Castro', telefono: '555-0110', tipo: 'Inquilino' },
      { numero: '11', nombre: 'Sara Dalia', apellidos: 'Vega', telefono: '555-0111', tipo: 'Inquilino' },
      { numero: '12', nombre: 'Ramon', apellidos: 'Silva', telefono: '555-0112', tipo: 'Dueño' },
      { numero: '13', nombre: 'Irinia', apellidos: 'Morales', telefono: '555-0113', tipo: 'Dueño' },
      { numero: '14', nombre: 'Yuri y Alejandro', apellidos: 'Jiménez', telefono: '555-0114', tipo: 'Dueño' },
      { numero: '15', nombre: 'Rossy', apellidos: 'Torres', telefono: '555-0115', tipo: 'Dueño' },
      { numero: '16', nombre: 'Profe Juan', apellidos: 'Díaz', telefono: '555-0116', tipo: 'Dueño' },
      { numero: '17', nombre: 'Nelly', apellidos: 'Cruz', telefono: '555-0117', tipo: 'Dueño' },
      { numero: '18', nombre: 'Osmar', apellidos: 'Reyes', telefono: '555-0118', tipo: 'Inquilino' },
      { numero: '19', nombre: 'LR, Natally', apellidos: 'Moreno', telefono: '555-0119', tipo: 'Inquilino' },
      { numero: '20', nombre: 'Sergio', apellidos: 'Alvarez', telefono: '555-0120', tipo: 'Inquilino' },
      { numero: '21', nombre: 'Giny', apellidos: 'Ruiz', telefono: '555-0121', tipo: 'Dueño' },
      { numero: '22', nombre: 'Mara', apellidos: 'Ortiz', telefono: '555-0122', tipo: 'Dueño' },
      { numero: '23', nombre: 'Citlali', apellidos: 'Guzmán', telefono: '555-0123', tipo: 'Inquilino' },
      { numero: '24', nombre: 'Enfermera', apellidos: 'Flores', telefono: '555-0124', tipo: 'Dueño' },
      { numero: '25', nombre: 'Humberto', apellidos: 'Sánchez', telefono: '555-0125', tipo: 'Dueño' }
    ];

    console.log('\n👥 Creando residentes...');
    let residentesCreados = 0;

    for (const residenteData of residentesData) {
      // Buscar la vivienda correspondiente
      const vivienda = viviendas.find(v => v.numero === residenteData.numero);
      
      if (vivienda) {
        console.log(`✅ Encontrada vivienda ${residenteData.numero} para ${residenteData.nombre} ${residenteData.apellidos}`);
        residentesCreados++;
      } else {
        console.log(`❌ No se encontró vivienda con número ${residenteData.numero}`);
      }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Total de viviendas en producción: ${viviendas.length}`);
    console.log(`Residentes que se pueden crear: ${residentesCreados}`);
    console.log(`Viviendas sin residentes: ${viviendas.filter(v => !v.residente).length}`);

    console.log('\n⚠️ NOTA: Este script solo verifica las viviendas disponibles.');
    console.log('Para crear residentes reales, necesitamos acceso directo a la base de datos de producción.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

asignarResidentesAPI(); 