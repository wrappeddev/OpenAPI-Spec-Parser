/**
 * OpenAPI to Universal Schema Converter
 * 
 * This module converts OpenAPI/Swagger specifications into the universal
 * schema format used by the API Explorer. It handles both OpenAPI 3.x
 * and Swagger 2.0 specifications.
 * 
 * Key conversions:
 * - OpenAPI paths -> Operation definitions
 * - OpenAPI schemas -> SchemaField definitions
 * - OpenAPI parameters -> Parameter definitions
 * - OpenAPI responses -> Response definitions
 */

import {
  UniversalSchema,
  SchemaField,
  Operation,
  Parameter,
  Response,
  DataType,
  HTTPMethod,
  APIProtocol,
  AuthenticationInfo,
  SchemaMetadata,
  FieldConstraints
} from '../../types/core';
import {
  OpenAPISpecification,
  OpenAPISchema,
  OpenAPIParameter,
  OpenAPIOperation,
  OpenAPIResponse,
  OpenAPIDataType,
  ParameterLocation,
  SecuritySchemeType
} from './openapi-types';

/**
 * Converts OpenAPI specifications to universal schema format
 */
export class OpenAPISchemaConverter {
  /**
   * Convert a complete OpenAPI specification to universal format
   */
  public convertSchema(
    spec: OpenAPISpecification,
    sourceUrl: string
  ): UniversalSchema {
    const operations: Operation[] = [];
    const types: Record<string, SchemaField> = {};

    // Extract reusable type definitions
    this.extractTypeDefinitions(spec, types);

    // Extract operations from paths
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem) continue;

