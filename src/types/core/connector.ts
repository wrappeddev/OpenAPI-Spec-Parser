/**
 * Connector interface definitions for the Universal API Schema Explorer
 * 
 * This module defines the interfaces that all API connectors must implement
 * to provide a consistent way of introspecting different API protocols.
 * 
 * Design Decisions:
 * 1. Async by default: All operations return promises for non-blocking execution
 * 2. Configuration-driven: Connectors accept configuration objects for flexibility
 * 3. Error handling: Standardized error types for consistent error reporting
 * 4. Extensible: Base interfaces can be extended for protocol-specific features
 */

import { UniversalSchema, APIProtocol } from './schema';

/**
 * Base configuration for all connectors
 */
export interface ConnectorConfig {
  /** Target URL or endpoint */
  url: string;
  /** Authentication headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to follow redirects */
  followRedirects?: boolean;
  /** Custom user agent */
  userAgent?: string;
  /** Additional connector-specific options */
  options?: Record<string, unknown>;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  /** Whether connection was successful */
  success: boolean;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Error message if connection failed */
  error?: string;
  /** Additional metadata about the connection */
  metadata?: Record<string, unknown>;
}

/**
 * Schema introspection result
 */
export interface IntrospectionResult {
  /** Whether introspection was successful */
  success: boolean;
  /** Discovered schema (if successful) */
  schema?: UniversalSchema;
  /** Error message if introspection failed */
  error?: string;
  /** Warnings encountered during introspection */
  warnings?: string[];
  /** Additional metadata about the introspection process */
  metadata?: Record<string, unknown>;
}

/**
 * Base interface that all API connectors must implement
 */
export interface APIConnector {
  /** The protocol this connector supports */
  readonly protocol: APIProtocol;
  
  /** Human-readable name of the connector */
  readonly name: string;
  
  /** Version of the connector */
  readonly version: string;

  /**
   * Test connection to the API endpoint
   * @param config Connection configuration
   * @returns Promise resolving to connection test result
   */
  testConnection(config: ConnectorConfig): Promise<ConnectionTestResult>;

  /**
   * Introspect the API and return a universal schema
   * @param config Connection configuration
   * @returns Promise resolving to introspection result
   */
  introspect(config: ConnectorConfig): Promise<IntrospectionResult>;

  /**
   * Validate that the connector can handle the given URL
   * @param url Target URL
   * @returns Whether this connector can handle the URL
   */
  canHandle(url: string): boolean;

  /**
   * Get default configuration for this connector
   * @returns Default configuration object
   */
  getDefaultConfig(): Partial<ConnectorConfig>;
}

/**
 * Factory interface for creating connectors
 */
export interface ConnectorFactory {
  /**
   * Create a connector for the specified protocol
   * @param protocol Target API protocol
   * @returns Connector instance or null if protocol not supported
   */
  createConnector(protocol: APIProtocol): APIConnector | null;

  /**
   * Get all supported protocols
   * @returns Array of supported protocols
   */
  getSupportedProtocols(): APIProtocol[];

  /**
   * Register a new connector
   * @param connector Connector to register
   */
  registerConnector(connector: APIConnector): void;
}

/**
 * Connector registry for managing available connectors
 */
export interface ConnectorRegistry {
  /**
   * Register a connector
   * @param connector Connector to register
   */
  register(connector: APIConnector): void;

  /**
   * Get connector by protocol
   * @param protocol Target protocol
   * @returns Connector instance or null if not found
   */
  getConnector(protocol: APIProtocol): APIConnector | null;

  /**
   * Get all registered connectors
   * @returns Array of all registered connectors
   */
  getAllConnectors(): APIConnector[];

  /**
   * Find the best connector for a given URL
   * @param url Target URL
   * @returns Best matching connector or null if none found
   */
  findConnectorForUrl(url: string): APIConnector | null;
}
