import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import LoginResidente from './pages/LoginResidente';
import Dashboard from './pages/Dashboard';
import DashboardResidente from './pages/DashboardResidente';
import Viviendas from './pages/Viviendas';
import Residentes from './pages/Residentes';
import ResidentesTest from './pages/ResidentesTest';
import ResidentesCopia from './pages/ResidentesCopia';
import Pagos from './pages/Pagos';
import Gastos from './pages/Gastos';
import HistorialPagos from './pages/HistorialPagos';
import CorteDiario from './pages/CorteDiario';
import Accesos from './pages/Accesos';
import Usuarios from './pages/Usuarios';
import Configuracion from './pages/Configuracion';
import ConfiguracionCuotas from './pages/ConfiguracionCuotas';
import EstadoCuenta from './pages/EstadoCuenta';
import EstadoCuentaResidente from './pages/EstadoCuentaResidente';
import ProyectosEspecialesResidente from './pages/ProyectosEspecialesResidente';
import ComprobantesResidente from './pages/ComprobantesResidente';
import ReporteMorosidad from './pages/ReporteMorosidad';
import PagosEspeciales from './pages/PagosEspeciales';
import ReporteFlujoCaja from './pages/ReporteFlujoCaja';
import ReporteGastosCategoria from './pages/ReporteGastosCategoria';
import ReporteOcupacion from './pages/ReporteOcupacion';
import ReporteMantenimiento from './pages/ReporteMantenimiento';
import ReporteProyectos from './pages/ReporteProyectos';
import ReporteProyectosEspeciales from './pages/ReporteProyectosEspeciales';
import ProyectosPagosEspeciales from './pages/ProyectosPagosEspeciales';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import NotFound from './components/NotFound';

function App() {
  const { user, loading } = useAuth();
  const isResidente = localStorage.getItem('isResidente') === 'true';
  const location = useLocation();

  console.log('🚀 App.js se está ejecutando:');
  console.log('- user:', user);
  console.log('- user.rol:', user?.rol);
  console.log('- isResidente:', isResidente);
  console.log('- location.pathname:', location.pathname);
  console.log('- loading:', loading);

  // Si el usuario es residente, redirigir al dashboard de residente
  if (user && user.rol === 'Residente' && !location.pathname.startsWith('/residente')) {
    return <Navigate to="/residente/dashboard" replace />;
  }

  // Rutas de residentes (solo para usuarios residentes o cuando se accede a /residente)
  if (location.pathname.startsWith('/residente')) {
    return (
      <Routes>
        <Route path="/residente/login" element={<LoginResidente />} />
        <Route
          path="/residente/dashboard"
          element={(isResidente || (user && user.rol === 'Residente')) ? <DashboardResidente /> : <Navigate to="/residente/login" replace />}
        />
        <Route
          path="/residente/estado-cuenta"
          element={(isResidente || (user && user.rol === 'Residente')) ? <EstadoCuentaResidente /> : <Navigate to="/residente/login" replace />}
        />
        <Route
          path="/residente/proyectos-especiales"
          element={(isResidente || (user && user.rol === 'Residente')) ? <ProyectosEspecialesResidente /> : <Navigate to="/residente/login" replace />}
        />
        <Route
          path="/residente/comprobantes"
          element={(isResidente || (user && user.rol === 'Residente')) ? <ComprobantesResidente /> : <Navigate to="/residente/login" replace />}
        />
        <Route
          path="/residente/*"
          element={<Navigate to={(isResidente || (user && user.rol === 'Residente')) ? '/residente/dashboard' : '/residente/login'} replace />}
        />
      </Routes>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Si no hay usuario, mostrar login de administrador
  if (!user) {
    return <Login />;
  }

  // Si hay usuario y NO es residente, mostrar el portal de administración
  console.log('🔍 Verificando usuario para portal de administración:');
  console.log('- user:', user);
  console.log('- user.rol:', user?.rol);
  console.log('- location.pathname:', location.pathname);
  
  if (user && user.rol !== 'Residente') {
    console.log('✅ Usuario es administrador, mostrando portal de administración');
    return (
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/viviendas" element={<Viviendas />} />
          <Route path="/gestion-residentes" element={<Residentes />} />
          <Route path="/test-residentes" element={<Viviendas />} />
          <Route path="/pagos" element={<Pagos />} />
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/historial" element={<HistorialPagos />} />
          <Route path="/corte-diario" element={<CorteDiario />} />
          <Route path="/accesos" element={<Accesos />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/configuracion-cuotas" element={<ConfiguracionCuotas />} />
          <Route path="/estado-cuenta" element={<EstadoCuenta />} />
          <Route path="/reporte-proyectos" element={<ReporteProyectos />} />
          <Route path="/reporte-proyectos-especiales" element={<ReporteProyectosEspeciales />} />
          <Route path="/reporte-morosidad" element={<ReporteMorosidad />} />
          <Route path="/pagos-especiales" element={<PagosEspeciales />} />
          <Route path="/proyectos-pagos-especiales" element={<ProyectosPagosEspeciales />} />
          <Route path="/reporte-flujo-caja" element={<ReporteFlujoCaja />} />
          <Route path="/reporte-gastos-categoria" element={<ReporteGastosCategoria />} />
          <Route path="/reporte-ocupacion" element={<ReporteOcupacion />} />
          <Route path="/reporte-mantenimiento" element={<ReporteMantenimiento />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    );
  }

  // Si hay usuario residente pero no está en rutas de residente, redirigir
  if (user && user.rol === 'Residente') {
    console.log('🔄 Usuario es residente, redirigiendo a dashboard de residente');
    return <Navigate to="/residente/dashboard" replace />;
  }

  console.log('❌ No se cumplió ninguna condición, mostrando login');
  // Si no hay usuario, mostrar login de administrador
  return <Login />;
}

export default App; 