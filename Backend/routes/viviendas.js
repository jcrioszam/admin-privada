const express = require('express');
const router = express.Router();
const Vivienda = require('../models/Vivienda');
const Residente = require('../models/Residente');
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
    
    const viviendas = await Vivienda.find(filtro)
      .populate('residente')
      .populate('residentes', 'nombre apellidos')
      .sort({ numero: 1 });
    res.json(viviendas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener una vivienda específica
router.get('/:id', async (req, res) => {
  try {
    const vivienda = await Vivienda.findById(req.params.id)
      .populate('residente')
      .populate('residentes', 'nombre apellidos');
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

// Endpoint temporal para asignar residentes
router.post('/asignar-residentes', async (req, res) => {
  try {
    const viviendas = await Vivienda.find().sort({ numero: 1 });
    const residentesCreados = [];

    const residentesData = [
      { numero: '1', nombre: 'Faby', apellidos: 'García', telefono: '555-0101', tipo: 'Dueño' },
      { numero: '2', nombre: 'Samantha', apellidos: 'López', telefono: '555-0102', tipo: 'Inquilino' },
      { numero: '3', nombre: 'Erica', apellidos: 'Armenta', telefono: '555-0103', tipo: 'Dueño' },
      { numero: '4', nombre: 'Yadira', apellidos: 'Martínez', telefono: '555-0104', tipo: 'Dueño' },
      { numero: '5', nombre: 'Vero y Enrique', apellidos: 'Rodríguez', telefono: '555-0105', tipo: 'Dueño' },
      { numero: '6', nombre: 'Emma y Abel', apellidos: 'Hernández', telefono: '555-0106', tipo: 'Dueño' },
      { numero: '8', nombre: 'Juan', apellidos: 'Fernández', telefono: '555-0108', tipo: 'Inquilino' },
      { numero: '9', nombre: 'Anahí', apellidos: 'Sarabia', telefono: '555-0109', tipo: 'Inquilino' },
      { numero: '10', nombre: 'Asusan', apellidos: 'Castro', telefono: '555-0110', tipo: 'Inquilino' },
      { numero: '11', nombre: 'Sara Dalia', apellidos: 'Vega', telefono: '555-0111', tipo: 'Inquilino' },
      { numero: '12', nombre: 'Ramon', apellidos: 'Silva', telefono: '555-0112', tipo: 'Dueño' },
      { numero: '13', nombre: 'Irinia', apellidos: 'Morales', telefono: '555-0113', tipo: 'Dueño' },
      { numero: '14', nombre: 'Yuri y Alejandro', apellidos: 'Jiménez', telefono: '555-0114', tipo: 'Dueño' },
      { numero: '15', nombre: 'Rossy', apellidos: 'Torres', telefono: '555-0115', tipo: 'Dueño' },
      { numero: '16', nombre: 'Profe Juan', apellidos: 'Díaz', telefono: '555-0116', tipo: 'Dueño' },
      { numero: '17', nombre: 'Nelly', apellidos: 'Cruz', telefono: '555-0117', tipo: 'Dueño' },
      { numero: '18', nombre: 'Osmar', apellidos: 'Reyes', telefono: '555-0118', tipo: 'Inquilino' },
      { numero: '19', nombre: 'LR, Natally', apellidos: 'Moreno', telefono: '555-0119', tipo: 'Inquilino' },
      { numero: '20', nombre: 'Sergio', apellidos: 'Alvarez', telefono: '555-0120', tipo: 'Inquilino' },
      { numero: '21', nombre: 'Giny', apellidos: 'Ruiz', telefono: '555-0121', tipo: 'Dueño' },
      { numero: '22', nombre: 'Mara', apellidos: 'Ortiz', telefono: '555-0122', tipo: 'Dueño' },
      { numero: '23', nombre: 'Citlali', apellidos: 'Guzmán', telefono: '555-0123', tipo: 'Inquilino' },
      { numero: '24', nombre: 'Enfermera', apellidos: 'Flores', telefono: '555-0124', tipo: 'Dueño' },
      { numero: '25', nombre: 'Humberto', apellidos: 'Sánchez', telefono: '555-0125', tipo: 'Dueño' }
    ];

    for (const residenteData of residentesData) {
      const vivienda = viviendas.find(v => v.numero === residenteData.numero);
      
      if (vivienda) {
        const residente = new Residente({
          vivienda: vivienda._id,
          tipo: residenteData.tipo,
          nombre: residenteData.nombre,
          apellidos: residenteData.apellidos,
          telefono: residenteData.telefono,
          activo: true
        });

        await residente.save();
        vivienda.residente = residente._id;
        await vivienda.save();
        
        residentesCreados.push({
          vivienda: residenteData.numero,
          residente: `${residenteData.nombre} ${residenteData.apellidos}`
        });
      }
    }

    res.json({
      message: 'Residentes asignados correctamente',
      residentesCreados,
      total: residentesCreados.length
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint temporal para actualizar viviendas con residentes existentes
router.post('/actualizar-con-residentes', async (req, res) => {
  try {
    console.log('🔄 Iniciando actualización de viviendas con residentes...');
    
    // Obtener todos los residentes
    const residentes = await Residente.find().populate('vivienda');
    console.log(`📋 Encontrados ${residentes.length} residentes`);
    
    let actualizadas = 0;
    const resultados = [];

    for (const residente of residentes) {
      if (residente.vivienda) {
        // Buscar la vivienda por ID
        const vivienda = await Vivienda.findById(residente.vivienda._id);
        
        if (vivienda) {
          // Actualizar la vivienda con el residente
          vivienda.residente = residente._id;
          await vivienda.save();
          
          console.log(`✅ Vivienda ${vivienda.numero} actualizada con residente: ${residente.nombre} ${residente.apellidos}`);
          actualizadas++;
          
          resultados.push({
            vivienda: vivienda.numero,
            residente: `${residente.nombre} ${residente.apellidos}`,
            tipo: residente.tipo
          });
        } else {
          console.log(`❌ No se encontró vivienda para residente: ${residente.nombre} ${residente.apellidos}`);
        }
      }
    }

    // Verificar el resultado
    const viviendasConResidentes = await Vivienda.find().populate('residente');
    const totalViviendas = viviendasConResidentes.length;
    const viviendasConResidentesCount = viviendasConResidentes.filter(v => v.residente).length;
    const viviendasSinResidentesCount = viviendasConResidentes.filter(v => !v.residente).length;

    console.log('\n📊 RESUMEN:');
    console.log(`Total de viviendas: ${totalViviendas}`);
    console.log(`Viviendas con residentes: ${viviendasConResidentesCount}`);
    console.log(`Viviendas sin residentes: ${viviendasSinResidentesCount}`);
    console.log(`Viviendas actualizadas: ${actualizadas}`);

    res.json({
      message: 'Actualización completada',
      totalViviendas,
      viviendasConResidentes: viviendasConResidentesCount,
      viviendasSinResidentes: viviendasSinResidentesCount,
      viviendasActualizadas: actualizadas,
      resultados
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
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

// Obtener configuración de cuotas por vivienda
router.get('/configuracion/cuotas', async (req, res) => {
  try {
    const viviendas = await Vivienda.find({}, 'numero cuotaMantenimiento tipoCuota')
      .sort({ numero: 1 });
    
    const configuracion = {
      tiposCuota: [
        { valor: 'Estandar', nombre: 'Estándar', monto: 200 },
        { valor: 'Economica', nombre: 'Económica', monto: 50 },
        { valor: 'Premium', nombre: 'Premium', monto: 300 }
      ],
      viviendas: viviendas.map(v => ({
        _id: v._id,
        numero: v.numero,
        cuotaMantenimiento: v.cuotaMantenimiento,
        tipoCuota: v.tipoCuota
      }))
    };
    
    res.json(configuracion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Actualizar cuota de una vivienda específica
router.put('/:id/cuota', [
  body('cuotaMantenimiento').isNumeric().withMessage('La cuota debe ser un número'),
  body('tipoCuota').isIn(['Estandar', 'Economica', 'Premium']).withMessage('Tipo de cuota inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cuotaMantenimiento, tipoCuota } = req.body;
    
    const vivienda = await Vivienda.findByIdAndUpdate(
      req.params.id,
      { cuotaMantenimiento, tipoCuota },
      { new: true, runValidators: true }
    );
    
    if (!vivienda) {
      return res.status(404).json({ message: 'Vivienda no encontrada' });
    }
    
    res.json({
      message: 'Cuota actualizada correctamente',
      vivienda: {
        _id: vivienda._id,
        numero: vivienda.numero,
        cuotaMantenimiento: vivienda.cuotaMantenimiento,
        tipoCuota: vivienda.tipoCuota
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Actualizar cuotas masivamente por tipo
router.put('/configuracion/cuotas-masivo', [
  body('tipoCuota').isIn(['Estandar', 'Economica', 'Premium']).withMessage('Tipo de cuota inválido'),
  body('cuotaMantenimiento').isNumeric().withMessage('La cuota debe ser un número'),
  body('viviendas').isArray().withMessage('Debe proporcionar un array de IDs de viviendas')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tipoCuota, cuotaMantenimiento, viviendas } = req.body;
    
    const resultado = await Vivienda.updateMany(
      { _id: { $in: viviendas } },
      { cuotaMantenimiento, tipoCuota }
    );
    
    res.json({
      message: 'Cuotas actualizadas masivamente',
      viviendasActualizadas: resultado.modifiedCount,
      tipoCuota,
      cuotaMantenimiento
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 