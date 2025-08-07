import { useState, useEffect, createContext, useContext } from 'react';
import { authService } from '../services/authService';
// import toast from 'react-hot-toast';
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
    if (token) {
      authService.getProfile()
        .then(userData => {
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem('token');
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