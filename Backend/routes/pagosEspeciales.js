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
  body('cantidadPagar').optional().isNumeric().withMessage('Cantidad a pagar inválida')
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
      cantidadPagar = 0,
      notas
    } = req.body;

    // Crear pago especial para todas las viviendas
    const viviendas = await Vivienda.find({});
    const pagosEspeciales = [];

    for (const viviendaItem of viviendas) {
      const pagoEspecial = new PagoEspecial({
        vivienda: viviendaItem._id,
        residente: viviendaItem.residente,
        tipo,
        descripcion,
        monto: monto || 0,
        fechaLimite,
        aplicaATodasLasViviendas: true,
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

module.exports = router; 