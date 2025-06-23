/**
 * CLI Configuration Management
 * 
 * This module handles configuration for the CLI, including storage options,
 * default settings, and configuration file management.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ExplorerConfig } from '../index';

/**
 * CLI-specific configuration options
 */
export interface CLIConfig extends ExplorerConfig {
  /** Default output format for commands */
  defaultFormat?: 'json' | 'yaml' | 'table';
  /** Default verbosity level */
  verbose?: boolean;
  /** Default storage directory */
  storageDirectory?: string;
}

/**
 * Default CLI configuration
 */
export const DEFAULT_CLI_CONFIG: CLIConfig = {
  autoSave: true,
  defaultTimeout: 30000,
  defaultFormat: 'table',
  verbose: false,
  storageDirectory: './schemas',
  storage: {
    type: 'file',
    options: {
      baseDirectory: './schemas',
      enableBackups: true,
      maxBackups: 5
    }
  }
};

/**
 * Configuration manager for CLI
 */
export class CLIConfigManager {
  private config: CLIConfig;
  private configPath?: string;

  constructor(configPath?: string) {
    this.config = { ...DEFAULT_CLI_CONFIG };
    this.configPath = configPath;
  }

  /**
   * Load configuration from file
   */
  public async loadConfig(): Promise<void> {
    if (!this.configPath) {
      return;
    }

    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      const fileConfig = JSON.parse(configData) as Partial<CLIConfig>;
      
      // Merge with defaults
      this.config = {
        ...DEFAULT_CLI_CONFIG,
        ...fileConfig
      };

      // Update storage directory if specified
      if (this.config.storageDirectory && this.config.storage) {
        this.config.storage.options = {
          ...this.config.storage.options,
          baseDirectory: this.config.storageDirectory
        };
      }
    } catch (error) {
      console.warn(`Warning: Could not load config file ${this.configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save current configuration to file
   */
  public async saveConfig(): Promise<void> {
    if (!this.configPath) {
      throw new Error('No config path specified');
    }

    try {
      // Ensure directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      // Write config file
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf8'
      );
    } catch (error) {
      throw new Error(`Failed to save config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): CLIConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<CLIConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };

    // Update storage directory if specified
    if (updates.storageDirectory && this.config.storage) {
      this.config.storage.options = {
        ...this.config.storage.options,
        baseDirectory: updates.storageDirectory
      };
    }
  }

  /**
   * Get explorer configuration
   */
  public getExplorerConfig(): ExplorerConfig {
    const { defaultFormat, verbose, storageDirectory, ...explorerConfig } = this.config;
    return explorerConfig;
  }

  /**
   * Set storage type
   */
  public setStorageType(type: 'memory' | 'file', options?: Record<string, unknown>): void {
    this.config.storage = {
      type,
      options: options || (type === 'file' ? { baseDirectory: this.config.storageDirectory || './schemas' } : {})
    };
  }

  /**
   * Create default config file
   */
  public static async createDefaultConfig(configPath: string): Promise<void> {
    const configDir = path.dirname(configPath);
    await fs.mkdir(configDir, { recursive: true });

    const defaultConfig = {
      ...DEFAULT_CLI_CONFIG,
      // Add some helpful comments in the JSON
      _comments: {
        storage: "Storage configuration - 'memory' for temporary, 'file' for persistent",
        storageDirectory: "Directory where schemas are stored (only for file storage)",
        autoSave: "Automatically save discovered schemas",
        defaultTimeout: "Default timeout for API requests in milliseconds"
      }
    };

    await fs.writeFile(
      configPath,
      JSON.stringify(defaultConfig, null, 2),
      'utf8'
    );
  }
}

/**
 * Get default config file path
 */
export function getDefaultConfigPath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
  return path.join(homeDir, '.api-explorer', 'config.json');
}

/**
 * Create a CLI config manager with automatic file loading
 */
export async function createCLIConfig(configPath?: string): Promise<CLIConfigManager> {
  const finalConfigPath = configPath || getDefaultConfigPath();
  const manager = new CLIConfigManager(finalConfigPath);
  
  try {
    await manager.loadConfig();
  } catch (error) {
    // Config loading failed, use defaults
    console.warn(`Using default configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return manager;
}
