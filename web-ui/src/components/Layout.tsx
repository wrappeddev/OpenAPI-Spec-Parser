import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  CogIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useApp } from '../contexts/AppContext';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Introspect', href: '/introspect', icon: MagnifyingGlassIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { state } = useApp();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transition-colors duration-200">
        <div className="flex h-16 items-center justify-center border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <GlobeAltIcon className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">API Explorer</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Universal Schema Discovery</p>
            </div>
          </div>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={clsx(
                      'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    <item.icon
                      className={clsx(
                        'mr-3 h-5 w-5 flex-shrink-0',
                        isActive
                          ? 'text-primary-500 dark:text-primary-400'
                          : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                      )}
                    />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Protocol Status */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-3 transition-colors duration-200">
            <h3 className="text-xs font-medium text-gray-900 dark:text-white mb-2">System Status</h3>

            {state.systemStatus ? (
              <div className="space-y-2">
                {/* Overall Status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">System</span>
                  <div className="flex items-center space-x-1">
                    {state.systemStatus.status === 'healthy' ? (
                      <CheckCircleIcon className="h-3 w-3 text-green-500" />
                    ) : state.systemStatus.status === 'degraded' ? (
                      <ExclamationTriangleIcon className="h-3 w-3 text-yellow-500" />
                    ) : (
                      <XCircleIcon className="h-3 w-3 text-red-500" />
                    )}
                    <span className={clsx(
                      'text-xs font-medium',
                      state.systemStatus.status === 'healthy' ? 'text-green-600' :
                      state.systemStatus.status === 'degraded' ? 'text-yellow-600' :
                      'text-red-600'
                    )}>
                      {state.systemStatus.status}
                    </span>
                  </div>
                </div>

                {/* Protocol Status */}
                <div className="space-y-1">
                  {Object.entries(state.systemStatus.protocols).map(([protocol, active]) => (
                    <div key={protocol} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-300 capitalize">{protocol}</span>
                      <span className={clsx(
                        'text-xs px-1.5 py-0.5 rounded font-medium',
                        active
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      )}>
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Storage Info */}
                <div className="pt-1 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-300">Storage</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {state.systemStatus.storage.schemaCount} schemas
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Loading...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
