/**
 * In-Memory Schema Storage Implementation
 * 
 * This storage backend keeps all schemas in memory for fast access.
 * Data is lost when the application restarts, making it suitable for
 * temporary storage, caching, or development purposes.
 * 
 * Features:
 * - Fast read/write operations
 * - Full-text search capabilities
 * - No external dependencies
 * - Automatic cleanup and memory management
 */

import { UniversalSchema } from '../../types/core';
import { SchemaStorage, StorageConfig, SchemaQuery, SchemaQueryResult, StorageStats } from '../types';

/**
 * In-memory storage configuration
 */
export interface MemoryStorageConfig {
  /** Maximum number of schemas to store */
  maxSchemas?: number;
  /** Whether to enable automatic cleanup of old schemas */
  autoCleanup?: boolean;
  /** Maximum age of schemas in milliseconds before cleanup */
  maxAge?: number;
}

/**
 * In-memory schema storage implementation
 */
export class MemoryStorage implements SchemaStorage {
  public readonly name = 'Memory Storage';
  public readonly version = '1.0.0';

  private schemas = new Map<string, UniversalSchema>();
  private config: MemoryStorageConfig = {};
  private initialized = false;
  private cleanupTimer?: NodeJS.Timeout;

  /**
   * Initialize the memory storage
   */
  public async initialize(config: StorageConfig): Promise<void> {
    this.config = {
      maxSchemas: 1000,
      autoCleanup: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      ...(config.options as MemoryStorageConfig)
    };

    this.initialized = true;

    // Start cleanup timer if enabled
    if (this.config.autoCleanup) {
      this.startCleanupTimer();
    }
  }

  /**
   * Store a schema in memory
   */
  public async store(schema: UniversalSchema): Promise<string> {
    this.ensureInitialized();

    // Check if we need to make room
    if (this.config.maxSchemas && this.schemas.size >= this.config.maxSchemas) {
      await this.cleanup();
    }

    // Store the schema
    this.schemas.set(schema.id, { ...schema });
    
    return schema.id;
  }

  /**
   * Retrieve a schema by ID
   */
  public async retrieve(id: string): Promise<UniversalSchema | null> {
    this.ensureInitialized();
    
    const schema = this.schemas.get(id);
    return schema ? { ...schema } : null;
  }

  /**
   * Update an existing schema
   */
  public async update(id: string, schema: UniversalSchema): Promise<boolean> {
    this.ensureInitialized();
    
    if (!this.schemas.has(id)) {
      return false;
    }

    this.schemas.set(id, { ...schema });
    return true;
  }

  /**
   * Delete a schema
   */
  public async delete(id: string): Promise<boolean> {
    this.ensureInitialized();
    
    return this.schemas.delete(id);
  }

  /**
   * Query schemas with filters
   */
  public async query(query: SchemaQuery): Promise<SchemaQueryResult> {
    this.ensureInitialized();
    
    let results = Array.from(this.schemas.values());

    // Apply filters
    if (query.id) {
      results = results.filter(schema => schema.id === query.id);
    }

    if (query.name) {
      results = results.filter(schema => 
        schema.name.toLowerCase().includes(query.name!.toLowerCase())
      );
    }

    if (query.protocol) {
      results = results.filter(schema => schema.protocol === query.protocol);
    }

    if (query.source) {
      results = results.filter(schema => 
        schema.source?.toLowerCase().includes(query.source!.toLowerCase())
      );
    }

    if (query.discoveredAfter) {
      results = results.filter(schema => 
        schema.discoveredAt >= query.discoveredAfter!
      );
    }

    if (query.discoveredBefore) {
      results = results.filter(schema => 
        schema.discoveredAt <= query.discoveredBefore!
      );
    }

    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      results = results.filter(schema => 
        schema.name.toLowerCase().includes(searchTerm) ||
        (schema.description && schema.description.toLowerCase().includes(searchTerm))
      );
    }

    // Sort by discovery date (newest first)
    results.sort((a, b) => b.discoveredAt.getTime() - a.discoveredAt.getTime());

    const totalCount = results.length;

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return {
      schemas: results.map(schema => ({ ...schema })), // Deep copy
      totalCount,
      hasMore: query.limit ? totalCount > (query.offset || 0) + query.limit : false
    };
  }

  /**
   * List all schema IDs
   */
  public async listIds(): Promise<string[]> {
    this.ensureInitialized();
    
    return Array.from(this.schemas.keys());
  }

  /**
   * Get storage statistics
   */
  public async getStats(): Promise<StorageStats> {
    this.ensureInitialized();
    
    const schemasByProtocol: Record<string, number> = {};
    
    for (const schema of this.schemas.values()) {
      schemasByProtocol[schema.protocol] = (schemasByProtocol[schema.protocol] || 0) + 1;
    }

    // Calculate approximate memory usage
    const storageSize = JSON.stringify(Array.from(this.schemas.values())).length * 2; // Rough estimate

    return {
      totalSchemas: this.schemas.size,
      schemasByProtocol,
      storageSize,
      lastUpdated: new Date()
    };
  }

  /**
   * Clear all schemas
   */
  public async clear(): Promise<boolean> {
    this.ensureInitialized();
    
    this.schemas.clear();
    return true;
  }

  /**
   * Close the storage and cleanup resources
   */
  public async close(): Promise<void> {
    this.initialized = false;
    this.schemas.clear();

    // Clear the cleanup timer to allow process to exit
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Ensure storage is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Memory storage not initialized. Call initialize() first.');
    }
  }

  /**
   * Cleanup old schemas based on configuration
   */
  private async cleanup(): Promise<void> {
    if (!this.config.maxAge) {
      // If no max age, just remove oldest schemas to make room
      const schemas = Array.from(this.schemas.entries());
      schemas.sort((a, b) => a[1].discoveredAt.getTime() - b[1].discoveredAt.getTime());
      
      const toRemove = Math.max(1, Math.floor(schemas.length * 0.1)); // Remove 10%
      for (let i = 0; i < toRemove; i++) {
        this.schemas.delete(schemas[i][0]);
      }
      return;
    }

    // Remove schemas older than maxAge
    const cutoffTime = Date.now() - this.config.maxAge;
    const toDelete: string[] = [];

    for (const [id, schema] of this.schemas.entries()) {
      if (schema.discoveredAt.getTime() < cutoffTime) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.schemas.delete(id);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    // Run cleanup every hour
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(console.error);
    }, 60 * 60 * 1000);

    // Don't keep the process alive just for this timer
    this.cleanupTimer.unref();
  }
}
