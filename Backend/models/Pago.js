const mongoose = require('mongoose');

const pagoSchema = new mongoose.Schema({
  vivienda: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vivienda',
    required: true
  },
  residente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Residente',
    required: false
  },
  mes: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  año: {
    type: Number,
    required: true
  },
  monto: {
    type: Number,
    required: true
  },
  montoPagado: {
    type: Number,
    default: 0
  },
  excedente: {
    type: Number,
    default: 0
  },
  montoAdicional: {
    type: Number,
    default: 0
  },
  conceptoAdicional: {
    type: String,
    trim: true
  },
  fechaPago: {
    type: Date,
    default: null
  },
  fechaInicioPeriodo: {
    type: Date,
    required: true
  },
  fechaFinPeriodo: {
    type: Date,
    required: true
  },
  fechaLimite: {
    type: Date,
    required: true
  },
  estado: {
    type: String,
    enum: ['Pendiente', 'Pagado', 'Vencido', 'Parcial', 'Pagado con excedente'],
    default: 'Pendiente'
  },
  metodoPago: {
    type: String,
    enum: ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro'],
    required: true
  },
  referenciaPago: {
    type: String,
    trim: true
  },
  pagosAdelantados: [{
    mes: Number,
    año: Number,
    monto: Number,
    fechaPago: {
      type: Date,
      default: Date.now
    }
  }],
  abonosAMesesFuturos: [{
    mes: Number,
    año: Number,
    monto: Number,
    fechaAbono: {
      type: Date,
      default: Date.now
    }
  }],
  observaciones: {
    type: String,
    trim: true
  },
  registradoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  }
}, {
  timestamps: true
});

// Índices compuestos para consultas eficientes
pagoSchema.index({ vivienda: 1, mes: 1, año: 1 });
pagoSchema.index({ residente: 1, mes: 1, año: 1 });
pagoSchema.index({ estado: 1 });
pagoSchema.index({ fechaInicioPeriodo: 1 });
pagoSchema.index({ fechaFinPeriodo: 1 });
pagoSchema.index({ fechaLimite: 1 });

// Método virtual para el total
pagoSchema.virtual('total').get(function() {
  return this.monto + this.montoAdicional;
});

// Método para verificar si está vencido
pagoSchema.methods.estaVencido = function() {
  return this.fechaLimite < new Date() && this.estado !== 'Pagado' && this.estado !== 'Pagado con excedente';
};

// Método para verificar si está dentro del plazo
pagoSchema.methods.estaDentroDelPlazo = function() {
  return new Date() <= this.fechaLimite;
};

// Método para calcular días de atraso
pagoSchema.methods.diasAtraso = function() {
  if (this.estado === 'Pagado' || this.estado === 'Pagado con excedente' || this.estaDentroDelPlazo()) {
    return 0;
  }
  const hoy = new Date();
  const diffTime = hoy - this.fechaLimite;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Método para calcular recargo por atraso
pagoSchema.methods.calcularRecargo = function() {
  const diasAtraso = this.diasAtraso();
  if (diasAtraso <= 0) return 0;

  const porcentajeRecargo = 10; // Por defecto 10%
  return (this.monto * porcentajeRecargo / 100) * Math.ceil(diasAtraso / 30);
};

// Método para calcular saldo pendiente
pagoSchema.methods.saldoPendiente = function() {
  return this.monto - this.montoPagado;
};

// Método para verificar si está pagado completamente
pagoSchema.methods.estaCompletamentePagado = function() {
  return this.montoPagado >= this.monto;
};

module.exports = mongoose.model('Pago', pagoSchema); 