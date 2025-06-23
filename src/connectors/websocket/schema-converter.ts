/**
 * WebSocket to Universal Schema Converter
 * 
 * This module converts WebSocket introspection results into the universal
 * schema format used by the API Explorer. It handles the mapping between
 * WebSocket-specific concepts and the normalized schema representation.
 * 
 * Key conversions:
 * - WebSocket events -> Operation definitions
 * - Message patterns -> SchemaField definitions
 * - WebSocket protocols -> Metadata
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
  WebSocketSession,
  WebSocketEvent,
  WebSocketMessagePattern,
  WebSocketProtocol,
  WebSocketMessage,
  ProtocolDetectionResult
} from './types';

/**
 * Converts WebSocket introspection results to universal schema format
 */
export class WebSocketSchemaConverter {
  /**
   * Convert WebSocket session to universal schema
   */
  public convertSession(
    session: WebSocketSession,
    patterns: WebSocketMessagePattern[],
    protocolDetection: ProtocolDetectionResult,
    sourceUrl: string,
    apiName?: string
  ): UniversalSchema {
    const operations: Operation[] = [];
    const types: Record<string, SchemaField> = {};

    // Convert message patterns to reusable types
    for (const pattern of patterns) {
      types[pattern.name] = this.convertPatternToSchemaField(pattern);
    }

    // Convert events to operations
    for (const event of session.events) {
      operations.push(this.convertEventToOperation(event, patterns));
    }

    // Add connection operation
    operations.unshift(this.createConnectionOperation(session.endpoint));

    return {
      id: this.generateSchemaId(sourceUrl),
      name: apiName || this.extractApiName(sourceUrl),
      version: '1.0.0', // WebSocket doesn't have built-in versioning
      protocol: APIProtocol.WEBSOCKET,
      baseUrl: sourceUrl,
      description: this.createDescription(session, protocolDetection),
      operations,
      types,
      authentication: this.extractAuthentication(session),
      metadata: this.createMetadata(session, protocolDetection),
      discoveredAt: new Date(),
      source: sourceUrl
    };
  }

  /**
   * Convert WebSocket event to operation
   */
  private convertEventToOperation(
    event: WebSocketEvent,
    patterns: WebSocketMessagePattern[]
  ): Operation {
    const parameters: Parameter[] = [];
    const responses: Response[] = [];

    // Find matching pattern for this event
    const matchingPattern = patterns.find(p => 
      event.examples.some(example => this.messageMatchesPattern(example, p))
    );

    // Create parameter for message data
    if (matchingPattern) {
      parameters.push({
        name: 'message',
        location: 'body',
        schema: {
          name: 'message',
          type: DataType.OBJECT,
          required: true,
          description: `Message data for ${event.name} event`,
          properties: this.extractFieldsFromPattern(matchingPattern)
        },
        required: true,
        description: `Message payload for ${event.name} event`
      });
    } else if (event.examples.length > 0) {
      // Infer schema from examples
      const exampleSchema = this.inferSchemaFromExamples(event.examples);
      parameters.push({
        name: 'message',
        location: 'body',
        schema: exampleSchema,
        required: true,
        description: `Message payload for ${event.name} event`
      });
    }

    // Create response for bidirectional events
    if (event.direction === 'bidirectional' || event.direction === 'incoming') {
      responses.push({
        statusCode: 'success',
        description: `Successful ${event.name} event response`,
        schema: matchingPattern ? {
          name: 'response',
          type: DataType.OBJECT,
          required: true,
          description: `Response data for ${event.name} event`
        } : undefined
      });
    }

    return {
      id: `websocket_${event.name}`,
      name: event.name,
      type: 'message',
      description: event.description || `WebSocket ${event.name} event`,
      parameters,
      responses,
      deprecated: event.deprecated,
      metadata: {
        websocket: {
          direction: event.direction,
          frequency: event.frequency,
          examples: event.examples.slice(0, 3).map(ex => ({
            data: ex.parsed || ex.data,
            timestamp: ex.timestamp,
            size: ex.size
          }))
        }
      }
    };
  }

  /**
   * Convert message pattern to schema field
   */
  private convertPatternToSchemaField(pattern: WebSocketMessagePattern): SchemaField {
    const properties: Record<string, SchemaField> = {};

    // Convert required fields
    for (const field of pattern.requiredFields) {
      properties[field] = {
        name: field,
        type: this.mapFieldType(pattern.fieldTypes[field] || 'unknown'),
        required: true,
        description: `Required field for ${pattern.name}`
      };
    }

    // Convert optional fields
    for (const field of pattern.optionalFields) {
      properties[field] = {
        name: field,
        type: this.mapFieldType(pattern.fieldTypes[field] || 'unknown'),
        required: false,
        description: `Optional field for ${pattern.name}`
      };
    }

    return {
      name: pattern.name,
      type: DataType.OBJECT,
      required: true,
      description: pattern.description,
      properties,
      metadata: {
        websocket: {
          frequency: pattern.frequency,
          examples: pattern.examples.slice(0, 2)
        }
      }
    };
  }

