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
    const { vivienda, residente, estado, tipo, aplicaATodasLasViviendas, incluirPagosIndividuales } = req.query;
    let filtro = {};
    
    if (vivienda) filtro.vivienda = vivienda;
    if (residente) filtro.residente = residente;
    if (estado) filtro.estado = estado;
    if (tipo) filtro.tipo = tipo;
    if (aplicaATodasLasViviendas !== undefined) {
      filtro.aplicaATodasLasViviendas = aplicaATodasLasViviendas === 'true';
    }
    
    // Por defecto, listar solo proyectos (no pagos individuales)
    if (!incluirPagosIndividuales || incluirPagosIndividuales === 'false') {
      filtro.$or = [
        { vivienda: { $exists: false } },
        { vivienda: null }
      ];
    }

    const pagosEspeciales = await PagoEspecial.find(filtro)
      .populate('vivienda', 'numero calle')
      .populate('residente', 'nombre apellidos')
      .populate('registradoPor', 'nombre apellidos')
      .populate({
        path: 'viviendasSeleccionadas',
        select: 'numero calle residentes',
        populate: { path: 'residentes', select: 'nombre apellidos' }
      })
      .sort({ fechaCreacion: -1 });

    console.log('Pagos especiales encontrados:', pagosEspeciales.length);
    pagosEspeciales.forEach(pago => {
      console.log(`Pago ${pago.tipo}:`, {
        viviendasSeleccionadas: pago.viviendasSeleccionadas?.length || 0,
        aplicaATodasLasViviendas: pago.aplicaATodasLasViviendas,
        viviendasSeleccionadasIds: pago.viviendasSeleccionadas?.map(v => v._id || v) || [],
        viviendasSeleccionadasNumeros: pago.viviendasSeleccionadas?.map(v => v.numero || 'ID') || []
      });
    });

    // Para cada pago especial, obtener los pagos realizados
    const pagosEspecialesConPagos = await Promise.all(
      pagosEspeciales.map(async (pagoEspecial) => {
        // Solo obtener pagos realizados para proyectos (no para pagos individuales)
        if (!pagoEspecial.vivienda) {
          const pagosRealizados = await PagoEspecial.find({
            pagoEspecialOriginal: pagoEspecial._id,
            estado: 'Pagado'
          })
            .populate('vivienda', 'numero calle')
            .populate('residente', 'nombre apellidos')
            .populate('registradoPor', 'nombre')
            .sort({ fechaPago: -1 });

          console.log(`Pagos realizados para proyecto ${pagoEspecial.tipo}:`, pagosRealizados.length);

          // Convertir a formato esperado por el frontend
          const pagosRealizadosFormateados = pagosRealizados.map(pago => ({
            vivienda: pago.vivienda,
            residente: pago.residente,
            montoPagado: pago.monto || pago.cantidadPagar,
            fechaPago: pago.fechaPago,
            metodoPago: pago.metodoPago,
            registradoPor: pago.registradoPor,
            notas: pago.notas
          }));

          const pagoConPagos = {
            ...pagoEspecial.toObject(),
            pagosRealizados: pagosRealizadosFormateados,
            viviendasSeleccionadas: pagoEspecial.viviendasSeleccionadas || []
          };
          
          console.log(`Pago ${pagoEspecial.tipo} con pagos:`, {
            viviendasSeleccionadas: pagoConPagos.viviendasSeleccionadas?.length || 0,
            pagosRealizados: pagoConPagos.pagosRealizados.length,
            viviendasSeleccionadasIds: pagoConPagos.viviendasSeleccionadas?.map(v => v._id || v) || []
          });
          
          return pagoConPagos;
        }
        
        return pagoEspecial;
      })
    );
    
    res.json(pagosEspecialesConPagos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener pagos individuales de un proyecto especial
router.get('/:id/pagos', auth, async (req, res) => {
  try {
    const proyectoId = req.params.id;
    const pagos = await PagoEspecial.find({
      pagoEspecialOriginal: proyectoId,
      estado: 'Pagado'
    })
      .populate({ path: 'vivienda', select: 'numero calle' })
      .populate({ path: 'residente', select: 'nombre apellidos' })
      .populate({ path: 'registradoPor', select: 'nombre apellidos' })
      .sort({ fechaPago: -1 });

    const totalRecaudado = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);

    res.json({ pagos, totalRecaudado, cantidad: pagos.length });
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

    // Crear un solo PagoEspecial que represente el proyecto completo
    // 'monto' representa el MONTO TOTAL del proyecto, no por vivienda
    const montoTotal = monto || 0;
    const pagoEspecial = new PagoEspecial({
      tipo,
      descripcion,
      monto: montoTotal, // Monto total del proyecto
      fechaLimite,
      aplicaATodasLasViviendas,
      viviendasSeleccionadas: viviendas.map(v => v._id), // Todas las viviendas involucradas
      cantidadPagar: cantidadPagar || 0,
      notas,
      registradoPor: req.usuario._id
    });

    console.log('Creando pago especial:', {
      tipo,
      aplicaATodasLasViviendas,
      viviendasSeleccionadas: viviendas.map(v => v._id).length,
      cantidadPagar
    });

    const pagoGuardado = await pagoEspecial.save();
    res.status(201).json({
      message: `Proyecto de pago especial creado para ${viviendas.length} viviendas`,
      pagoEspecial: pagoGuardado
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Actualizar pago especial
router.put('/:id', auth, [
  body('tipo').optional().notEmpty().withMessage('Nombre del proyecto requerido'),
  body('descripcion').optional().notEmpty().withMessage('Descripción requerida'),
  body('monto').optional().custom((value) => {
    if (value !== undefined && value !== null && value !== '') {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Monto inválido');
      }
    }
    return true;
  }),
  body('fechaLimite').optional().custom((value) => {
    if (value && value !== '') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Fecha límite inválida');
      }
    }
    return true;
  }),
  body('estado').optional().isIn(['Pendiente', 'Pagado', 'Vencido', 'Cancelado', 'Activo']).withMessage('Estado inválido'),
  body('cantidadPagar').optional().custom((value) => {
    if (value !== undefined && value !== null && value !== '') {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Cantidad a pagar inválida');
      }
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Errores de validación:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const pagoEspecial = await PagoEspecial.findById(req.params.id);
    if (!pagoEspecial) {
      return res.status(404).json({ message: 'Pago especial no encontrado' });
    }

    // Preparar datos para actualizar
    const updateData = {};
    
    // Campos que se pueden actualizar
    const allowedFields = [
      'tipo', 'descripcion', 'monto', 'cantidadPagar', 'fechaLimite', 
      'estado', 'notas', 'aplicaATodasLasViviendas', 'viviendasSeleccionadas'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'monto' || field === 'cantidadPagar') {
          updateData[field] = parseFloat(req.body[field]);
        } else if (field === 'fechaLimite' && req.body[field]) {
          updateData[field] = new Date(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    console.log('Datos a actualizar:', updateData);

    // Actualizar el documento
    const pagoActualizado = await PagoEspecial.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: false }
    );

    if (!pagoActualizado) {
      return res.status(404).json({ message: 'Pago especial no encontrado' });
    }

    res.json(pagoActualizado);
  } catch (error) {
    console.error('Error actualizando pago especial:', error);
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
    // Considerar SOLO proyectos (no pagos individuales por vivienda)
    const filtroProyectos = {
      $or: [
        { vivienda: { $exists: false } },
        { vivienda: null }
      ]
    };

    const totalPagosEspeciales = await PagoEspecial.countDocuments(filtroProyectos);
    const pagosPendientes = await PagoEspecial.countDocuments({ ...filtroProyectos, estado: 'Pendiente' });
    const pagosPagados = await PagoEspecial.countDocuments({ ...filtroProyectos, estado: 'Pagado' });
    const pagosVencidos = await PagoEspecial.countDocuments({ ...filtroProyectos, estado: 'Vencido' });
    
    const montoTotalPendiente = await PagoEspecial.aggregate([
      { $match: { ...filtroProyectos, estado: 'Pendiente' } },
      { $group: { _id: null, total: { $sum: '$monto' } } }
    ]);

    const montoTotalPagado = await PagoEspecial.aggregate([
      { $match: { ...filtroProyectos, estado: 'Pagado' } },
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

// Registrar pago individual (endpoint alternativo)
router.post('/registrar-pago', auth, [
  body('pagoEspecialId').notEmpty().withMessage('ID del pago especial es requerido'),
  body('viviendaId').notEmpty().withMessage('ID de vivienda es requerido'),
  body('montoPagado').isNumeric().withMessage('Monto pagado debe ser numérico')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pagoEspecialId, viviendaId, montoPagado, notas } = req.body;

    // Verificar que el pago especial existe
    const pagoEspecial = await PagoEspecial.findById(pagoEspecialId);
    if (!pagoEspecial) {
      return res.status(404).json({ message: 'Pago especial no encontrado' });
    }

    // Verificar que la vivienda existe
    const vivienda = await Vivienda.findById(viviendaId).populate('residentes');
    if (!vivienda) {
      return res.status(404).json({ message: 'Vivienda no encontrada' });
    }

    // Obtener el primer residente de la vivienda
    const residente = vivienda.residentes?.[0];
    if (!residente) {
      return res.status(400).json({ message: 'La vivienda no tiene residentes asignados' });
    }

    // Verificar que la vivienda está en el scope del pago especial
    if (!pagoEspecial.aplicaATodasLasViviendas) {
      const viviendasSeleccionadasIds = pagoEspecial.viviendasSeleccionadas?.map(v => 
        typeof v === 'string' ? v : v._id || v
      ) || [];
      
      console.log('Validando vivienda:', {
        viviendaId,
        viviendasSeleccionadasIds,
        viviendaIncluida: viviendasSeleccionadasIds.includes(viviendaId),
        tipos: {
          viviendaId: typeof viviendaId,
          primerId: typeof viviendasSeleccionadasIds[0]
        }
      });
      
      // Convertir todos a strings para comparación
      const viviendasSeleccionadasStrings = viviendasSeleccionadasIds.map(id => id.toString());
      const viviendaIdString = viviendaId.toString();
      
      if (!viviendasSeleccionadasStrings.includes(viviendaIdString)) {
        return res.status(400).json({ 
          message: 'La vivienda seleccionada no está incluida en este pago especial' 
        });
      }
    }

    // Verificar que la vivienda no ha pagado ya este pago especial
    const yaPago = await PagoEspecial.findOne({
      pagoEspecialOriginal: pagoEspecialId,
      vivienda: viviendaId,
      estado: 'Pagado'
    });

    console.log('Verificando si ya pagó:', {
      pagoEspecialId,
      viviendaId,
      yaPago: yaPago ? 'Sí' : 'No'
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
      residente: residente._id,
      fechaLimite: pagoEspecial.fechaLimite,
      aplicaATodasLasViviendas: false,
      cantidadPagar: montoPagado,
      metodoPago: 'Efectivo', // Por defecto
      fechaPago: new Date(),
      estado: 'Pagado',
      pagado: true,
      registradoPor: req.usuario._id,
      notas: notas || `Pago individual registrado para ${pagoEspecial.tipo}`,
      pagoEspecialOriginal: pagoEspecialId // Referencia al pago especial original
    });

    console.log('Registrando pago individual:', {
      pagoEspecialId,
      viviendaId,
      residenteId: residente._id,
      montoPagado,
      fechaPago: new Date()
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

// Registrar pago individual (endpoint original)
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
      pagoEspecialOriginal: pagoEspecialId,
      vivienda: viviendaId,
      estado: 'Pagado'
    });

    console.log('Verificando si ya pagó:', {
      pagoEspecialId,
      viviendaId,
      yaPago: yaPago ? 'Sí' : 'No'
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
      montoPorVivienda: pagoEspecial.montoPorVivienda || montoPagado,
      vivienda: viviendaId,
      residente: residenteId,
      fechaLimite: pagoEspecial.fechaLimite,
      aplicaATodasLasViviendas: false,
      cantidadPagar: montoPagado,
      metodoPago: metodoPago,
      fechaPago: new Date(),
      estado: 'Pagado',
      pagado: true,
      registradoPor: req.usuario._id,
      notas: notas || `Pago individual registrado para ${pagoEspecial.tipo}`,
      pagoEspecialOriginal: pagoEspecialId // Referencia al pago especial original
    });

    console.log('Registrando pago individual:', {
      pagoEspecialId,
      viviendaId,
      residenteId,
      montoPagado,
      metodoPago,
      fechaPago: new Date()
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