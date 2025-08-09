const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Residente = require('../models/Residente');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Middleware para verificar token (simplificado)
const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Token requerido' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

// Crear usuario administrador inicial (solo si no existe ningún usuario)
router.post('/crear-admin-inicial', async (req, res) => {
  try {
    // Verificar si ya existe algún usuario
    const usuarioExistente = await Usuario.findOne();
    if (usuarioExistente) {
      return res.status(400).json({ message: 'Ya existe un usuario en el sistema' });
    }
    
    // Crear usuario administrador
    const usuario = new Usuario({
      nombre: 'Administrador',
      apellidos: 'Sistema',
      email: 'admin@admin.com',
      password: 'admin123',
      rol: 'Administrador',
      permisos: [
        {
          modulo: 'viviendas',
          acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar']
        },
        {
          modulo: 'residentes',
          acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar']
        },
        {
          modulo: 'pagos',
          acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar']
        },
        {
          modulo: 'usuarios',
          acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar']
        },
        {
          modulo: 'accesos',
          acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar']
        }
      ],
      activo: true
    });
    
    await usuario.save();
    
    res.status(201).json({ 
      message: 'Usuario administrador creado exitosamente',
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login por email o teléfono
router.post('/login', [
  body('password').notEmpty().withMessage('Password requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, telefono, password } = req.body;

    // buscar por email o teléfono
    let usuario = null;
    if (email) {
      usuario = await Usuario.findOne({ email, activo: true });
    } else if (telefono) {
      usuario = await Usuario.findOne({ telefono, activo: true });
    } else {
      return res.status(400).json({ message: 'Email o teléfono requerido' });
    }

    if (!usuario) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const passwordValido = await usuario.compararPassword(password);
    if (!passwordValido) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    usuario.ultimoAcceso = new Date();
    await usuario.save();

    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol, residente: usuario.residente },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        email: usuario.email,
        telefono: usuario.telefono,
        rol: usuario.rol,
        residente: usuario.residente
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crear usuario para un residente (admin)
router.post('/crear-usuario-residente', [
  body('residenteId').notEmpty().withMessage('residenteId requerido'),
  body('password').isLength({ min: 4 }).withMessage('Password mínimo 4 caracteres'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { residenteId, email, telefono, password } = req.body;
    const residente = await Residente.findById(residenteId);
    if (!residente) {
      return res.status(404).json({ message: 'Residente no encontrado' });
    }

    // Evitar duplicados por email o teléfono
    if (email) {
      const existeEmail = await Usuario.findOne({ email });
      if (existeEmail) return res.status(400).json({ message: 'Email ya en uso' });
    }
    if (telefono) {
      const existeTel = await Usuario.findOne({ telefono });
      if (existeTel) return res.status(400).json({ message: 'Teléfono ya en uso' });
    }

    const usuario = new Usuario({
      nombre: residente.nombre,
      apellidos: residente.apellidos,
      email: email || undefined,
      telefono: telefono || undefined,
      password,
      rol: 'Residente',
      residente: residente._id,
      activo: true
    });

    await usuario.save();

    res.status(201).json({
      message: 'Usuario de residente creado',
      usuario: {
        id: usuario._id, nombre: usuario.nombre, apellidos: usuario.apellidos,
        email: usuario.email, telefono: usuario.telefono, rol: usuario.rol, residente: usuario.residente
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener perfil del usuario actual
router.get('/perfil', verificarToken, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('-password');
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener todos los usuarios (solo administradores)
router.get('/', async (req, res) => {
  try {
    // Verificar token si está presente
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const usuario = await Usuario.findById(decoded.id).select('-password');
        if (!usuario || usuario.rol !== 'Administrador') {
          return res.status(403).json({ message: 'Acceso denegado' });
        }
      } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
      }
    }
    
    const usuarios = await Usuario.find().select('-password').sort({ apellidos: 1, nombre: 1 });
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener un usuario específico
router.get('/:id', async (req, res) => {
  try {
    // Verificar token si está presente
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const usuarioAutenticado = await Usuario.findById(decoded.id).select('-password');
        if (!usuarioAutenticado || (usuarioAutenticado.rol !== 'Administrador' && decoded.id !== req.params.id)) {
          return res.status(403).json({ message: 'Acceso denegado' });
        }
      } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
      }
    }
    
    const usuario = await Usuario.findById(req.params.id).select('-password');
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crear nuevo usuario (solo administradores)
router.post('/', [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('apellidos').notEmpty().withMessage('Los apellidos son requeridos'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol').isIn(['Administrador', 'Operador', 'Supervisor']).withMessage('Rol inválido')
], async (req, res) => {
  try {
    // Verificar token si está presente
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const usuarioAutenticado = await Usuario.findById(decoded.id).select('-password');
        if (!usuarioAutenticado || usuarioAutenticado.rol !== 'Administrador') {
          return res.status(403).json({ message: 'Acceso denegado' });
        }
      } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
      }
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verificar que el email no esté en uso
    const usuarioExistente = await Usuario.findOne({ email: req.body.email });
    if (usuarioExistente) {
      return res.status(400).json({ message: 'El email ya está en uso' });
    }

    const usuario = new Usuario(req.body);
    const nuevoUsuario = await usuario.save();
    
    const usuarioSinPassword = nuevoUsuario.toObject();
    delete usuarioSinPassword.password;
    
    res.status(201).json(usuarioSinPassword);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Actualizar usuario
router.put('/:id', [
  body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('apellidos').optional().notEmpty().withMessage('Los apellidos no pueden estar vacíos'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('rol').optional().isIn(['Administrador', 'Operador', 'Supervisor']).withMessage('Rol inválido'),
  body('activo').optional().isBoolean().withMessage('El estado activo debe ser booleano')
], async (req, res) => {
  try {
    // Verificar token si está presente
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const usuarioAutenticado = await Usuario.findById(decoded.id).select('-password');
        if (!usuarioAutenticado || (usuarioAutenticado.rol !== 'Administrador' && decoded.id !== req.params.id)) {
          return res.status(403).json({ message: 'Acceso denegado' });
        }
      } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
      }
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cambiar contraseña
router.put('/:id/cambiar-password', [
  body('passwordActual').notEmpty().withMessage('La contraseña actual es requerida'),
  body('passwordNuevo').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    // Verificar token si está presente
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const usuarioAutenticado = await Usuario.findById(decoded.id).select('-password');
        if (!usuarioAutenticado || (usuarioAutenticado.rol !== 'Administrador' && decoded.id !== req.params.id)) {
          return res.status(403).json({ message: 'Acceso denegado' });
        }
      } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
      }
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Verificar contraseña actual
    const passwordValido = await usuario.compararPassword(req.body.passwordActual);
    if (!passwordValido) {
      return res.status(400).json({ message: 'Contraseña actual incorrecta' });
    }
    
    // Cambiar contraseña
    usuario.password = req.body.passwordNuevo;
    await usuario.save();
    
    res.json({ message: 'Contraseña cambiada correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Eliminar usuario (solo administradores)
router.delete('/:id', async (req, res) => {
  try {
    // Verificar token si está presente
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const usuarioAutenticado = await Usuario.findById(decoded.id).select('-password');
        if (!usuarioAutenticado || usuarioAutenticado.rol !== 'Administrador') {
          return res.status(403).json({ message: 'Acceso denegado' });
        }
        
        if (decoded.id === req.params.id) {
          return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
        }
      } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
      }
    }
    
    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener estadísticas de usuarios
router.get('/estadisticas/resumen', async (req, res) => {
  try {
    // Verificar token si está presente
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const usuarioAutenticado = await Usuario.findById(decoded.id).select('-password');
        if (!usuarioAutenticado || usuarioAutenticado.rol !== 'Administrador') {
          return res.status(403).json({ message: 'Acceso denegado' });
        }
      } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
      }
    }
    
    const estadisticas = await Usuario.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          activos: {
            $sum: { $cond: ['$activo', 1, 0] }
          },
          inactivos: {
            $sum: { $cond: [{ $eq: ['$activo', false] }, 1, 0] }
          }
        }
      }
    ]);

    // Estadísticas por rol
    const estadisticasPorRol = await Usuario.aggregate([
      {
        $group: {
          _id: '$rol',
          cantidad: { $sum: 1 },
          activos: { $sum: { $cond: ['$activo', 1, 0] } }
        }
      }
    ]);

    res.json({
      general: estadisticas[0] || {
        total: 0,
        activos: 0,
        inactivos: 0
      },
      porRol: estadisticasPorRol
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 