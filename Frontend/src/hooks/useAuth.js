import { useState, useEffect, createContext, useContext } from 'react';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      // Si tenemos token y usuario almacenado, usar el usuario almacenado
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setLoading(false);
        console.log('✅ Usuario cargado desde localStorage:', userData);
      } catch (error) {
        console.error('❌ Error parseando usuario desde localStorage:', error);
        localStorage.removeItem('user');
        setLoading(false);
      }
    } else if (token && !storedUser) {
      // Si tenemos token pero no usuario, obtener perfil
      authService.getProfile()
        .then(userData => {
          setUser(userData);
        })
        .catch((error) => {
          console.error('❌ Error obteniendo perfil:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    try {
      const { token, usuario } = await authService.login(credentials);
      localStorage.setItem('token', token);
      setUser(usuario);
      console.log('✅', 'Inicio de sesión exitoso');
      return true;
    } catch (error) {
      console.error('❌', error.message || 'Error al iniciar sesión');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    console.log('✅', 'Sesión cerrada');
    navigate('/');
  };

  const value = {
    user,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 