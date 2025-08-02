import api from './api';

export const authService = {
  async login(credentials) {
    try {
      const response = await api.post('/usuarios/login', credentials);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
    }
  },

  async getProfile() {
    try {
      const response = await api.get('/usuarios/perfil');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener perfil');
    }
  },

  async changePassword(data) {
    try {
      const response = await api.put('/usuarios/cambiar-password', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al cambiar contraseña');
    }
  },
}; 