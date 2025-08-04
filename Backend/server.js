const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: './config.env' });

// Verificar variables de entorno críticas
console.log('Environment check:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'NOT SET');
console.log('PORT:', process.env.PORT || 'Using default 5000');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');

const app = express();

// Middleware de logging para debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// Middleware CORS más permisivo
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como mobile apps o Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://admin-privada-frontend.onrender.com',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware para manejar preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Función para conectar a MongoDB con reintentos
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB exitosamente');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err.message);
    console.error('Stack trace:', err.stack);
    // En producción, no salir del proceso, solo loggear el error
    if (process.env.NODE_ENV === 'development') {
      process.exit(1);
    }
  }
};

// Conectar a MongoDB
connectDB();

// Rutas
app.use('/api/viviendas', require('./routes/viviendas'));
app.use('/api/residentes', require('./routes/residentes'));
app.use('/api/pagos', require('./routes/pagos'));
app.use('/api/accesos', require('./routes/accesos'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/configuracion', require('./routes/configuracion'));
app.use('/api/gastos', require('./routes/gastos'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de Administración de Fraccionamiento Privado',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ 
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;

// Iniciar servidor con manejo de errores
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 Health check disponible en: http://localhost:${PORT}/health`);
});

// Manejo de errores del servidor
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Puerto ${PORT} ya está en uso`);
  }
});

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    mongoose.connection.close(() => {
      console.log('✅ Conexión a MongoDB cerrada');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    mongoose.connection.close(() => {
      console.log('✅ Conexión a MongoDB cerrada');
      process.exit(0);
    });
  });
}); 