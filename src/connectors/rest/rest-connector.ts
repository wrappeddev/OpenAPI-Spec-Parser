/**
 * REST API Connector
 * 
 * This connector implements the APIConnector interface for REST APIs.
 * It discovers and parses OpenAPI/Swagger specifications to extract
 * API schema information and converts it to the universal format.
 * 
 * Features:
 * - Automatic OpenAPI/Swagger specification detection
 * - Support for both OpenAPI 3.x and Swagger 2.0
 * - Multiple discovery methods (common paths, headers, etc.)
 * - Comprehensive error handling and validation
 */

import axios, { AxiosResponse } from 'axios';
import * as yaml from 'yaml';
import {
  APIConnector,
  ConnectorConfig,
  ConnectionTestResult,
  IntrospectionResult,
  APIProtocol,
  ConnectionError,
  IntrospectionError,
  SchemaParsingError
} from '../../types/core';
import { OpenAPISpecification } from './openapi-types';
import { OpenAPISchemaConverter } from './openapi-converter';

/**
 * REST-specific configuration options
 */
export interface RESTConnectorConfig extends ConnectorConfig {
  /** Custom OpenAPI specification URL */
  specUrl?: string;
  /** Whether to try common OpenAPI paths */
  tryCommonPaths?: boolean;
  /** Custom paths to try for OpenAPI specs */
  customPaths?: string[];
  /** Whether to parse YAML specifications */
  parseYaml?: boolean;
}

/**
 * Common OpenAPI specification paths to try
 */
const COMMON_OPENAPI_PATHS = [
  '/openapi.json',
  '/openapi.yaml',
  '/swagger.json',
  '/swagger.yaml',
  '/api-docs',
  '/api/docs',
  '/docs/openapi.json',
  '/docs/swagger.json',
  '/v1/openapi.json',
  '/v1/swagger.json',
  '/api/v1/openapi.json',
  '/api/v1/swagger.json'
];

/**
 * REST API connector implementation
 */
export class RESTConnector implements APIConnector {
  public readonly protocol = APIProtocol.REST;
  public readonly name = 'REST/OpenAPI Connector';
  public readonly version = '1.0.0';

  private readonly converter = new OpenAPISchemaConverter();

  /**
   * Test connection to REST API endpoint
   */
  public async testConnection(config: ConnectorConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    const restConfig = config as RESTConnectorConfig;

    try {
      // Try to find and fetch OpenAPI specification
      const specUrl = await this.discoverSpecificationUrl(restConfig);
      
      if (!specUrl) {
        return {
          success: false,
          responseTime: Date.now() - startTime,
          error: 'Could not discover OpenAPI specification URL',
          metadata: {
            endpoint: config.url,
            triedPaths: this.getPathsToTry(restConfig)
          }
        };
      }

      // Test fetching the specification
      const response = await this.fetchSpecification(specUrl, config);
      const responseTime = Date.now() - startTime;

      if (response.data) {
        return {
          success: true,
          responseTime,
          metadata: {
            endpoint: config.url,
            specUrl,
            specFormat: this.detectSpecificationFormat(response.data),
            specSize: JSON.stringify(response.data).length
          }
        };
      } else {
        return {
          success: false,
          responseTime,
          error: 'Empty or invalid OpenAPI specification',
          metadata: {
            endpoint: config.url,
            specUrl
          }
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          responseTime,
          error: `HTTP ${error.response?.status}: ${error.response?.statusText || error.message}`,
          metadata: {
            endpoint: config.url,
            httpStatus: error.response?.status,
            httpStatusText: error.response?.statusText
          }
        };
      }

      throw new ConnectionError(
        `Failed to connect to REST endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { url: config.url, error: String(error) }
      );
    }
  }

  /**
   * Introspect REST API and return universal schema
   */
  public async introspect(config: ConnectorConfig): Promise<IntrospectionResult> {
    try {
      // First test the connection
      const connectionTest = await this.testConnection(config);
      if (!connectionTest.success) {
        return {
          success: false,
          error: `Connection test failed: ${connectionTest.error}`,
          metadata: connectionTest.metadata
        };
      }

      const restConfig = config as RESTConnectorConfig;
      const specUrl = await this.discoverSpecificationUrl(restConfig);
      
      if (!specUrl) {
        return {
          success: false,
          error: 'Could not discover OpenAPI specification URL',
          metadata: {
            endpoint: config.url,
            triedPaths: this.getPathsToTry(restConfig)
          }
        };
      }

      // Fetch and parse the specification
      const response = await this.fetchSpecification(specUrl, config);
      const spec = this.parseSpecification(response.data, specUrl);

      // Validate the specification
      const validationResult = this.validateSpecification(spec);
      if (!validationResult.valid) {
        return {
          success: false,
          error: `Invalid OpenAPI specification: ${validationResult.errors.join(', ')}`,
          metadata: {
            endpoint: config.url,
            specUrl,
            validationErrors: validationResult.errors
          }
        };
      }

      // Convert to universal schema
      const schema = this.converter.convertSchema(spec, specUrl);

      return {
        success: true,
        schema,
        warnings: validationResult.warnings,
        metadata: {
          endpoint: config.url,
          specUrl,
          specFormat: this.detectSpecificationFormat(response.data),
          operationCount: schema.operations.length,
          typeCount: Object.keys(schema.types).length,
          introspectionTimestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      if (error instanceof ConnectionError) {
        throw error;
      }

      throw new IntrospectionError(
        `REST introspection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { url: config.url, error: String(error) }
      );
    }
  }

