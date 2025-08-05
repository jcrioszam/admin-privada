import React, { useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';

const Header = ({ user, onMenuClick }) => {
  const { logout } = useAuth();

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-soft border-b border-gray-200/50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <button
              type="button"
              className="md:hidden px-4 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors duration-200"
              onClick={onMenuClick}
            >
              <span className="sr-only">Abrir sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              type="button"
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
            >
              <span className="sr-only">Ver notificaciones</span>
              <BellIcon className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Profile dropdown */}
            <Menu as="div" className="relative">
              <div>
                <Menu.Button className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 hover:shadow-medium">
                  <span className="sr-only">Abrir menú de usuario</span>
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-soft">
                    <span className="text-sm font-semibold text-white">
                      {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="origin-top-right absolute right-0 mt-3 w-56 rounded-xl shadow-large py-2 bg-white/95 backdrop-blur-sm ring-1 ring-black/5 focus:outline-none z-50">
                  <Menu.Item>
                    {({ active }) => (
                      <div className="px-4 py-3 text-sm text-gray-700 border-b border-gray-100/50">
                        <div className="font-semibold text-gray-900">{user?.nombre} {user?.apellidos}</div>
                        <div className="text-gray-500 text-xs">{user?.email}</div>
                        <div className="text-xs text-primary-600 font-medium mt-1">{user?.rol}</div>
                      </div>
                    )}
                  </Menu.Item>
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      logout();
                    }}
                    className="block px-4 py-3 text-sm text-gray-700 w-full text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 cursor-pointer transition-colors duration-200 font-medium"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        logout();
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar sesión
                    </div>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 