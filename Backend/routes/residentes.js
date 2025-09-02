const express = require('express');
const router = express.Router();
const Residente = require('../models/Residente');
const Vivienda = require('../models/Vivienda');
const PagoEspecial = require('../models/PagoEspecial');
const ProyectoPagoEspecial = require('../models/ProyectoPagoEspecial');
const Pago = require('../models/Pago');
const Configuracion = require('../models/Configuracion');
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

    // Procesar fecha de ingreso para evitar problemas de zona horaria
    const residenteData = { ...req.body };
    if (residenteData.fechaIngreso) {
      // Mantener la fecha exacta sin conversión de zona horaria
      const fecha = new Date(residenteData.fechaIngreso);
      // Usar la fecha tal como viene del frontend, sin ajustes de zona horaria
      residenteData.fechaIngreso = fecha;
    }

    const residente = new Residente(residenteData);
    const nuevoResidente = await residente.save();
    
    // Actualizar la vivienda con el nuevo residente
    await Vivienda.findByIdAndUpdate(req.body.vivienda, {
      estado: 'Ocupada',
      tipoOcupacion: req.body.tipo,
      residente: nuevoResidente._id,
      $addToSet: { residentes: nuevoResidente._id }
    });
    
    // Si se solicita crear usuario de residente
    if (req.body.crearUsuario && req.body.password) {
      console.log('🔧 Creando usuario para nuevo residente:', nuevoResidente._id);
      const Usuario = require('../models/Usuario');

      // Evitar duplicados por email o teléfono
      if (req.body.email) {
        const existenteEmail = await Usuario.findOne({ email: req.body.email });
        if (existenteEmail) {
          return res.status(400).json({ message: 'El email ya está en uso' });
        }
      }
      if (req.body.telefono) {
        const existenteTel = await Usuario.findOne({ telefono: req.body.telefono });
        if (existenteTel) {
          return res.status(400).json({ message: 'El teléfono ya está en uso' });
        }
      }

      const usuario = new Usuario({
        nombre: nuevoResidente.nombre,
        apellidos: nuevoResidente.apellidos,
        email: req.body.email || undefined,
        telefono: req.body.telefono || undefined,
        password: req.body.password,
        rol: 'Residente',
        residente: nuevoResidente._id,
        activo: true
      });
      await usuario.save();
      console.log('✅ Usuario creado exitosamente para nuevo residente:', usuario._id);
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

    // Procesar fecha de ingreso para evitar problemas de zona horaria
    const updateData = { ...req.body };
    console.log('📥 Fecha recibida del frontend:', updateData.fechaIngreso);
    console.log('📥 Tipo de fecha recibida:', typeof updateData.fechaIngreso);
    
    if (updateData.fechaIngreso) {
      // Mantener la fecha exacta sin conversión de zona horaria
      const fecha = new Date(updateData.fechaIngreso);
      console.log('📥 Fecha convertida a Date:', fecha);
      console.log('📥 Fecha en ISO:', fecha.toISOString());
      // Usar la fecha tal como viene del frontend, sin ajustes de zona horaria
      updateData.fechaIngreso = fecha;
    }

    const residente = await Residente.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('vivienda', 'numero calle');

    // Si se cambió la fecha de ingreso, recalcular pagos pendientes
    if (updateData.fechaIngreso && residente.vivienda) {
      console.log('🔄 Recalculando pagos por cambio de fecha de ingreso...');
      console.log('🔄 Residente ID:', residente._id);
      console.log('🔄 Vivienda ID:', residente.vivienda._id);
      console.log('🔄 Nueva fecha de ingreso:', updateData.fechaIngreso);
      try {
        await recalcularPagosPorFechaIngreso(residente._id, residente.vivienda._id, updateData.fechaIngreso);
        console.log('✅ Recálculo de pagos completado exitosamente');
      } catch (error) {
        console.error('❌ Error en recálculo de pagos:', error);
      }
    } else {
      console.log('ℹ️ No se recalculan pagos - fecha de ingreso no cambió o no hay vivienda');
    }

    // Si se solicita crear usuario de residente y no existe
    if (req.body.crearUsuario && req.body.password) {
      console.log('🔧 Intentando crear usuario para residente:', req.params.id);
      const Usuario = require('../models/Usuario');

      // Verificar si ya existe un usuario para este residente
      const usuarioExistente = await Usuario.findOne({ residente: req.params.id });
      console.log('👤 Usuario existente:', usuarioExistente ? 'Sí' : 'No');
      
      if (!usuarioExistente) {
        // Evitar duplicados por email o teléfono
        if (req.body.email) {
          const existenteEmail = await Usuario.findOne({ 
            email: req.body.email,
            _id: { $ne: usuarioExistente?._id } // Excluir el usuario actual si existe
          });
          if (existenteEmail) {
            return res.status(400).json({ message: 'El email ya está en uso' });
          }
        }
        if (req.body.telefono) {
          const existenteTel = await Usuario.findOne({ 
            telefono: req.body.telefono,
            _id: { $ne: usuarioExistente?._id } // Excluir el usuario actual si existe
          });
          if (existenteTel) {
            return res.status(400).json({ message: 'El teléfono ya está en uso' });
          }
        }

        const usuario = new Usuario({
          nombre: residente.nombre,
          apellidos: residente.apellidos,
          email: req.body.email || undefined,
          telefono: req.body.telefono || undefined,
          password: req.body.password,
          rol: 'Residente',
          residente: residente._id,
          activo: true
        });
        await usuario.save();
        console.log('✅ Usuario creado exitosamente:', usuario._id);
      }
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

    // Eliminar usuario asociado si existe
    const Usuario = require('../models/Usuario');
    await Usuario.findOneAndDelete({ residente: req.params.id });

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

    res.json({ message: 'Residente y usuario asociado eliminados correctamente' });
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

// ========================================
// RUTAS PARA EL PORTAL DE RESIDENTES
// ========================================

// POST /api/residentes/login - Autenticación por clave de acceso
router.post('/login', async (req, res) => {
  try {
    const { claveAcceso } = req.body;

    if (!claveAcceso) {
      return res.status(400).json({ message: 'Clave de acceso requerida' });
    }

    const residente = await Residente.findOne({ 
      claveAcceso, 
      activo: true 
    }).populate('vivienda');

    if (!residente) {
      return res.status(401).json({ message: 'Clave de acceso inválida o residente inactivo' });
    }

    // Generar token temporal para el residente (sin JWT por simplicidad)
    const token = Buffer.from(`${residente._id}:${claveAcceso}`).toString('base64');

    res.json({
      message: 'Acceso exitoso',
      residente: {
        id: residente._id,
        nombre: residente.nombre,
        apellidos: residente.apellidos,
        tipo: residente.tipo,
        vivienda: {
          id: residente.vivienda._id,
          numero: residente.vivienda.numero,
          estado: residente.vivienda.estado
        }
      },
      token
    });

  } catch (error) {
    console.error('Error en login de residente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/residentes/perfil/:clave - Información personal del residente
router.get('/perfil/:clave', async (req, res) => {
  try {
    const { clave } = req.params;

    const residente = await Residente.findOne({ 
      claveAcceso: clave, 
      activo: true 
    }).populate('vivienda');

    if (!residente) {
      return res.status(404).json({ message: 'Residente no encontrado' });
    }

    res.json({
      residente: {
        id: residente._id,
        nombre: residente.nombre,
        apellidos: residente.apellidos,
        tipo: residente.tipo,
        telefono: residente.telefono,
        fechaIngreso: residente.fechaIngreso,
        vehiculos: residente.vehiculos,
        familiares: residente.familiares,
        observaciones: residente.observaciones,
        vivienda: {
          id: residente.vivienda._id,
          numero: residente.vivienda.numero,
          estado: residente.vivienda.estado,
          tipoOcupacion: residente.vivienda.tipoOcupacion
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil de residente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/residentes/dashboard/:id - Dashboard del residente (sistema unificado)
router.get('/dashboard/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const residente = await Residente.findById(id)
      .populate('vivienda');

    if (!residente) {
      return res.status(404).json({ message: 'Residente no encontrado' });
    }

    // Calcular morosidad desde la fecha de ingreso
    const fechaActual = new Date();
    const fechaIngreso = new Date(residente.fechaIngreso);
    
    // Calcular meses desde el ingreso
    const mesesDesdeIngreso = (fechaActual.getFullYear() - fechaIngreso.getFullYear()) * 12 + 
                             (fechaActual.getMonth() - fechaIngreso.getMonth());
    
    // Obtener pagos del residente
    const pagos = await Pago.find({ 
      vivienda: residente.vivienda._id,
      residente: residente._id 
    }).sort({ año: -1, mes: -1 });

    // Calcular estadísticas
    let totalPagos = 0;
    let totalAtrasados = 0;
    let totalMorosos = 0;
    let pagosAtrasados = [];
    let pagosMorosos = [];

    // Verificar pagos desde la fecha de ingreso
    for (let i = 0; i <= mesesDesdeIngreso; i++) {
      const fechaPago = new Date(fechaIngreso);
      fechaPago.setMonth(fechaIngreso.getMonth() + i);
      
      const año = fechaPago.getFullYear();
      const mes = fechaPago.getMonth() + 1;
      
      const pago = pagos.find(p => p.año === año && p.mes === mes);
      
      if (!pago) {
        totalAtrasados++;
        const mesesAtraso = mesesDesdeIngreso - i;
        
        if (mesesAtraso >= 2) {
          totalMorosos++;
          pagosMorosos.push({
            mes: mes,
            año: año,
            mesesAtraso: mesesAtraso,
            monto: 200 // Monto típico
          });
        } else {
          pagosAtrasados.push({
            mes: mes,
            año: año,
            mesesAtraso: mesesAtraso,
            monto: 200
          });
        }
      } else {
        totalPagos++;
      }
    }

    // Obtener proyectos especiales
    const proyectos = await ProyectoPagoEspecial.find({ activo: true });
    const pagosEspeciales = await PagoEspecial.find({ 
      residente: residente._id 
    });

    const proyectosPendientes = pagosEspeciales.filter(p => !p.pagado).length;
    const proyectosVencidos = pagosEspeciales.filter(p => {
      if (p.pagado) return false;
      const fechaLimite = new Date(p.fechaLimite);
      return fechaLimite < fechaActual;
    }).length;

    res.json({
      residente: {
        id: residente._id,
        nombre: residente.nombre,
        apellidos: residente.apellidos,
        tipo: residente.tipo,
        telefono: residente.telefono,
        fechaIngreso: residente.fechaIngreso,
        vivienda: {
          id: residente.vivienda._id,
          numero: residente.vivienda.numero,
          estado: residente.vivienda.estado,
          tipoOcupacion: residente.vivienda.tipoOcupacion
        }
      },
      estadisticas: {
        totalPagos,
        totalAtrasados,
        totalMorosos,
        pagosAtrasados,
        pagosMorosos,
        proyectosPendientes,
        proyectosVencidos,
        mesesDesdeIngreso
      }
    });

  } catch (error) {
    console.error('Error obteniendo dashboard de residente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/residentes/pagos/:clave - Historial de pagos del residente
router.get('/pagos/:clave', async (req, res) => {
  try {
    const { clave } = req.params;

    const residente = await Residente.findOne({ 
      claveAcceso: clave, 
      activo: true 
    }).populate('vivienda');

    if (!residente) {
      return res.status(404).json({ message: 'Residente no encontrado' });
    }

    // Obtener pagos normales
    const pagos = await Pago.find({ 
      vivienda: residente.vivienda._id 
    }).sort({ fechaPago: -1 });

    // Obtener pagos especiales
    const pagosEspeciales = await PagoEspecial.find({
      vivienda: residente.vivienda._id,
      pagoEspecialOriginal: { $exists: true } // Solo pagos individuales
    }).populate('pagoEspecialOriginal').sort({ fechaPago: -1 });

    // Calcular pagos atrasados (pagos normales)
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const añoActual = hoy.getFullYear();
    const primerDiaMes = new Date(añoActual, mesActual - 1, 1);
    
    const pagoMesActual = await Pago.findOne({
      vivienda: residente.vivienda._id,
      mes: mesActual,
      año: añoActual
    });

    const pagosAtrasados = [];
    if (!pagoMesActual) {
      // Obtener configuración para monto de cuota
      const conf = await Configuracion.findOne({ activo: true });
      const montoCuota = conf?.cuotaMantenimientoMensual || 500;

      pagosAtrasados.push({
        tipo: 'Mantenimiento',
        mes: mesActual,
        año: añoActual,
        monto: montoCuota,
        diasAtraso: Math.floor((hoy - primerDiaMes) / (1000 * 60 * 60 * 24))
      });
    }

    // Calcular próximo pago (siguiente mes)
    const siguienteMes = mesActual === 12 ? 1 : mesActual + 1;
    const añoSiguiente = mesActual === 12 ? añoActual + 1 : añoActual;
    const conf = await Configuracion.findOne({ activo: true });
    const montoCuota = conf?.cuotaMantenimientoMensual || 500;
    const fechaLimiteProximo = new Date(añoSiguiente, siguienteMes - 1, 1); // primer día del mes siguiente

    const proximoPago = {
      tipo: 'Mantenimiento',
      mes: siguienteMes,
      año: añoSiguiente,
      monto: montoCuota,
      fechaLimite: fechaLimiteProximo
    };

    res.json({
      pagos: pagos,
      pagosEspeciales: pagosEspeciales,
      pagosAtrasados: pagosAtrasados,
      proximoPago,
      totalPagos: pagos.length,
      totalPagosEspeciales: pagosEspeciales.length,
      totalAtrasados: pagosAtrasados.length
    });

  } catch (error) {
    console.error('Error obteniendo pagos de residente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/residentes/proyectos/:clave - Proyectos especiales del residente
router.get('/proyectos/:clave', async (req, res) => {
  try {
    const { clave } = req.params;

    const residente = await Residente.findOne({ 
      claveAcceso: clave, 
      activo: true 
    }).populate('vivienda');

    if (!residente) {
      return res.status(404).json({ message: 'Residente no encontrado' });
    }

    // Obtener proyectos de PagoEspecial (tradicionales)
    const proyectosEspecialesRaw = await PagoEspecial.find({
      $and: [
        {
          $or: [
            { viviendasSeleccionadas: residente.vivienda._id },
            { aplicaATodasLasViviendas: true }
          ]
        },
        { $or: [ { pagoEspecialOriginal: { $exists: false } }, { pagoEspecialOriginal: null } ] },
        { $or: [ { vivienda: { $exists: false } }, { vivienda: null } ] }
      ]
    }).sort({ createdAt: -1 });

    // Obtener proyectos del modelo ProyectoPagoEspecial (proyectos globales con pagos embebidos)
    const proyectosModeloProyecto = await ProyectoPagoEspecial.find({ estado: { $in: ['Activo', 'Completado'] } }).sort({ createdAt: -1 });

    // Filtrar proyectosModeloProyecto donde la vivienda del residente participa (si aplica)
    const proyectosModeloProyectoFiltrados = proyectosModeloProyecto.filter(p => {
      // Si el proyecto tiene pagosRealizados, verificar si ya hay pago de esta vivienda
      const yaPago = p.pagosRealizados?.some(pr => pr.vivienda?.toString() === residente.vivienda._id.toString());
      // Mostrar igualmente aunque no haya pagado, porque aplican a todas las viviendas por diseño
      return true;
    });

    // Deduplicar proyectosEspecialesRaw por llave estable
    const proyectoKey = (p) => {
      const fecha = p.fechaLimite ? new Date(p.fechaLimite).toISOString().slice(0, 10) : 'sin-fecha';
      const desc = (p.descripcion || '').trim();
      return `${p.tipo}|${desc}|${fecha}|${p.cantidadPagar || 0}`;
    };

    const mapaUnicos = new Map();
    for (const p of proyectosEspecialesRaw) {
      const key = proyectoKey(p);
      if (!mapaUnicos.has(key)) {
        mapaUnicos.set(key, p);
      }
    }
    const proyectosEspeciales = Array.from(mapaUnicos.values());

    // Normalizar ambos tipos de proyectos a un mismo formato
    const normalizadosPagoEspecial = await Promise.all(proyectosEspeciales.map(async (proyecto) => {
      const pagoRealizado = await PagoEspecial.findOne({
        vivienda: residente.vivienda._id,
        pagoEspecialOriginal: proyecto._id
      });
      return {
        id: `PE:${proyecto._id}`,
        nombre: proyecto.tipo,
        descripcion: proyecto.descripcion,
        cantidadPagar: proyecto.cantidadPagar || proyecto.monto || 0,
        fechaLimite: proyecto.fechaLimite,
        estado: proyecto.estado,
        yaPago: !!pagoRealizado,
        fechaPago: pagoRealizado ? pagoRealizado.fechaPago : null,
        fuente: 'PagoEspecial'
      };
    }));

    const normalizadosProyecto = proyectosModeloProyectoFiltrados.map((p) => {
      const yaPago = p.pagosRealizados?.some(pr => pr.vivienda?.toString() === residente.vivienda._id.toString());
      return {
        id: `PP:${p._id}`,
        nombre: p.nombre,
        descripcion: p.descripcion,
        cantidadPagar: p.cantidadPagar,
        fechaLimite: p.fechaLimite,
        estado: p.estado === 'Completado' ? 'Completado' : 'Activo',
        yaPago: !!yaPago,
        fechaPago: null,
        fuente: 'ProyectoPagoEspecial'
      };
    });

    const todos = [...normalizadosPagoEspecial, ...normalizadosProyecto];

    res.json({
      proyectos: todos,
      totalProyectos: todos.length,
      proyectosPendientes: todos.filter(p => !p.yaPago && (p.estado === 'Activo' || p.estado === 'Pendiente')).length
    });

  } catch (error) {
    console.error('Error obteniendo proyectos de residente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Función para recalcular pagos cuando cambia la fecha de ingreso
async function recalcularPagosPorFechaIngreso(residenteId, viviendaId, nuevaFechaIngreso) {
  try {
    console.log('🔄 Iniciando recálculo de pagos...');
    console.log('📅 Nueva fecha de ingreso:', nuevaFechaIngreso);
    
    // Obtener todos los pagos pendientes de esta vivienda
    const pagosPendientes = await Pago.find({
      vivienda: viviendaId,
      estado: { $in: ['Pendiente', 'Vencido', 'Parcial'] }
    }).sort({ año: 1, mes: 1 });
    
    console.log(`📊 Pagos pendientes encontrados: ${pagosPendientes.length}`);
    
    if (pagosPendientes.length === 0) {
      console.log('ℹ️ No hay pagos pendientes para recalcular');
      return;
    }
    
    // Calcular la nueva fecha de inicio del período
    const fechaIngreso = new Date(nuevaFechaIngreso);
    const añoIngreso = fechaIngreso.getFullYear();
    const mesIngreso = fechaIngreso.getMonth() + 1;
    
    console.log(`📅 Fecha de ingreso: ${mesIngreso}/${añoIngreso}`);
    
    // Recalcular cada pago pendiente
    for (const pago of pagosPendientes) {
      console.log(`🔄 Procesando pago ${pago.mes}/${pago.año} - Estado: ${pago.estado}`);
      
      // Calcular la nueva fecha de inicio del período basada en la fecha de ingreso
      const nuevoMesInicio = mesIngreso;
      const nuevoAñoInicio = añoIngreso;
      
      // Calcular cuántos meses han pasado desde el ingreso hasta este pago
      const mesesTranscurridos = (pago.año - nuevoAñoInicio) * 12 + (pago.mes - nuevoMesInicio);
      
      console.log(`📊 Meses transcurridos desde ingreso: ${mesesTranscurridos}`);
      
      if (mesesTranscurridos >= 0) {
        // Recalcular fechas del período
        const nuevaFechaInicio = new Date(nuevoAñoInicio, nuevoMesInicio - 1 + mesesTranscurridos, 1);
        const nuevaFechaFin = new Date(nuevoAñoInicio, nuevoMesInicio + mesesTranscurridos, 0);
        const nuevaFechaLimite = new Date(nuevoAñoInicio, nuevoMesInicio + mesesTranscurridos, 0);
        
        console.log(`📅 Nuevas fechas - Inicio: ${nuevaFechaInicio.toISOString()}, Fin: ${nuevaFechaFin.toISOString()}, Límite: ${nuevaFechaLimite.toISOString()}`);
        
        // Actualizar el pago
        const pagoActualizado = await Pago.findByIdAndUpdate(pago._id, {
          fechaInicioPeriodo: nuevaFechaInicio,
          fechaFinPeriodo: nuevaFechaFin,
          fechaLimite: nuevaFechaLimite
        }, { new: true });
        
        console.log(`✅ Pago ${pago.mes}/${pago.año} recalculado con nuevas fechas`);
        console.log(`📊 Pago actualizado:`, {
          id: pagoActualizado._id,
          mes: pagoActualizado.mes,
          año: pagoActualizado.año,
          estado: pagoActualizado.estado,
          fechaLimite: pagoActualizado.fechaLimite
        });
      } else {
        console.log(`⚠️ Pago ${pago.mes}/${pago.año} es anterior a la fecha de ingreso, no se recalcula`);
      }
    }
    
    console.log('✅ Recálculo de pagos completado');
    
  } catch (error) {
    console.error('❌ Error recalculando pagos:', error);
    throw error;
  }
}

// Endpoint temporal para listar todas las viviendas con sus IDs
router.get('/debug/viviendas', async (req, res) => {
  try {
    console.log('🔍 Listando todas las viviendas...');
    
    const viviendas = await Vivienda.find()
      .populate('residente', 'nombre apellidos fechaIngreso')
      .sort({ numero: 1 });
    
    const resultado = viviendas.map(vivienda => ({
      id: vivienda._id,
      numero: vivienda.numero,
      calle: vivienda.calle,
      residente: vivienda.residente ? {
        nombre: vivienda.residente.nombre,
        apellidos: vivienda.residente.apellidos,
        fechaIngreso: vivienda.residente.fechaIngreso
      } : null
    }));
    
    console.log('📊 Viviendas encontradas:', resultado.length);
    
    res.json({
      total: resultado.length,
      viviendas: resultado
    });
    
  } catch (error) {
    console.error('❌ Error listando viviendas:', error);
    res.status(500).json({ message: 'Error listando viviendas', error: error.message });
  }
});

// Endpoint temporal para verificar pagos de una vivienda específica
router.get('/debug/pagos/:viviendaId', async (req, res) => {
  try {
    const { viviendaId } = req.params;
    
    console.log(`🔍 Verificando pagos para vivienda: ${viviendaId}`);
    
    // Verificar que el ID sea válido
    if (!viviendaId || viviendaId === '[ID_DE_LA_VIVIENDA]') {
      return res.status(400).json({ 
        message: 'ID de vivienda inválido. Usa /api/residentes/debug/viviendas para obtener los IDs válidos' 
      });
    }
    
    // Obtener todos los pagos de esta vivienda (incluyendo pagados)
    const pagos = await Pago.find({ vivienda: viviendaId })
      .populate('vivienda', 'numero')
      .populate('residente', 'nombre apellidos')
      .sort({ año: 1, mes: 1 });
    
    // También obtener solo los pagos pendientes para comparar
    const pagosPendientes = await Pago.find({ 
      vivienda: viviendaId,
      estado: { $in: ['Pendiente', 'Vencido', 'Parcial'] }
    }).sort({ año: 1, mes: 1 });
    
    console.log(`📊 Total de pagos encontrados: ${pagos.length}`);
    console.log(`📊 Pagos pendientes encontrados: ${pagosPendientes.length}`);
    
    // Obtener información de la vivienda
    const vivienda = await Vivienda.findById(viviendaId)
      .populate('residente', 'nombre apellidos fechaIngreso');
    
    const resultado = {
      vivienda: vivienda ? {
        id: vivienda._id,
        numero: vivienda.numero,
        residente: vivienda.residente
      } : null,
      totalPagos: pagos.length,
      totalPagosPendientes: pagosPendientes.length,
      pagos: pagos.map(pago => ({
        id: pago._id,
        mes: pago.mes,
        año: pago.año,
        monto: pago.monto,
        montoPagado: pago.montoPagado,
        saldoPendiente: pago.monto - (pago.montoPagado || 0),
        estado: pago.estado,
        fechaInicioPeriodo: pago.fechaInicioPeriodo,
        fechaFinPeriodo: pago.fechaFinPeriodo,
        fechaLimite: pago.fechaLimite,
        diasAtraso: pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' ? 0 : 
                   new Date() > pago.fechaLimite ? Math.ceil((new Date() - pago.fechaLimite) / (1000 * 60 * 60 * 24)) : 0
      })),
      pagosPendientes: pagosPendientes.map(pago => ({
        id: pago._id,
        mes: pago.mes,
        año: pago.año,
        monto: pago.monto,
        montoPagado: pago.montoPagado,
        saldoPendiente: pago.monto - (pago.montoPagado || 0),
        estado: pago.estado,
        fechaInicioPeriodo: pago.fechaInicioPeriodo,
        fechaFinPeriodo: pago.fechaFinPeriodo,
        fechaLimite: pago.fechaLimite,
        diasAtraso: pago.estado === 'Pagado' || pago.estado === 'Pagado con excedente' ? 0 : 
                   new Date() > pago.fechaLimite ? Math.ceil((new Date() - pago.fechaLimite) / (1000 * 60 * 60 * 24)) : 0
      }))
    };
    
    console.log('📊 Resultado:', JSON.stringify(resultado, null, 2));
    
    res.json(resultado);
    
  } catch (error) {
    console.error('❌ Error verificando pagos:', error);
    res.status(500).json({ message: 'Error verificando pagos', error: error.message });
  }
});

module.exports = router; 