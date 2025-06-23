/**
 * GraphQL to Universal Schema Converter
 * 
 * This module converts GraphQL introspection results into the universal
 * schema format used by the API Explorer. It handles the mapping between
 * GraphQL-specific concepts and the normalized schema representation.
 * 
 * Key conversions:
 * - GraphQL types -> SchemaField definitions
 * - GraphQL queries/mutations -> Operation definitions
 * - GraphQL arguments -> Parameter definitions
 * - GraphQL return types -> Response definitions
 */

import {
  UniversalSchema,
  SchemaField,
  Operation,
  Parameter,
  Response,
  DataType,
  APIProtocol,
  AuthenticationInfo,
  SchemaMetadata
} from '../../types/core';
import {
  GraphQLIntrospectionSchema,
  GraphQLType,
  GraphQLTypeRef,
  GraphQLTypeKind,
  GraphQLField,
  GraphQLInputValue
} from './types';

/**
 * Converts GraphQL introspection schema to universal schema format
 */
export class GraphQLSchemaConverter {
  /**
   * Convert a complete GraphQL schema to universal format
   */
  public convertSchema(
    introspectionSchema: GraphQLIntrospectionSchema,
    sourceUrl: string,
    apiName?: string
  ): UniversalSchema {
    const operations: Operation[] = [];
    const types: Record<string, SchemaField> = {};

    // Process all types and extract operations
    for (const type of introspectionSchema.types) {
      // Skip built-in GraphQL types
      if (this.isBuiltInType(type.name)) {
        continue;
      }

      // Convert type to schema field for reusable types
      if (type.kind === GraphQLTypeKind.OBJECT || 
          type.kind === GraphQLTypeKind.INPUT_OBJECT ||
          type.kind === GraphQLTypeKind.INTERFACE) {
        types[type.name!] = this.convertTypeToSchemaField(type);
      }

      // Extract operations from root types
      if (this.isRootType(type.name, introspectionSchema)) {
        operations.push(...this.extractOperationsFromType(type, introspectionSchema));
      }
    }

    return {
      id: this.generateSchemaId(sourceUrl),
      name: apiName || this.extractApiName(sourceUrl),
      version: '1.0.0', // GraphQL doesn't have built-in versioning
      protocol: APIProtocol.GRAPHQL,
      baseUrl: sourceUrl,
      description: 'GraphQL API discovered via introspection',
      operations,
      types,
      authentication: this.inferAuthentication(),
      metadata: this.createMetadata(introspectionSchema),
      discoveredAt: new Date(),
      source: sourceUrl
    };
  }

  /**
   * Convert GraphQL type to universal schema field
   */
  private convertTypeToSchemaField(type: GraphQLType): SchemaField {
    const properties: Record<string, SchemaField> = {};

    // Process fields for object types
    if (type.fields) {
      for (const field of type.fields) {
        properties[field.name] = {
          name: field.name,
          type: this.convertGraphQLTypeToDataType(field.type),
          required: this.isNonNullType(field.type),
          description: field.description,
          metadata: {
            graphql: {
              isDeprecated: field.isDeprecated,
              deprecationReason: field.deprecationReason,
              arguments: field.args.map(arg => this.convertInputValueToParameter(arg))
            }
          }
        };
      }
    }

    // Process input fields for input types
    if (type.inputFields) {
      for (const inputField of type.inputFields) {
        properties[inputField.name] = {
          name: inputField.name,
          type: this.convertGraphQLTypeToDataType(inputField.type),
          required: this.isNonNullType(inputField.type),
          description: inputField.description,
          defaultValue: inputField.defaultValue ? JSON.parse(inputField.defaultValue) : undefined
        };
      }
    }

    return {
      name: type.name!,
      type: DataType.OBJECT,
      required: true,
      description: type.description,
      properties,
      metadata: {
        graphql: {
          kind: type.kind,
          interfaces: type.interfaces?.map(iface => iface.name),
          possibleTypes: type.possibleTypes?.map(pType => pType.name)
        }
      }
    };
  }

  /**
   * Extract operations from a root type (Query, Mutation, Subscription)
   */
  private extractOperationsFromType(
    type: GraphQLType,
    schema: GraphQLIntrospectionSchema
  ): Operation[] {
    if (!type.fields) {
      return [];
    }

    const operationType = this.getOperationType(type.name!, schema);
    
    return type.fields.map(field => ({
      id: `${operationType}_${field.name}`,
      name: field.name,
      type: operationType as 'query' | 'mutation' | 'subscription',
      description: field.description,
      parameters: field.args.map(arg => this.convertInputValueToParameter(arg)),
      responses: [{
        statusCode: '200',
        description: 'Successful response',
        schema: {
          name: 'response',
          type: this.convertGraphQLTypeToDataType(field.type),
          required: true,
          description: `Response for ${field.name}`
        }
      }],
      deprecated: field.isDeprecated,
      metadata: {
        graphql: {
          deprecationReason: field.deprecationReason,
          returnType: this.getTypeString(field.type)
        }
      }
    }));
  }

