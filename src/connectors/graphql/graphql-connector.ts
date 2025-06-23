/**
 * GraphQL API Connector
 * 
 * This connector implements the APIConnector interface for GraphQL APIs.
 * It performs introspection queries to discover the complete schema and
 * converts the results to the universal schema format.
 * 
 * Features:
 * - Automatic GraphQL endpoint detection
 * - Full schema introspection with fallback to simplified queries
 * - Error handling and connection testing
 * - Support for custom headers and authentication
 */

import axios, { AxiosResponse } from 'axios';
import {
  APIConnector,
  ConnectorConfig,
  ConnectionTestResult,
  IntrospectionResult,
  APIProtocol,
  ConnectionError,
  IntrospectionError,
  AuthenticationError
} from '../../types/core';
import { GraphQLIntrospectionResponse } from './types';
import { GraphQLSchemaConverter } from './schema-converter';
import { INTROSPECTION_QUERY, SIMPLE_INTROSPECTION_QUERY, HEALTH_CHECK_QUERY } from './introspection-query';

/**
 * GraphQL-specific configuration options
 */
export interface GraphQLConnectorConfig extends ConnectorConfig {
  /** Whether to use simplified introspection query */
  useSimpleQuery?: boolean;
  /** Maximum query depth for introspection */
  maxDepth?: number;
  /** Custom introspection query */
  customQuery?: string;
}

/**
 * GraphQL API connector implementation
 */
export class GraphQLConnector implements APIConnector {
  public readonly protocol = APIProtocol.GRAPHQL;
  public readonly name = 'GraphQL Connector';
  public readonly version = '1.0.0';

  private readonly converter = new GraphQLSchemaConverter();

  /**
   * Test connection to GraphQL endpoint
   */
  public async testConnection(config: ConnectorConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.executeGraphQLQuery(
        config,
        HEALTH_CHECK_QUERY,
        'HealthCheck'
      );

      const responseTime = Date.now() - startTime;

      if (response.data?.data?.__schema) {
        return {
          success: true,
          responseTime,
          metadata: {
            endpoint: config.url,
            hasSchema: true
          }
        };
      } else if (response.data?.errors) {
        return {
          success: false,
          responseTime,
          error: `GraphQL errors: ${response.data.errors.map(e => e.message).join(', ')}`,
          metadata: {
            endpoint: config.url,
            errors: response.data.errors
          }
        };
      } else {
        return {
          success: false,
          responseTime,
          error: 'Invalid GraphQL response format',
          metadata: {
            endpoint: config.url,
            response: response.data
          }
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new AuthenticationError(
            `Authentication failed: ${error.response.statusText}`,
            { status: error.response.status, url: config.url }
          );
        }
        
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
        `Failed to connect to GraphQL endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { url: config.url, error: String(error) }
      );
    }
  }

  /**
   * Introspect GraphQL API and return universal schema
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

      // Perform introspection
      const graphqlConfig = config as GraphQLConnectorConfig;
      const query = this.selectIntrospectionQuery(graphqlConfig);
      
      const response = await this.executeGraphQLQuery(config, query, 'IntrospectionQuery');
      
      if (response.data?.errors && response.data.errors.length > 0) {
        // Try simplified query if full introspection fails
        if (query === INTROSPECTION_QUERY) {
          const simpleResponse = await this.executeGraphQLQuery(
            config,
            SIMPLE_INTROSPECTION_QUERY,
            'SimpleIntrospectionQuery'
          );
          
          if (simpleResponse.data?.data?.__schema) {
            return this.processIntrospectionResult(simpleResponse.data, config.url, ['Used simplified introspection query due to errors in full query']);
          }
        }
        
        return {
          success: false,
          error: `Introspection failed: ${response.data.errors.map(e => e.message).join(', ')}`,
          metadata: {
            endpoint: config.url,
            errors: response.data.errors
          }
        };
      }

      if (!response.data?.data?.__schema) {
        return {
          success: false,
          error: 'Invalid introspection response: missing schema data',
          metadata: {
            endpoint: config.url,
            response: response.data
          }
        };
      }

      return this.processIntrospectionResult(response.data, config.url);

    } catch (error) {
      if (error instanceof ConnectionError || error instanceof AuthenticationError) {
        throw error;
      }

      throw new IntrospectionError(
        `GraphQL introspection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      
      // Check for common GraphQL endpoint patterns
      const path = urlObj.pathname.toLowerCase();
      const graphqlPatterns = [
        '/graphql',
        '/graphiql',
        '/api/graphql',
        '/v1/graphql',
        '/query'
      ];
      
      return graphqlPatterns.some(pattern => path.includes(pattern)) ||
             urlObj.searchParams.has('query') ||
             url.includes('graphql');
    } catch {
      return false;
    }
  }

  /**
   * Get default configuration for GraphQL connector
   */
  public getDefaultConfig(): Partial<ConnectorConfig> {
    return {
      timeout: 30000,
      followRedirects: true,
      userAgent: 'Universal-API-Schema-Explorer/1.0.0',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      options: {
        useSimpleQuery: false,
        maxDepth: 10
      }
    };
  }

  /**
   * Execute a GraphQL query against the endpoint
   */
  private async executeGraphQLQuery(
    config: ConnectorConfig,
    query: string,
    operationName?: string
  ): Promise<AxiosResponse<GraphQLIntrospectionResponse>> {
    const requestBody = {
      query,
      operationName,
      variables: {}
    };

    return axios.post(config.url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': config.userAgent || 'Universal-API-Schema-Explorer/1.0.0',
        ...config.headers
      },
      timeout: config.timeout || 30000,
      maxRedirects: config.followRedirects ? 5 : 0
    });
  }

  /**
   * Select appropriate introspection query based on configuration
   */
  private selectIntrospectionQuery(config: GraphQLConnectorConfig): string {
    if (config.customQuery) {
      return config.customQuery;
    }

    if (config.useSimpleQuery) {
      return SIMPLE_INTROSPECTION_QUERY;
    }

    return INTROSPECTION_QUERY;
  }

  /**
   * Process introspection result and convert to universal schema
   */
  private processIntrospectionResult(
    introspectionData: GraphQLIntrospectionResponse,
    sourceUrl: string,
    warnings: string[] = []
  ): IntrospectionResult {
    try {
      const schema = this.converter.convertSchema(
        introspectionData.data!.__schema,
        sourceUrl
      );

      return {
        success: true,
        schema,
        warnings,
        metadata: {
          endpoint: sourceUrl,
          typeCount: schema.types ? Object.keys(schema.types).length : 0,
          operationCount: schema.operations.length,
          introspectionTimestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to convert GraphQL schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings,
        metadata: {
          endpoint: sourceUrl,
          conversionError: String(error)
        }
      };
    }
  }
}
