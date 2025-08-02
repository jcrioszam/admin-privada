const mongoose = require('mongoose');

const residenteSchema = new mongoose.Schema({
  vivienda: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vivienda',
    required: true
  },
  tipo: {
    type: String,
    enum: ['Dueño', 'Inquilino'],
    required: true
  },
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
    required: true,
    trim: true,
    lowercase: true
  },
  telefono: {
    type: String,
    required: true,
    trim: true
  },
  fechaNacimiento: {
    type: Date
  },
  documentoIdentidad: {
    tipo: {
      type: String,
      enum: ['INE', 'IFE', 'Pasaporte', 'Otro'],
      required: true
    },
    numero: {
      type: String,
      required: true,
      trim: true
    }
  },
  fechaIngreso: {
    type: Date,
    default: Date.now
  },
  fechaSalida: {
    type: Date
  },
  activo: {
    type: Boolean,
    default: true
  },
  vehiculos: [{
    marca: String,
    modelo: String,
    año: Number,
    color: String,
    placas: String
  }],
  familiares: [{
    nombre: String,
    apellidos: String,
    parentesco: String,
    telefono: String
  }],
  observaciones: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Índices
residenteSchema.index({ vivienda: 1 });
residenteSchema.index({ email: 1 });
residenteSchema.index({ activo: 1 });
residenteSchema.index({ tipo: 1 });

module.exports = mongoose.model('Residente', residenteSchema); 