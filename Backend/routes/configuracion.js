const express = require('express');
const router = express.Router();
const Configuracion = require('../models/Configuracion');
const { body, validationResult } = require('express-validator');

// Obtener configuración actual
router.get('/', async (req, res) => {
  try {
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
    }
    
    res.json(configuracion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Actualizar configuración
router.put('/', [
  body('cuotaMantenimientoMensual').isNumeric().withMessage('La cuota debe ser un número'),
  body('nombreFraccionamiento').notEmpty().withMessage('El nombre del fraccionamiento es requerido'),
  body('diasGraciaPago').isNumeric().withMessage('Los días de gracia deben ser un número'),
  body('porcentajeRecargo').isNumeric().withMessage('El porcentaje de recargo debe ser un número')
], async (req, res) => {
  try {
    console.log('🔄 Actualizando configuración con datos:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Errores de validación:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    let configuracion = await Configuracion.findOne({ activo: true });
    console.log('📊 Configuración actual encontrada:', configuracion);
    
    if (!configuracion) {
      console.log('➕ Creando nueva configuración');
      configuracion = new Configuracion(req.body);
    } else {
      console.log('✏️ Actualizando configuración existente');
      Object.assign(configuracion, req.body);
    }
    
    await configuracion.save();
    console.log('✅ Configuración guardada:', configuracion);
    res.json(configuracion);
  } catch (error) {
    console.error('❌ Error actualizando configuración:', error);
    res.status(500).json({ message: error.message });
  }
});

// Obtener cuota de mantenimiento
router.get('/cuota-mantenimiento', async (req, res) => {
  try {
    const configuracion = await Configuracion.findOne({ activo: true });
    res.json({ 
      cuotaMantenimientoMensual: configuracion?.cuotaMantenimientoMensual || 500 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 