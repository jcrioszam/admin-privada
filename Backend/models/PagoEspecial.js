const mongoose = require('mongoose');

const pagoEspecialSchema = new mongoose.Schema({
  vivienda: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vivienda',
    required: false
  },
  residente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Residente',
    required: false
  },
  tipo: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  monto: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  },
  montoPorVivienda: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  },
  fechaLimite: {
    type: Date,
    required: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  estado: {
    type: String,
    enum: ['Pendiente', 'Pagado', 'Vencido', 'Cancelado'],
    default: 'Pendiente'
  },
  pagado: {
    type: Boolean,
    default: false
  },
  fechaPago: {
    type: Date
  },
  metodoPago: {
    type: String,
    enum: ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro']
  },
  registradoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  aplicaATodasLasViviendas: {
    type: Boolean,
    default: true
  },
  viviendasSeleccionadas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vivienda'
  }],
  cantidadPagar: {
    type: Number,
    min: 0,
    default: 0
  },
  notas: {
    type: String,
    trim: true
  },
  pagoEspecialOriginal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PagoEspecial'
  }
}, {
  timestamps: true
});

// Índices para mejorar rendimiento
pagoEspecialSchema.index({ vivienda: 1, estado: 1 });
pagoEspecialSchema.index({ fechaLimite: 1 });
pagoEspecialSchema.index({ tipo: 1 });

// Método para calcular monto total a pagar
pagoEspecialSchema.methods.calcularMontoTotal = function() {
  return (this.monto || 0) + (this.cantidadPagar || 0);
};

// Método para verificar si está vencido
pagoEspecialSchema.methods.estaVencido = function() {
  if (this.pagado || this.estado === 'Cancelado') return false;
  return new Date() > this.fechaLimite;
};

// Método para calcular días vencido
pagoEspecialSchema.methods.diasVencido = function() {
  if (this.pagado || this.estado === 'Cancelado') return 0;
  const ahora = new Date();
  const fechaLimite = new Date(this.fechaLimite);
  return Math.floor((ahora - fechaLimite) / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model('PagoEspecial', pagoEspecialSchema); 