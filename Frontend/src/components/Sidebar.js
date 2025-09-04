import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CreditCardIcon,
  KeyIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ChartPieIcon,
  WrenchScrewdriverIcon,
  HomeModernIcon,
  FolderIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, color: 'text-blue-500' },
  { name: 'Viviendas', href: '/viviendas', icon: BuildingOfficeIcon, color: 'text-indigo-500' },
  { name: 'Residentes', href: '/residentes', icon: UsersIcon, color: 'text-green-500' },
  { name: 'Pagos', href: '/pagos', icon: CreditCardIcon, color: 'text-emerald-500' },
  { name: 'Estado de Cuenta', href: '/estado-cuenta', icon: DocumentChartBarIcon, color: 'text-blue-600' },
  { name: 'Pagos Especiales', href: '/pagos-especiales', icon: CurrencyDollarIcon, color: 'text-yellow-500' },
  { name: 'Proyectos', href: '/proyectos-pagos-especiales', icon: FolderIcon, color: 'text-purple-500' },
  { name: 'Gastos', href: '/gastos', icon: BanknotesIcon, color: 'text-amber-500' },
  { name: 'Corte Diario', href: '/corte-diario', icon: CurrencyDollarIcon, color: 'text-yellow-500' },
  { name: 'Historial', href: '/historial', icon: ClockIcon, color: 'text-purple-500' },
  { name: 'Accesos', href: '/accesos', icon: KeyIcon, color: 'text-orange-500' },
  { name: 'Usuarios', href: '/usuarios', icon: UserGroupIcon, color: 'text-teal-500' },
  { name: 'Configuración', href: '/configuracion', icon: Cog6ToothIcon, color: 'text-gray-500' },
  { name: 'Config. Cuotas', href: '/configuracion-cuotas', icon: CurrencyDollarIcon, color: 'text-green-600' },
];

const reportes = [
  { name: 'Reporte de Proyectos', href: '/reporte-proyectos', icon: DocumentChartBarIcon, color: 'text-indigo-600' },
  { name: 'Reporte de Proyectos Especiales', href: '/reporte-proyectos-especiales', icon: CurrencyDollarIcon, color: 'text-yellow-600' },
  { name: 'Reporte de Morosidad', href: '/reporte-morosidad', icon: ExclamationTriangleIcon, color: 'text-red-500' },
  { name: 'Reporte de Flujo de Caja', href: '/reporte-flujo-caja', icon: ChartBarIcon, color: 'text-blue-600' },
  { name: 'Reporte de Gastos por Categoría', href: '/reporte-gastos-categoria', icon: ChartPieIcon, color: 'text-pink-500' },
  { name: 'Reporte de Ocupación', href: '/reporte-ocupacion', icon: HomeModernIcon, color: 'text-cyan-500' },
  { name: 'Reporte de Mantenimiento', href: '/reporte-mantenimiento', icon: WrenchScrewdriverIcon, color: 'text-orange-600' },
];

const Sidebar = ({ open, setOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = (href) => {
    console.log('Sidebar click:', href);
    navigate(href);
  };

  const renderNavItems = (items) => {
    return items.map((item) => {
      const isActive = location.pathname === item.href;
      return (
        <button
          key={item.name}
          className={`group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200 ${
            isActive
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-soft'
          }`}
          onClick={() => {
            handleNavigation(item.href);
            setOpen(false);
          }}
        >
          <item.icon
            className={`mr-3 flex-shrink-0 h-5 w-5 transition-all duration-200 ${
              isActive 
                ? 'text-white' 
                : `${item.color} group-hover:scale-110 group-hover:drop-shadow-sm`
            }`}
            aria-hidden="true"
          />
          {item.name}
        </button>
      );
    });
  };

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-50 md:hidden ${open ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white/95 backdrop-blur-sm shadow-large">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-all duration-200 hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              <span className="sr-only">Cerrar sidebar</span>
              <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-soft mr-3">
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Admin Privada</h1>
            </div>
            <nav className="mt-6 px-3 space-y-1">
              {renderNavItems(navigation)}
              
              {/* Separador */}
              <div className="pt-6 pb-3">
                <div className="border-t border-gray-200/50"></div>
              </div>
              
              {/* Reportes */}
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Reportes
                </h3>
              </div>
              {renderNavItems(reportes)}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40">
        <div className="flex-1 flex flex-col min-h-0 bg-white/95 backdrop-blur-sm border-r border-gray-200/50 relative shadow-soft">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-soft mr-3">
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Admin Privada</h1>
            </div>
            <nav className="mt-6 flex-1 px-3 space-y-1">
              {renderNavItems(navigation)}
              
              {/* Separador */}
              <div className="pt-6 pb-3">
                <div className="border-t border-gray-200/50"></div>
              </div>
              
              {/* Reportes */}
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Reportes
                </h3>
              </div>
              {renderNavItems(reportes)}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 