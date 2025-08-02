const mongoose = require('mongoose');

const viviendaSchema = new mongoose.Schema({
  numero: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  tipo: {
    type: String,
    enum: ['Casa', 'Departamento', 'Townhouse'],
    required: true
  },
  estado: {
    type: String,
    enum: ['Ocupada', 'Desocupada', 'En construcción', 'En venta'],
    default: 'Desocupada'
  },
  tipoOcupacion: {
    type: String,
    enum: ['Dueño', 'Inquilino', 'Vacante'],
    default: 'Vacante'
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  },
  observaciones: {
    type: String,
    trim: true
  },
  residente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Residente',
    default: null
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
viviendaSchema.index({ numero: 1 });
viviendaSchema.index({ estado: 1 });
viviendaSchema.index({ tipoOcupacion: 1 });

module.exports = mongoose.model('Vivienda', viviendaSchema); 