  /**
   * Convert GraphQL input value to universal parameter
   */
  private convertInputValueToParameter(inputValue: GraphQLInputValue): Parameter {
    return {
      name: inputValue.name,
      location: 'body', // GraphQL arguments are always in the request body
      schema: {
        name: inputValue.name,
        type: this.convertGraphQLTypeToDataType(inputValue.type),
        required: this.isNonNullType(inputValue.type),
        description: inputValue.description,
        defaultValue: inputValue.defaultValue ? JSON.parse(inputValue.defaultValue) : undefined
      },
      required: this.isNonNullType(inputValue.type),
      description: inputValue.description
    };
  }

  /**
   * Convert GraphQL type reference to universal data type
   */
  private convertGraphQLTypeToDataType(typeRef: GraphQLTypeRef): DataType {
    // Handle non-null and list wrappers
    let currentType = typeRef;
    let isList = false;

    // Unwrap NON_NULL and LIST wrappers
    while (currentType.ofType) {
      if (currentType.kind === GraphQLTypeKind.LIST) {
        isList = true;
      }
      currentType = currentType.ofType;
    }

    // Return array type if it's a list
    if (isList) {
      return DataType.ARRAY;
    }

    // Map GraphQL scalar types to universal types
    switch (currentType.kind) {
      case GraphQLTypeKind.SCALAR:
        return this.mapScalarType(currentType.name!);
      case GraphQLTypeKind.ENUM:
        return DataType.STRING; // Enums are represented as strings
      case GraphQLTypeKind.OBJECT:
      case GraphQLTypeKind.INTERFACE:
      case GraphQLTypeKind.UNION:
      case GraphQLTypeKind.INPUT_OBJECT:
        return DataType.OBJECT;
      default:
        return DataType.UNKNOWN;
    }
  }

  /**
   * Map GraphQL scalar types to universal data types
   */
  private mapScalarType(scalarName: string): DataType {
    switch (scalarName) {
      case 'String':
      case 'ID':
        return DataType.STRING;
      case 'Int':
        return DataType.INTEGER;
      case 'Float':
        return DataType.NUMBER;
      case 'Boolean':
        return DataType.BOOLEAN;
      default:
        // Custom scalars default to string
        return DataType.STRING;
    }
  }

  /**
   * Check if a GraphQL type is non-null (required)
   */
  private isNonNullType(typeRef: GraphQLTypeRef): boolean {
    return typeRef.kind === GraphQLTypeKind.NON_NULL;
  }

  /**
   * Check if a type name is a built-in GraphQL type
   */
  private isBuiltInType(typeName?: string): boolean {
    if (!typeName) return true;

    const builtInTypes = [
      '__Schema', '__Type', '__TypeKind', '__Field', '__InputValue',
      '__EnumValue', '__Directive', '__DirectiveLocation'
    ];

    return typeName.startsWith('__') || builtInTypes.includes(typeName);
  }

  /**
   * Check if a type is a root type (Query, Mutation, Subscription)
   */
  private isRootType(typeName: string | undefined, schema: GraphQLIntrospectionSchema): boolean {
    if (!typeName) return false;

    return typeName === schema.queryType?.name ||
           typeName === schema.mutationType?.name ||
           typeName === schema.subscriptionType?.name;
  }

  /**
   * Get operation type for a root type name
   */
  private getOperationType(typeName: string, schema: GraphQLIntrospectionSchema): string {
    if (typeName === schema.queryType?.name) return 'query';
    if (typeName === schema.mutationType?.name) return 'mutation';
    if (typeName === schema.subscriptionType?.name) return 'subscription';
    return 'query'; // Default fallback
  }

  /**
   * Get string representation of a GraphQL type
   */
  private getTypeString(typeRef: GraphQLTypeRef): string {
    if (typeRef.kind === GraphQLTypeKind.NON_NULL && typeRef.ofType) {
      return `${this.getTypeString(typeRef.ofType)}!`;
    }
    if (typeRef.kind === GraphQLTypeKind.LIST && typeRef.ofType) {
      return `[${this.getTypeString(typeRef.ofType)}]`;
    }
    return typeRef.name || 'Unknown';
  }

  /**
   * Generate unique schema ID
   */
  private generateSchemaId(sourceUrl: string): string {
    return `graphql_${Buffer.from(sourceUrl).toString('base64').slice(0, 8)}_${Date.now()}`;
  }

  /**
   * Extract API name from URL
   */
  private extractApiName(sourceUrl: string): string {
    try {
      const url = new URL(sourceUrl);
      return url.hostname.replace(/^www\./, '') || 'GraphQL API';
    } catch {
      return 'GraphQL API';
    }
  }

  /**
   * Infer authentication requirements (basic heuristic)
   */
  private inferAuthentication(): AuthenticationInfo {
    // This is a basic implementation - in practice, you might analyze
    // the schema for auth-related fields or directives
    return {
      type: 'custom',
      description: 'Authentication method not determined from schema introspection'
    };
  }

  /**
   * Create schema metadata
   */
  private createMetadata(schema: GraphQLIntrospectionSchema): SchemaMetadata {
    return {
      extensions: {
        graphql: {
          typeCount: schema.types.length,
          directiveCount: schema.directives.length,
          hasQuery: !!schema.queryType,
          hasMutation: !!schema.mutationType,
          hasSubscription: !!schema.subscriptionType
        }
      }
    };
  }
}
