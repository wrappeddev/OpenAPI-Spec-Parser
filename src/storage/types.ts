/**
 * Storage interface definitions for the Universal API Schema Explorer
 * 
 * This module defines the interfaces for storing and retrieving API schemas
 * with support for different storage backends (memory, file, database).
 */

import { UniversalSchema } from '../types/core';

/**
 * Storage query filters
 */
export interface SchemaQuery {
  /** Filter by schema ID */
  id?: string;
  /** Filter by API name */
  name?: string;
  /** Filter by protocol */
  protocol?: string;
  /** Filter by source URL */
  source?: string;
  /** Filter by discovery date range */
  discoveredAfter?: Date;
  discoveredBefore?: Date;
  /** Text search in name or description */
  search?: string;
  /** Limit number of results */
  limit?: number;
  /** Skip number of results (for pagination) */
  offset?: number;
}

/**
 * Storage query result
 */
export interface SchemaQueryResult {
  /** Found schemas */
  schemas: UniversalSchema[];
  /** Total count (before limit/offset) */
  totalCount: number;
  /** Whether there are more results */
  hasMore: boolean;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  /** Total number of schemas */
  totalSchemas: number;
  /** Schemas by protocol */
  schemasByProtocol: Record<string, number>;
  /** Storage size in bytes (if applicable) */
  storageSize?: number;
  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Storage backend type */
  type: 'memory' | 'file' | 'database';
  /** Backend-specific options */
  options?: Record<string, unknown>;
}

/**
 * Base interface for all storage backends
 */
export interface SchemaStorage {
  /** Storage backend name */
  readonly name: string;
  
  /** Storage backend version */
  readonly version: string;

  /**
   * Initialize the storage backend
   * @param config Storage configuration
   */
  initialize(config: StorageConfig): Promise<void>;

  /**
   * Store a schema
   * @param schema Schema to store
   * @returns Promise resolving to the stored schema ID
   */
  store(schema: UniversalSchema): Promise<string>;

  /**
   * Retrieve a schema by ID
   * @param id Schema ID
   * @returns Promise resolving to the schema or null if not found
   */
  retrieve(id: string): Promise<UniversalSchema | null>;

  /**
   * Update an existing schema
   * @param id Schema ID
   * @param schema Updated schema
   * @returns Promise resolving to success status
   */
  update(id: string, schema: UniversalSchema): Promise<boolean>;

  /**
   * Delete a schema
   * @param id Schema ID
   * @returns Promise resolving to success status
   */
  delete(id: string): Promise<boolean>;

  /**
   * Query schemas with filters
   * @param query Query filters
   * @returns Promise resolving to query results
   */
  query(query: SchemaQuery): Promise<SchemaQueryResult>;

  /**
   * List all schema IDs
   * @returns Promise resolving to array of schema IDs
   */
  listIds(): Promise<string[]>;

  /**
   * Get storage statistics
   * @returns Promise resolving to storage stats
   */
  getStats(): Promise<StorageStats>;

  /**
   * Clear all schemas
   * @returns Promise resolving to success status
   */
  clear(): Promise<boolean>;

  /**
   * Close the storage connection
   * @returns Promise resolving when closed
   */
  close(): Promise<void>;
}

/**
 * Storage factory interface
 */
export interface StorageFactory {
  /**
   * Create a storage instance
   * @param config Storage configuration
   * @returns Promise resolving to storage instance
   */
  createStorage(config: StorageConfig): Promise<SchemaStorage>;

  /**
   * Get supported storage types
   * @returns Array of supported storage types
   */
  getSupportedTypes(): string[];
}

/**
 * Storage manager interface for coordinating multiple storage backends
 */
export interface StorageManager {
  /**
   * Register a storage backend
   * @param storage Storage instance
   */
  registerStorage(storage: SchemaStorage): void;

  /**
   * Get primary storage backend
   * @returns Primary storage instance
   */
  getPrimaryStorage(): SchemaStorage;

  /**
   * Set primary storage backend
   * @param storage Storage instance to set as primary
   */
  setPrimaryStorage(storage: SchemaStorage): void;

  /**
   * Store schema in primary storage
   * @param schema Schema to store
   * @returns Promise resolving to stored schema ID
   */
  store(schema: UniversalSchema): Promise<string>;

  /**
   * Retrieve schema from any available storage
   * @param id Schema ID
   * @returns Promise resolving to schema or null
   */
  retrieve(id: string): Promise<UniversalSchema | null>;

  /**
   * Query schemas across all storage backends
   * @param query Query filters
   * @returns Promise resolving to combined results
   */
  query(query: SchemaQuery): Promise<SchemaQueryResult>;

  /**
   * Sync schemas between storage backends
   * @returns Promise resolving to sync status
   */
  sync(): Promise<boolean>;
}
