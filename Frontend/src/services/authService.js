import api from './api';

export const authService = {
  login: async (credentials) => {
    try {
      console.log('🔐 Intentando login con credenciales:', credentials);
      const { data } = await api.post('/api/usuarios/login', credentials);
      console.log('✅ Login exitoso:', data);
      // guardar usuario para redirección según rol
      localStorage.setItem('user', JSON.stringify(data.usuario));
      return data;
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  },
  getProfile: async () => {
    try {
      console.log('🔍 Obteniendo perfil del usuario...');
      const { data } = await api.get('/api/usuarios/perfil');
      console.log('✅ Perfil obtenido:', data);
      // sincronizar local
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo perfil:', error);
      throw error;
    }
  },
}; 