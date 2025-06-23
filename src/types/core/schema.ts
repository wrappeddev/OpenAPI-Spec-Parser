/**
 * Core schema types for the Universal API Schema Explorer
 * 
 * This module defines the unified schema representation that normalizes
 * different API protocols (REST, GraphQL, WebSocket) into a common format.
 * 
 * Design Decisions:
 * 1. Protocol-agnostic: Schema structure works for REST, GraphQL, and WebSocket
 * 2. Extensible: Additional metadata can be added without breaking existing code
 * 3. Type-safe: Full TypeScript support with strict typing
 * 4. Hierarchical: Supports nested types and complex relationships
 */

/**
 * Supported API protocol types
 */
export enum APIProtocol {
  REST = 'rest',
  GRAPHQL = 'graphql',
  WEBSOCKET = 'websocket'
}

/**
 * HTTP methods for REST APIs
 */
export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

/**
 * Basic data types supported across all protocols
 */
export enum DataType {
  STRING = 'string',
  NUMBER = 'number',
  INTEGER = 'integer',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  NULL = 'null',
  UNKNOWN = 'unknown'
}

/**
 * Field definition for schema properties
 */
export interface SchemaField {
  /** Field name */
  name: string;
  /** Field data type */
  type: DataType;
  /** Whether the field is required */
  required: boolean;
  /** Field description */
  description?: string;
  /** Default value */
  defaultValue?: unknown;
  /** For array types, the type of array items */
  items?: SchemaField;
  /** For object types, nested properties */
  properties?: Record<string, SchemaField>;
  /** Validation constraints */
  constraints?: FieldConstraints;
  /** Protocol-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Validation constraints for fields
 */
export interface FieldConstraints {
  /** Minimum value (for numbers) or length (for strings/arrays) */
  minimum?: number;
  /** Maximum value (for numbers) or length (for strings/arrays) */
  maximum?: number;
  /** Regular expression pattern (for strings) */
  pattern?: string;
  /** Enumerated values */
  enum?: unknown[];
  /** Format specification (e.g., 'email', 'date-time') */
  format?: string;
}

/**
 * Parameter definition for operations
 */
export interface Parameter {
  /** Parameter name */
  name: string;
  /** Parameter location (query, path, header, body) */
  location: 'query' | 'path' | 'header' | 'body';
  /** Parameter schema */
  schema: SchemaField;
  /** Whether parameter is required */
  required: boolean;
  /** Parameter description */
  description?: string;
}

/**
 * Response definition
 */
export interface Response {
  /** HTTP status code (for REST) or response type identifier */
  statusCode: string;
  /** Response description */
  description?: string;
  /** Response schema */
  schema?: SchemaField;
  /** Response headers */
  headers?: Record<string, SchemaField>;
}

/**
 * Operation definition (REST endpoint, GraphQL query/mutation, WebSocket message)
 */
export interface Operation {
  /** Operation identifier */
  id: string;
  /** Operation name */
  name: string;
  /** Operation type */
  type: 'query' | 'mutation' | 'subscription' | 'endpoint' | 'message';
  /** Operation description */
  description?: string;
  /** HTTP method (for REST operations) */
  method?: HTTPMethod;
  /** Operation path or endpoint */
  path?: string;
  /** Operation parameters */
  parameters: Parameter[];
  /** Possible responses */
  responses: Response[];
  /** Operation tags/categories */
  tags?: string[];
  /** Whether operation is deprecated */
  deprecated?: boolean;
  /** Protocol-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Complete API schema representation
 */
export interface UniversalSchema {
  /** Schema identifier */
  id: string;
  /** API name */
  name: string;
  /** API version */
  version: string;
  /** API protocol */
  protocol: APIProtocol;
  /** Base URL or endpoint */
  baseUrl?: string;
  /** Schema description */
  description?: string;
  /** All operations in the API */
  operations: Operation[];
  /** Reusable type definitions */
  types: Record<string, SchemaField>;
  /** API authentication requirements */
  authentication?: AuthenticationInfo;
  /** Schema metadata */
  metadata?: SchemaMetadata;
  /** Timestamp when schema was discovered */
  discoveredAt: Date;
  /** Source URL or file path */
  source?: string;
}

/**
 * Authentication information
 */
export interface AuthenticationInfo {
  /** Authentication type */
  type: 'none' | 'apikey' | 'bearer' | 'basic' | 'oauth2' | 'custom';
  /** Authentication description */
  description?: string;
  /** Required scopes (for OAuth2) */
  scopes?: string[];
  /** Authentication metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Schema metadata for additional context
 */
export interface SchemaMetadata {
  /** Contact information */
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  /** License information */
  license?: {
    name: string;
    url?: string;
  };
  /** External documentation */
  externalDocs?: {
    description?: string;
    url: string;
  };
  /** Custom extensions */
  extensions?: Record<string, unknown>;
}
