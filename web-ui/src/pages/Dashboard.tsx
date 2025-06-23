import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  WifiIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useApp } from '../contexts/AppContext';

// Schema interface is now imported from context

const protocolIcons: Record<string, any> = {
  rest: GlobeAltIcon,
  graphql: DocumentTextIcon,
  websocket: WifiIcon
};

const protocolColors: Record<string, string> = {
  rest: 'protocol-rest',
  graphql: 'protocol-graphql',
  websocket: 'protocol-websocket'
};

export function Dashboard() {
  const { state, actions } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  // Update search filter when searchTerm changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      actions.setFilters({ search: searchTerm });
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, actions]);

  // Schemas are already filtered by the context based on state.filters
  const filteredSchemas = state.schemas;

  const stats = {
    total: state.schemas.length,
    rest: state.schemas.filter(s => s.protocol === 'rest').length,
    graphql: state.schemas.filter(s => s.protocol === 'graphql').length,
    websocket: state.schemas.filter(s => s.protocol === 'websocket').length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">API Schema Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Discover, explore, and manage API schemas across REST, GraphQL, and WebSocket protocols.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={actions.refreshData}
            disabled={state.loading.schemas}
            className="btn-outline flex items-center space-x-2"
          >
            <ArrowPathIcon className={clsx(
              'h-5 w-5',
              state.loading.schemas && 'animate-spin'
            )} />
            <span>Refresh</span>
          </button>
          <Link
            to="/introspect"
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Introspect API</span>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {state.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{state.error}</p>
              <button
                onClick={actions.clearError}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 mt-2 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-gray-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Schemas</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <GlobeAltIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">REST APIs</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.rest}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-purple-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">GraphQL APIs</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.graphql}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <WifiIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">WebSocket APIs</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.websocket}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search schemas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-80"
          />
        </div>

        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Protocol:</label>
          <select
            value={state.filters.protocol}
            onChange={(e) => actions.setFilters({ protocol: e.target.value })}
            className="select w-40"
          >
            <option value="all">All Protocols</option>
            <option value="rest">REST</option>
            <option value="graphql">GraphQL</option>
            <option value="websocket">WebSocket</option>
          </select>
        </div>
      </div>

      {/* Schema List */}
      <div className="space-y-4">
        {state.loading.schemas ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Loading schemas...</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please wait while we fetch your API schemas.</p>
          </div>
        ) : filteredSchemas.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No schemas found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || state.filters.protocol !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by introspecting your first API.'
              }
            </p>
            {!searchTerm && state.filters.protocol === 'all' && (
              <div className="mt-6">
                <Link to="/introspect" className="btn-primary">
                  <PlusIcon className="mr-2 h-5 w-5" />
                  Introspect API
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {filteredSchemas.map((schema) => {
              const ProtocolIcon = protocolIcons[schema.protocol];
              return (
                <Link
                  key={schema.id}
                  to={`/schema/${schema.id}`}
                  className="card hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={clsx(
                        'flex-shrink-0 rounded-lg p-2 border',
                        protocolColors[schema.protocol]
                      )}>
                        <ProtocolIcon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                          {schema.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {schema.description || 'No description available'}
                        </p>
                        <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                          <span>{schema.operations} operations</span>
                          <span>{schema.types} types</span>
                          <span className="flex items-center">
                            <ClockIcon className="mr-1 h-4 w-4" />
                            {new Date(schema.discoveredAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={clsx(
                        'badge',
                        protocolColors[schema.protocol]
                      )}>
                        {schema.protocol.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
