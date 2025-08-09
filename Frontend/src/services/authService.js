import api from './api';

export const authService = {
  login: async (credentials) => {
    const { data } = await api.post('/api/usuarios/login', credentials);
    // guardar usuario para redirección según rol
    localStorage.setItem('user', JSON.stringify(data.usuario));
    return data;
  },
  getProfile: async () => {
    const { data } = await api.get('/api/usuarios/perfil');
    // sincronizar local
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },
}; 