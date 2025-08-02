const express = require('express');
const router = express.Router();
const Vivienda = require('../models/Vivienda');
const Pago = require('../models/Pago');
const Configuracion = require('../models/Configuracion');
const moment = require('moment');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Obtener todas las viviendas
router.get('/', async (req, res) => {
  try {
    const { estado, numero, tipo, tipoOcupacion } = req.query;
    let filtro = {};
    
    if (estado) filtro.estado = estado;
    if (numero) filtro.numero = { $regex: numero, $options: 'i' };
    if (tipo) filtro.tipo = tipo;
    if (tipoOcupacion) filtro.tipoOcupacion = tipoOcupacion;
    
    const viviendas = await Vivienda.find(filtro).sort({ numero: 1 });
    res.json(viviendas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener una vivienda específica
router.get('/:id', async (req, res) => {
  try {
    const vivienda = await Vivienda.findById(req.params.id);
    if (!vivienda) {
      return res.status(404).json({ message: 'Vivienda no encontrada' });
    }
    res.json(vivienda);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crear nueva vivienda
router.post('/', [
  body('numero').notEmpty().withMessage('El número es requerido'),
  body('tipo').isIn(['Casa', 'Departamento', 'Townhouse']).withMessage('Tipo inválido'),
  body('tipoOcupacion').optional().isIn(['Dueño', 'Inquilino', 'Vacante']).withMessage('Tipo de ocupación inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const vivienda = new Vivienda(req.body);
    const nuevaVivienda = await vivienda.save();

    // Generar pago automáticamente para la nueva vivienda
    try {
      const configuracion = await Configuracion.findOne({ activo: true });
      if (configuracion) {
        const fechaActual = moment();
        const mes = fechaActual.month() + 1;
        const año = fechaActual.year();

        // Verificar si ya existe un pago para este mes/año
        const pagoExistente = await Pago.findOne({
          vivienda: nuevaVivienda._id,
          mes: mes,
          año: año
        });

        if (!pagoExistente) {
          const fechaInicio = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).toDate();
          const fechaFin = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).endOf('month').toDate();
          const fechaLimite = moment(`${año}-${mes.toString().padStart(2, '0')}-01`).endOf('month').toDate();

          const nuevoPago = new Pago({
            vivienda: nuevaVivienda._id,
            residente: nuevaVivienda.residente || undefined,
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
          console.log(`Pago automático generado para ${nuevaVivienda.numero}`);
        }
      }
    } catch (error) {
      console.error('Error generando pago automático:', error.message);
    }

    res.status(201).json(nuevaVivienda);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Ya existe una vivienda con ese número' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Actualizar vivienda
router.put('/:id', [
  body('numero').optional().notEmpty().withMessage('El número no puede estar vacío'),
  body('tipo').optional().isIn(['Casa', 'Departamento', 'Townhouse']).withMessage('Tipo inválido'),
  body('tipoOcupacion').optional().isIn(['Dueño', 'Inquilino', 'Vacante']).withMessage('Tipo de ocupación inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const vivienda = await Vivienda.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!vivienda) {
      return res.status(404).json({ message: 'Vivienda no encontrada' });
    }
    
    res.json(vivienda);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Ya existe una vivienda con ese número' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Eliminar vivienda
router.delete('/:id', async (req, res) => {
  try {
    const vivienda = await Vivienda.findByIdAndDelete(req.params.id);
    if (!vivienda) {
      return res.status(404).json({ message: 'Vivienda no encontrada' });
    }
    res.json({ message: 'Vivienda eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener estadísticas de viviendas
router.get('/estadisticas/resumen', async (req, res) => {
  try {
    const estadisticas = await Vivienda.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          ocupadas: {
            $sum: { $cond: [{ $eq: ['$estado', 'Ocupada'] }, 1, 0] }
          },
          desocupadas: {
            $sum: { $cond: [{ $eq: ['$estado', 'Desocupada'] }, 1, 0] }
          },
          enConstruccion: {
            $sum: { $cond: [{ $eq: ['$estado', 'En construcción'] }, 1, 0] }
          },
          enVenta: {
            $sum: { $cond: [{ $eq: ['$estado', 'En venta'] }, 1, 0] }
          },
          totalCuotas: { $sum: '$cuotaMantenimiento' }
        }
      }
    ]);

    res.json(estadisticas[0] || {
      total: 0,
      ocupadas: 0,
      desocupadas: 0,
      enConstruccion: 0,
      enVenta: 0,
      totalCuotas: 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 