      const pathOperations = this.extractOperationsFromPath(path, pathItem, spec);
      operations.push(...pathOperations);
    }

    const schema: UniversalSchema = {
      id: this.generateSchemaId(sourceUrl),
      name: spec.info.title,
      version: spec.info.version,
      protocol: APIProtocol.REST,
      operations,
      types,
      metadata: this.createMetadata(spec),
      discoveredAt: new Date(),
      source: sourceUrl
    };

    const baseUrl = this.extractBaseUrl(spec);
    if (baseUrl) {
      schema.baseUrl = baseUrl;
    }

    if (spec.info.description) {
      schema.description = spec.info.description;
    }

    const authentication = this.extractAuthentication(spec);
    if (authentication) {
      schema.authentication = authentication;
    }

    return schema;
  }

  /**
   * Extract reusable type definitions from OpenAPI spec
   */
  private extractTypeDefinitions(
    spec: OpenAPISpecification,
    types: Record<string, SchemaField>
  ): void {
    // OpenAPI 3.x components/schemas
    if (spec.components?.schemas) {
      for (const [name, schema] of Object.entries(spec.components.schemas)) {
        types[name] = this.convertOpenAPISchemaToSchemaField(schema, name);
      }
    }

    // Swagger 2.0 definitions
    if (spec.definitions) {
      for (const [name, schema] of Object.entries(spec.definitions)) {
        types[name] = this.convertOpenAPISchemaToSchemaField(schema, name);
      }
    }
  }

  /**
   * Extract operations from a path item
   */
  private extractOperationsFromPath(
    path: string,
    pathItem: any,
    spec: OpenAPISpecification
  ): Operation[] {
    const operations: Operation[] = [];
    const httpMethods: Array<{ method: HTTPMethod; operation?: OpenAPIOperation }> = [
      { method: HTTPMethod.GET, operation: pathItem.get },
      { method: HTTPMethod.POST, operation: pathItem.post },
      { method: HTTPMethod.PUT, operation: pathItem.put },
      { method: HTTPMethod.DELETE, operation: pathItem.delete },
      { method: HTTPMethod.PATCH, operation: pathItem.patch },
      { method: HTTPMethod.HEAD, operation: pathItem.head },
      { method: HTTPMethod.OPTIONS, operation: pathItem.options }
    ];

    for (const { method, operation } of httpMethods) {
      if (!operation) continue;

      const operationId = operation.operationId || `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      const op: Operation = {
        id: operationId,
        name: operation.summary || `${method} ${path}`,
        type: 'endpoint',
        method,
        path,
        parameters: this.extractParameters(operation, pathItem, spec),
        responses: this.extractResponses(operation.responses, spec),
        metadata: {
          openapi: {
            operationId: operation.operationId,
            consumes: operation.consumes,
            produces: operation.produces,
            security: operation.security
          }
        }
      };

      if (operation.description) {
        op.description = operation.description;
      }

      if (operation.tags) {
        op.tags = operation.tags;
      }

      if (operation.deprecated) {
        op.deprecated = operation.deprecated;
      }

      operations.push(op);
    }

    return operations;
  }

  /**
   * Extract parameters from operation and path item
   */
  private extractParameters(
    operation: OpenAPIOperation,
    pathItem: any,
    spec: OpenAPISpecification
  ): Parameter[] {
    const parameters: Parameter[] = [];

    // Path-level parameters
    if (pathItem.parameters) {
      for (const param of pathItem.parameters) {
        parameters.push(this.convertOpenAPIParameterToParameter(param, spec));
      }
    }

    // Operation-level parameters
    if (operation.parameters) {
      for (const param of operation.parameters) {
        parameters.push(this.convertOpenAPIParameterToParameter(param, spec));
      }
    }

    // Request body (OpenAPI 3.x)
    if (operation.requestBody) {
      const requestBodyParam = this.convertRequestBodyToParameter(operation.requestBody);
      if (requestBodyParam) {
        parameters.push(requestBodyParam);
      }
    }

    return parameters;
  }

  /**
   * Convert OpenAPI parameter to universal parameter
   */
  private convertOpenAPIParameterToParameter(
    param: OpenAPIParameter,
    spec: OpenAPISpecification
  ): Parameter {
    // Resolve $ref if present
    const resolvedParam = this.resolveReference(param, spec) as OpenAPIParameter;

    let schema: SchemaField;

    // OpenAPI 3.x style
    if (resolvedParam.schema) {
      schema = this.convertOpenAPISchemaToSchemaField(resolvedParam.schema, resolvedParam.name);
    } else {
      // Swagger 2.0 style
      schema = {
        name: resolvedParam.name,
        type: this.mapOpenAPITypeToDataType(resolvedParam.type || OpenAPIDataType.STRING),
        required: resolvedParam.required || false
      };

      if (resolvedParam.description) {
        schema.description = resolvedParam.description;
      }

      if (resolvedParam.default !== undefined) {
        schema.defaultValue = resolvedParam.default;
      }

      const constraints = this.extractConstraints(resolvedParam);
      if (constraints) {
        schema.constraints = constraints;
      }
    }

    const parameter: Parameter = {
      name: resolvedParam.name,
      location: this.mapParameterLocation(resolvedParam.in),
      schema,
      required: resolvedParam.required || false
    };

    if (resolvedParam.description) {
      parameter.description = resolvedParam.description;
    }

    return parameter;
  }

  /**
   * Convert OpenAPI request body to parameter
   */
  private convertRequestBodyToParameter(requestBody: any): Parameter | null {
    if (!requestBody.content) return null;

    // Get the first content type (usually application/json)
    const contentType = Object.keys(requestBody.content)[0];
    const content = requestBody.content[contentType];

    if (!content.schema) return null;

    return {
      name: 'body',
      location: 'body',
      schema: this.convertOpenAPISchemaToSchemaField(content.schema, 'body'),
      required: requestBody.required || false,
      description: requestBody.description
    };
  }

  /**
   * Extract responses from OpenAPI operation
   */
  private extractResponses(
    responses: Record<string, OpenAPIResponse>,
    spec: OpenAPISpecification
  ): Response[] {
    const result: Response[] = [];

    for (const [statusCode, responseSpec] of Object.entries(responses)) {
      const resolvedResponse = this.resolveReference(responseSpec, spec) as OpenAPIResponse;

      let schema: SchemaField | undefined;

      // OpenAPI 3.x style
      if (resolvedResponse.content) {
        const contentType = Object.keys(resolvedResponse.content)[0];
        const content = resolvedResponse.content[contentType];
        if (content.schema) {
          schema = this.convertOpenAPISchemaToSchemaField(content.schema, 'response');
        }
      } else if (resolvedResponse.schema) {
        // Swagger 2.0 style
        schema = this.convertOpenAPISchemaToSchemaField(resolvedResponse.schema, 'response');
      }

      const response: Response = {
        statusCode,
        description: resolvedResponse.description
      };

      if (schema) {
        response.schema = schema;
      }

      const headers = this.extractResponseHeaders(resolvedResponse);
      if (headers) {
        response.headers = headers;
      }

      result.push(response);
    }

    return result;
  }

  /**
   * Extract response headers
   */
  private extractResponseHeaders(response: OpenAPIResponse): Record<string, SchemaField> | undefined {
    if (!response.headers) return undefined;

    const headers: Record<string, SchemaField> = {};

    for (const [name, header] of Object.entries(response.headers)) {
      if ('schema' in header) {
        headers[name] = this.convertOpenAPISchemaToSchemaField(header.schema!, name);
      } else {
        // Treat as parameter-style header
        headers[name] = {
          name,
          type: this.mapOpenAPITypeToDataType((header as any).type || OpenAPIDataType.STRING),
          required: false,
          description: (header as any).description
        };
      }
    }

    return Object.keys(headers).length > 0 ? headers : undefined;
  }

  /**
   * Convert OpenAPI schema to universal schema field
   */
  private convertOpenAPISchemaToSchemaField(
    schema: OpenAPISchema,
    name: string
  ): SchemaField {
    // Resolve $ref if present
    const resolvedSchema = schema.$ref ? this.resolveSchemaReference(schema.$ref) : schema;

    const field: SchemaField = {
      name,
      type: this.mapOpenAPITypeToDataType(resolvedSchema.type || OpenAPIDataType.OBJECT),
      required: false // Will be set by parent context
    };

    if (resolvedSchema.description) {
      field.description = resolvedSchema.description;
    }

    if (resolvedSchema.default !== undefined) {
      field.defaultValue = resolvedSchema.default;
    }

    const constraints = this.extractSchemaConstraints(resolvedSchema);
    if (constraints) {
      field.constraints = constraints;
    }

    // Handle array items
    if (resolvedSchema.type === OpenAPIDataType.ARRAY && resolvedSchema.items) {
      field.items = this.convertOpenAPISchemaToSchemaField(resolvedSchema.items, 'item');
    }

    // Handle object properties
    if (resolvedSchema.type === OpenAPIDataType.OBJECT && resolvedSchema.properties) {
      field.properties = {};
      for (const [propName, propSchema] of Object.entries(resolvedSchema.properties)) {
        field.properties[propName] = this.convertOpenAPISchemaToSchemaField(propSchema, propName);
        field.properties[propName].required = resolvedSchema.required?.includes(propName) || false;
      }
    }

    // Add OpenAPI-specific metadata
    field.metadata = {
      openapi: {
        format: resolvedSchema.format,
        example: resolvedSchema.example,
        enum: resolvedSchema.enum,
        nullable: resolvedSchema.nullable,
        readOnly: resolvedSchema.readOnly,
        writeOnly: resolvedSchema.writeOnly,
        deprecated: resolvedSchema.deprecated
      }
    };

    return field;
  }

  /**
   * Map OpenAPI data type to universal data type
   */
  private mapOpenAPITypeToDataType(type?: OpenAPIDataType): DataType {
    switch (type) {
      case OpenAPIDataType.STRING:
        return DataType.STRING;
      case OpenAPIDataType.NUMBER:
        return DataType.NUMBER;
      case OpenAPIDataType.INTEGER:
        return DataType.INTEGER;
      case OpenAPIDataType.BOOLEAN:
        return DataType.BOOLEAN;
      case OpenAPIDataType.ARRAY:
        return DataType.ARRAY;
      case OpenAPIDataType.OBJECT:
        return DataType.OBJECT;
      case OpenAPIDataType.FILE:
        return DataType.STRING; // Files are represented as strings (base64, etc.)
      default:
        return DataType.UNKNOWN;
    }
  }

  /**
   * Map OpenAPI parameter location to universal location
   */
  private mapParameterLocation(location: ParameterLocation): 'query' | 'path' | 'header' | 'body' {
    switch (location) {
      case ParameterLocation.QUERY:
        return 'query';
      case ParameterLocation.PATH:
        return 'path';
      case ParameterLocation.HEADER:
        return 'header';
      case ParameterLocation.FORM_DATA:
      case ParameterLocation.BODY:
        return 'body';
      default:
        return 'query';
    }
  }

  /**
   * Extract constraints from OpenAPI parameter
   */
  private extractConstraints(param: OpenAPIParameter): FieldConstraints | undefined {
    const constraints: FieldConstraints = {};
    let hasConstraints = false;

    if (param.minimum !== undefined) {
      constraints.minimum = param.minimum;
      hasConstraints = true;
    }
    if (param.maximum !== undefined) {
      constraints.maximum = param.maximum;
      hasConstraints = true;
    }
    if (param.minLength !== undefined) {
      constraints.minimum = param.minLength;
      hasConstraints = true;
    }
    if (param.maxLength !== undefined) {
      constraints.maximum = param.maxLength;
      hasConstraints = true;
    }
    if (param.pattern) {
      constraints.pattern = param.pattern;
      hasConstraints = true;
    }
    if (param.enum) {
      constraints.enum = param.enum;
      hasConstraints = true;
    }

    return hasConstraints ? constraints : undefined;
  }

  /**
   * Extract constraints from OpenAPI schema
   */
  private extractSchemaConstraints(schema: OpenAPISchema): FieldConstraints | undefined {
    const constraints: FieldConstraints = {};
    let hasConstraints = false;

    if (schema.minimum !== undefined) {
      constraints.minimum = schema.minimum;
      hasConstraints = true;
    }
    if (schema.maximum !== undefined) {
      constraints.maximum = schema.maximum;
      hasConstraints = true;
    }
    if (schema.minLength !== undefined) {
      constraints.minimum = schema.minLength;
      hasConstraints = true;
    }
    if (schema.maxLength !== undefined) {
      constraints.maximum = schema.maxLength;
      hasConstraints = true;
    }
    if (schema.pattern) {
      constraints.pattern = schema.pattern;
      hasConstraints = true;
    }
    if (schema.enum) {
      constraints.enum = schema.enum;
      hasConstraints = true;
    }
    if (schema.format) {
      constraints.format = schema.format;
      hasConstraints = true;
    }

    return hasConstraints ? constraints : undefined;
  }

  /**
   * Resolve $ref reference (simplified implementation)
   */
  private resolveReference(obj: any, spec: OpenAPISpecification): any {
    if (!obj.$ref) return obj;

    // This is a simplified implementation
    // In a production system, you'd want a more robust JSON pointer resolver
    const refPath = obj.$ref.replace('#/', '').split('/');
    let resolved: any = spec;

    for (const segment of refPath) {
      resolved = resolved?.[segment];
    }

    return resolved || obj;
  }

  /**
   * Resolve schema reference (simplified implementation)
   */
  private resolveSchemaReference(_ref: string): OpenAPISchema {
    // This is a placeholder - in practice, you'd resolve against the full spec
    return { type: OpenAPIDataType.OBJECT };
  }

  /**
   * Extract base URL from OpenAPI specification
   */
  private extractBaseUrl(spec: OpenAPISpecification): string | undefined {
    // OpenAPI 3.x servers
    if (spec.servers && spec.servers.length > 0) {
      return spec.servers[0].url;
    }

    // Swagger 2.0 host/basePath
    if (spec.host) {
      const scheme = spec.schemes?.[0] || 'https';
      const basePath = spec.basePath || '';
      return `${scheme}://${spec.host}${basePath}`;
    }

    return undefined;
  }

  /**
   * Extract authentication information from OpenAPI specification
   */
  private extractAuthentication(spec: OpenAPISpecification): AuthenticationInfo | undefined {
    // Check for security definitions
    const securitySchemes = spec.components?.securitySchemes || spec.securityDefinitions;

    if (!securitySchemes || Object.keys(securitySchemes).length === 0) {
      return { type: 'none' };
    }

    // Get the first security scheme as primary
    const firstScheme = Object.values(securitySchemes)[0];

    switch (firstScheme.type) {
      case SecuritySchemeType.API_KEY: {
        const auth: AuthenticationInfo = {
          type: 'apikey',
          metadata: {
            name: firstScheme.name,
            in: firstScheme.in
          }
        };
        if (firstScheme.description) {
          auth.description = firstScheme.description;
        }
        return auth;
      }
      case SecuritySchemeType.HTTP: {
        const auth: AuthenticationInfo = {
          type: firstScheme.scheme === 'bearer' ? 'bearer' : 'basic',
          metadata: {
            scheme: firstScheme.scheme,
            bearerFormat: firstScheme.bearerFormat
          }
        };
        if (firstScheme.description) {
          auth.description = firstScheme.description;
        }
        return auth;
      }
      case SecuritySchemeType.OAUTH2: {
        const auth: AuthenticationInfo = {
          type: 'oauth2',
          scopes: this.extractOAuth2Scopes(firstScheme),
          metadata: {
            flows: firstScheme.flows
          }
        };
        if (firstScheme.description) {
          auth.description = firstScheme.description;
        }
        return auth;
      }
      case SecuritySchemeType.OPEN_ID_CONNECT: {
        const auth: AuthenticationInfo = {
          type: 'oauth2',
          metadata: {
            openIdConnectUrl: firstScheme.openIdConnectUrl
          }
        };
        if (firstScheme.description) {
          auth.description = firstScheme.description;
        }
        return auth;
      }
      default: {
        const auth: AuthenticationInfo = {
          type: 'custom'
        };
        if (firstScheme.description) {
          auth.description = firstScheme.description;
        }
        return auth;
      }
    }
  }

  /**
   * Extract OAuth2 scopes from security scheme
   */
  private extractOAuth2Scopes(scheme: any): string[] {
    const scopes: string[] = [];

    if (scheme.flows) {
      for (const flow of Object.values(scheme.flows)) {
        if ((flow as any).scopes) {
          scopes.push(...Object.keys((flow as any).scopes));
        }
      }
    }

    return [...new Set(scopes)]; // Remove duplicates
  }

  /**
   * Create schema metadata
   */
  private createMetadata(spec: OpenAPISpecification): SchemaMetadata {
    const metadata: SchemaMetadata = {
      extensions: {
        openapi: {
          version: spec.openapi || spec.swagger,
          pathCount: Object.keys(spec.paths).length,
          tagCount: spec.tags?.length || 0,
          hasServers: !!(spec.servers && spec.servers.length > 0),
          hasComponents: !!(spec.components && Object.keys(spec.components).length > 0)
        }
      }
    };

    if (spec.info.contact) {
      metadata.contact = spec.info.contact;
    }

    if (spec.info.license) {
      metadata.license = spec.info.license;
    }

    if (spec.externalDocs) {
      metadata.externalDocs = spec.externalDocs;
    }

    return metadata;
  }

  /**
   * Generate unique schema ID
   */
  private generateSchemaId(sourceUrl: string): string {
    // Use a simple hash instead of Buffer for browser compatibility
    let hash = 0;
    for (let i = 0; i < sourceUrl.length; i++) {
      const char = sourceUrl.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `rest_${Math.abs(hash).toString(36)}_${Date.now()}`;
  }
}
