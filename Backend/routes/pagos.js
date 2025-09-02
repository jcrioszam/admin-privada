const express = require('express');
const router = express.Router();
const Pago = require('../models/Pago');
const Vivienda = require('../models/Vivienda');
const Residente = require('../models/Residente');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const mongoose = require('mongoose');
const Configuracion = require('../models/Configuracion');

// Obtener corte diario de pagos
router.get('/corte-diario/:fecha', async (req, res) => {
  try {
    const { fecha } = req.params;
    
    // Convertir fecha a inicio y fin del día en hora local usando moment
    // Ajustar para incluir todo el día completo considerando zona horaria
    const fechaInicio = moment(fecha).subtract(6, 'hours').startOf('day').toDate();
    const fechaFin = moment(fecha).add(6, 'hours').endOf('day').toDate();
    
    console.log(`Corte diario para fecha: ${fecha}`);
    console.log(`Rango de búsqueda: ${fechaInicio.toISOString()} - ${fechaFin.toISOString()}`);
    
    const pagos = await Pago.find({
      fechaPago: {
        $gte: fechaInicio,
        $lte: fechaFin
      },
      estado: { $in: ['Pagado', 'Pagado con excedente'] }
    })
    .populate('vivienda', 'numero')
    .populate('residente', 'nombre apellidos')
    .populate('registradoPor', 'nombre')
    .sort({ fechaPago: -1 });
    
    console.log(`Pagos encontrados: ${pagos.length}`);
    pagos.forEach(pago => {
      console.log(`- ${pago.vivienda?.numero}: ${pago.mes}/${pago.año} - ${pago.estado} - ${pago.fechaPago}`);
    });
    
    res.json(pagos);
  } catch (error) {
    console.error('Error obteniendo corte diario:', error);
    res.status(500).json({ message: 'Error obteniendo corte diario' });
  }
});

