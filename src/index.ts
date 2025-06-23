/**
 * Universal API Schema Explorer - Main Entry Point
 * 
 * This is the primary interface for the Universal API Schema Explorer.
 * It orchestrates all the different modules and provides a unified API
 * for introspecting REST, GraphQL, and WebSocket APIs.
 * 
 * Key Features:
 * - Protocol-agnostic API introspection
 * - Unified schema representation
 * - Pluggable storage backends
 * - Extensible connector architecture
 * - Comprehensive error handling
 */

import {
  UniversalSchema,
  APIProtocol,
  ConnectorConfig,
  IntrospectionResult,
  SchemaQuery,
  SchemaQueryResult,
  APIConnector,
  ConnectorRegistry,
  SchemaStorage,
  StorageConfig,
  ConnectionError,
  IntrospectionError,
  StorageError
} from './types/core';

// Import connectors
import { GraphQLConnector } from './connectors/graphql';
import { RESTConnector } from './connectors/rest';
import { WebSocketConnector } from './connectors/websocket';

// Import storage implementations
import { MemoryStorage } from './storage/memory/memory-storage';
import { FileStorage } from './storage/file/file-storage';

/**
 * Configuration for the Universal API Explorer
 */
export interface ExplorerConfig {
  /** Default storage configuration */
  storage?: StorageConfig;
  /** Default connector configurations */
  connectors?: {
    [K in APIProtocol]?: Partial<ConnectorConfig>;
  };
  /** Whether to auto-save discovered schemas */
  autoSave?: boolean;
  /** Default request timeout */
  defaultTimeout?: number;
}

/**
 * Simple connector registry implementation
 */
class SimpleConnectorRegistry implements ConnectorRegistry {
  private connectors = new Map<APIProtocol, APIConnector>();

  register(connector: APIConnector): void {
    this.connectors.set(connector.protocol, connector);
  }

  getConnector(protocol: APIProtocol): APIConnector | null {
    return this.connectors.get(protocol) || null;
  }

  getAllConnectors(): APIConnector[] {
    return Array.from(this.connectors.values());
  }

  findConnectorForUrl(url: string): APIConnector | null {
    for (const connector of this.connectors.values()) {
      if (connector.canHandle(url)) {
        return connector;
      }
    }
    return null;
  }
}

/**
 * Main Universal API Schema Explorer class
 */
export class UniversalAPIExplorer {
  private connectorRegistry: ConnectorRegistry;
  private storage: SchemaStorage;
  private config: ExplorerConfig;
  private initialized = false;

  constructor(config: ExplorerConfig = {}) {
    this.config = {
      autoSave: true,
      defaultTimeout: 30000,
      storage: {
        type: 'file',
        options: {
          baseDirectory: './schemas'
        }
      },
      ...config
    };

    this.connectorRegistry = new SimpleConnectorRegistry();
    this.storage = new MemoryStorage(); // Default storage
  }

