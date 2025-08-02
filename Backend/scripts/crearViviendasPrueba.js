const mongoose = require('mongoose');
const Vivienda = require('../models/Vivienda');
require('dotenv').config({ path: './config.env' });

async function crearViviendasPrueba() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Verificar si ya existen viviendas
    const viviendasExistentes = await Vivienda.countDocuments();
    if (viviendasExistentes > 0) {
      console.log(`Ya existen ${viviendasExistentes} viviendas en la base de datos`);
      console.log('¿Deseas continuar y agregar más viviendas? (Ctrl+C para cancelar)');
      return;
    }

    const viviendasPrueba = [
      {
        numero: 'Casa 1',
        tipo: 'Casa',
        superficie: 150,
        habitaciones: 3,
        baños: 2,
        estacionamientos: 2,
        estado: 'Ocupada',
        tipoOcupacion: 'Dueño',
        cuotaMantenimiento: 800,
        observaciones: 'Casa principal del fraccionamiento'
      },
      {
        numero: 'Casa 2',
        tipo: 'Casa',
        superficie: 180,
        habitaciones: 4,
        baños: 3,
        estacionamientos: 2,
        estado: 'Ocupada',
        tipoOcupacion: 'Inquilino',
        cuotaMantenimiento: 900,
        observaciones: 'Casa con jardín amplio'
      },
      {
        numero: 'Casa 3',
        tipo: 'Casa',
        superficie: 120,
        habitaciones: 2,
        baños: 1,
        estacionamientos: 1,
        estado: 'Desocupada',
        tipoOcupacion: 'Vacante',
        cuotaMantenimiento: 700,
        observaciones: 'Casa pequeña ideal para parejas'
      },
      {
        numero: 'Casa 4',
        tipo: 'Townhouse',
        superficie: 200,
        habitaciones: 3,
        baños: 2,
        estacionamientos: 1,
        estado: 'Ocupada',
        tipoOcupacion: 'Dueño',
        cuotaMantenimiento: 1000,
        observaciones: 'Townhouse con terraza'
      },
      {
        numero: 'Casa 5',
        tipo: 'Casa',
        superficie: 160,
        habitaciones: 3,
        baños: 2,
        estacionamientos: 2,
        estado: 'En venta',
        tipoOcupacion: 'Vacante',
        cuotaMantenimiento: 850,
        observaciones: 'Casa en venta'
      },
      {
        numero: 'Casa 6',
        tipo: 'Departamento',
        superficie: 80,
        habitaciones: 2,
        baños: 1,
        estacionamientos: 1,
        estado: 'Ocupada',
        tipoOcupacion: 'Inquilino',
        cuotaMantenimiento: 600,
        observaciones: 'Departamento moderno'
      },
      {
        numero: 'Casa 7',
        tipo: 'Casa',
        superficie: 140,
        habitaciones: 3,
        baños: 2,
        estacionamientos: 1,
        estado: 'Ocupada',
        tipoOcupacion: 'Dueño',
        cuotaMantenimiento: 750,
        observaciones: 'Casa familiar'
      },
      {
        numero: 'Casa 8',
        tipo: 'Townhouse',
        superficie: 180,
        habitaciones: 3,
        baños: 2,
        estacionamientos: 1,
        estado: 'Desocupada',
        tipoOcupacion: 'Vacante',
        cuotaMantenimiento: 950,
        observaciones: 'Townhouse disponible'
      }
    ];

    console.log('Creando viviendas de prueba...');

    for (const viviendaData of viviendasPrueba) {
      const vivienda = new Vivienda(viviendaData);
      await vivienda.save();
      console.log(`✅ Vivienda creada: ${viviendaData.numero} - ${viviendaData.tipo}`);
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Viviendas creadas: ${viviendasPrueba.length}`);
    console.log('Tipos de viviendas:');
    console.log('- Casas: 5');
    console.log('- Townhouses: 2');
    console.log('- Departamentos: 1');
    console.log('\nEstados:');
    console.log('- Ocupadas: 5');
    console.log('- Desocupadas: 2');
    console.log('- En venta: 1');

  } catch (error) {
    console.error('Error creando viviendas:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar el script
crearViviendasPrueba(); 