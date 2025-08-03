const mongoose = require('mongoose');

const gastoSchema = new mongoose.Schema({
  categoria: {
    type: String,
    required: true,
    enum: [
      'Mantenimiento',
      'Limpieza',
      'Seguridad',
      'Jardinería',
      'Electricidad',
      'Agua',
      'Internet',
      'Otros'
    ]
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  fecha: {
    type: Date,
    required: true,
    default: Date.now
  },
  responsable: {
    type: String,
    required: true,
    trim: true
  },
  comprobante: {
    type: String, // URL del archivo o referencia
    trim: true
  },
  estado: {
    type: String,
    enum: ['Pendiente', 'Aprobado', 'Rechazado'],
    default: 'Pendiente'
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
}, {
  timestamps: true
});

// Índices
gastoSchema.index({ categoria: 1 });
gastoSchema.index({ fecha: -1 });
gastoSchema.index({ estado: 1 });
gastoSchema.index({ registradoPor: 1 });

// Método para obtener el total de gastos por período
gastoSchema.statics.obtenerTotalPorPeriodo = async function(fechaInicio, fechaFin) {
  return await this.aggregate([
    {
      $match: {
        fecha: { $gte: fechaInicio, $lte: fechaFin },
        estado: 'Aprobado'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$monto' }
      }
    }
  ]);
};

// Método para obtener gastos por categoría
gastoSchema.statics.obtenerPorCategoria = async function(fechaInicio, fechaFin) {
  return await this.aggregate([
    {
      $match: {
        fecha: { $gte: fechaInicio, $lte: fechaFin },
        estado: 'Aprobado'
      }
    },
    {
      $group: {
        _id: '$categoria',
        total: { $sum: '$monto' },
        cantidad: { $sum: 1 }
      }
    },
    {
      $sort: { total: -1 }
    }
  ]);
};

module.exports = mongoose.model('Gasto', gastoSchema); 