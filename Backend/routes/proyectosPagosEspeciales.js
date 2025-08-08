const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const ProyectoPagoEspecial = require('../models/ProyectoPagoEspecial');
const Vivienda = require('../models/Vivienda');
const Residente = require('../models/Residente');

// Obtener todos los proyectos
router.get('/', auth, async (req, res) => {
  try {
    const proyectos = await ProyectoPagoEspecial.find()
      .populate('registradoPor', 'nombre email')
      .populate('pagosRealizados.vivienda', 'numero calle')
      .populate('pagosRealizados.residente', 'nombre apellidos')
      .populate('pagosRealizados.registradoPor', 'nombre')
      .sort({ fechaCreacion: -1 });

    res.json(proyectos);
  } catch (error) {
    console.error('Error obteniendo proyectos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener un proyecto específico
router.get('/:id', auth, async (req, res) => {
  try {
    const proyecto = await ProyectoPagoEspecial.findById(req.params.id)
      .populate('registradoPor', 'nombre email')
      .populate('pagosRealizados.vivienda', 'numero calle')
      .populate('pagosRealizados.residente', 'nombre apellidos')
      .populate('pagosRealizados.registradoPor', 'nombre');

    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    res.json(proyecto);
  } catch (error) {
    console.error('Error obteniendo proyecto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear nuevo proyecto
router.post('/', [
  auth,
  body('nombre').notEmpty().withMessage('El nombre del proyecto es requerido'),
  body('descripcion').notEmpty().withMessage('La descripción es requerida'),
  body('cantidadPagar').isNumeric().withMessage('La cantidad a pagar debe ser un número'),
  body('fechaLimite').isISO8601().withMessage('La fecha límite debe ser válida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const proyecto = new ProyectoPagoEspecial({
      ...req.body,
      registradoPor: req.usuario._id
    });

    await proyecto.save();
    
    const proyectoPopulado = await ProyectoPagoEspecial.findById(proyecto._id)
      .populate('registradoPor', 'nombre email');

    res.status(201).json(proyectoPopulado);
  } catch (error) {
    console.error('Error creando proyecto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar proyecto
router.put('/:id', [
  auth,
  body('nombre').notEmpty().withMessage('El nombre del proyecto es requerido'),
  body('descripcion').notEmpty().withMessage('La descripción es requerida'),
  body('cantidadPagar').isNumeric().withMessage('La cantidad a pagar debe ser un número'),
  body('fechaLimite').isISO8601().withMessage('La fecha límite debe ser válida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const proyecto = await ProyectoPagoEspecial.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('registradoPor', 'nombre email');

    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    res.json(proyecto);
  } catch (error) {
    console.error('Error actualizando proyecto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Registrar pago para un proyecto
router.post('/:id/pagar', [
  auth,
  body('viviendaId').notEmpty().withMessage('La vivienda es requerida'),
  body('residenteId').notEmpty().withMessage('El residente es requerido'),
  body('montoPagado').isNumeric().withMessage('El monto debe ser un número'),
  body('metodoPago').isIn(['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro']).withMessage('Método de pago inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const proyecto = await ProyectoPagoEspecial.findById(req.params.id);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Verificar que la vivienda y residente existen
    const vivienda = await Vivienda.findById(req.body.viviendaId);
    const residente = await Residente.findById(req.body.residenteId);

    if (!vivienda || !residente) {
      return res.status(400).json({ message: 'Vivienda o residente no encontrado' });
    }

    // Verificar que no se haya pagado ya por esta vivienda
    const pagoExistente = proyecto.pagosRealizados.find(
      pago => pago.vivienda.toString() === req.body.viviendaId
    );

    if (pagoExistente) {
      return res.status(400).json({ message: 'Ya se ha registrado un pago para esta vivienda' });
    }

    // Agregar el pago al proyecto
    proyecto.pagosRealizados.push({
      vivienda: req.body.viviendaId,
      residente: req.body.residenteId,
      montoPagado: req.body.montoPagado,
      metodoPago: req.body.metodoPago,
      registradoPor: req.usuario._id,
      notas: req.body.notas || ''
    });

    await proyecto.save();

    const proyectoActualizado = await ProyectoPagoEspecial.findById(proyecto._id)
      .populate('registradoPor', 'nombre email')
      .populate('pagosRealizados.vivienda', 'numero calle')
      .populate('pagosRealizados.residente', 'nombre apellidos')
      .populate('pagosRealizados.registradoPor', 'nombre');

    res.json({
      message: `Pago registrado exitosamente para la vivienda ${vivienda.numero}`,
      proyecto: proyectoActualizado
    });
  } catch (error) {
    console.error('Error registrando pago:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener estadísticas de un proyecto
router.get('/:id/estadisticas', auth, async (req, res) => {
  try {
    const proyecto = await ProyectoPagoEspecial.findById(req.params.id);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    const estadisticas = proyecto.obtenerEstadisticas();
    res.json(estadisticas);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener viviendas pendientes de pago
router.get('/:id/viviendas-pendientes', auth, async (req, res) => {
  try {
    const proyecto = await ProyectoPagoEspecial.findById(req.params.id);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Obtener todas las viviendas
    const todasLasViviendas = await Vivienda.find().populate('residentes', 'nombre apellidos');
    
    // Filtrar las que ya pagaron
    const viviendasPagadas = proyecto.pagosRealizados.map(pago => pago.vivienda.toString());
    const viviendasPendientes = todasLasViviendas.filter(
      vivienda => !viviendasPagadas.includes(vivienda._id.toString())
    );

    res.json(viviendasPendientes);
  } catch (error) {
    console.error('Error obteniendo viviendas pendientes:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener pagos especiales del día
router.get('/pagos-del-dia/:fecha', auth, async (req, res) => {
  try {
    const { fecha } = req.params;
    
    // Crear las fechas de inicio y fin del día
    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    // Obtener todos los proyectos con pagos
    const todosLosProyectos = await ProyectoPagoEspecial.find({})
      .populate('pagosRealizados.vivienda', 'numero calle')
      .populate('pagosRealizados.residente', 'nombre apellidos')
      .populate('pagosRealizados.registradoPor', 'nombre');

    // Extraer todos los pagos del día
    const pagosDelDia = [];
    
    todosLosProyectos.forEach(proyecto => {
      if (proyecto.pagosRealizados && proyecto.pagosRealizados.length > 0) {
        proyecto.pagosRealizados.forEach(pago => {
          const fechaPago = new Date(pago.fechaPago);
          const fechaPagoStr = fechaPago.toISOString().split('T')[0]; // YYYY-MM-DD
          
          if (fechaPagoStr === fecha) {
            pagosDelDia.push({
              _id: pago._id,
              fechaPago: pago.fechaPago,
              montoPagado: pago.montoPagado,
              metodoPago: pago.metodoPago,
              notas: pago.notas,
              vivienda: pago.vivienda,
              residente: pago.residente,
              registradoPor: pago.registradoPor,
              proyecto: {
                _id: proyecto._id,
                nombre: proyecto.nombre
              }
            });
          }
        });
      }
    });

    res.json(pagosDelDia);
  } catch (error) {
    console.error('Error obteniendo pagos del día:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar proyecto
router.delete('/:id', auth, async (req, res) => {
  try {
    const proyecto = await ProyectoPagoEspecial.findByIdAndDelete(req.params.id);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }
    res.json({ message: 'Proyecto eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando proyecto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router; 