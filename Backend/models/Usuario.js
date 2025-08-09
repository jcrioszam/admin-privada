const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  apellidos: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    unique: false,
    sparse: true,
    trim: true,
    lowercase: true
  },
  telefono: {
    type: String,
    required: false,
    trim: true,
    unique: false,
    sparse: true
  },
  password: {
    type: String,
    required: true,
    minlength: 4
  },
  rol: {
    type: String,
    enum: ['Administrador', 'Operador', 'Supervisor', 'Residente'],
    default: 'Operador'
  },
  residente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Residente'
  },
  activo: {
    type: Boolean,
    default: true
  },
  ultimoAcceso: {
    type: Date
  },
  permisos: [{
    modulo: {
      type: String,
      enum: ['viviendas', 'residentes', 'pagos', 'accesos', 'usuarios', 'reportes']
    },
    acciones: [{
      type: String,
      enum: ['crear', 'leer', 'actualizar', 'eliminar', 'exportar']
    }]
  }],
  foto: {
    type: String
  }
}, {
  timestamps: true
});

// Índices
usuarioSchema.index({ email: 1 });
usuarioSchema.index({ telefono: 1 });
usuarioSchema.index({ rol: 1 });
usuarioSchema.index({ activo: 1 });

// Hash password antes de guardar
usuarioSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar passwords
usuarioSchema.methods.compararPassword = async function(passwordCandidata) {
  return await bcrypt.compare(passwordCandidata, this.password);
};

usuarioSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombre} ${this.apellidos}`;
});

usuarioSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('Usuario', usuarioSchema); 