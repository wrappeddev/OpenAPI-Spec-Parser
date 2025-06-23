import { useState } from 'react';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  CubeIcon,
  ListBulletIcon,
  HashtagIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

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
  nullable?: boolean;
  deprecated?: boolean;
}

interface SchemaTypeViewerProps {
  schema: SchemaField;
  className?: string;
  maxDepth?: number;
}

const typeIcons = {
  object: CubeIcon,
  array: ListBulletIcon,
  string: DocumentTextIcon,
  number: HashtagIcon,
  integer: HashtagIcon,
  boolean: DocumentTextIcon,
  null: DocumentTextIcon
};

const typeColors = {
  object: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
  array: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700',
  string: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
  number: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
  integer: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
  boolean: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700',
  null: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
};

export function SchemaTypeViewer({ schema, className, maxDepth = 5 }: SchemaTypeViewerProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']));

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const renderField = (field: SchemaField, path: string, depth: number): React.ReactElement => {
    const isExpanded = expandedPaths.has(path);
    const hasChildren = field.properties && Object.keys(field.properties).length > 0;
    const canExpand = hasChildren && depth < maxDepth;
    const TypeIcon = typeIcons[field.type as keyof typeof typeIcons] || DocumentTextIcon;

    return (
      <div className={clsx('border-l-2 border-gray-100 dark:border-gray-700', depth > 0 && 'ml-4 pl-4')}>
        <div className="flex items-start space-x-3 py-2">
          {/* Expand/Collapse Button */}
          <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
            {canExpand ? (
              <button
                onClick={() => toggleExpanded(path)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-4 h-4" />
            )}
          </div>

          {/* Type Icon */}
          <div className={clsx(
            'flex-shrink-0 p-1 rounded border',
            typeColors[field.type as keyof typeof typeColors] || 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
          )}>
            <TypeIcon className="h-4 w-4" />
          </div>

          {/* Field Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                {field.name}
              </span>

              <span className={clsx(
                'inline-flex items-center px-2 py-1 text-xs font-medium rounded border',
                typeColors[field.type as keyof typeof typeColors] || 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
              )}>
                {field.type}
                {field.format && `(${field.format})`}
                {field.items && field.type === 'array' && `<${field.items.type}>`}
              </span>

              {field.required && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-700">
                  required
                </span>
              )}

              {field.nullable && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  nullable
                </span>
              )}

              {field.deprecated && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-700">
                  deprecated
                </span>
              )}

              {field.enum && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded border border-purple-200 dark:border-purple-700">
                  enum
                </span>
              )}
            </div>

            {/* Description */}
            {field.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{field.description}</p>
            )}

            {/* Enum Values */}
            {field.enum && (
              <div className="mt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Possible values:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {field.enum.map((value, index) => (
                    <code key={index} className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-2 py-1 rounded border border-purple-200 dark:border-purple-700">
                      {JSON.stringify(value)}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Example */}
            {field.example !== undefined && (
              <div className="mt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Example:</span>
                <code className="block text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(field.example, null, 2)}
                </code>
              </div>
            )}

            {/* Array Items */}
            {field.type === 'array' && field.items && (
              <div className="mt-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Array items:</span>
                <div className="mt-1">
                  {renderField(
                    { ...field.items, name: 'item' },
                    `${path}.items`,
                    depth + 1
                  )}
                </div>
              </div>
            )}

            {/* Object Properties */}
            {isExpanded && hasChildren && (
              <div className="mt-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Properties:</span>
                <div className="mt-2 space-y-1">
                  {Object.entries(field.properties!).map(([propName, propField]) => (
                    <div key={propName}>
                      {renderField(
                        { ...propField, name: propName },
                        `${path}.${propName}`,
                        depth + 1
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsed Properties Count */}
            {!isExpanded && hasChildren && (
              <div className="mt-2">
                <button
                  onClick={() => toggleExpanded(path)}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                >
                  Show {Object.keys(field.properties!).length} properties...
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getSchemaStats = (field: SchemaField): { properties: number; depth: number } => {
    let properties = 0;
    let maxDepth = 0;

    const traverse = (f: SchemaField, currentDepth: number) => {
      if (f.properties) {
        properties += Object.keys(f.properties).length;
        Object.values(f.properties).forEach(prop => {
          traverse(prop, currentDepth + 1);
        });
        maxDepth = Math.max(maxDepth, currentDepth + 1);
      }
      if (f.items) {
        traverse(f.items, currentDepth + 1);
        maxDepth = Math.max(maxDepth, currentDepth + 1);
      }
    };

    traverse(field, 0);
    return { properties, depth: maxDepth };
  };

  const stats = getSchemaStats(schema);

  return (
    <div className={clsx('bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={clsx(
              'p-2 rounded border',
              typeColors[schema.type as keyof typeof typeColors] || 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
            )}>
              {(() => {
                const TypeIcon = typeIcons[schema.type as keyof typeof typeIcons] || DocumentTextIcon;
                return <TypeIcon className="h-6 w-6" />;
              })()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{schema.name}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                <span>Type: {schema.type}</span>
                {stats.properties > 0 && <span>{stats.properties} properties</span>}
                {stats.depth > 0 && <span>Depth: {stats.depth}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setExpandedPaths(new Set(['root']))}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Collapse All
            </button>
            <button
              onClick={() => {
                const allPaths = new Set<string>();
                const addPaths = (field: SchemaField, path: string, depth: number) => {
                  if (depth < maxDepth) {
                    allPaths.add(path);
                    if (field.properties) {
                      Object.keys(field.properties).forEach(key => {
                        addPaths(field.properties![key], `${path}.${key}`, depth + 1);
                      });
                    }
                    if (field.items) {
                      addPaths(field.items, `${path}.items`, depth + 1);
                    }
                  }
                };
                addPaths(schema, 'root', 0);
                setExpandedPaths(allPaths);
              }}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
            >
              Expand All
            </button>
          </div>
        </div>

        {schema.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{schema.description}</p>
        )}
      </div>

      {/* Schema Tree */}
      <div className="p-4">
        {renderField(schema, 'root', 0)}
      </div>
    </div>
  );
}
