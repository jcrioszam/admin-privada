const express = require('express');
const router = express.Router();
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');
const { body, validationResult } = require('express-validator');

// Obtener todos los residentes
router.get('/', async (req, res) => {
  try {
    const { tipo, activo, vivienda } = req.query;
    let filtro = {};
    
    if (tipo) filtro.tipo = tipo;
    if (activo !== undefined) filtro.activo = activo === 'true';
    if (vivienda) filtro.vivienda = vivienda;
    
    const residentes = await Residente.find(filtro)
      .populate('vivienda', 'numero calle')
      .sort({ apellidos: 1, nombre: 1 });
    
    res.json(residentes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener un residente específico
router.get('/:id', async (req, res) => {
  try {
    const residente = await Residente.findById(req.params.id)
      .populate('vivienda', 'numero calle tipo');
    
    if (!residente) {
      return res.status(404).json({ message: 'Residente no encontrado' });
    }
    res.json(residente);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crear nuevo residente
router.post('/', [
  body('vivienda').isMongoId().withMessage('Vivienda inválida'),
  body('tipo').isIn(['Dueño', 'Inquilino']).withMessage('Tipo inválido'),
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('apellidos').notEmpty().withMessage('Los apellidos son requeridos'),
  body('email').isEmail().withMessage('Email inválido'),
  body('telefono').notEmpty().withMessage('El teléfono es requerido'),
  body('documentoIdentidad.tipo').isIn(['INE', 'IFE', 'Pasaporte', 'Otro']).withMessage('Tipo de documento inválido'),
  body('documentoIdentidad.numero').notEmpty().withMessage('El número de documento es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verificar que la vivienda existe
    const vivienda = await Vivienda.findById(req.body.vivienda);
    if (!vivienda) {
      return res.status(400).json({ message: 'Vivienda no encontrada' });
    }

    const residente = new Residente(req.body);
    const nuevoResidente = await residente.save();
    
    // Actualizar estado de la vivienda si es el primer residente
    if (vivienda.estado === 'Desocupada') {
      await Vivienda.findByIdAndUpdate(req.body.vivienda, { estado: 'Ocupada' });
    }
    
    const residentePopulado = await Residente.findById(nuevoResidente._id)
      .populate('vivienda', 'numero calle');
    
    res.status(201).json(residentePopulado);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Actualizar residente
router.put('/:id', [
  body('tipo').optional().isIn(['Dueño', 'Inquilino']).withMessage('Tipo inválido'),
  body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('apellidos').optional().notEmpty().withMessage('Los apellidos no pueden estar vacíos'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('telefono').optional().notEmpty().withMessage('El teléfono no puede estar vacío'),
  body('documentoIdentidad.tipo').optional().isIn(['INE', 'IFE', 'Pasaporte', 'Otro']).withMessage('Tipo de documento inválido'),
  body('documentoIdentidad.numero').optional().notEmpty().withMessage('El número de documento no puede estar vacío')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const residente = await Residente.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('vivienda', 'numero calle');
    
    if (!residente) {
      return res.status(404).json({ message: 'Residente no encontrado' });
    }
    
    res.json(residente);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Eliminar residente
router.delete('/:id', async (req, res) => {
  try {
    const residente = await Residente.findById(req.params.id);
    if (!residente) {
      return res.status(404).json({ message: 'Residente no encontrado' });
    }

    // Verificar si es el último residente de la vivienda
    const otrosResidentes = await Residente.find({
      vivienda: residente.vivienda,
      _id: { $ne: residente._id },
      activo: true
    });

    await Residente.findByIdAndDelete(req.params.id);

    // Si no hay más residentes activos, cambiar estado de vivienda
    if (otrosResidentes.length === 0) {
      await Vivienda.findByIdAndUpdate(residente.vivienda, { estado: 'Desocupada' });
    }

    res.json({ message: 'Residente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener residentes por vivienda
router.get('/vivienda/:viviendaId', async (req, res) => {
  try {
    const residentes = await Residente.find({ 
      vivienda: req.params.viviendaId,
      activo: true 
    }).populate('vivienda', 'numero calle');
    
    res.json(residentes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener estadísticas de residentes
router.get('/estadisticas/resumen', async (req, res) => {
  try {
    const estadisticas = await Residente.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          dueños: {
            $sum: { $cond: [{ $eq: ['$tipo', 'Dueño'] }, 1, 0] }
          },
          inquilinos: {
            $sum: { $cond: [{ $eq: ['$tipo', 'Inquilino'] }, 1, 0] }
          },
          activos: {
            $sum: { $cond: ['$activo', 1, 0] }
          }
        }
      }
    ]);

    res.json(estadisticas[0] || {
      total: 0,
      dueños: 0,
      inquilinos: 0,
      activos: 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 