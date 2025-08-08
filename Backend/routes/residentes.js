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
  body('telefono').notEmpty().withMessage('El teléfono es requerido')
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

    // Verificar que la vivienda no tenga residentes activos
    const residentesExistentes = await Residente.find({
      vivienda: req.body.vivienda,
      activo: true
    });

    if (residentesExistentes.length > 0) {
      return res.status(400).json({ message: 'Esta vivienda ya tiene residentes activos' });
    }

    const residente = new Residente(req.body);
    const nuevoResidente = await residente.save();
    
    // Actualizar la vivienda con el nuevo residente
    await Vivienda.findByIdAndUpdate(req.body.vivienda, {
      estado: 'Ocupada',
      tipoOcupacion: req.body.tipo,
      residente: nuevoResidente._id,
      $addToSet: { residentes: nuevoResidente._id }
    });
    
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
  body('telefono').optional().notEmpty().withMessage('El teléfono no puede estar vacío')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const residenteExistente = await Residente.findById(req.params.id);
    if (!residenteExistente) {
      return res.status(404).json({ message: 'Residente no encontrado' });
    }

    // Si se está cambiando la vivienda
    if (req.body.vivienda && req.body.vivienda !== residenteExistente.vivienda.toString()) {
      // Verificar que la nueva vivienda no tenga residentes activos
      const residentesEnNuevaVivienda = await Residente.find({
        vivienda: req.body.vivienda,
        activo: true
      });

      if (residentesEnNuevaVivienda.length > 0) {
        return res.status(400).json({ message: 'La vivienda seleccionada ya tiene residentes activos' });
      }

      // Remover residente de la vivienda anterior
      await Vivienda.findByIdAndUpdate(residenteExistente.vivienda, {
        $pull: { residentes: req.params.id }
      });

      // Verificar si la vivienda anterior queda sin residentes activos
      const otrosResidentes = await Residente.find({
        vivienda: residenteExistente.vivienda,
        _id: { $ne: req.params.id },
        activo: true
      });

      if (otrosResidentes.length === 0) {
        await Vivienda.findByIdAndUpdate(residenteExistente.vivienda, {
          estado: 'Desocupada',
          tipoOcupacion: 'Vacante',
          residente: null
        });
      }

      // Agregar residente a la nueva vivienda
      await Vivienda.findByIdAndUpdate(req.body.vivienda, {
        estado: 'Ocupada',
        tipoOcupacion: req.body.tipo || residenteExistente.tipo,
        residente: req.params.id,
        $addToSet: { residentes: req.params.id }
      });
    }

    const residente = await Residente.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('vivienda', 'numero calle');
    
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

    // Remover residente de la vivienda
    await Vivienda.findByIdAndUpdate(residente.vivienda, {
      $pull: { residentes: req.params.id }
    });

    // Si no hay más residentes activos, cambiar estado de vivienda
    if (otrosResidentes.length === 0) {
      await Vivienda.findByIdAndUpdate(residente.vivienda, {
        estado: 'Desocupada',
        tipoOcupacion: 'Vacante',
        residente: null
      });
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

// Obtener viviendas disponibles (sin residentes activos)
router.get('/viviendas/disponibles', async (req, res) => {
  try {
    // Obtener todas las viviendas
    const viviendas = await Vivienda.find().sort({ numero: 1 });
    
    // Obtener viviendas que tienen residentes activos
    const viviendasOcupadas = await Residente.distinct('vivienda', { activo: true });
    
    // Filtrar viviendas disponibles
    const viviendasDisponibles = viviendas.filter(vivienda => 
      !viviendasOcupadas.includes(vivienda._id.toString())
    );
    
    res.json(viviendasDisponibles);
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

// Endpoint para sincronizar residentes y viviendas
router.post('/sincronizar', async (req, res) => {
  try {
    console.log('🔄 Iniciando sincronización de residentes y viviendas...');

    // Obtener todos los residentes activos
    const residentes = await Residente.find({ activo: true }).populate('vivienda');
    console.log(`📋 Encontrados ${residentes.length} residentes activos`);

    // Agrupar residentes por vivienda
    const residentesPorVivienda = {};
    residentes.forEach(residente => {
      if (residente.vivienda) {
        const viviendaId = residente.vivienda._id.toString();
        if (!residentesPorVivienda[viviendaId]) {
          residentesPorVivienda[viviendaId] = [];
        }
        residentesPorVivienda[viviendaId].push(residente);
      }
    });

    console.log(`🏠 Viviendas con residentes: ${Object.keys(residentesPorVivienda).length}`);

    // Actualizar cada vivienda
    for (const [viviendaId, residentesVivienda] of Object.entries(residentesPorVivienda)) {
      const vivienda = await Vivienda.findById(viviendaId);
      if (!vivienda) {
        console.log(`⚠️  Vivienda ${viviendaId} no encontrada`);
        continue;
      }

      // Obtener el primer residente como residente principal
      const residentePrincipal = residentesVivienda[0];
      
      // Actualizar la vivienda
      await Vivienda.findByIdAndUpdate(viviendaId, {
        estado: 'Ocupada',
        tipoOcupacion: residentePrincipal.tipo,
        residente: residentePrincipal._id,
        residentes: residentesVivienda.map(r => r._id)
      });

      console.log(`✅ Vivienda ${vivienda.numero} actualizada con ${residentesVivienda.length} residentes`);
    }

    // Actualizar viviendas sin residentes activos
    const viviendasOcupadas = Object.keys(residentesPorVivienda);
    const viviendasSinResidentes = await Vivienda.find({
      _id: { $nin: viviendasOcupadas }
    });

    for (const vivienda of viviendasSinResidentes) {
      await Vivienda.findByIdAndUpdate(vivienda._id, {
        estado: 'Desocupada',
        tipoOcupacion: 'Vacante',
        residente: null,
        residentes: []
      });
      console.log(`🏚️  Vivienda ${vivienda.numero} marcada como desocupada`);
    }

    console.log('✅ Sincronización completada exitosamente');
    
    // Mostrar resumen
    const totalViviendas = await Vivienda.countDocuments();
    const viviendasOcupadasCount = await Vivienda.countDocuments({ estado: 'Ocupada' });
    const viviendasDesocupadasCount = await Vivienda.countDocuments({ estado: 'Desocupada' });
    
    const resumen = {
      totalViviendas,
      viviendasOcupadas: viviendasOcupadasCount,
      viviendasDesocupadas: viviendasDesocupadasCount,
      totalResidentesActivos: residentes.length,
      mensaje: 'Sincronización completada exitosamente'
    };

    res.json(resumen);
  } catch (error) {
    console.error('❌ Error durante la sincronización:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 