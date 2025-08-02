const mongoose = require('mongoose');

const configuracionSchema = new mongoose.Schema({
  cuotaMantenimientoMensual: {
    type: Number,
    required: true,
    default: 500
  },
  nombreFraccionamiento: {
    type: String,
    required: true,
    default: 'Fraccionamiento Privado'
  },
  direccionFraccionamiento: {
    type: String,
    trim: true
  },
  telefonoContacto: {
    type: String,
    trim: true
  },
  emailContacto: {
    type: String,
    trim: true
  },
  diasGraciaPago: {
    type: Number,
    default: 5
  },
  porcentajeRecargo: {
    type: Number,
    default: 10
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Solo debe haber una configuración activa
configuracionSchema.index({ activo: 1 }, { unique: true });

module.exports = mongoose.model('Configuracion', configuracionSchema); 