  /**
   * Check if this connector can handle the given URL
   */
  public canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check for OpenAPI/Swagger indicators in the URL
      const path = urlObj.pathname.toLowerCase();
      const openApiIndicators = [
        'openapi',
        'swagger',
        'api-docs',
        'docs'
      ];
      
      // Check if URL directly points to a spec file
      if (openApiIndicators.some(indicator => path.includes(indicator))) {
        return true;
      }

      // Check file extensions
      if (path.endsWith('.json') || path.endsWith('.yaml') || path.endsWith('.yml')) {
        return true;
      }

      // For base URLs, we can try to discover specs
      return true; // REST connector can attempt to discover any HTTP endpoint
    } catch {
      return false;
    }
  }

  /**
   * Get default configuration for REST connector
   */
  public getDefaultConfig(): Partial<ConnectorConfig> {
    return {
      timeout: 30000,
      followRedirects: true,
      userAgent: 'Universal-API-Schema-Explorer/1.0.0',
      headers: {
        'Accept': 'application/json, application/yaml, text/yaml'
      },
      options: {
        tryCommonPaths: true,
        parseYaml: true,
        customPaths: []
      }
    };
  }

  /**
   * Discover OpenAPI specification URL
   */
  private async discoverSpecificationUrl(config: RESTConnectorConfig): Promise<string | null> {
    // If explicit spec URL is provided, use it
    if (config.specUrl) {
      return config.specUrl;
    }

    // Check if the URL itself points to a spec file
    if (this.looksLikeSpecUrl(config.url)) {
      return config.url;
    }

    // Try common paths
    const pathsToTry = this.getPathsToTry(config);
    const baseUrl = config.url.replace(/\/$/, ''); // Remove trailing slash

    for (const path of pathsToTry) {
      const specUrl = `${baseUrl}${path}`;

      try {
        const response = await axios.head(specUrl, {
          headers: config.headers,
          timeout: config.timeout || 10000,
          maxRedirects: config.followRedirects ? 5 : 0
        });

        // Check if response looks like an OpenAPI spec
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('json') || contentType.includes('yaml') || contentType.includes('text')) {
          return specUrl;
        }
      } catch {
        // Continue trying other paths
        continue;
      }
    }

    return null;
  }

  /**
   * Check if URL looks like it points to a spec file
   */
  private looksLikeSpecUrl(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('swagger') ||
           lowerUrl.includes('openapi') ||
           lowerUrl.endsWith('.json') ||
           lowerUrl.endsWith('.yaml') ||
           lowerUrl.endsWith('.yml') ||
           lowerUrl.includes('api-docs');
  }

  /**
   * Get paths to try for OpenAPI specification discovery
   */
  private getPathsToTry(config: RESTConnectorConfig): string[] {
    const paths: string[] = [];

    // Add custom paths first
    if (config.customPaths) {
      paths.push(...config.customPaths);
    }

    // Add common paths if enabled
    if (config.tryCommonPaths !== false) {
      paths.push(...COMMON_OPENAPI_PATHS);
    }

    return paths;
  }

  /**
   * Fetch OpenAPI specification from URL
   */
  private async fetchSpecification(url: string, config: ConnectorConfig): Promise<AxiosResponse<any>> {
    return axios.get(url, {
      headers: {
        'Accept': 'application/json, application/yaml, text/yaml',
        'User-Agent': config.userAgent || 'Universal-API-Schema-Explorer/1.0.0',
        ...config.headers
      },
      timeout: config.timeout || 30000,
      maxRedirects: config.followRedirects ? 5 : 0
    });
  }

  /**
   * Parse OpenAPI specification from response data
   */
  private parseSpecification(data: any, sourceUrl: string): OpenAPISpecification {
    try {
      // If data is already an object, return it
      if (typeof data === 'object' && data !== null) {
        return data as OpenAPISpecification;
      }

      // If data is a string, try to parse it
      if (typeof data === 'string') {
        // Try JSON first
        try {
          return JSON.parse(data) as OpenAPISpecification;
        } catch {
          // Try YAML
          return yaml.parse(data) as OpenAPISpecification;
        }
      }

      throw new Error('Invalid specification format');
    } catch (error) {
      throw new SchemaParsingError(
        `Failed to parse OpenAPI specification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sourceUrl, error: String(error) }
      );
    }
  }

  /**
   * Detect specification format
   */
  private detectSpecificationFormat(data: any): string {
    if (typeof data === 'object' && data !== null) {
      if (data.openapi) {
        return `OpenAPI ${data.openapi}`;
      } else if (data.swagger) {
        return `Swagger ${data.swagger}`;
      }
    }
    return 'Unknown';
  }

  /**
   * Validate OpenAPI specification
   */
  private validateSpecification(spec: OpenAPISpecification): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!spec.info) {
      errors.push('Missing required field: info');
    } else {
      if (!spec.info.title) {
        errors.push('Missing required field: info.title');
      }
      if (!spec.info.version) {
        errors.push('Missing required field: info.version');
      }
    }

    if (!spec.paths) {
      errors.push('Missing required field: paths');
    } else if (Object.keys(spec.paths).length === 0) {
      warnings.push('No paths defined in specification');
    }

    // Check version compatibility
    if (!spec.openapi && !spec.swagger) {
      errors.push('Missing version field (openapi or swagger)');
    }

    // Validate version format
    if (spec.openapi && !spec.openapi.match(/^3\.\d+\.\d+$/)) {
      warnings.push(`Unsupported OpenAPI version: ${spec.openapi}`);
    }

    if (spec.swagger && spec.swagger !== '2.0') {
      warnings.push(`Unsupported Swagger version: ${spec.swagger}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
