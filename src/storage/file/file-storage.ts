/**
 * File-Based Schema Storage Implementation
 * 
 * This storage backend persists schemas to the file system using JSON files.
 * Each schema is stored as a separate file for better performance and
 * to avoid loading all schemas into memory at once.
 * 
 * Features:
 * - Persistent storage across application restarts
 * - Individual file per schema for efficient access
 * - Automatic directory structure management
 * - Backup and recovery capabilities
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { UniversalSchema, StorageError } from '../../types/core';
import { SchemaStorage, StorageConfig, SchemaQuery, SchemaQueryResult, StorageStats } from '../types';

/**
 * File storage configuration
 */
export interface FileStorageConfig {
  /** Base directory for storing schemas */
  baseDirectory: string;
  /** Whether to create backup files */
  enableBackups?: boolean;
  /** Number of backup files to keep */
  maxBackups?: number;
  /** Whether to compress stored files */
  compress?: boolean;
  /** File extension for schema files */
  fileExtension?: string;
}

/**
 * File-based schema storage implementation
 */
export class FileStorage implements SchemaStorage {
  public readonly name = 'File Storage';
  public readonly version = '1.0.0';

  private config: FileStorageConfig = { baseDirectory: './schemas' };
  private initialized = false;
  private schemasDir = '';
  private indexFile = '';

  /**
   * Initialize the file storage
   */
  public async initialize(config: StorageConfig): Promise<void> {
    this.config = {
      enableBackups: true,
      maxBackups: 5,
      compress: false,
      fileExtension: '.json',
      baseDirectory: './schemas',
      ...(config.options || {})
    };

    this.schemasDir = path.resolve(this.config.baseDirectory);
    this.indexFile = path.join(this.schemasDir, 'index.json');

    // Create directory structure
    await this.ensureDirectoryExists(this.schemasDir);
    
    // Initialize index file if it doesn't exist
    await this.ensureIndexExists();

    this.initialized = true;
  }

  /**
   * Store a schema to file
   */
  public async store(schema: UniversalSchema): Promise<string> {
    this.ensureInitialized();

    try {
      const filePath = this.getSchemaFilePath(schema.id);
      
      // Create backup if enabled
      if (this.config.enableBackups && await this.fileExists(filePath)) {
        await this.createBackup(filePath);
      }

      // Write schema to file
      const schemaData = JSON.stringify(schema, null, 2);
      await fs.writeFile(filePath, schemaData, 'utf8');

      // Update index
      await this.updateIndex(schema.id, {
        id: schema.id,
        name: schema.name,
        protocol: schema.protocol,
        source: schema.source,
        discoveredAt: schema.discoveredAt.toISOString(),
        filePath: path.relative(this.schemasDir, filePath)
      });

      return schema.id;
    } catch (error) {
      throw new StorageError(
        `Failed to store schema ${schema.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { schemaId: schema.id, error: String(error) }
      );
    }
  }

  /**
   * Retrieve a schema from file
   */
  public async retrieve(id: string): Promise<UniversalSchema | null> {
    this.ensureInitialized();

    try {
      const filePath = this.getSchemaFilePath(id);
      
      if (!await this.fileExists(filePath)) {
        return null;
      }

      const schemaData = await fs.readFile(filePath, 'utf8');
      const schema = JSON.parse(schemaData) as UniversalSchema;
      
      // Convert discoveredAt back to Date object
      schema.discoveredAt = new Date(schema.discoveredAt);
      
      return schema;
    } catch (error) {
      throw new StorageError(
        `Failed to retrieve schema ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { schemaId: id, error: String(error) }
      );
    }
  }

  /**
   * Update an existing schema
   */
  public async update(id: string, schema: UniversalSchema): Promise<boolean> {
    this.ensureInitialized();

    const filePath = this.getSchemaFilePath(id);
    
    if (!await this.fileExists(filePath)) {
      return false;
    }

    // Store the updated schema (this will create a backup automatically)
    await this.store(schema);
    return true;
  }

