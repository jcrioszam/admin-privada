const mongoose = require('mongoose');

const proyectoPagoEspecialSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  montoProyecto: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  },
  cantidadPagar: {
    type: Number,
    required: true,
    min: 0
  },
  fechaLimite: {
    type: Date,
    required: true
  },
  estado: {
    type: String,
    enum: ['Activo', 'Inactivo', 'Completado'],
    default: 'Activo'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  registradoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  notas: {
    type: String,
    trim: true
  },
  pagosRealizados: [{
    vivienda: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vivienda',
      required: true
    },
    residente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Residente',
      required: true
    },
    montoPagado: {
      type: Number,
      required: true
    },
    fechaPago: {
      type: Date,
      default: Date.now
    },
    metodoPago: {
      type: String,
      enum: ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro'],
      required: true
    },
    registradoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    },
    notas: {
      type: String,
      trim: true
    }
  }]
}, {
  timestamps: true
});

// Índices para mejorar rendimiento
proyectoPagoEspecialSchema.index({ estado: 1 });
proyectoPagoEspecialSchema.index({ fechaLimite: 1 });
proyectoPagoEspecialSchema.index({ nombre: 1 });

// Método para calcular total recaudado
proyectoPagoEspecialSchema.methods.calcularTotalRecaudado = function() {
  return this.pagosRealizados.reduce((total, pago) => total + pago.montoPagado, 0);
};

// Método para calcular pendiente por vivienda
proyectoPagoEspecialSchema.methods.calcularPendientePorVivienda = function() {
  const viviendasPagadas = this.pagosRealizados.map(pago => pago.vivienda.toString());
  return this.cantidadPagar - this.calcularTotalRecaudado();
};

// Método para verificar si está vencido
proyectoPagoEspecialSchema.methods.estaVencido = function() {
  if (this.estado === 'Completado') return false;
  return new Date() > this.fechaLimite;
};

// Método para obtener estadísticas
proyectoPagoEspecialSchema.methods.obtenerEstadisticas = function() {
  const totalRecaudado = this.calcularTotalRecaudado();
  const pendiente = this.cantidadPagar - totalRecaudado;
  const viviendasPagadas = this.pagosRealizados.length;
  
  // Calcular progreso basado en viviendas que han pagado vs total de viviendas
  // Necesitamos obtener el total de viviendas del sistema
  // Por ahora usamos un cálculo basado en el monto recaudado vs monto esperado por vivienda
  const montoEsperadoPorVivienda = this.cantidadPagar;
  const viviendasEsperadas = this.montoProyecto > 0 ? Math.ceil(this.montoProyecto / montoEsperadoPorVivienda) : 25; // 25 viviendas por defecto
  
  return {
    totalRecaudado,
    pendiente,
    viviendasPagadas,
    viviendasEsperadas,
    porcentajeCompletado: (viviendasPagadas / viviendasEsperadas) * 100,
    montoEsperadoPorVivienda
  };
};

module.exports = mongoose.model('ProyectoPagoEspecial', proyectoPagoEspecialSchema); 