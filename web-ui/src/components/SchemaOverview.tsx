import { 
  GlobeAltIcon,
  DocumentTextIcon,
  WifiIcon,
  ClockIcon,
  TagIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChartBarIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface SchemaMetadata {
  extensions?: Record<string, any>;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
  documentation?: string;
}

interface AuthenticationInfo {
  type: string;
  description?: string;
  scheme?: string;
  bearerFormat?: string;
}

interface UniversalSchema {
  id: string;
  name: string;
  version: string;
  protocol: 'rest' | 'graphql' | 'websocket';
  baseUrl?: string;
  description?: string;
  operations: any[];
  types: Record<string, any>;
  authentication?: AuthenticationInfo;
  metadata?: SchemaMetadata;
  discoveredAt: Date | string;
  source: string;
}

interface SchemaOverviewProps {
  schema: UniversalSchema;
  className?: string;
}

const protocolIcons = {
  rest: GlobeAltIcon,
  graphql: DocumentTextIcon,
  websocket: WifiIcon
};

const protocolColors = {
  rest: 'text-green-600 bg-green-50 border-green-200',
  graphql: 'text-purple-600 bg-purple-50 border-purple-200',
  websocket: 'text-blue-600 bg-blue-50 border-blue-200'
};

const authTypeColors = {
  none: 'text-gray-600 bg-gray-50',
  apikey: 'text-blue-600 bg-blue-50',
  bearer: 'text-green-600 bg-green-50',
  oauth2: 'text-purple-600 bg-purple-50',
  basic: 'text-yellow-600 bg-yellow-50',
  custom: 'text-red-600 bg-red-50'
};

export function SchemaOverview({ schema, className }: SchemaOverviewProps) {
  const ProtocolIcon = protocolIcons[schema.protocol];
  
  // Calculate statistics
  const stats = {
    totalOperations: schema.operations.length,
    totalTypes: Object.keys(schema.types).length,
    operationsByType: schema.operations.reduce((acc, op) => {
      const type = op.method || op.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    deprecatedOperations: schema.operations.filter(op => op.deprecated).length,
    hasAuthentication: !!schema.authentication && schema.authentication.type !== 'none'
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;

      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }

      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header Card */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className={clsx(
              'p-3 rounded-lg border',
              protocolColors[schema.protocol]
            )}>
              <ProtocolIcon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{schema.name}</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">{schema.description}</p>
              <div className="flex items-center space-x-6 mt-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center">
                  <TagIcon className="mr-1 h-4 w-4" />
                  Version {schema.version}
                </span>
                <span className="flex items-center">
                  <ClockIcon className="mr-1 h-4 w-4" />
                  {formatDate(schema.discoveredAt)}
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
              'badge border',
              protocolColors[schema.protocol]
            )}>
              {schema.protocol.toUpperCase()}
            </span>
            
            {stats.hasAuthentication && (
              <span className="flex items-center text-green-600 text-sm">
                <ShieldCheckIcon className="h-4 w-4 mr-1" />
                Secured
              </span>
            )}
            
            {stats.deprecatedOperations > 0 && (
              <span className="flex items-center text-yellow-600 text-sm">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                {stats.deprecatedOperations} deprecated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Operations</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalOperations}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CubeIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data Types</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalTypes}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ProtocolIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Protocol</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{schema.protocol.toUpperCase()}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className={clsx(
              'p-2 rounded-lg',
              stats.hasAuthentication ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
            )}>
              <ShieldCheckIcon className={clsx(
                'h-6 w-6',
                stats.hasAuthentication ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
              )} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Security</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {stats.hasAuthentication ? 'Secured' : 'Open'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Operation Breakdown */}
      {Object.keys(stats.operationsByType).length > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Operation Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.operationsByType).map(([type, count]) => (
              <div key={type} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{String(count)}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 uppercase">{type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Authentication Details */}
      {schema.authentication && schema.authentication.type !== 'none' && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <ShieldCheckIcon className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500" />
            Authentication
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Type:</span>
              <span className={clsx(
                'px-2 py-1 text-xs font-medium rounded',
                authTypeColors[schema.authentication.type as keyof typeof authTypeColors] || 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700'
              )}>
                {schema.authentication.type.toUpperCase()}
              </span>
            </div>

            {schema.authentication.scheme && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Scheme:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{schema.authentication.scheme}</span>
              </div>
            )}

            {schema.authentication.bearerFormat && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Bearer Format:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{schema.authentication.bearerFormat}</span>
              </div>
            )}

            {schema.authentication.description && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Description:</span>
                <p className="text-sm text-gray-900 dark:text-white mt-1">{schema.authentication.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      {schema.metadata && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <InformationCircleIcon className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500" />
            Additional Information
          </h3>
          <div className="space-y-4">
            {/* Contact Information */}
            {schema.metadata.contact && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Contact</h4>
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {schema.metadata.contact.name && (
                    <div>Name: {schema.metadata.contact.name}</div>
                  )}
                  {schema.metadata.contact.email && (
                    <div>Email: <a href={`mailto:${schema.metadata.contact.email}`} className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">{schema.metadata.contact.email}</a></div>
                  )}
                  {schema.metadata.contact.url && (
                    <div>URL: <a href={schema.metadata.contact.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">{schema.metadata.contact.url}</a></div>
                  )}
                </div>
              </div>
            )}

            {/* License */}
            {schema.metadata.license && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">License</h4>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {schema.metadata.license.url ? (
                    <a href={schema.metadata.license.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                      {schema.metadata.license.name}
                    </a>
                  ) : (
                    schema.metadata.license.name
                  )}
                </div>
              </div>
            )}

            {/* Documentation */}
            {schema.metadata.documentation && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Documentation</h4>
                <a href={schema.metadata.documentation} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                  {schema.metadata.documentation}
                </a>
              </div>
            )}

            {/* Source */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Source</h4>
              <code className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 rounded">{schema.source}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