  /**
   * Initialize the explorer with connectors and storage
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Register default connectors
    this.connectorRegistry.register(new GraphQLConnector());
    this.connectorRegistry.register(new RESTConnector());
    this.connectorRegistry.register(new WebSocketConnector());

    // Initialize storage
    await this.initializeStorage();

    this.initialized = true;
  }

  /**
   * Introspect an API and return its schema
   */
  public async introspect(
    protocol: APIProtocol,
    url: string,
    config?: Partial<ConnectorConfig>
  ): Promise<IntrospectionResult> {
    await this.ensureInitialized();

    try {
      // Get appropriate connector
      const connector = this.connectorRegistry.getConnector(protocol);
      if (!connector) {
        throw new IntrospectionError(
          `No connector available for protocol: ${protocol}`,
          { protocol, url }
        );
      }

      // Merge configuration
      const connectorConfig: ConnectorConfig = {
        url,
        timeout: this.config.defaultTimeout,
        followRedirects: true,
        ...this.config.connectors?.[protocol],
        ...config
      };

      // Perform introspection
      const result = await connector.introspect(connectorConfig);

      // Auto-save if enabled and successful
      if (this.config.autoSave && result.success && result.schema) {
        try {
          await this.storage.store(result.schema);
        } catch (error) {
          // Don't fail introspection if storage fails
          console.warn('Failed to auto-save schema:', error instanceof Error ? error.message : 'Unknown error');
        }
      }

      return result;
    } catch (error) {
      if (error instanceof IntrospectionError || error instanceof ConnectionError) {
        throw error;
      }

      throw new IntrospectionError(
        `Introspection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { protocol, url, error: String(error) }
      );
    }
  }

  /**
   * Test connection to an API endpoint
   */
  public async testConnection(
    protocol: APIProtocol,
    url: string,
    config?: Partial<ConnectorConfig>
  ): Promise<{ success: boolean; error?: string; responseTime?: number }> {
    await this.ensureInitialized();

    try {
      const connector = this.connectorRegistry.getConnector(protocol);
      if (!connector) {
        return {
          success: false,
          error: `No connector available for protocol: ${protocol}`
        };
      }

      const connectorConfig: ConnectorConfig = {
        url,
        timeout: this.config.defaultTimeout,
        followRedirects: true,
        ...this.config.connectors?.[protocol],
        ...config
      };

      const result = await connector.testConnection(connectorConfig);
      return {
        success: result.success,
        error: result.error,
        responseTime: result.responseTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Auto-detect API protocol and introspect
   */
  public async autoIntrospect(
    url: string,
    config?: Partial<ConnectorConfig>
  ): Promise<IntrospectionResult> {
    await this.ensureInitialized();

    // Try to find a suitable connector
    const connector = this.connectorRegistry.findConnectorForUrl(url);
    if (!connector) {
      throw new IntrospectionError(
        `Could not determine API protocol for URL: ${url}`,
        { url }
      );
    }

    return this.introspect(connector.protocol, url, config);
  }

  /**
   * Save a schema to storage
   */
  public async saveSchema(schema: UniversalSchema): Promise<string> {
    await this.ensureInitialized();

    try {
      return await this.storage.store(schema);
    } catch (error) {
      throw new StorageError(
        `Failed to save schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { schemaId: schema.id, error: String(error) }
      );
    }
  }

  /**
   * Retrieve a schema by ID
   */
  public async getSchema(id: string): Promise<UniversalSchema | null> {
    await this.ensureInitialized();

    try {
      return await this.storage.retrieve(id);
    } catch (error) {
      throw new StorageError(
        `Failed to retrieve schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { schemaId: id, error: String(error) }
      );
    }
  }

  /**
   * List stored schemas with optional filtering
   */
  public async listSchemas(query: SchemaQuery = {}): Promise<SchemaQueryResult> {
    await this.ensureInitialized();

    try {
      return await this.storage.query(query);
    } catch (error) {
      throw new StorageError(
        `Failed to list schemas: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { query, error: String(error) }
      );
    }
  }

  /**
   * Delete a schema by ID
   */
  public async deleteSchema(id: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      return await this.storage.delete(id);
    } catch (error) {
      throw new StorageError(
        `Failed to delete schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { schemaId: id, error: String(error) }
      );
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<any> {
    await this.ensureInitialized();

    try {
      return await this.storage.getStats();
    } catch (error) {
      throw new StorageError(
        `Failed to get storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: String(error) }
      );
    }
  }

  /**
   * Register a custom connector
   */
  public registerConnector(connector: APIConnector): void {
    this.connectorRegistry.register(connector);
  }

  /**
   * Get all registered connectors
   */
  public getConnectors(): APIConnector[] {
    return this.connectorRegistry.getAllConnectors();
  }

  /**
   * Close the explorer and cleanup resources
   */
  public async close(): Promise<void> {
    if (this.storage) {
      await this.storage.close();
    }
    this.initialized = false;
  }

  /**
   * Initialize storage backend
   */
  private async initializeStorage(): Promise<void> {
    if (!this.config.storage) {
      return;
    }

    switch (this.config.storage.type) {
      case 'memory':
        this.storage = new MemoryStorage();
        break;
      case 'file':
        this.storage = new FileStorage();
        break;
      default:
        throw new Error(`Unsupported storage type: ${this.config.storage.type}`);
    }

    await this.storage.initialize(this.config.storage);
  }

  /**
   * Ensure the explorer is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// Export everything for external use
export * from './types/core';
export * from './connectors/graphql';
export * from './connectors/rest';
export * from './connectors/websocket';
export * from './storage/memory/memory-storage';
export * from './storage/file/file-storage';
