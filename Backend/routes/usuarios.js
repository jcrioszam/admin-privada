const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
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

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Password requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    // Buscar usuario
    const usuario = await Usuario.findOne({ email, activo: true });
    if (!usuario) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    // Verificar password
    const passwordValido = await usuario.compararPassword(password);
    if (!passwordValido) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    // Actualizar último acceso
    usuario.ultimoAcceso = new Date();
    await usuario.save();
    
    // Generar token
    const token = jwt.sign(
      { 
        id: usuario._id, 
        email: usuario.email, 
        rol: usuario.rol 
      },
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
        rol: usuario.rol,
        permisos: usuario.permisos
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
router.get('/', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'Administrador') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    
    const usuarios = await Usuario.find().select('-password').sort({ apellidos: 1, nombre: 1 });
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener un usuario específico
router.get('/:id', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'Administrador' && req.usuario.id !== req.params.id) {
      return res.status(403).json({ message: 'Acceso denegado' });
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
router.post('/', verificarToken, [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('apellidos').notEmpty().withMessage('Los apellidos son requeridos'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol').isIn(['Administrador', 'Operador', 'Supervisor']).withMessage('Rol inválido')
], async (req, res) => {
  try {
    if (req.usuario.rol !== 'Administrador') {
      return res.status(403).json({ message: 'Acceso denegado' });
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
router.put('/:id', verificarToken, [
  body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('apellidos').optional().notEmpty().withMessage('Los apellidos no pueden estar vacíos'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('rol').optional().isIn(['Administrador', 'Operador', 'Supervisor']).withMessage('Rol inválido'),
  body('activo').optional().isBoolean().withMessage('El estado activo debe ser booleano')
], async (req, res) => {
  try {
    if (req.usuario.rol !== 'Administrador' && req.usuario.id !== req.params.id) {
      return res.status(403).json({ message: 'Acceso denegado' });
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
router.put('/:id/cambiar-password', verificarToken, [
  body('passwordActual').notEmpty().withMessage('La contraseña actual es requerida'),
  body('passwordNuevo').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    if (req.usuario.rol !== 'Administrador' && req.usuario.id !== req.params.id) {
      return res.status(403).json({ message: 'Acceso denegado' });
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
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'Administrador') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    
    if (req.usuario.id === req.params.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
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
router.get('/estadisticas/resumen', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'Administrador') {
      return res.status(403).json({ message: 'Acceso denegado' });
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