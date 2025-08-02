const mongoose = require('mongoose');
const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');
const Configuracion = require('../models/Configuracion');
const moment = require('moment');
require('dotenv').config({ path: './config.env' });

async function regenerarPagos() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Obtener configuración global
    let configuracion = await Configuracion.findOne({ activo: true });
    if (!configuracion) {
      // Crear configuración por defecto si no existe
      configuracion = new Configuracion({
        cuotaMantenimientoMensual: 500,
        nombreFraccionamiento: 'Fraccionamiento Privado',
        diasGraciaPago: 5,
        porcentajeRecargo: 10,
        activo: true
      });
      await configuracion.save();
      console.log('Configuración por defecto creada');
    }

    console.log(`Usando cuota mensual: $${configuracion.cuotaMantenimientoMensual}`);

    // Obtener todos los pagos existentes
    const pagosExistentes = await Pago.find({});
    console.log(`Encontrados ${pagosExistentes.length} pagos existentes`);

    let pagosActualizados = 0;

    for (const pago of pagosExistentes) {
      // Actualizar el monto del pago con la configuración global
      if (pago.monto !== configuracion.cuotaMantenimientoMensual) {
        pago.monto = configuracion.cuotaMantenimientoMensual;
        await pago.save();
        console.log(`✅ Pago actualizado para ${pago.vivienda} - ${pago.mes}/${pago.año} ($${configuracion.cuotaMantenimientoMensual})`);
        pagosActualizados++;
      } else {
        console.log(`ℹ️  Pago ya tiene el monto correcto: ${pago.vivienda} - ${pago.mes}/${pago.año}`);
      }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Pagos actualizados: ${pagosActualizados}`);
    console.log(`Total pagos procesados: ${pagosExistentes.length}`);
    console.log(`Cuota mensual aplicada: $${configuracion.cuotaMantenimientoMensual}`);

  } catch (error) {
    console.error('Error regenerando pagos:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar el script
regenerarPagos(); 