const mongoose = require('mongoose');
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');
require('dotenv').config({ path: './config.env' });

async function crearResidentesPrueba() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Verificar si ya existen residentes
    const residentesExistentes = await Residente.countDocuments();
    if (residentesExistentes > 0) {
      console.log(`Ya existen ${residentesExistentes} residentes en la base de datos`);
      console.log('¿Deseas continuar y agregar más residentes? (Ctrl+C para cancelar)');
      return;
    }

    const residentesPrueba = [
      {
        nombre: 'Juan Carlos',
        apellidos: 'García López',
        email: 'juan.garcia@email.com',
        telefono: '555-0101',
        tipo: 'Dueño',
        fechaNacimiento: '1985-03-15',
        ocupacion: 'Ingeniero',
        activo: true,
        observaciones: 'Dueño de Casa 1'
      },
      {
        nombre: 'María Elena',
        apellidos: 'Rodríguez Silva',
        email: 'maria.rodriguez@email.com',
        telefono: '555-0102',
        tipo: 'Inquilino',
        fechaNacimiento: '1990-07-22',
        ocupacion: 'Médica',
        activo: true,
        observaciones: 'Inquilina de Casa 2'
      },
      {
        nombre: 'Carlos Alberto',
        apellidos: 'Martínez Díaz',
        email: 'carlos.martinez@email.com',
        telefono: '555-0103',
        tipo: 'Dueño',
        fechaNacimiento: '1978-11-08',
        ocupacion: 'Abogado',
        activo: true,
        observaciones: 'Dueño de Casa 4'
      },
      {
        nombre: 'Ana Sofía',
        apellidos: 'Hernández Vega',
        email: 'ana.hernandez@email.com',
        telefono: '555-0104',
        tipo: 'Inquilino',
        fechaNacimiento: '1992-04-12',
        ocupacion: 'Arquitecta',
        activo: true,
        observaciones: 'Inquilina de Casa 6'
      },
      {
        nombre: 'Roberto Luis',
        apellidos: 'Fernández Castro',
        email: 'roberto.fernandez@email.com',
        telefono: '555-0105',
        tipo: 'Dueño',
        fechaNacimiento: '1982-09-30',
        ocupacion: 'Empresario',
        activo: true,
        observaciones: 'Dueño de Casa 7'
      }
    ];

    console.log('Creando residentes de prueba...');

    const residentesCreados = [];
    for (const residenteData of residentesPrueba) {
      const residente = new Residente(residenteData);
      await residente.save();
      residentesCreados.push(residente);
      console.log(`✅ Residente creado: ${residenteData.nombre} ${residenteData.apellidos}`);
    }

    // Asignar residentes a viviendas
    console.log('\nAsignando residentes a viviendas...');
    
    const viviendas = await Vivienda.find().sort({ numero: 1 });
    const asignaciones = [
      { viviendaIndex: 0, residenteIndex: 0 }, // Casa 1 - Juan Carlos
      { viviendaIndex: 1, residenteIndex: 1 }, // Casa 2 - María Elena
      { viviendaIndex: 3, residenteIndex: 2 }, // Casa 4 - Carlos Alberto
      { viviendaIndex: 5, residenteIndex: 3 }, // Casa 6 - Ana Sofía
      { viviendaIndex: 6, residenteIndex: 4 }  // Casa 7 - Roberto Luis
    ];

    for (const asignacion of asignaciones) {
      const vivienda = viviendas[asignacion.viviendaIndex];
      const residente = residentesCreados[asignacion.residenteIndex];
      
      vivienda.residente = residente._id;
      await vivienda.save();
      
      console.log(`✅ ${residente.nombre} ${residente.apellidos} asignado a ${vivienda.numero}`);
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Residentes creados: ${residentesCreados.length}`);
    console.log(`Viviendas con residentes asignados: ${asignaciones.length}`);
    console.log('\nTipos de residentes:');
    console.log('- Dueños: 3');
    console.log('- Inquilinos: 2');

  } catch (error) {
    console.error('Error creando residentes:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar el script
crearResidentesPrueba(); 