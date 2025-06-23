import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  WifiIcon,
  ClockIcon,
  TagIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { SchemaOverview, OperationViewer, SchemaTypeViewer, WebSocketViewer, ErrorBoundary } from '../components';
import { apiService } from '../services/api';

// Use the same types as our visualization components
interface Parameter {
  name: string;
  location: 'query' | 'path' | 'header' | 'body' | 'cookie';
  schema: any;
  required: boolean;
  description?: string;
  example?: any;
}

interface Response {
  statusCode: string;
  description: string;
  schema?: any;
  headers?: Record<string, any>;
}

interface Operation {
  id: string;
  name: string;
  method?: string;
  path?: string;
  type: string;
  description?: string;
  parameters: Parameter[];
  responses: Response[];
  deprecated?: boolean;
  tags?: string[];
}

interface UniversalSchema {
  id: string;
  name: string;
  protocol: 'rest' | 'graphql' | 'websocket';
  version: string;
  baseUrl?: string;
  description?: string;
  operations: Operation[];
  types: Record<string, any>;
  discoveredAt: Date | string;
  source: string;
  authentication?: {
    type: string;
    description?: string;
  };
  metadata?: any;
}

// Mock schema data removed - now using real API data

const protocolIcons = {
  rest: GlobeAltIcon,
  graphql: DocumentTextIcon,
  websocket: WifiIcon
};

const protocolColors = {
  rest: 'protocol-rest',
  graphql: 'protocol-graphql',
  websocket: 'protocol-websocket'
};



export function SchemaDetail() {
  const { id } = useParams<{ id: string }>();
  const [schema, setSchema] = useState<UniversalSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'types' | 'websocket'>('overview');

  const exportSchema = (schema: UniversalSchema) => {
    const exportData = {
      ...schema,
      exportedAt: new Date().toISOString(),
      exportedBy: 'Universal API Schema Explorer'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${schema.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_schema.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const fetchSchema = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        console.log('Fetching schema details for ID:', id);
        const response = await apiService.getSchema(id);

        if (response && response.schema) {
          console.log('Schema loaded:', response.schema.name);
          setSchema(response.schema);
        } else {
          setError('Schema not found');
        }
      } catch (err) {
        console.error('Failed to fetch schema:', err);
        setError('Failed to load schema details');
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400 mx-auto"></div>
          <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Loading schema...</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please wait while we fetch the schema details.</p>
        </div>
      </div>
    );
  }

  if (error || !schema) {
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="btn-outline flex items-center space-x-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Error Message */}
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {error || 'Schema not found'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              The requested schema could not be loaded. It may have been deleted or the ID is invalid.
            </p>
            <div className="mt-6">
              <Link to="/" className="btn-primary">
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ProtocolIcon = protocolIcons[schema.protocol];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/"
          className="btn-outline flex items-center space-x-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Schema Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className={clsx(
              'flex-shrink-0 rounded-lg p-3 border',
              protocolColors[schema.protocol]
            )}>
              <ProtocolIcon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{schema.name}</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">{schema.description}</p>
              <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center">
                  <TagIcon className="mr-1 h-4 w-4" />
                  Version {schema.version}
                </span>
                <span className="flex items-center">
                  <ClockIcon className="mr-1 h-4 w-4" />
                  {new Date(schema.discoveredAt).toLocaleDateString()}
                </span>
                {schema.baseUrl && (
                  <span className="flex items-center">
                    <GlobeAltIcon className="mr-1 h-4 w-4" />
                    {schema.baseUrl}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={clsx(
              'badge',
              protocolColors[schema.protocol]
            )}>
              {schema.protocol.toUpperCase()}
            </span>
            <button
              onClick={() => exportSchema(schema)}
              className="btn-outline"
            >
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'operations', name: `Operations (${schema.operations.length})` },
            { id: 'types', name: `Types (${Object.keys(schema.types).length})` },
            ...(schema.protocol === 'websocket' ? [{ id: 'websocket', name: 'Live Connection' }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <ErrorBoundary>
          <SchemaOverview schema={schema} />
        </ErrorBoundary>
      )}

      {activeTab === 'operations' && (
        <ErrorBoundary>
          <div className="space-y-6">
            {schema.operations.map((operation) => (
              <OperationViewer
                key={operation.id}
                operation={operation}
              />
            ))}
            {schema.operations.length === 0 && (
              <div className="text-center py-12">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No operations found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This schema doesn't define any operations.</p>
              </div>
            )}
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'types' && (
        <ErrorBoundary>
          <div className="space-y-6">
            {Object.entries(schema.types).map(([typeName, typeSchema]) => (
              <SchemaTypeViewer
                key={typeName}
                schema={typeSchema}
              />
            ))}
            {Object.keys(schema.types).length === 0 && (
              <div className="text-center py-12">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No types found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This schema doesn't define any custom types.</p>
              </div>
            )}
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'websocket' && schema.protocol === 'websocket' && (
        <ErrorBoundary>
          <WebSocketViewer
            url={schema.baseUrl || schema.source}
            className="h-96"
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
