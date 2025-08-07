import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Viviendas from './pages/Viviendas';
import Residentes from './pages/Residentes';
import Pagos from './pages/Pagos';
import Gastos from './pages/Gastos';
import HistorialPagos from './pages/HistorialPagos';
import CorteDiario from './pages/CorteDiario';
import Accesos from './pages/Accesos';
import Usuarios from './pages/Usuarios';
import Configuracion from './pages/Configuracion';
import ReporteMorosidad from './pages/ReporteMorosidad';
import PagosEspeciales from './pages/PagosEspeciales';
import ReporteFlujoCaja from './pages/ReporteFlujoCaja';
import ReporteGastosCategoria from './pages/ReporteGastosCategoria';
import ReporteOcupacion from './pages/ReporteOcupacion';
import ReporteMantenimiento from './pages/ReporteMantenimiento';
import ProyectosPagosEspeciales from './pages/ProyectosPagosEspeciales';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import NotFound from './components/NotFound';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/viviendas" element={<Viviendas />} />
        <Route path="/residentes" element={<Residentes />} />
        <Route path="/pagos" element={<Pagos />} />
        <Route path="/gastos" element={<Gastos />} />
        <Route path="/historial" element={<HistorialPagos />} />
        <Route path="/corte-diario" element={<CorteDiario />} />
        <Route path="/accesos" element={<Accesos />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/configuracion" element={<Configuracion />} />
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

export default App; 