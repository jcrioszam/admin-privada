const express = require('express');
const router = express.Router();
const Acceso = require('../models/Acceso');
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');
const { body, validationResult } = require('express-validator');

// Obtener todos los accesos
router.get('/', async (req, res) => {
  try {
    const { residente, vivienda, activo, tipoAcceso } = req.query;
    let filtro = {};
    
    if (residente) filtro.residente = residente;
    if (vivienda) filtro.vivienda = vivienda;
    if (activo !== undefined) filtro.activo = activo === 'true';
    if (tipoAcceso) filtro.tipoAcceso = tipoAcceso;
    
    const accesos = await Acceso.find(filtro)
      .populate('residente', 'nombre apellidos')
      .populate('vivienda', 'numero calle')
      .populate('registradoPor', 'nombre apellidos')
      .sort({ fechaAsignacion: -1 });
    
    res.json(accesos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener un acceso específico
router.get('/:id', async (req, res) => {
  try {
    const acceso = await Acceso.findById(req.params.id)
      .populate('residente', 'nombre apellidos email telefono')
      .populate('vivienda', 'numero calle')
      .populate('registradoPor', 'nombre apellidos');
    
    if (!acceso) {
      return res.status(404).json({ message: 'Acceso no encontrado' });
    }
    res.json(acceso);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crear nuevo acceso
router.post('/', [
  body('residente').isMongoId().withMessage('Residente inválido'),
  body('vivienda').isMongoId().withMessage('Vivienda inválida'),
  body('tipoAcceso').isIn(['Tarjeta RFID', 'Código PIN', 'Huella Digital', 'Reconocimiento Facial', 'Llave Física', 'Control Remoto']).withMessage('Tipo de acceso inválido'),
  body('codigoAcceso').notEmpty().withMessage('El código de acceso es requerido'),
  body('fechaVencimiento').optional().isISO8601().withMessage('Fecha de vencimiento inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verificar que el residente y vivienda existen
    const [residente, vivienda] = await Promise.all([
      Residente.findById(req.body.residente),
      Vivienda.findById(req.body.vivienda)
    ]);

    if (!residente) {
      return res.status(400).json({ message: 'Residente no encontrado' });
    }
    if (!vivienda) {
      return res.status(400).json({ message: 'Vivienda no encontrada' });
    }

    // Verificar que no exista ya un acceso activo del mismo tipo para este residente
    const accesoExistente = await Acceso.findOne({
      residente: req.body.residente,
      tipoAcceso: req.body.tipoAcceso,
      activo: true
    });

    if (accesoExistente) {
      return res.status(400).json({ message: 'Ya existe un acceso activo de este tipo para este residente' });
    }

    const acceso = new Acceso({
      ...req.body,
      registradoPor: req.body.registradoPor || '64f1a2b3c4d5e6f7g8h9i0j1' // ID temporal
    });
    
    const nuevoAcceso = await acceso.save();
    
    const accesoPopulado = await Acceso.findById(nuevoAcceso._id)
      .populate('residente', 'nombre apellidos')
      .populate('vivienda', 'numero calle');
    
    res.status(201).json(accesoPopulado);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Actualizar acceso
router.put('/:id', [
  body('tipoAcceso').optional().isIn(['Tarjeta RFID', 'Código PIN', 'Huella Digital', 'Reconocimiento Facial', 'Llave Física', 'Control Remoto']).withMessage('Tipo de acceso inválido'),
  body('codigoAcceso').optional().notEmpty().withMessage('El código de acceso no puede estar vacío'),
  body('fechaVencimiento').optional().isISO8601().withMessage('Fecha de vencimiento inválida'),
  body('activo').optional().isBoolean().withMessage('El estado activo debe ser booleano')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const acceso = await Acceso.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('residente', 'nombre apellidos')
     .populate('vivienda', 'numero calle');
    
    if (!acceso) {
      return res.status(404).json({ message: 'Acceso no encontrado' });
    }
    
    res.json(acceso);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Desactivar acceso
router.put('/:id/desactivar', async (req, res) => {
  try {
    const acceso = await Acceso.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    ).populate('residente', 'nombre apellidos')
     .populate('vivienda', 'numero calle');
    
    if (!acceso) {
      return res.status(404).json({ message: 'Acceso no encontrado' });
    }
    
    res.json(acceso);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Activar acceso
router.put('/:id/activar', async (req, res) => {
  try {
    const acceso = await Acceso.findByIdAndUpdate(
      req.params.id,
      { activo: true },
      { new: true }
    ).populate('residente', 'nombre apellidos')
     .populate('vivienda', 'numero calle');
    
    if (!acceso) {
      return res.status(404).json({ message: 'Acceso no encontrado' });
    }
    
    res.json(acceso);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Eliminar acceso
router.delete('/:id', async (req, res) => {
  try {
    const acceso = await Acceso.findByIdAndDelete(req.params.id);
    if (!acceso) {
      return res.status(404).json({ message: 'Acceso no encontrado' });
    }
    res.json({ message: 'Acceso eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener accesos por residente
router.get('/residente/:residenteId', async (req, res) => {
  try {
    const accesos = await Acceso.find({ 
      residente: req.params.residenteId,
      activo: true 
    }).populate('vivienda', 'numero calle')
      .populate('residente', 'nombre apellidos');
    
    res.json(accesos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener accesos por vivienda
router.get('/vivienda/:viviendaId', async (req, res) => {
  try {
    const accesos = await Acceso.find({ 
      vivienda: req.params.viviendaId,
      activo: true 
    }).populate('residente', 'nombre apellidos')
      .populate('vivienda', 'numero calle');
    
    res.json(accesos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener accesos vencidos
router.get('/vencidos/listado', async (req, res) => {
  try {
    const accesosVencidos = await Acceso.find({
      fechaVencimiento: { $lt: new Date() },
      activo: true
    }).populate('residente', 'nombre apellidos telefono')
      .populate('vivienda', 'numero calle')
      .sort({ fechaVencimiento: 1 });
    
    res.json(accesosVencidos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener estadísticas de accesos
router.get('/estadisticas/resumen', async (req, res) => {
  try {
    const estadisticas = await Acceso.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          activos: {
            $sum: { $cond: ['$activo', 1, 0] }
          },
          inactivos: {
            $sum: { $cond: [{ $eq: ['$activo', false] }, 1, 0] }
          },
          vencidos: {
            $sum: {
              $cond: [
                { $and: [
                  { $lt: ['$fechaVencimiento', new Date()] },
                  { $eq: ['$activo', true] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Estadísticas por tipo de acceso
    const estadisticasPorTipo = await Acceso.aggregate([
      {
        $group: {
          _id: '$tipoAcceso',
          cantidad: { $sum: 1 },
          activos: { $sum: { $cond: ['$activo', 1, 0] } }
        }
      }
    ]);

    res.json({
      general: estadisticas[0] || {
        total: 0,
        activos: 0,
        inactivos: 0,
        vencidos: 0
      },
      porTipo: estadisticasPorTipo
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 