  /**
   * Create connection operation
   */
  private createConnectionOperation(endpoint: any): Operation {
    return {
      id: 'websocket_connect',
      name: 'Connect',
      type: 'endpoint',
      description: 'Establish WebSocket connection',
      parameters: [],
      responses: [
        {
          statusCode: '101',
          description: 'WebSocket connection established'
        },
        {
          statusCode: '400',
          description: 'Bad request - connection failed'
        },
        {
          statusCode: '401',
          description: 'Unauthorized - authentication required'
        }
      ],
      metadata: {
        websocket: {
          protocol: endpoint.protocol,
          subprotocols: endpoint.subprotocols,
          headers: endpoint.headers
        }
      }
    };
  }

  /**
   * Extract fields from message pattern
   */
  private extractFieldsFromPattern(pattern: WebSocketMessagePattern): Record<string, SchemaField> {
    const properties: Record<string, SchemaField> = {};

    for (const field of [...pattern.requiredFields, ...pattern.optionalFields]) {
      properties[field] = {
        name: field,
        type: this.mapFieldType(pattern.fieldTypes[field] || 'unknown'),
        required: pattern.requiredFields.includes(field)
      };
    }

    return properties;
  }

  /**
   * Infer schema from message examples
   */
  private inferSchemaFromExamples(examples: WebSocketMessage[]): SchemaField {
    if (examples.length === 0) {
      return {
        name: 'message',
        type: DataType.UNKNOWN,
        required: true
      };
    }

    // Use first example to infer structure
    const firstExample = examples[0];
    const data = firstExample.parsed || firstExample.data;

    if (typeof data === 'object' && data !== null) {
      const properties: Record<string, SchemaField> = {};
      
      for (const [key, value] of Object.entries(data)) {
        properties[key] = {
          name: key,
          type: this.inferDataType(value),
          required: true // Assume required for now
        };
      }

      return {
        name: 'message',
        type: DataType.OBJECT,
        required: true,
        properties
      };
    }

    return {
      name: 'message',
      type: this.inferDataType(data),
      required: true
    };
  }

  /**
   * Map field type string to DataType
   */
  private mapFieldType(fieldType: string): DataType {
    switch (fieldType.toLowerCase()) {
      case 'string':
        return DataType.STRING;
      case 'number':
      case 'float':
      case 'double':
        return DataType.NUMBER;
      case 'integer':
      case 'int':
        return DataType.INTEGER;
      case 'boolean':
      case 'bool':
        return DataType.BOOLEAN;
      case 'array':
        return DataType.ARRAY;
      case 'object':
        return DataType.OBJECT;
      case 'null':
        return DataType.NULL;
      default:
        return DataType.UNKNOWN;
    }
  }

  /**
   * Infer data type from value
   */
  private inferDataType(value: any): DataType {
    if (value === null) return DataType.NULL;
    if (typeof value === 'string') return DataType.STRING;
    if (typeof value === 'number') {
      return Number.isInteger(value) ? DataType.INTEGER : DataType.NUMBER;
    }
    if (typeof value === 'boolean') return DataType.BOOLEAN;
    if (Array.isArray(value)) return DataType.ARRAY;
    if (typeof value === 'object') return DataType.OBJECT;
    return DataType.UNKNOWN;
  }

  /**
   * Check if message matches pattern
   */
  private messageMatchesPattern(message: WebSocketMessage, pattern: WebSocketMessagePattern): boolean {
    const data = message.parsed || message.data;
    if (typeof data !== 'object' || data === null) return false;

    // Check if all required fields are present
    for (const field of pattern.requiredFields) {
      if (!(field in data)) return false;
    }

    return true;
  }

  /**
   * Extract authentication information
   */
  private extractAuthentication(session: WebSocketSession): AuthenticationInfo | undefined {
    const auth = session.endpoint.authentication;
    if (!auth || auth.type === 'none') {
      return { type: 'none' };
    }

    return {
      type: 'custom',
      description: auth.description || `${auth.type} authentication required`
    };
  }

  /**
   * Create schema description
   */
  private createDescription(session: WebSocketSession, protocolDetection: ProtocolDetectionResult): string {
    const protocol = protocolDetection.protocol === WebSocketProtocol.RAW ? 'WebSocket' : protocolDetection.protocol;
    const eventCount = session.events.length;
    const messageCount = session.messages.length;
    
    return `${protocol} API discovered via introspection. Found ${eventCount} events from ${messageCount} captured messages.`;
  }

  /**
   * Create schema metadata
   */
  private createMetadata(session: WebSocketSession, protocolDetection: ProtocolDetectionResult): SchemaMetadata {
    return {
      extensions: {
        websocket: {
          protocol: protocolDetection.protocol,
          confidence: protocolDetection.confidence,
          sessionDuration: session.statistics.connectionDuration,
          totalMessages: session.statistics.totalMessages,
          messagesByType: session.statistics.messagesByType,
          averageMessageSize: session.statistics.averageMessageSize,
          detectionReasoning: protocolDetection.reasoning
        }
      }
    };
  }

  /**
   * Generate unique schema ID
   */
  private generateSchemaId(sourceUrl: string): string {
    let hash = 0;
    for (let i = 0; i < sourceUrl.length; i++) {
      const char = sourceUrl.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `websocket_${Math.abs(hash).toString(36)}_${Date.now()}`;
  }

  /**
   * Extract API name from URL
   */
  private extractApiName(sourceUrl: string): string {
    try {
      const url = new URL(sourceUrl);
      return url.hostname.replace(/^ws\./, '').replace(/^wss\./, '') || 'WebSocket API';
    } catch {
      return 'WebSocket API';
    }
  }
}
