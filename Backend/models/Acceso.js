const mongoose = require('mongoose');

const accesoSchema = new mongoose.Schema({
  residente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Residente',
    required: true
  },
  vivienda: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vivienda',
    required: true
  },
  tipoAcceso: {
    type: String,
    enum: ['Tarjeta RFID', 'Código PIN', 'Huella Digital', 'Reconocimiento Facial', 'Llave Física', 'Control Remoto'],
    required: true
  },
  fechaAsignacion: {
    type: Date,
    default: Date.now
  },
  activo: {
    type: Boolean,
    default: true
  },
  horarioPermitido: {
    inicio: {
      type: String,
      default: '00:00'
    },
    fin: {
      type: String,
      default: '23:59'
    }
  },
  diasPermitidos: {
    type: [String],
    enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    default: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  },
  zonasAcceso: [{
    type: String,
    enum: ['Entrada Principal', 'Salida Principal', 'Estacionamiento', 'Área Común', 'Gimnasio', 'Alberca', 'Jardines'],
    default: ['Entrada Principal', 'Salida Principal', 'Estacionamiento']
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

// Índices
accesoSchema.index({ residente: 1 });
accesoSchema.index({ vivienda: 1 });
accesoSchema.index({ activo: 1 });
accesoSchema.index({ tipoAcceso: 1 });

// Método para verificar si el acceso está activo
accesoSchema.methods.esValido = function() {
  return this.activo;
};

module.exports = mongoose.model('Acceso', accesoSchema); 