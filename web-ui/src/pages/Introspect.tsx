import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { apiService, type IntrospectionResponse } from '../services/api';
import { useApp } from '../contexts/AppContext';

// IntrospectionResult is now imported from the API service

const protocolExamples = {
  rest: [
    'https://petstore.swagger.io/v2/swagger.json',
    'https://jsonplaceholder.typicode.com',
    'https://httpbin.org/spec.json'
  ],
  graphql: [
    'https://countries.trevorblades.com/',
    'https://graphql-pokemon2.vercel.app/',
    'https://api.spacex.land/graphql'
  ],
  websocket: [
    'wss://echo.websocket.org',
    'wss://socketsbay.com/wss/v2/1/demo/',
    'ws://localhost:8080'
  ]
};

export function Introspect() {
  const navigate = useNavigate();
  const { actions } = useApp();
  const [protocol, setProtocol] = useState<'rest' | 'graphql' | 'websocket'>('rest');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState('');
  const [isIntrospecting, setIsIntrospecting] = useState(false);
  const [result, setResult] = useState<IntrospectionResponse | null>(null);

  const handleIntrospect = async () => {
    setIsIntrospecting(true);
    setResult(null);

    try {
      // Parse headers if provided
      let parsedHeaders: Record<string, string> | undefined;
      if (headers.trim()) {
        try {
          parsedHeaders = JSON.parse(headers);
        } catch (error) {
          setResult({
            success: false,
            error: 'Invalid JSON format in headers. Please check your syntax.'
          });
          setIsIntrospecting(false);
          return;
        }
      }

      // Call the real API
      const response = await apiService.introspectApi({
        protocol,
        url,
        headers: parsedHeaders,
        save: true, // Always save successful introspections
        options: protocol === 'websocket' ? {
          maxDuration: 30000,
          maxMessages: 100
        } : undefined
      });

      setResult(response);

      // If successful, refresh the schemas list
      if (response.success && response.schema) {
        // Force refresh the schemas list to show the new schema
        await actions.refreshData();
        console.log('Schema introspection successful, refreshed data');
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    } finally {
      setIsIntrospecting(false);
    }
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const canIntrospect = url.trim() && isValidUrl(url) && !isIntrospecting;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Introspect API</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Discover and analyze API schemas from REST, GraphQL, and WebSocket endpoints.
        </p>
      </div>

      {/* Introspection Form */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">API Details</h2>

        {/* Protocol Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Protocol
          </label>
          <div className="grid grid-cols-3 gap-4">
            {(['rest', 'graphql', 'websocket'] as const).map((p) => {
              const icons = {
                rest: GlobeAltIcon,
                graphql: DocumentTextIcon,
                websocket: WifiIcon
              };
              const Icon = icons[p];
              
              return (
                <button
                  key={p}
                  onClick={() => setProtocol(p)}
                  className={clsx(
                    'flex items-center justify-center space-x-2 rounded-lg border-2 p-4 transition-colors',
                    protocol === p
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{p.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* URL Input */}
        <div className="mb-6">
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Endpoint URL
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={`Enter ${protocol.toUpperCase()} endpoint URL...`}
            className="input"
          />
          {url && !isValidUrl(url) && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">Please enter a valid URL</p>
          )}
        </div>

        {/* Examples */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Examples for {protocol.toUpperCase()}
          </label>
          <div className="space-y-2">
            {protocolExamples[protocol].map((example, index) => (
              <button
                key={index}
                onClick={() => setUrl(example)}
                className="block w-full text-left text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline"
              >
                {example}
              </button>
            ))}
          </div>
          {protocol === 'rest' && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>💡 Tip:</strong> For REST APIs, use URLs that point directly to OpenAPI/Swagger specifications (usually ending in .json or .yaml).
                Regular API endpoints like api.github.com won't work unless they expose schema discovery endpoints.
              </p>
            </div>
          )}
        </div>

        {/* Headers (for REST/GraphQL) */}
        {(protocol === 'rest' || protocol === 'graphql') && (
          <div className="mb-6">
            <label htmlFor="headers" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Headers (JSON format, optional)
            </label>
            <textarea
              id="headers"
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              placeholder='{"Authorization": "Bearer token", "X-API-Key": "key"}'
              rows={3}
              className="textarea"
            />
          </div>
        )}

        {/* Introspect Button */}
        <button
          onClick={handleIntrospect}
          disabled={!canIntrospect}
          className={clsx(
            'btn w-full flex items-center justify-center space-x-2',
            canIntrospect ? 'btn-primary' : 'btn-secondary'
          )}
        >
          {isIntrospecting ? (
            <>
              <ClockIcon className="h-5 w-5 animate-spin" />
              <span>Introspecting...</span>
            </>
          ) : (
            <>
              <MagnifyingGlassIcon className="h-5 w-5" />
              <span>Introspect API</span>
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Introspection Results</h2>
          
          {result.success ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                <CheckCircleIcon className="h-6 w-6" />
                <span className="font-medium">Introspection successful!</span>
              </div>

              {result.schema && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 dark:text-green-200 mb-2">Schema Summary</h3>
                  {result.metadata?.saved && (
                    <div className="mb-3 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-sm text-green-800 dark:text-green-200">
                      ✅ Schema successfully saved to dashboard!
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-700 dark:text-green-300">Name:</span>
                      <span className="ml-2 text-green-900 dark:text-green-100">{result.schema.name}</span>
                    </div>
                    <div>
                      <span className="text-green-700 dark:text-green-300">Protocol:</span>
                      <span className="ml-2 text-green-900 dark:text-green-100">{protocol.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-green-700 dark:text-green-300">Operations:</span>
                      <span className="ml-2 text-green-900 dark:text-green-100">{result.schema.operations}</span>
                    </div>
                    <div>
                      <span className="text-green-700 dark:text-green-300">Types:</span>
                      <span className="ml-2 text-green-900 dark:text-green-100">{result.schema.types}</span>
                    </div>
                  </div>
                </div>
              )}

              {result.warnings && result.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-200">Warnings</h4>
                      <ul className="mt-2 text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                        {result.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                {result.schema && (
                  <button
                    onClick={() => navigate(`/schema/${result.schema.id}`)}
                    className="btn-primary"
                  >
                    View Schema Details
                  </button>
                )}
                <button
                  onClick={() => navigate('/')}
                  className="btn-outline"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setUrl('');
                    setHeaders('');
                  }}
                  className="btn-outline"
                >
                  Introspect Another API
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <ExclamationTriangleIcon className="h-6 w-6" />
                <span className="font-medium">Introspection failed</span>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">{result.error}</p>
              </div>

              <button
                onClick={() => setResult(null)}
                className="btn-outline"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
