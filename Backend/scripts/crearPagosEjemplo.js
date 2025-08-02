const mongoose = require('mongoose');
const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');
const Configuracion = require('../models/Configuracion');
const moment = require('moment');
require('dotenv').config({ path: './config.env' });

async function crearPagosEjemplo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Obtener configuración
    let configuracion = await Configuracion.findOne({ activo: true });
    if (!configuracion) {
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

    // Crear viviendas de ejemplo si no existen
    const viviendasEjemplo = [
      { numero: 'Casa 1', tipo: 'Casa', estado: 'Ocupada', tipoOcupacion: 'Dueño' },
      { numero: 'Casa 2', tipo: 'Casa', estado: 'Ocupada', tipoOcupacion: 'Inquilino' },
      { numero: 'Casa 3', tipo: 'Casa', estado: 'Ocupada', tipoOcupacion: 'Dueño' },
      { numero: 'Casa 4', tipo: 'Casa', estado: 'Ocupada', tipoOcupacion: 'Inquilino' },
      { numero: 'Casa 5', tipo: 'Casa', estado: 'Ocupada', tipoOcupacion: 'Dueño' }
    ];

    const viviendasCreadas = [];
    for (const viviendaData of viviendasEjemplo) {
      let vivienda = await Vivienda.findOne({ numero: viviendaData.numero });
      if (!vivienda) {
        vivienda = new Vivienda(viviendaData);
        await vivienda.save();
        console.log(`✅ Vivienda creada: ${vivienda.numero}`);
      } else {
        console.log(`ℹ️  Vivienda ya existe: ${vivienda.numero}`);
      }
      viviendasCreadas.push(vivienda);
    }

    // Crear pagos de ejemplo con diferentes estados y fechas
    const pagosEjemplo = [
      // Casa 1 - Pago vencido (2 meses atrasado)
      {
        vivienda: viviendasCreadas[0]._id,
        mes: moment().subtract(2, 'months').month() + 1,
        año: moment().subtract(2, 'months').year(),
        monto: configuracion.cuotaMantenimientoMensual,
        montoPagado: 0,
        excedente: 0,
        estado: 'Vencido',
        metodoPago: 'Otro',
        fechaPago: null,
        fechaInicioPeriodo: moment().subtract(2, 'months').startOf('month').toDate(),
        fechaFinPeriodo: moment().subtract(2, 'months').endOf('month').toDate(),
        fechaLimite: moment().subtract(2, 'months').endOf('month').toDate(),
        registradoPor: new mongoose.Types.ObjectId()
      },
      // Casa 1 - Pago vencido (1 mes atrasado)
      {
        vivienda: viviendasCreadas[0]._id,
        mes: moment().subtract(1, 'month').month() + 1,
        año: moment().subtract(1, 'month').year(),
        monto: configuracion.cuotaMantenimientoMensual,
        montoPagado: 0,
        excedente: 0,
        estado: 'Vencido',
        metodoPago: 'Otro',
        fechaPago: null,
        fechaInicioPeriodo: moment().subtract(1, 'month').startOf('month').toDate(),
        fechaFinPeriodo: moment().subtract(1, 'month').endOf('month').toDate(),
        fechaLimite: moment().subtract(1, 'month').endOf('month').toDate(),
        registradoPor: new mongoose.Types.ObjectId()
      },

      // Casa 2 - Pago parcial (pagó solo $200 de $500)
      {
        vivienda: viviendasCreadas[1]._id,
        mes: moment().month() + 1,
        año: moment().year(),
        monto: configuracion.cuotaMantenimientoMensual,
        montoPagado: 200,
        excedente: 0,
        estado: 'Parcial',
        metodoPago: 'Efectivo',
        fechaPago: moment().subtract(5, 'days').toDate(),
        fechaInicioPeriodo: moment().startOf('month').toDate(),
        fechaFinPeriodo: moment().endOf('month').toDate(),
        fechaLimite: moment().endOf('month').toDate(),
        registradoPor: new mongoose.Types.ObjectId()
      },

      // Casa 3 - Pago pendiente (mes actual)
      {
        vivienda: viviendasCreadas[2]._id,
        mes: moment().month() + 1,
        año: moment().year(),
        monto: configuracion.cuotaMantenimientoMensual,
        montoPagado: 0,
        excedente: 0,
        estado: 'Pendiente',
        metodoPago: 'Otro',
        fechaPago: null,
        fechaInicioPeriodo: moment().startOf('month').toDate(),
        fechaFinPeriodo: moment().endOf('month').toDate(),
        fechaLimite: moment().endOf('month').toDate(),
        registradoPor: new mongoose.Types.ObjectId()
      },

      // Casa 4 - Pago completado con excedente
      {
        vivienda: viviendasCreadas[3]._id,
        mes: moment().subtract(1, 'month').month() + 1,
        año: moment().subtract(1, 'month').year(),
        monto: configuracion.cuotaMantenimientoMensual,
        montoPagado: 700,
        excedente: 200,
        estado: 'Pagado con excedente',
        metodoPago: 'Transferencia',
        fechaPago: moment().subtract(1, 'month').date(15).toDate(),
        fechaInicioPeriodo: moment().subtract(1, 'month').startOf('month').toDate(),
        fechaFinPeriodo: moment().subtract(1, 'month').endOf('month').toDate(),
        fechaLimite: moment().subtract(1, 'month').endOf('month').toDate(),
        registradoPor: new mongoose.Types.ObjectId()
      },

      // Casa 5 - Pago vencido (3 meses atrasado)
      {
        vivienda: viviendasCreadas[4]._id,
        mes: moment().subtract(3, 'months').month() + 1,
        año: moment().subtract(3, 'months').year(),
        monto: configuracion.cuotaMantenimientoMensual,
        montoPagado: 0,
        excedente: 0,
        estado: 'Vencido',
        metodoPago: 'Otro',
        fechaPago: null,
        fechaInicioPeriodo: moment().subtract(3, 'months').startOf('month').toDate(),
        fechaFinPeriodo: moment().subtract(3, 'months').endOf('month').toDate(),
        fechaLimite: moment().subtract(3, 'months').endOf('month').toDate(),
        registradoPor: new mongoose.Types.ObjectId()
      }
    ];

    console.log('\n=== CREANDO PAGOS DE EJEMPLO ===');
    
    for (const pagoData of pagosEjemplo) {
      // Verificar si ya existe un pago para esta vivienda, mes y año
      const pagoExistente = await Pago.findOne({
        vivienda: pagoData.vivienda,
        mes: pagoData.mes,
        año: pagoData.año
      });

      if (pagoExistente) {
        console.log(`ℹ️  Pago ya existe para ${pagoData.vivienda} - ${pagoData.mes}/${pagoData.año}`);
        continue;
      }

      const pago = new Pago(pagoData);
      await pago.save();
      
      const vivienda = viviendasCreadas.find(v => v._id.toString() === pagoData.vivienda.toString());
      console.log(`✅ Pago creado: ${vivienda.numero} - ${pagoData.mes}/${pagoData.año} - ${pagoData.estado}`);
    }

    console.log('\n=== RESUMEN DE PAGOS DE EJEMPLO ===');
    console.log('🏠 Casa 1: 2 pagos vencidos (2 y 1 mes atrasado)');
    console.log('🏠 Casa 2: 1 pago parcial ($200 de $500)');
    console.log('🏠 Casa 3: 1 pago pendiente (mes actual)');
    console.log('🏠 Casa 4: 1 pago completado con excedente ($700 pagado)');
    console.log('🏠 Casa 5: 1 pago vencido (3 meses atrasado)');
    
    console.log('\n=== ESTADOS DE PRUEBA ===');
    console.log('🔴 Vencidos: 4 pagos');
    console.log('🟡 Pendientes: 1 pago');
    console.log('🔵 Parciales: 1 pago');
    console.log('🟢 Completados: 1 pago');

  } catch (error) {
    console.error('Error creando pagos de ejemplo:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
    process.exit(0);
  }
}

crearPagosEjemplo(); 