  /**
   * Delete a schema file
   */
  public async delete(id: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const filePath = this.getSchemaFilePath(id);
      
      if (!await this.fileExists(filePath)) {
        return false;
      }

      // Create backup before deletion if enabled
      if (this.config.enableBackups) {
        await this.createBackup(filePath);
      }

      // Delete the file
      await fs.unlink(filePath);

      // Remove from index
      await this.removeFromIndex(id);

      return true;
    } catch (error) {
      throw new StorageError(
        `Failed to delete schema ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { schemaId: id, error: String(error) }
      );
    }
  }

  /**
   * Query schemas with filters
   */
  public async query(query: SchemaQuery): Promise<SchemaQueryResult> {
    this.ensureInitialized();

    try {
      const index = await this.loadIndex();
      let results = Object.values(index);

      // Apply filters using index data first
      if (query.id) {
        results = results.filter(item => item.id === query.id);
      }

      if (query.name) {
        results = results.filter(item => 
          item.name.toLowerCase().includes(query.name!.toLowerCase())
        );
      }

      if (query.protocol) {
        results = results.filter(item => item.protocol === query.protocol);
      }

      if (query.source) {
        results = results.filter(item => 
          item.source?.toLowerCase().includes(query.source!.toLowerCase())
        );
      }

      if (query.discoveredAfter) {
        results = results.filter(item => 
          new Date(item.discoveredAt) >= query.discoveredAfter!
        );
      }

      if (query.discoveredBefore) {
        results = results.filter(item => 
          new Date(item.discoveredAt) <= query.discoveredBefore!
        );
      }

      // For search, we need to load the full schemas
      if (query.search) {
        const searchTerm = query.search.toLowerCase();
        const filteredResults = [];
        
        for (const item of results) {
          const schema = await this.retrieve(item.id);
          if (schema && (
            schema.name.toLowerCase().includes(searchTerm) ||
            (schema.description && schema.description.toLowerCase().includes(searchTerm))
          )) {
            filteredResults.push(item);
          }
        }
        results = filteredResults;
      }

      // Sort by discovery date (newest first)
      results.sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime());

      const totalCount = results.length;

      // Apply pagination
      if (query.offset) {
        results = results.slice(query.offset);
      }

      if (query.limit) {
        results = results.slice(0, query.limit);
      }

      // Load full schemas for results
      const schemas: UniversalSchema[] = [];
      for (const item of results) {
        const schema = await this.retrieve(item.id);
        if (schema) {
          schemas.push(schema);
        }
      }

      return {
        schemas,
        totalCount,
        hasMore: query.limit ? totalCount > (query.offset || 0) + query.limit : false
      };
    } catch (error) {
      throw new StorageError(
        `Failed to query schemas: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { query, error: String(error) }
      );
    }
  }

  /**
   * List all schema IDs
   */
  public async listIds(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const index = await this.loadIndex();
      return Object.keys(index);
    } catch (error) {
      throw new StorageError(
        `Failed to list schema IDs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: String(error) }
      );
    }
  }

  /**
   * Get storage statistics
   */
  public async getStats(): Promise<StorageStats> {
    this.ensureInitialized();

    try {
      const index = await this.loadIndex();
      const schemasByProtocol: Record<string, number> = {};

      for (const item of Object.values(index)) {
        schemasByProtocol[item.protocol] = (schemasByProtocol[item.protocol] || 0) + 1;
      }

      // Calculate storage size
      let storageSize = 0;
      try {
        storageSize = await this.getDirectorySize(this.schemasDir);
      } catch {
        // Directory size calculation failed, continue without it
      }

      return {
        totalSchemas: Object.keys(index).length,
        schemasByProtocol,
        storageSize,
        lastUpdated: new Date()
      };
    } catch (error) {
      throw new StorageError(
        `Failed to get storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: String(error) }
      );
    }
  }

  /**
   * Clear all schemas
   */
  public async clear(): Promise<boolean> {
    this.ensureInitialized();

    try {
      // Remove all schema files
      const index = await this.loadIndex();

      for (const item of Object.values(index)) {
        const filePath = path.join(this.schemasDir, item.filePath);
        try {
          await fs.unlink(filePath);
        } catch {
          // Continue even if individual file deletion fails
        }
      }

      // Clear the index
      await fs.writeFile(this.indexFile, JSON.stringify({}), 'utf8');

      return true;
    } catch (error) {
      throw new StorageError(
        `Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: String(error) }
      );
    }
  }

  /**
   * Close the storage (cleanup resources)
   */
  public async close(): Promise<void> {
    this.initialized = false;
  }

  /**
   * Get file path for a schema
   */
  private getSchemaFilePath(id: string): string {
    const fileName = `${id}${this.config.fileExtension}`;
    return path.join(this.schemasDir, fileName);
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new StorageError(
        `Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { dirPath, error: String(error) }
      );
    }
  }

  /**
   * Ensure index file exists
   */
  private async ensureIndexExists(): Promise<void> {
    if (!await this.fileExists(this.indexFile)) {
      await fs.writeFile(this.indexFile, JSON.stringify({}), 'utf8');
    }
  }

  /**
   * Load index from file
   */
  private async loadIndex(): Promise<Record<string, any>> {
    try {
      const indexData = await fs.readFile(this.indexFile, 'utf8');
      return JSON.parse(indexData);
    } catch {
      return {};
    }
  }

  /**
   * Update index with schema information
   */
  private async updateIndex(id: string, indexEntry: any): Promise<void> {
    const index = await this.loadIndex();
    index[id] = indexEntry;
    await fs.writeFile(this.indexFile, JSON.stringify(index, null, 2), 'utf8');
  }

  /**
   * Remove schema from index
   */
  private async removeFromIndex(id: string): Promise<void> {
    const index = await this.loadIndex();
    delete index[id];
    await fs.writeFile(this.indexFile, JSON.stringify(index, null, 2), 'utf8');
  }

  /**
   * Create backup of a file
   */
  private async createBackup(filePath: string): Promise<void> {
    if (!this.config.enableBackups) return;

    const backupDir = path.join(this.schemasDir, 'backups');
    await this.ensureDirectoryExists(backupDir);

    const fileName = path.basename(filePath, path.extname(filePath));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${fileName}_${timestamp}.backup`);

    try {
      await fs.copyFile(filePath, backupPath);

      // Clean up old backups
      await this.cleanupBackups(fileName, backupDir);
    } catch (error) {
      // Backup failure shouldn't prevent the main operation
      console.warn(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up old backup files
   */
  private async cleanupBackups(fileName: string, backupDir: string): Promise<void> {
    if (!this.config.maxBackups) return;

    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter(file => file.startsWith(`${fileName}_`) && file.endsWith('.backup'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          stat: null as any
        }));

      // Get file stats for sorting by creation time
      for (const file of backupFiles) {
        try {
          file.stat = await fs.stat(file.path);
        } catch {
          // Skip files we can't stat
        }
      }

      // Sort by creation time (newest first) and remove excess
      const validBackups = backupFiles
        .filter(file => file.stat)
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());

      if (validBackups.length > this.config.maxBackups!) {
        const toDelete = validBackups.slice(this.config.maxBackups!);
        for (const file of toDelete) {
          try {
            await fs.unlink(file.path);
          } catch {
            // Continue even if deletion fails
          }
        }
      }
    } catch {
      // Cleanup failure shouldn't prevent the main operation
    }
  }

  /**
   * Calculate directory size recursively
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch {
      // Return 0 if we can't calculate size
    }

    return totalSize;
  }

  /**
   * Ensure storage is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('File storage not initialized. Call initialize() first.');
    }
  }
}
