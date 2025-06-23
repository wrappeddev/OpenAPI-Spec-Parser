/**
 * OpenAPI/Swagger specification types
 * 
 * These types represent the structure of OpenAPI 3.x and Swagger 2.x specifications
 * as defined by the OpenAPI Initiative. They are used for parsing and validating
 * API specifications.
 */

/**
 * OpenAPI specification versions
 */
export enum OpenAPIVersion {
  SWAGGER_2 = '2.0',
  OPENAPI_3_0 = '3.0',
  OPENAPI_3_1 = '3.1'
}

/**
 * HTTP security scheme types
 */
export enum SecuritySchemeType {
  API_KEY = 'apiKey',
  HTTP = 'http',
  OAUTH2 = 'oauth2',
  OPEN_ID_CONNECT = 'openIdConnect'
}

/**
 * Parameter locations
 */
export enum ParameterLocation {
  QUERY = 'query',
  HEADER = 'header',
  PATH = 'path',
  COOKIE = 'cookie',
  FORM_DATA = 'formData',
  BODY = 'body'
}

/**
 * OpenAPI data types
 */
export enum OpenAPIDataType {
  STRING = 'string',
  NUMBER = 'number',
  INTEGER = 'integer',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  FILE = 'file'
}

/**
 * OpenAPI schema object
 */
export interface OpenAPISchema {
  type?: OpenAPIDataType;
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  example?: unknown;
  examples?: unknown[];
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: OpenAPISchema;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  additionalProperties?: boolean | OpenAPISchema;
  allOf?: OpenAPISchema[];
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  not?: OpenAPISchema;
  $ref?: string;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
}

/**
 * OpenAPI parameter object
 */
export interface OpenAPIParameter {
  name: string;
  in: ParameterLocation;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  schema?: OpenAPISchema;
  type?: OpenAPIDataType; // Swagger 2.0
  format?: string; // Swagger 2.0
  items?: OpenAPISchema; // Swagger 2.0
  collectionFormat?: string; // Swagger 2.0
  default?: unknown; // Swagger 2.0
  maximum?: number; // Swagger 2.0
  minimum?: number; // Swagger 2.0
  maxLength?: number; // Swagger 2.0
  minLength?: number; // Swagger 2.0
  pattern?: string; // Swagger 2.0
  enum?: unknown[]; // Swagger 2.0
}

/**
 * OpenAPI response object
 */
export interface OpenAPIResponse {
  description: string;
  headers?: Record<string, OpenAPIParameter | OpenAPISchema>;
  content?: Record<string, {
    schema?: OpenAPISchema;
    example?: unknown;
    examples?: Record<string, unknown>;
  }>;
  schema?: OpenAPISchema; // Swagger 2.0
  examples?: Record<string, unknown>; // Swagger 2.0
}

/**
 * OpenAPI request body object (OpenAPI 3.x)
 */
export interface OpenAPIRequestBody {
  description?: string;
  content: Record<string, {
    schema?: OpenAPISchema;
    example?: unknown;
    examples?: Record<string, unknown>;
  }>;
  required?: boolean;
}

/**
 * OpenAPI operation object
 */
export interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  deprecated?: boolean;
  security?: Record<string, string[]>[];
  consumes?: string[]; // Swagger 2.0
  produces?: string[]; // Swagger 2.0
}

/**
 * OpenAPI path item object
 */
export interface OpenAPIPathItem {
  summary?: string;
  description?: string;
  get?: OpenAPIOperation;
  put?: OpenAPIOperation;
  post?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  trace?: OpenAPIOperation;
  parameters?: OpenAPIParameter[];
}

/**
 * OpenAPI info object
 */
export interface OpenAPIInfo {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
  version: string;
}

/**
 * OpenAPI server object (OpenAPI 3.x)
 */
export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, {
    enum?: string[];
    default: string;
    description?: string;
  }>;
}

/**
 * OpenAPI security scheme object
 */
export interface OpenAPISecurityScheme {
  type: SecuritySchemeType;
  description?: string;
  name?: string; // For apiKey
  in?: 'query' | 'header' | 'cookie'; // For apiKey
  scheme?: string; // For http
  bearerFormat?: string; // For http bearer
  flows?: {
    implicit?: {
      authorizationUrl: string;
      refreshUrl?: string;
      scopes: Record<string, string>;
    };
    password?: {
      tokenUrl: string;
      refreshUrl?: string;
      scopes: Record<string, string>;
    };
    clientCredentials?: {
      tokenUrl: string;
      refreshUrl?: string;
      scopes: Record<string, string>;
    };
    authorizationCode?: {
      authorizationUrl: string;
      tokenUrl: string;
      refreshUrl?: string;
      scopes: Record<string, string>;
    };
  }; // For oauth2
  openIdConnectUrl?: string; // For openIdConnect
}

/**
 * Complete OpenAPI specification
 */
export interface OpenAPISpecification {
  openapi?: string; // OpenAPI 3.x
  swagger?: string; // Swagger 2.0
  info: OpenAPIInfo;
  servers?: OpenAPIServer[]; // OpenAPI 3.x
  host?: string; // Swagger 2.0
  basePath?: string; // Swagger 2.0
  schemes?: string[]; // Swagger 2.0
  paths: Record<string, OpenAPIPathItem>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
    responses?: Record<string, OpenAPIResponse>;
    parameters?: Record<string, OpenAPIParameter>;
    examples?: Record<string, unknown>;
    requestBodies?: Record<string, OpenAPIRequestBody>;
    headers?: Record<string, OpenAPIParameter | OpenAPISchema>;
    securitySchemes?: Record<string, OpenAPISecurityScheme>;
    links?: Record<string, unknown>;
    callbacks?: Record<string, unknown>;
  }; // OpenAPI 3.x
  definitions?: Record<string, OpenAPISchema>; // Swagger 2.0
  parameters?: Record<string, OpenAPIParameter>; // Swagger 2.0
  responses?: Record<string, OpenAPIResponse>; // Swagger 2.0
  securityDefinitions?: Record<string, OpenAPISecurityScheme>; // Swagger 2.0
  security?: Record<string, string[]>[];
  tags?: Array<{
    name: string;
    description?: string;
    externalDocs?: {
      description?: string;
      url: string;
    };
  }>;
  externalDocs?: {
    description?: string;
    url: string;
  };
}
