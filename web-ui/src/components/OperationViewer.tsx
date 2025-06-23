import { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface Parameter {
  name: string;
  location: 'query' | 'path' | 'header' | 'body' | 'cookie';
  schema: SchemaField;
  required: boolean;
  description?: string;
  example?: any;
}

interface Response {
  statusCode: string;
  description: string;
  schema?: SchemaField;
  headers?: Record<string, SchemaField>;
}

interface SchemaField {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  properties?: Record<string, SchemaField>;
  items?: SchemaField;
  enum?: string[];
  example?: any;
  format?: string;
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
  security?: any[];
}

interface OperationViewerProps {
  operation: Operation;
  className?: string;
}

const methodColors = {
  GET: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
  POST: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  PUT: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
  DELETE: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
  PATCH: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700',
  OPTIONS: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600',
  HEAD: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600'
};

const typeColors = {
  string: 'text-green-600 dark:text-green-400',
  number: 'text-blue-600 dark:text-blue-400',
  integer: 'text-blue-600 dark:text-blue-400',
  boolean: 'text-purple-600 dark:text-purple-400',
  array: 'text-orange-600 dark:text-orange-400',
  object: 'text-red-600 dark:text-red-400',
  null: 'text-gray-600 dark:text-gray-400'
};

export function OperationViewer({ operation, className }: OperationViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleField = (fieldPath: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(fieldPath)) {
      newExpanded.delete(fieldPath);
    } else {
      newExpanded.add(fieldPath);
    }
    setExpandedFields(newExpanded);
  };

  const renderSchemaField = (field: SchemaField, depth = 0, fieldPath = ''): React.ReactElement => {
    const currentPath = fieldPath ? `${fieldPath}.${field.name}` : field.name;
    const isExpanded = expandedFields.has(currentPath) || (depth < 2 && !expandedFields.has(currentPath));
    
    return (
      <div className={clsx('border-l-2 border-gray-200 dark:border-gray-700 pl-4', depth > 0 && 'ml-4')}>
        <div className="flex items-center space-x-2 py-1">
          {field.properties && Object.keys(field.properties).length > 0 && (
            <button
              onClick={() => toggleField(currentPath)}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
          )}

          <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
            {field.name}
          </span>

          <span className={clsx(
            'text-xs font-medium px-2 py-1 rounded',
            typeColors[field.type as keyof typeof typeColors] || 'text-gray-600 dark:text-gray-400'
          )}>
            {field.type}
            {field.format && `(${field.format})`}
          </span>

          {field.required && (
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">required</span>
          )}

          {field.enum && (
            <span className="text-xs text-purple-600 dark:text-purple-400">enum</span>
          )}
        </div>

        {field.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 ml-6">{field.description}</p>
        )}

        {field.example && (
          <div className="mt-1 ml-6">
            <code className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 rounded">
              {JSON.stringify(field.example)}
            </code>
          </div>
        )}

        {field.enum && (
          <div className="mt-1 ml-6">
            <div className="flex flex-wrap gap-1">
              {field.enum.map((value, index) => (
                <span key={index} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                  {value}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {isExpanded && field.properties && (
          <div className="mt-2">
            {Object.entries(field.properties).map(([key, subField]) => (
              <div key={key}>
                {renderSchemaField({ ...subField, name: key }, depth + 1, currentPath)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderParameters = () => {
    if (operation.parameters.length === 0) {
      return (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">No parameters</div>
      );
    }

    const paramsByLocation = operation.parameters.reduce((acc, param) => {
      if (!acc[param.location]) acc[param.location] = [];
      acc[param.location].push(param);
      return acc;
    }, {} as Record<string, Parameter[]>);

    return (
      <div className="space-y-4">
        {Object.entries(paramsByLocation).map(([location, params]) => (
          <div key={location}>
            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2 capitalize">
              {location} Parameters
            </h5>
            <div className="space-y-3">
              {params.map((param) => (
                <div key={param.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">{param.name}</span>
                      {param.required && (
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">required</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{param.location}</span>
                  </div>

                  {param.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{param.description}</p>
                  )}

                  {renderSchemaField(param.schema, 0, `param_${param.name}`)}

                  {param.example && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Example:</span>
                      <code className="block text-xs bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded mt-1">
                        {JSON.stringify(param.example, null, 2)}
                      </code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderResponses = () => {
    if (operation.responses.length === 0) {
      return (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">No responses defined</div>
      );
    }

    return (
      <div className="space-y-4">
        {operation.responses.map((response) => (
          <div key={response.statusCode} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className={clsx(
                'px-2 py-1 text-xs font-medium rounded',
                response.statusCode.startsWith('2') ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                response.statusCode.startsWith('4') ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                response.statusCode.startsWith('5') ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
              )}>
                {response.statusCode}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{response.description}</span>
            </div>

            {response.schema && (
              <div className="mt-3">
                <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Response Body</h6>
                {renderSchemaField(response.schema, 0, `response_${response.statusCode}`)}
              </div>
            )}

            {response.headers && Object.keys(response.headers).length > 0 && (
              <div className="mt-3">
                <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Headers</h6>
                <div className="space-y-2">
                  {Object.entries(response.headers).map(([headerName, headerSchema]) => (
                    <div key={headerName} className="flex items-center space-x-2">
                      <span className="font-mono text-sm text-gray-900 dark:text-white">{headerName}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{headerSchema.type}</span>
                      {headerSchema.description && (
                        <span className="text-xs text-gray-600 dark:text-gray-300">- {headerSchema.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={clsx('bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {operation.method && (
              <span className={clsx(
                'px-3 py-1 text-sm font-medium rounded border',
                methodColors[operation.method as keyof typeof methodColors] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600'
              )}>
                {operation.method}
              </span>
            )}

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{operation.name}</h3>
              {operation.path && (
                <code className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mt-1 inline-block">
                  {operation.path}
                </code>
              )}
              {operation.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{operation.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {operation.deprecated && (
              <span className="flex items-center text-yellow-600 dark:text-yellow-400 text-sm">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                Deprecated
              </span>
            )}

            {operation.tags && operation.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {operation.tags.map((tag) => (
                  <span key={tag} className="badge-secondary">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {/* Parameters Section */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('parameters')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="text-md font-medium text-gray-900 dark:text-white flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500" />
              Parameters ({operation.parameters.length})
            </h4>
            {expandedSections.has('parameters') ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            )}
          </button>

          {expandedSections.has('parameters') && (
            <div className="mt-4">
              {renderParameters()}
            </div>
          )}
        </div>

        {/* Responses Section */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('responses')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="text-md font-medium text-gray-900 dark:text-white flex items-center">
              <InformationCircleIcon className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500" />
              Responses ({operation.responses.length})
            </h4>
            {expandedSections.has('responses') ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            )}
          </button>

          {expandedSections.has('responses') && (
            <div className="mt-4">
              {renderResponses()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