// Obtener todos los pagos
router.get('/', async (req, res) => {
  try {
    const { vivienda, residente, estado, mes, año } = req.query;
    let filtro = {};
    
    if (vivienda) filtro.vivienda = vivienda;
    if (residente) filtro.residente = residente;
    if (estado) filtro.estado = estado;
    if (mes) filtro.mes = parseInt(mes);
    if (año) filtro.año = parseInt(año);
    
    const pagos = await Pago.find(filtro)
      .populate('vivienda', 'numero calle')
      .populate('residente', 'nombre apellidos')
      .populate('registradoPor', 'nombre apellidos')
      .sort({ año: -1, mes: -1, fechaPago: -1 });
    
    res.json(pagos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener un pago específico
router.get('/:id', async (req, res) => {
  try {
    const pago = await Pago.findById(req.params.id)
      .populate('vivienda', 'numero calle cuotaMantenimiento')
      .populate('residente', 'nombre apellidos email telefono')
      .populate('registradoPor', 'nombre apellidos');
    
    if (!pago) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }
    res.json(pago);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crear nuevo pago
router.post('/', [
  body('vivienda').isMongoId().withMessage('Vivienda inválida'),
  body('residente').isMongoId().withMessage('Residente inválido'),
  body('mes').isInt({ min: 1, max: 12 }).withMessage('Mes inválido'),
  body('año').isInt({ min: 2020 }).withMessage('Año inválido'),
  body('monto').isNumeric().withMessage('Monto inválido'),
  body('metodoPago').isIn(['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro']).withMessage('Método de pago inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verificar que la vivienda y residente existen
    const [vivienda, residente] = await Promise.all([
      Vivienda.findById(req.body.vivienda),
      Residente.findById(req.body.residente)
    ]);

    if (!vivienda) {
      return res.status(400).json({ message: 'Vivienda no encontrada' });
    }
    if (!residente) {
      return res.status(400).json({ message: 'Residente no encontrado' });
    }

    // Verificar si ya existe un pago para este mes/año
    const pagoExistente = await Pago.findOne({
      vivienda: req.body.vivienda,
      mes: req.body.mes,
      año: req.body.año
    });

    if (pagoExistente) {
      return res.status(400).json({ message: 'Ya existe un pago para este mes y año' });
    }

    // Calcular fechas automáticamente
    const fechaVencimiento = moment(`${req.body.año}-${req.body.mes.toString().padStart(2, '0')}-01`).toDate();
    const fechaLimite = moment(`${req.body.año}-${req.body.mes.toString().padStart(2, '0')}-01`).endOf('month').toDate();

    const pago = new Pago({
      ...req.body,
      fechaVencimiento,
      fechaLimite,
      registradoPor: req.body.registradoPor || '64f1a2b3c4d5e6f7g8h9i0j1' // ID temporal, se debe obtener del token
    });
    
    const nuevoPago = await pago.save();
    
    const pagoPopulado = await Pago.findById(nuevoPago._id)
      .populate('vivienda', 'numero calle')
      .populate('residente', 'nombre apellidos');
    
    res.status(201).json(pagoPopulado);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Actualizar pago
router.put('/:id', [
  body('monto').optional().isNumeric().withMessage('Monto inválido'),
  body('montoAdicional').optional().isNumeric().withMessage('Monto adicional inválido'),
  body('estado').optional().isIn(['Pendiente', 'Pagado', 'Vencido', 'Parcial']).withMessage('Estado inválido'),
  body('metodoPago').optional().isIn(['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro']).withMessage('Método de pago inválido'),
  body('fechaPago').optional().isISO8601().withMessage('Fecha de pago inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pago = await Pago.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('vivienda', 'numero calle')
     .populate('residente', 'nombre apellidos');
    
    if (!pago) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }
    
    res.json(pago);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Registrar pago
router.post('/:id/registrar-pago', [
  body('metodoPago').isIn(['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro']).withMessage('Método de pago inválido'),
  body('referenciaPago').optional().notEmpty().withMessage('La referencia no puede estar vacía')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pago = await Pago.findById(req.params.id);
    if (!pago) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    pago.estado = 'Pagado';
    pago.fechaPago = new Date();
    pago.metodoPago = req.body.metodoPago;
    pago.referenciaPago = req.body.referenciaPago;
    pago.registradoPor = req.body.registradoPor || '64f1a2b3c4d5e6f7g8h9i0j1';

    const pagoActualizado = await pago.save();
    
    const pagoPopulado = await Pago.findById(pagoActualizado._id)
      .populate('vivienda', 'numero calle')
      .populate('residente', 'nombre apellidos');
    
    res.json(pagoPopulado);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Registrar pago múltiple
router.post('/pago-multiple', [
  body('pagoIds').isArray().withMessage('Debe ser un array de IDs de pagos'),
  body('metodoPago').isIn(['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro']).withMessage('Método de pago inválido'),
  body('referenciaPago').optional().notEmpty().withMessage('La referencia no puede estar vacía'),
  body('montoPagado').isNumeric().withMessage('Monto inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pagoIds, metodoPago, referenciaPago, montoPagado } = req.body;

    // Verificar que todos los pagos existan
    const pagos = await Pago.find({ _id: { $in: pagoIds } });
    if (pagos.length !== pagoIds.length) {
      return res.status(404).json({ message: 'Uno o más pagos no encontrados' });
    }

    // Calcular total de los pagos seleccionados
    const totalPagos = pagos.reduce((sum, pago) => {
      const recargo = pago.estaVencido ? (pago.calcularRecargo?.() || 0) : 0;
      return sum + pago.monto + recargo;
    }, 0);

    // Verificar que el monto pagado sea suficiente
    if (parseFloat(montoPagado) < totalPagos) {
      return res.status(400).json({ 
        message: `El monto pagado (${montoPagado}) es menor al total requerido (${totalPagos})` 
      });
    }

    // Actualizar todos los pagos
    const pagosActualizados = [];
    for (const pago of pagos) {
      pago.estado = 'Pagado';
      pago.fechaPago = new Date();
      pago.metodoPago = metodoPago;
      pago.referenciaPago = referenciaPago;
      pago.registradoPor = req.body.registradoPor || '64f1a2b3c4d5e6f7g8h9i0j1';
      
      const pagoActualizado = await pago.save();
      const pagoPopulado = await Pago.findById(pagoActualizado._id)
        .populate('vivienda', 'numero calle')
        .populate('residente', 'nombre apellidos');
      
      pagosActualizados.push(pagoPopulado);
    }

    res.json({
      message: `${pagosActualizados.length} pagos registrados exitosamente`,
      pagos: pagosActualizados,
      totalPagado: montoPagado,
      excedente: parseFloat(montoPagado) - totalPagos
    });
  } catch (error) {
    console.error('Error registrando pago múltiple:', error);
    res.status(500).json({ message: error.message });
  }
});

// Registrar pago adelantado
router.post('/:id/pago-adelantado', [
  body('mes').isInt({ min: 1, max: 12 }).withMessage('Mes inválido'),
  body('año').isInt({ min: 2020 }).withMessage('Año inválido'),
  body('monto').isNumeric().withMessage('Monto inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pago = await Pago.findById(req.params.id);
    if (!pago) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    // Verificar que no exista ya un pago para ese mes/año
    const pagoAdelantadoExistente = await Pago.findOne({
      vivienda: pago.vivienda,
      mes: req.body.mes,
      año: req.body.año
    });

    if (pagoAdelantadoExistente) {
      return res.status(400).json({ message: 'Ya existe un pago para ese mes y año' });
    }

    // Agregar pago adelantado
    pago.pagosAdelantados.push({
      mes: req.body.mes,
      año: req.body.año,
      monto: req.body.monto,
      fechaPago: new Date()
    });

    const pagoActualizado = await pago.save();
    
    const pagoPopulado = await Pago.findById(pagoActualizado._id)
      .populate('vivienda', 'numero calle')
      .populate('residente', 'nombre apellidos');
    
    res.json(pagoPopulado);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Registrar pago (marcar como pagado)
router.put('/:id/registrar-pago', [
  body('metodoPago').isIn(['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro']).withMessage('Método de pago inválido'),
  body('referenciaPago').optional().isString().withMessage('Referencia inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pago = await Pago.findById(req.params.id);
    if (!pago) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    if (pago.estado === 'Pagado') {
      return res.status(400).json({ message: 'El pago ya está registrado como pagado' });
    }

    // Calcular recargo si está vencido
    let montoAdicional = 0;
    if (pago.estaVencido()) {
      montoAdicional = pago.calcularRecargo();
    }

    pago.estado = 'Pagado';
    pago.fechaPago = new Date();
    pago.metodoPago = req.body.metodoPago;
    pago.referenciaPago = req.body.referenciaPago || '';
    pago.montoAdicional = montoAdicional;
    pago.conceptoAdicional = montoAdicional > 0 ? 'Recargo por atraso' : '';

    await pago.save();

    const pagoPopulado = await Pago.findById(pago._id)
      .populate('vivienda', 'numero')
      .populate('residente', 'nombre apellidos');

    res.json(pagoPopulado);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Registrar pago con excedentes
router.put('/:id/registrar-pago-flexible', [
  body('montoPagado').isNumeric().withMessage('El monto pagado debe ser numérico'),
  body('metodoPago').isIn(['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro']).withMessage('Método de pago inválido'),
  body('referenciaPago').optional().isString().withMessage('Referencia inválida'),
  body('aplicarExcedenteAMesFuturo').optional().isBoolean().withMessage('Debe ser true o false')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pago = await Pago.findById(req.params.id);
    if (!pago) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    const montoPagado = parseFloat(req.body.montoPagado);
    const aplicarExcedente = req.body.aplicarExcedenteAMesFuturo === 'true' || req.body.aplicarExcedenteAMesFuturo === true;

    // Calcular recargo si está vencido
    let recargo = 0;
    if (pago.estaVencido()) {
      recargo = pago.calcularRecargo();
    }

    // Calcular el total a pagar (monto + recargo)
    const totalAPagar = pago.monto + recargo;
    
    // Calcular excedente
    const excedente = montoPagado > totalAPagar ? montoPagado - totalAPagar : 0;
    
    // Actualizar el pago actual
    pago.montoPagado = montoPagado;
    pago.montoAdicional = recargo;
    pago.conceptoAdicional = recargo > 0 ? 'Recargo por atraso' : '';
    pago.excedente = excedente;
    pago.fechaPago = new Date();
    pago.metodoPago = req.body.metodoPago;
    pago.referenciaPago = req.body.referenciaPago || '';

    // Determinar el estado del pago
    if (montoPagado >= totalAPagar) {
      pago.estado = excedente > 0 ? 'Pagado con excedente' : 'Pagado';
    } else {
      pago.estado = 'Parcial';
    }

    await pago.save();

    // Si hay excedente y se quiere aplicar a meses futuros
    if (excedente > 0 && aplicarExcedente) {
      await aplicarExcedenteAMesesFuturos(pago.vivienda, excedente, pago.mes, pago.año);
    }

    // Si el pago se completó completamente, generar automáticamente el próximo pago
    if (pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente') {
      try {
        // Buscar el próximo pago pendiente o generar uno nuevo
        const proximoPago = await generarProximoPagoAutomatico(pago.vivienda);
        if (proximoPago) {
          console.log(`✅ Próximo pago generado automáticamente para vivienda ${pago.vivienda}`);
        }
      } catch (error) {
        console.log('⚠️ No se pudo generar próximo pago automáticamente:', error.message);
      }
    }

    const pagoPopulado = await Pago.findById(pago._id)
      .populate('vivienda', 'numero')
      .populate('residente', 'nombre apellidos');

    res.json({
      pago: pagoPopulado,
      excedente: excedente,
      aplicadoAMesesFuturos: aplicarExcedente && excedente > 0
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Función para aplicar excedente a meses futuros
async function aplicarExcedenteAMesesFuturos(viviendaId, excedente, mesActual, añoActual) {
  let excedenteRestante = excedente;
  let mes = mesActual;
  let año = añoActual;

  while (excedenteRestante > 0) {
    // Avanzar al siguiente mes
    mes++;
    if (mes > 12) {
      mes = 1;
      año++;
    }

    // Buscar o crear el pago del mes siguiente
    let pagoFuturo = await Pago.findOne({
      vivienda: viviendaId,
      mes: mes,
      año: año
    });

    if (!pagoFuturo) {
      // Crear el pago del mes futuro
      const configuracion = await Configuracion.findOne({ activo: true });
      const fechaInicio = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).toDate();
      const fechaFin = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).endOf('month').toDate();
      const fechaLimite = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).endOf('month').toDate();

      pagoFuturo = new Pago({
        vivienda: viviendaId,
        mes: mes,
        año: año,
        monto: configuracion.cuotaMantenimientoMensual,
        fechaInicioPeriodo: fechaInicio,
        fechaFinPeriodo: fechaFin,
        fechaLimite: fechaLimite,
        estado: 'Pendiente',
        metodoPago: 'Otro',
        registradoPor: new mongoose.Types.ObjectId()
      });
    }

    // Aplicar el excedente al pago futuro
    const montoAplicar = Math.min(excedenteRestante, pagoFuturo.monto);
    pagoFuturo.montoPagado = (pagoFuturo.montoPagado || 0) + montoAplicar;
    pagoFuturo.excedente = 0;

    // Actualizar estado del pago futuro
    if (pagoFuturo.montoPagado >= pagoFuturo.monto) {
      pagoFuturo.estado = 'Pagado';
    } else {
      pagoFuturo.estado = 'Parcial';
    }

    // Agregar registro del abono
    pagoFuturo.abonosAMesesFuturos.push({
      mes: mesActual,
      año: añoActual,
      monto: montoAplicar,
      fechaAbono: new Date()
    });

    await pagoFuturo.save();
    excedenteRestante -= montoAplicar;

    console.log(`Abono de $${montoAplicar} aplicado al mes ${mes}/${año}`);
  }
}

// Obtener pagos vencidos
router.get('/vencidos/listado', async (req, res) => {
  try {
    const pagosVencidos = await Pago.find({
      fechaLimite: { $lt: new Date() },
      estado: { $ne: 'Pagado' }
    }).populate('vivienda', 'numero')
      .populate('residente', 'nombre apellidos telefono')
      .sort({ fechaLimite: 1 });
    
    res.json(pagosVencidos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener estadísticas de pagos
router.get('/estadisticas/resumen', async (req, res) => {
  try {
    const { mes, año } = req.query;
    let filtro = {};
    
    if (mes && año) {
      filtro.mes = parseInt(mes);
      filtro.año = parseInt(año);
    }
    
    const estadisticas = await Pago.aggregate([
      { $match: filtro },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pagados: {
            $sum: { $cond: [{ $eq: ['$estado', 'Pagado'] }, 1, 0] }
          },
          pendientes: {
            $sum: { $cond: [{ $eq: ['$estado', 'Pendiente'] }, 1, 0] }
          },
          vencidos: {
            $sum: { $cond: [{ $eq: ['$estado', 'Vencido'] }, 1, 0] }
          },
          totalRecaudado: {
            $sum: { $cond: [{ $eq: ['$estado', 'Pagado'] }, '$monto', 0] }
          },
          totalPendiente: {
            $sum: { $cond: [{ $ne: ['$estado', 'Pagado'] }, '$monto', 0] }
          }
        }
      }
    ]);

    res.json(estadisticas[0] || {
      total: 0,
      pagados: 0,
      pendientes: 0,
      vencidos: 0,
      totalRecaudado: 0,
      totalPendiente: 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener próximo pago pendiente de una vivienda
router.get('/proximo-pago/:viviendaId', async (req, res) => {
  try {
    const { viviendaId } = req.params;
    
    // Buscar el próximo pago pendiente
    const proximoPago = await Pago.findOne({
      vivienda: viviendaId,
      estado: { $in: ['Pendiente', 'Parcial', 'Vencido'] }
    }).sort({ año: 1, mes: 1 }).populate('vivienda', 'numero');
    
    if (!proximoPago) {
      // Si no hay pagos pendientes, crear el próximo mes
      const configuracion = await Configuracion.findOne({ activo: true });
      if (!configuracion) {
        return res.status(404).json({ message: 'Configuración no encontrada' });
      }
      
      const fechaActual = moment();
      const mes = fechaActual.month() + 1;
      const año = fechaActual.year();
      
      const fechaInicio = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).toDate();
      const fechaFin = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).endOf('month').toDate();
      const fechaLimite = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).endOf('month').toDate();
      
      const nuevoPago = new Pago({
        vivienda: viviendaId,
        mes: mes,
        año: año,
        monto: configuracion.cuotaMantenimientoMensual,
        fechaInicioPeriodo: fechaInicio,
        fechaFinPeriodo: fechaFin,
        fechaLimite: fechaLimite,
        estado: 'Pendiente',
        metodoPago: 'Otro',
        registradoPor: new mongoose.Types.ObjectId()
      });
      
      await nuevoPago.save();
      await nuevoPago.populate('vivienda', 'numero');
      
      return res.json(nuevoPago);
    }
    
    res.json(proximoPago);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener pagos pendientes de una vivienda específica
router.get('/pendientes/:viviendaId', async (req, res) => {
  try {
    const { viviendaId } = req.params;
    
    const pagosPendientes = await Pago.find({
      vivienda: viviendaId,
      estado: { $in: ['Pendiente', 'Parcial', 'Vencido'] }
    })
    .sort({ año: 1, mes: 1 })
    .populate('vivienda', 'numero')
    .populate('residente', 'nombre apellidos');
    
    res.json(pagosPendientes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Actualizar residentes en pagos existentes
router.post('/actualizar-residentes', async (req, res) => {
  try {
    // Obtener todos los pagos que no tienen residente asignado
    const pagosSinResidente = await Pago.find({ residente: { $exists: false } });
    
    let actualizados = 0;
    let errores = 0;

    for (const pago of pagosSinResidente) {
      try {
        // Buscar el residente de la vivienda
        const residente = await Residente.findOne({ vivienda: pago.vivienda });
        
        if (residente) {
          // Actualizar el pago con el residente
          await Pago.findByIdAndUpdate(pago._id, { residente: residente._id });
          actualizados++;
        } else {
          errores++;
        }
      } catch (error) {
        errores++;
      }
    }

    res.json({
      message: `Actualización completada: ${actualizados} pagos actualizados, ${errores} errores`,
      actualizados,
      errores
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener historial de pagos de una vivienda
router.get('/historial/:viviendaId', async (req, res) => {
  try {
    const { viviendaId } = req.params;
    const { estado, fecha } = req.query;
    
    let filtros = { vivienda: viviendaId };
    
    // Filtro por estado
    if (estado && estado !== 'todos') {
      filtros.estado = estado;
    }
    
    // Filtro por fecha
    if (fecha && fecha !== 'todos') {
      const hoy = new Date();
      let fechaInicio;
      
      switch (fecha) {
        case 'ultimo_mes':
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
          break;
        case 'ultimos_3_meses':
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1);
          break;
        case 'ultimos_6_meses':
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1);
          break;
        case 'ultimo_año':
          fechaInicio = new Date(hoy.getFullYear() - 1, hoy.getMonth(), 1);
          break;
      }
      
      if (fechaInicio) {
        filtros.fechaInicioPeriodo = { $gte: fechaInicio };
      }
    }
    
    const pagos = await Pago.find(filtros)
      .populate('vivienda', 'numero')
      .populate('residente', 'nombre apellidos')
      .sort({ fechaInicioPeriodo: -1 });
    
    res.json(pagos);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error al obtener historial de pagos' });
  }
});

// Obtener historial de pagos de todas las viviendas
router.get('/historial-todos', async (req, res) => {
  try {
    const { estado, fecha } = req.query;
    
    let filtros = {};
    
    // Filtro por estado
    if (estado && estado !== 'todos') {
      filtros.estado = estado;
    }
    
    // Filtro por fecha
    if (fecha && fecha !== 'todos') {
      const hoy = new Date();
      let fechaInicio;
      
      switch (fecha) {
        case 'ultimo_mes':
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
          break;
        case 'ultimos_3_meses':
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1);
          break;
        case 'ultimos_6_meses':
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1);
          break;
        case 'ultimo_año':
          fechaInicio = new Date(hoy.getFullYear() - 1, hoy.getMonth(), 1);
          break;
      }
      
      if (fechaInicio) {
        filtros.fechaInicioPeriodo = { $gte: fechaInicio };
      }
    }
    
    const pagos = await Pago.find(filtros)
      .populate('vivienda', 'numero')
      .populate('residente', 'nombre apellidos')
      .sort({ vivienda: 1, fechaInicioPeriodo: -1 });
    
    res.json(pagos);
  } catch (error) {
    console.error('Error al obtener historial de todas las viviendas:', error);
    res.status(500).json({ message: 'Error al obtener historial de pagos' });
  }
});

// Función para generar automáticamente el próximo pago
async function generarProximoPagoAutomatico(viviendaId) {
  try {
    // Obtener configuración
    const configuracion = await Configuracion.findOne({ activo: true });
    if (!configuracion) {
      throw new Error('No hay configuración activa');
    }

    // Obtener la vivienda y su residente
    const vivienda = await Vivienda.findById(viviendaId);
    if (!vivienda) {
      throw new Error('Vivienda no encontrada');
    }

    // Obtener el residente de la vivienda
    const residente = await Residente.findOne({ vivienda: viviendaId });
    
    // Obtener el último pago de la vivienda
    const ultimoPago = await Pago.findOne({ vivienda: viviendaId })
      .sort({ año: -1, mes: -1 });

    if (!ultimoPago) {
      throw new Error('No se encontró ningún pago para la vivienda');
    }

    // Calcular el próximo mes
    let proximoMes = ultimoPago.mes + 1;
    let proximoAño = ultimoPago.año;
    
    if (proximoMes > 12) {
      proximoMes = 1;
      proximoAño++;
    }

    // Verificar si ya existe un pago para el próximo mes
    const pagoExistente = await Pago.findOne({
      vivienda: viviendaId,
      mes: proximoMes,
      año: proximoAño
    });

    if (pagoExistente) {
      return pagoExistente; // Ya existe un pago para ese mes
    }

    // Crear el nuevo pago
    const fechaInicio = moment(`${proximoAño}-${proximoMes.toString().padStart(2, '0')}-01`).toDate();
    const fechaFin = moment(`${proximoAño}-${proximoMes.toString().padStart(2, '0')}-01`).endOf('month').toDate();
    const fechaLimite = moment(`${proximoAño}-${proximoMes.toString().padStart(2, '0')}-01`).endOf('month').toDate();

    const nuevoPago = new Pago({
      vivienda: viviendaId,
      residente: residente?._id, // Asignar el residente si existe
      mes: proximoMes,
      año: proximoAño,
      monto: configuracion.cuotaMantenimientoMensual,
      montoPagado: 0,
      excedente: 0,
      estado: 'Pendiente',
      metodoPago: 'Otro',
      fechaPago: null,
      fechaInicioPeriodo: fechaInicio,
      fechaFinPeriodo: fechaFin,
      fechaLimite: fechaLimite,
      registradoPor: new mongoose.Types.ObjectId()
    });

    await nuevoPago.save();
    return nuevoPago;
  } catch (error) {
    console.error('Error generando próximo pago automático:', error.message);
    return null;
  }
}

module.exports = router; 