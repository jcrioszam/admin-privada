const express = require('express');
const router = express.Router();
const Gasto = require('../models/Gasto');
const Pago = require('../models/Pago');
const auth = require('../middleware/auth');
const moment = require('moment');

// Obtener todos los gastos (ruta pública para reportes)
router.get('/reportes', async (req, res) => {
  try {
    const gastos = await Gasto.find({})
      .populate('registradoPor', 'nombre apellidos')
      .sort({ fecha: -1 });
    
    res.json(gastos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener todos los gastos
router.get('/', auth, async (req, res) => {
  try {
    const { categoria, estado, fechaInicio, fechaFin, page = 1, limit = 10 } = req.query;
    
    let filtro = {};
    
    if (categoria) filtro.categoria = categoria;
    if (estado) filtro.estado = estado;
    
    if (fechaInicio && fechaFin) {
      filtro.fecha = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin)
      };
    }
    
    const skip = (page - 1) * limit;
    
    const gastos = await Gasto.find(filtro)
      .populate('registradoPor', 'nombre apellidos')
      .sort({ fecha: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Gasto.countDocuments(filtro);
    
    res.json({
      gastos,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener un gasto específico
router.get('/:id', auth, async (req, res) => {
  try {
    const gasto = await Gasto.findById(req.params.id)
      .populate('registradoPor', 'nombre apellidos');
    
    if (!gasto) {
      return res.status(404).json({ message: 'Gasto no encontrado' });
    }
    
    res.json(gasto);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crear nuevo gasto
router.post('/', auth, async (req, res) => {
  try {
    const gasto = new Gasto({
      ...req.body,
      registradoPor: req.usuario.id
    });
    
    await gasto.save();
    
    const gastoPopulado = await Gasto.findById(gasto._id)
      .populate('registradoPor', 'nombre apellidos');
    
    res.status(201).json(gastoPopulado);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Actualizar gasto
router.put('/:id', auth, async (req, res) => {
  try {
    const gasto = await Gasto.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('registradoPor', 'nombre apellidos');
    
    if (!gasto) {
      return res.status(404).json({ message: 'Gasto no encontrado' });
    }
    
    res.json(gasto);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Eliminar gasto
router.delete('/:id', auth, async (req, res) => {
  try {
    const gasto = await Gasto.findByIdAndDelete(req.params.id);
    
    if (!gasto) {
      return res.status(404).json({ message: 'Gasto no encontrado' });
    }
    
    res.json({ message: 'Gasto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener estadísticas de gastos
router.get('/estadisticas/resumen', auth, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    let filtroFecha = {};
    if (fechaInicio && fechaFin) {
      filtroFecha = {
        fecha: {
          $gte: new Date(fechaInicio),
          $lte: new Date(fechaFin)
        }
      };
    }
    
    // Total de gastos aprobados
    const totalGastos = await Gasto.aggregate([
      { $match: { ...filtroFecha, estado: 'Aprobado' } },
      { $group: { _id: null, total: { $sum: '$monto' } } }
    ]);
    
    // Gastos por categoría
    const gastosPorCategoria = await Gasto.obtenerPorCategoria(
      fechaInicio ? new Date(fechaInicio) : moment().startOf('month').toDate(),
      fechaFin ? new Date(fechaFin) : moment().endOf('month').toDate()
    );
    
    // Total de gastos pendientes
    const gastosPendientes = await Gasto.countDocuments({ 
      ...filtroFecha, 
      estado: 'Pendiente' 
    });
    
    // Ingresos totales (pagos recibidos)
    const ingresos = await Pago.aggregate([
      { 
        $match: { 
          ...filtroFecha, 
          estado: { $in: ['Pagado', 'Pagado con excedente'] } 
        } 
      },
      { $group: { _id: null, total: { $sum: '$montoPagado' } } }
    ]);
    
    const totalIngresos = ingresos.length > 0 ? ingresos[0].total : 0;
    const totalGastosAprobados = totalGastos.length > 0 ? totalGastos[0].total : 0;
    const balance = totalIngresos - totalGastosAprobados;
    
    res.json({
      totalGastos: totalGastosAprobados,
      totalIngresos,
      balance,
      gastosPorCategoria,
      gastosPendientes,
      gastosAprobados: await Gasto.countDocuments({ ...filtroFecha, estado: 'Aprobado' }),
      gastosRechazados: await Gasto.countDocuments({ ...filtroFecha, estado: 'Rechazado' })
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener balance detallado
router.get('/balance/detallado', auth, async (req, res) => {
  try {
    const { mes, año } = req.query;
    
    const fechaInicio = moment(`${año}-${mes}-01`).startOf('month').toDate();
    const fechaFin = moment(`${año}-${mes}-01`).endOf('month').toDate();
    
    // Ingresos del mes
    const ingresos = await Pago.aggregate([
      {
        $match: {
          fechaPago: { $gte: fechaInicio, $lte: fechaFin },
          estado: { $in: ['Pagado', 'Pagado con excedente'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$montoPagado' } } }
    ]);
    
    // Gastos del mes
    const gastos = await Gasto.aggregate([
      {
        $match: {
          fecha: { $gte: fechaInicio, $lte: fechaFin },
          estado: 'Aprobado'
        }
      },
      { $group: { _id: null, total: { $sum: '$monto' } } }
    ]);
    
    const totalIngresos = ingresos.length > 0 ? ingresos[0].total : 0;
    const totalGastos = gastos.length > 0 ? gastos[0].total : 0;
    
    res.json({
      mes: parseInt(mes),
      año: parseInt(año),
      ingresos: totalIngresos,
      gastos: totalGastos,
      balance: totalIngresos - totalGastos,
      fechaInicio,
      fechaFin
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cambiar estado de gasto
router.patch('/:id/estado', auth, async (req, res) => {
  try {
    const { estado } = req.body;
    
    if (!['Pendiente', 'Aprobado', 'Rechazado'].includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }
    
    const gasto = await Gasto.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    ).populate('registradoPor', 'nombre apellidos');
    
    if (!gasto) {
      return res.status(404).json({ message: 'Gasto no encontrado' });
    }
    
    res.json(gasto);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 