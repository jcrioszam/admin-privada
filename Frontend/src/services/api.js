import axios from 'axios';

// Configurar la URL base según el entorno
const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://admin-privada-backend.onrender.com');
console.log('🔧 API_BASE_URL configurado como:', API_BASE_URL);
console.log('🔧 process.env.REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token de autenticación
api.interceptors.request.use(
  (config) => {
    console.log('🌐 Haciendo petición a:', config.url);
    console.log('🌐 URL completa:', config.baseURL + config.url);
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Error en interceptor de request:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => {
    console.log('✅ Respuesta exitosa:', response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Error en petición:', error.config?.url);
    console.error('❌ Detalles del error:', error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 