const express = require('express');
const router = express.Router();
const PagoEspecial = require('../models/PagoEspecial');
const Vivienda = require('../models/Vivienda');
const Residente = require('../models/Residente');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const auth = require('../middleware/auth');

// Obtener todos los pagos especiales
router.get('/', async (req, res) => {
  try {
    const { vivienda, residente, estado, tipo, aplicaATodasLasViviendas } = req.query;
    let filtro = {};
    
    if (vivienda) filtro.vivienda = vivienda;
    if (residente) filtro.residente = residente;
    if (estado) filtro.estado = estado;
    if (tipo) filtro.tipo = tipo;
    if (aplicaATodasLasViviendas !== undefined) {
      filtro.aplicaATodasLasViviendas = aplicaATodasLasViviendas === 'true';
    }
    
    const pagosEspeciales = await PagoEspecial.find(filtro)
      .populate('vivienda', 'numero calle')
      .populate('residente', 'nombre apellidos')
      .populate('registradoPor', 'nombre apellidos')
      .populate('viviendasSeleccionadas', 'numero calle')
      .sort({ fechaCreacion: -1 });
    
    res.json(pagosEspeciales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener un pago especial específico
router.get('/:id', async (req, res) => {
  try {
    const pagoEspecial = await PagoEspecial.findById(req.params.id)
      .populate('vivienda', 'numero calle')
      .populate('residente', 'nombre apellidos email telefono')
      .populate('registradoPor', 'nombre apellidos');
    
    if (!pagoEspecial) {
      return res.status(404).json({ message: 'Pago especial no encontrado' });
    }
    res.json(pagoEspecial);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crear nuevo pago especial
router.post('/', auth, [
  body('tipo').notEmpty().withMessage('Nombre del proyecto requerido'),
  body('descripcion').notEmpty().withMessage('Descripción requerida'),
  body('monto').optional().isNumeric().withMessage('Monto inválido'),
  body('fechaLimite').isISO8601().withMessage('Fecha límite inválida'),
  body('aplicaATodasLasViviendas').optional().isBoolean().withMessage('Aplica a todas las viviendas debe ser booleano'),
  body('cantidadPagar').optional().isNumeric().withMessage('Cantidad a pagar inválida'),
  body('viviendasSeleccionadas').optional().isArray().withMessage('Viviendas seleccionadas debe ser un array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      tipo,
      descripcion,
      monto,
      fechaLimite,
      aplicaATodasLasViviendas = true,
      viviendasSeleccionadas = [],
      cantidadPagar = 0,
      notas
    } = req.body;

    let viviendas = [];

    if (aplicaATodasLasViviendas) {
      // Aplicar a todas las viviendas
      viviendas = await Vivienda.find({});
    } else {
      // Aplicar solo a las viviendas seleccionadas
      if (viviendasSeleccionadas.length === 0) {
        return res.status(400).json({ message: 'Debe seleccionar al menos una vivienda' });
      }
      viviendas = await Vivienda.find({ _id: { $in: viviendasSeleccionadas } });
    }

    const pagosEspeciales = [];

    for (const viviendaItem of viviendas) {
      const pagoEspecial = new PagoEspecial({
        vivienda: viviendaItem._id,
        residente: viviendaItem.residente,
        tipo,
        descripcion,
        monto: monto || 0,
        fechaLimite,
        aplicaATodasLasViviendas,
        viviendasSeleccionadas: aplicaATodasLasViviendas ? [] : viviendasSeleccionadas,
        cantidadPagar: cantidadPagar || 0,
        notas,
        registradoPor: req.usuario._id
      });
      pagosEspeciales.push(pagoEspecial);
    }

    const pagosGuardados = await PagoEspecial.insertMany(pagosEspeciales);
    res.status(201).json({
      message: `Pago especial creado para ${pagosGuardados.length} viviendas`,
      pagosEspeciales: pagosGuardados
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Actualizar pago especial
router.put('/:id', auth, [
  body('tipo').optional().notEmpty().withMessage('Nombre del proyecto requerido'),
  body('descripcion').optional().notEmpty().withMessage('Descripción requerida'),
  body('monto').optional().isNumeric().withMessage('Monto inválido'),
  body('fechaLimite').optional().isISO8601().withMessage('Fecha límite inválida'),
  body('estado').optional().isIn(['Pendiente', 'Pagado', 'Vencido', 'Cancelado']).withMessage('Estado inválido'),
  body('cantidadPagar').optional().isNumeric().withMessage('Cantidad a pagar inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pagoEspecial = await PagoEspecial.findById(req.params.id);
    if (!pagoEspecial) {
      return res.status(404).json({ message: 'Pago especial no encontrado' });
    }

    // Actualizar campos
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        pagoEspecial[key] = req.body[key];
      }
    });

    // Si se marca como pagado, actualizar fecha de pago
    if (req.body.estado === 'Pagado' && !pagoEspecial.pagado) {
      pagoEspecial.pagado = true;
      pagoEspecial.fechaPago = new Date();
    }

    const pagoActualizado = await pagoEspecial.save();
    res.json(pagoActualizado);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Registrar pago de un pago especial
router.post('/:id/pagar', auth, [
  body('metodoPago').isIn(['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro']).withMessage('Método de pago inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pagoEspecial = await PagoEspecial.findById(req.params.id);
    if (!pagoEspecial) {
      return res.status(404).json({ message: 'Pago especial no encontrado' });
    }

    if (pagoEspecial.pagado) {
      return res.status(400).json({ message: 'Este pago especial ya fue pagado' });
    }

    pagoEspecial.pagado = true;
    pagoEspecial.estado = 'Pagado';
    pagoEspecial.fechaPago = new Date();
    pagoEspecial.metodoPago = req.body.metodoPago;

    const pagoActualizado = await pagoEspecial.save();
    res.json(pagoActualizado);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Eliminar pago especial
router.delete('/:id', auth, async (req, res) => {
  try {
    const pagoEspecial = await PagoEspecial.findById(req.params.id);
    if (!pagoEspecial) {
      return res.status(404).json({ message: 'Pago especial no encontrado' });
    }

    if (pagoEspecial.pagado) {
      return res.status(400).json({ message: 'No se puede eliminar un pago especial que ya fue pagado' });
    }

    await PagoEspecial.findByIdAndDelete(req.params.id);
    res.json({ message: 'Pago especial eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener estadísticas de pagos especiales
router.get('/estadisticas/resumen', async (req, res) => {
  try {
    const totalPagosEspeciales = await PagoEspecial.countDocuments();
    const pagosPendientes = await PagoEspecial.countDocuments({ estado: 'Pendiente' });
    const pagosPagados = await PagoEspecial.countDocuments({ estado: 'Pagado' });
    const pagosVencidos = await PagoEspecial.countDocuments({ estado: 'Vencido' });
    
    const montoTotalPendiente = await PagoEspecial.aggregate([
      { $match: { estado: 'Pendiente' } },
      { $group: { _id: null, total: { $sum: '$monto' } } }
    ]);

    const montoTotalPagado = await PagoEspecial.aggregate([
      { $match: { estado: 'Pagado' } },
      { $group: { _id: null, total: { $sum: '$monto' } } }
    ]);

    res.json({
      totalPagosEspeciales,
      pagosPendientes,
      pagosPagados,
      pagosVencidos,
      montoTotalPendiente: montoTotalPendiente[0]?.total || 0,
      montoTotalPagado: montoTotalPagado[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Registrar pago individual
router.post('/pagar-individual', auth, [
  body('pagoEspecialId').notEmpty().withMessage('ID del pago especial es requerido'),
  body('viviendaId').notEmpty().withMessage('ID de vivienda es requerido'),
  body('residenteId').notEmpty().withMessage('ID de residente es requerido'),
  body('montoPagado').isNumeric().withMessage('Monto pagado debe ser numérico'),
  body('metodoPago').isIn(['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro']).withMessage('Método de pago inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pagoEspecialId, viviendaId, residenteId, montoPagado, metodoPago, notas } = req.body;

    // Verificar que el pago especial existe
    const pagoEspecial = await PagoEspecial.findById(pagoEspecialId);
    if (!pagoEspecial) {
      return res.status(404).json({ message: 'Pago especial no encontrado' });
    }

    // Verificar que la vivienda y residente existen
    const vivienda = await Vivienda.findById(viviendaId);
    const residente = await Residente.findById(residenteId);
    
    if (!vivienda) {
      return res.status(404).json({ message: 'Vivienda no encontrada' });
    }
    
    if (!residente) {
      return res.status(404).json({ message: 'Residente no encontrado' });
    }

    // Verificar que la vivienda está en el scope del pago especial
    if (!pagoEspecial.aplicaATodasLasViviendas) {
      const viviendaIncluida = pagoEspecial.viviendasSeleccionadas.some(
        viv => viv.toString() === viviendaId
      );
      if (!viviendaIncluida) {
        return res.status(400).json({ 
          message: 'La vivienda seleccionada no está incluida en este pago especial' 
        });
      }
    }

    // Verificar que la vivienda no ha pagado ya este pago especial
    const yaPago = await PagoEspecial.findOne({
      _id: pagoEspecialId,
      vivienda: viviendaId,
      estado: 'Pagado'
    });

    if (yaPago) {
      return res.status(400).json({ 
        message: 'Esta vivienda ya ha realizado el pago para este concepto especial' 
      });
    }

    // Crear el registro de pago individual
    const nuevoPagoIndividual = new PagoEspecial({
      tipo: pagoEspecial.tipo,
      descripcion: `Pago individual - ${pagoEspecial.descripcion}`,
      monto: montoPagado,
      vivienda: viviendaId,
      residente: residenteId,
      fechaLimite: pagoEspecial.fechaLimite,
      aplicaATodasLasViviendas: false,
      cantidadPagar: montoPagado,
      metodoPago: metodoPago,
      fechaPago: new Date(),
      estado: 'Pagado',
      pagado: true,
      registradoPor: req.user.id,
      notas: notas || `Pago individual registrado para ${pagoEspecial.tipo}`,
      pagoEspecialOriginal: pagoEspecialId // Referencia al pago especial original
    });

    await nuevoPagoIndividual.save();

    // Poblar la respuesta
    await nuevoPagoIndividual.populate([
      { path: 'vivienda', select: 'numero calle' },
      { path: 'residente', select: 'nombre apellidos' },
      { path: 'registradoPor', select: 'nombre' }
    ]);

    res.status(201).json({
      message: 'Pago registrado exitosamente',
      pago: nuevoPagoIndividual
    });

  } catch (error) {
    console.error('Error registrando pago individual:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router; 