import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginResidente = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();



  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // construir credenciales con email o telefono
      const payload = usePhone ? { telefono: data.telefono, password: data.password } : { email: data.email, password: data.password };
      console.log('🔐 Enviando credenciales:', payload);
      
      const ok = await login(payload);
      if (!ok) {
        console.log('❌ Login falló');
        return;
      }
      
      console.log('✅ Login exitoso, verificando rol...');
      
      // Esperar un momento para que se actualice el contexto
      setTimeout(() => {
        const currentUser = user || JSON.parse(localStorage.getItem('user') || 'null');
        console.log('👤 Usuario actual:', currentUser);
        
        if (currentUser && currentUser.rol === 'Residente') {
          console.log('🏠 Redirigiendo a dashboard de residente');
          localStorage.setItem('isResidente', 'true');
          navigate('/residente/dashboard', { replace: true });
        } else if (currentUser && currentUser.rol !== 'Residente') {
          console.log('👨‍💼 Redirigiendo a dashboard de administrador');
          navigate('/dashboard', { replace: true });
        } else {
          console.log('❓ Usuario no encontrado o sin rol');
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Error de login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Portal de Residentes
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inicia sesión con tu email/teléfono y contraseña
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Usar teléfono para iniciar sesión</span>
            <input type="checkbox" checked={usePhone} onChange={(e) => setUsePhone(e.target.checked)} />
          </div>

          <div className="rounded-md shadow-sm -space-y-px">
            {!usePhone ? (
              <div>
                <label htmlFor="email" className="sr-only">Correo electrónico</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="Correo electrónico"
                  {...register('email', {
                    required: 'El correo electrónico es requerido',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Correo electrónico inválido',
                    },
                  })}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="telefono" className="sr-only">Teléfono</label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  autoComplete="tel"
                  required
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    errors.telefono ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="Teléfono"
                  {...register('telefono', {
                    required: 'El teléfono es requerido',
                    minLength: { value: 7, message: 'Teléfono inválido' }
                  })}
                />
                {errors.telefono && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefono.message}</p>
                )}
              </div>
            )}
            
            <div className="relative">
              <label htmlFor="password" className="sr-only">Contraseña</label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Contraseña"
                {...register('password', {
                  required: 'La contraseña es requerida',
                  minLength: { value: 4, message: 'Mínimo 4 caracteres' },
                })}
              />
              <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>



            
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Iniciar sesión'}
            </button>
          </div>
        </form>
        
        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            ¿Eres administrador? Inicia sesión aquí
          </button>
          <p className="text-xs text-gray-500 mt-2">© 2024 Admin Privada. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginResidente;
