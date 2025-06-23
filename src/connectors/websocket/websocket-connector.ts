/**
 * WebSocket API Connector
 * 
 * This connector implements the APIConnector interface for WebSocket APIs.
 * It connects to WebSocket endpoints, captures messages, analyzes patterns,
 * and converts the results to the universal schema format.
 * 
 * Features:
 * - Real-time WebSocket connection and message capture
 * - Protocol detection (raw WebSocket, Socket.IO, etc.)
 * - Message pattern analysis and schema inference
 * - Support for various WebSocket authentication methods
 */

import WebSocket from 'ws';
import {
  APIConnector,
  ConnectorConfig,
  ConnectionTestResult,
  IntrospectionResult,
  APIProtocol,
  ConnectionError,
  IntrospectionError
} from '../../types/core';
import {
  WebSocketSession,
  WebSocketMessage,
  WebSocketEvent,
  WebSocketMessagePattern,
  WebSocketProtocol,
  WebSocketState,
  WebSocketMessageType,
  WebSocketIntrospectionConfig,
  ProtocolDetectionResult
} from './types';
import { WebSocketSchemaConverter } from './schema-converter';

/**
 * WebSocket-specific configuration options
 */
export interface WebSocketConnectorConfig extends ConnectorConfig {
  /** Introspection configuration */
  introspection?: WebSocketIntrospectionConfig;
  /** WebSocket subprotocols to try */
  subprotocols?: string[];
  /** Custom WebSocket options */
  wsOptions?: any;
}

/**
 * WebSocket API connector implementation
 */
export class WebSocketConnector implements APIConnector {
  public readonly protocol = APIProtocol.WEBSOCKET;
  public readonly name = 'WebSocket Connector';
  public readonly version = '1.0.0';

  private readonly converter = new WebSocketSchemaConverter();

  /**
   * Test connection to WebSocket endpoint
   */
  public async testConnection(config: ConnectorConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      const wsConfig = config as WebSocketConnectorConfig;
      const ws = await this.createWebSocketConnection(wsConfig);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve({
            success: false,
            responseTime: Date.now() - startTime,
            error: 'Connection timeout',
            metadata: {
              endpoint: config.url,
              timeout: config.timeout || 10000
            }
          });
        }, config.timeout || 10000);

        ws.on('open', () => {
          clearTimeout(timeout);
          const responseTime = Date.now() - startTime;
          ws.close();
          
          resolve({
            success: true,
            responseTime,
            metadata: {
              endpoint: config.url,
              protocol: ws.protocol,
              readyState: ws.readyState
            }
          });
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          ws.close();
          
          resolve({
            success: false,
            responseTime: Date.now() - startTime,
            error: `WebSocket error: ${error.message}`,
            metadata: {
              endpoint: config.url,
              error: error.message
            }
          });
        });
      });
    } catch (error) {
      throw new ConnectionError(
        `Failed to test WebSocket connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { url: config.url, error: String(error) }
      );
    }
  }

  /**
   * Introspect WebSocket API and return universal schema
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

      const wsConfig = config as WebSocketConnectorConfig;
      const introspectionConfig = wsConfig.introspection || {};

      // Perform introspection session
      const session = await this.performIntrospectionSession(wsConfig, introspectionConfig);
      
      // Analyze message patterns
      const patterns = this.analyzeMessagePatterns(session.messages);
      
      // Detect protocol
      const protocolDetection = this.detectProtocol(session);
      
      // Convert to universal schema
      const schema = this.converter.convertSession(
        session,
        patterns,
        protocolDetection,
        config.url
      );

      return {
        success: true,
        schema,
        warnings: this.generateWarnings(session, patterns),
        metadata: {
          endpoint: config.url,
          sessionDuration: session.statistics.connectionDuration,
          messagesCapture: session.messages.length,
          eventsDetected: session.events.length,
          patternsFound: patterns.length,
          protocolDetected: protocolDetection.protocol,
          introspectionTimestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      if (error instanceof ConnectionError) {
        throw error;
      }

      throw new IntrospectionError(
        `WebSocket introspection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      return urlObj.protocol === 'ws:' || urlObj.protocol === 'wss:';
    } catch {
      return false;
    }
  }

  /**
   * Get default configuration for WebSocket connector
   */
  public getDefaultConfig(): Partial<ConnectorConfig> {
    return {
      timeout: 30000,
      followRedirects: false,
      userAgent: 'Universal-API-Schema-Explorer/1.0.0',
      options: {
        introspection: {
          maxDuration: 30000,
          maxMessages: 100,
          sendTestMessages: false,
          analyzePatterns: true,
          connectionTimeout: 10000,
          captureBinary: false
        }
      }
    };
  }

  /**
   * Create WebSocket connection
   */
  private async createWebSocketConnection(config: WebSocketConnectorConfig): Promise<WebSocket> {
    const wsOptions: any = {
      headers: config.headers,
      handshakeTimeout: config.timeout || 10000,
      ...config.wsOptions
    };

    if (config.subprotocols) {
      wsOptions.protocol = config.subprotocols;
    }

    return new WebSocket(config.url, wsOptions);
  }

  /**
   * Perform introspection session
   */
  private async performIntrospectionSession(
    config: WebSocketConnectorConfig,
    introspectionConfig: WebSocketIntrospectionConfig
  ): Promise<WebSocketSession> {
    const session: WebSocketSession = {
      id: `session_${Date.now()}`,
      endpoint: {
        url: config.url,
        protocol: WebSocketProtocol.RAW, // Will be detected later
        headers: config.headers,
        timeout: config.timeout
      },
      startTime: new Date(),
      state: WebSocketState.CONNECTING,
      messages: [],
      events: [],
      statistics: {
        totalMessages: 0,
        messagesByType: {},
        messagesByDirection: {},
        averageMessageSize: 0,
        connectionDuration: 0
      }
    };

    const ws = await this.createWebSocketConnection(config);
    
    return new Promise((resolve, reject) => {
      const maxDuration = introspectionConfig.maxDuration || 30000;
      const maxMessages = introspectionConfig.maxMessages || 100;
      
      const timeout = setTimeout(() => {
        session.endTime = new Date();
        session.state = WebSocketState.CLOSED;
        this.calculateStatistics(session);
        ws.close();
        resolve(session);
      }, maxDuration);

      ws.on('open', () => {
        session.state = WebSocketState.OPEN;
        
        // Send test messages if configured
        if (introspectionConfig.sendTestMessages && introspectionConfig.testMessages) {
          for (const testMessage of introspectionConfig.testMessages) {
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(testMessage.data));
              }
            }, testMessage.delay || 1000);
          }
        }
      });

      ws.on('message', (data, isBinary) => {
        if (session.messages.length >= maxMessages) {
          clearTimeout(timeout);
          session.endTime = new Date();
          session.state = WebSocketState.CLOSED;
          this.calculateStatistics(session);
          ws.close();
          resolve(session);
          return;
        }

        const message = this.captureMessage(data, isBinary, 'incoming');
        session.messages.push(message);
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        session.endTime = new Date();
        session.state = WebSocketState.ERROR;
        session.error = {
          message: error.message,
          timestamp: new Date()
        };
        this.calculateStatistics(session);
        reject(new IntrospectionError(`WebSocket error during introspection: ${error.message}`));
      });

      ws.on('close', (code, reason) => {
        clearTimeout(timeout);
        session.endTime = new Date();
        session.state = WebSocketState.CLOSED;
        this.calculateStatistics(session);
        resolve(session);
      });
    });
  }

  /**
   * Capture a WebSocket message
   */
  private captureMessage(data: any, isBinary: boolean, direction: 'incoming' | 'outgoing'): WebSocketMessage {
    const message: WebSocketMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: isBinary ? WebSocketMessageType.BINARY : WebSocketMessageType.TEXT,
      direction,
      data,
      timestamp: new Date(),
      size: Buffer.isBuffer(data) ? data.length : String(data).length
    };

    // Try to parse JSON
    if (!isBinary && typeof data === 'string') {
      try {
        message.parsed = JSON.parse(data);
        message.type = WebSocketMessageType.JSON;
      } catch {
        // Not JSON, keep as text
      }
    }

    // Detect event name for Socket.IO style messages
    if (message.parsed && typeof message.parsed === 'object') {
      if (Array.isArray(message.parsed) && message.parsed.length > 0) {
        // Socket.IO format: [event, data]
        message.event = String(message.parsed[0]);
      } else if (message.parsed.event || message.parsed.type) {
        // Custom event format
        message.event = message.parsed.event || message.parsed.type;
      }
    }

    return message;
  }

  /**
   * Calculate session statistics
   */
  private calculateStatistics(session: WebSocketSession): void {
    const stats = session.statistics;
    stats.totalMessages = session.messages.length;

    // Count by type
    for (const message of session.messages) {
      const type = message.type;
      stats.messagesByType[type] = (stats.messagesByType[type] || 0) + 1;

      const direction = message.direction;
      stats.messagesByDirection[direction] = (stats.messagesByDirection[direction] || 0) + 1;
    }

    // Calculate average message size
    if (session.messages.length > 0) {
      const totalSize = session.messages.reduce((sum, msg) => sum + msg.size, 0);
      stats.averageMessageSize = totalSize / session.messages.length;
    }

    // Calculate connection duration
    if (session.endTime) {
      stats.connectionDuration = session.endTime.getTime() - session.startTime.getTime();
    }

    // Extract events from messages
    session.events = this.extractEvents(session.messages);
  }

  /**
   * Extract events from captured messages
   */
  private extractEvents(messages: WebSocketMessage[]): WebSocketEvent[] {
    const eventMap = new Map<string, WebSocketEvent>();

    for (const message of messages) {
      const eventName = message.event || 'message';

      if (!eventMap.has(eventName)) {
        eventMap.set(eventName, {
          name: eventName,
          direction: message.direction,
          examples: [],
          frequency: 0
        });
      }

      const event = eventMap.get(eventName)!;
      event.frequency++;

      // Update direction if we see bidirectional communication
      if (event.direction !== message.direction) {
        event.direction = 'bidirectional';
      }

      // Add example (limit to 5 examples per event)
      if (event.examples.length < 5) {
        event.examples.push(message);
      }
    }

    return Array.from(eventMap.values());
  }

  /**
   * Analyze message patterns
   */
  private analyzeMessagePatterns(messages: WebSocketMessage[]): WebSocketMessagePattern[] {
    const patterns: WebSocketMessagePattern[] = [];
    const patternMap = new Map<string, any>();

    for (const message of messages) {
      if (!message.parsed || typeof message.parsed !== 'object') {
        continue;
      }

      const signature = this.getMessageSignature(message.parsed);

      if (!patternMap.has(signature)) {
        patternMap.set(signature, {
          signature,
          examples: [],
          fields: new Set<string>(),
          fieldTypes: new Map<string, Set<string>>()
        });
      }

      const pattern = patternMap.get(signature)!;
      pattern.examples.push(message.parsed);

      // Analyze fields
      this.analyzeObjectFields(message.parsed, pattern.fields, pattern.fieldTypes);
    }

    // Convert to WebSocketMessagePattern format
    let patternId = 1;
    for (const [signature, patternData] of patternMap.entries()) {
      if (patternData.examples.length < 2) continue; // Skip patterns with only one example

      const requiredFields: string[] = [];
      const optionalFields: string[] = [];
      const fieldTypes: Record<string, string> = {};

      // Determine required vs optional fields
      for (const field of patternData.fields) {
        const appearsInAll = patternData.examples.every((ex: any) => field in ex);
        if (appearsInAll) {
          requiredFields.push(field);
        } else {
          optionalFields.push(field);
        }

        // Determine most common type for this field
        const types = patternData.fieldTypes.get(field);
        if (types && types.size > 0) {
          fieldTypes[field] = Array.from(types)[0] as string; // Use first type for simplicity
        }
      }

      patterns.push({
        id: `pattern_${patternId++}`,
        name: `Pattern_${signature.slice(0, 8)}`,
        description: `Message pattern with ${requiredFields.length} required and ${optionalFields.length} optional fields`,
        template: patternData.examples[0],
        requiredFields,
        optionalFields,
        fieldTypes,
        frequency: patternData.examples.length,
        examples: patternData.examples.slice(0, 3)
      });
    }

    return patterns;
  }

  /**
   * Get message signature for pattern matching
   */
  private getMessageSignature(obj: any): string {
    if (typeof obj !== 'object' || obj === null) {
      return typeof obj;
    }

    const keys = Object.keys(obj).sort();
    return keys.join(',');
  }

  /**
   * Analyze object fields recursively
   */
  private analyzeObjectFields(
    obj: any,
    fields: Set<string>,
    fieldTypes: Map<string, Set<string>>,
    prefix = ''
  ): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      fields.add(fieldName);

      if (!fieldTypes.has(fieldName)) {
        fieldTypes.set(fieldName, new Set());
      }

      const types = fieldTypes.get(fieldName)!;
      types.add(typeof value);

      // Recursively analyze nested objects (limit depth to avoid infinite recursion)
      if (typeof value === 'object' && value !== null && prefix.split('.').length < 3) {
        this.analyzeObjectFields(value, fields, fieldTypes, fieldName);
      }
    }
  }

  /**
   * Detect WebSocket protocol
   */
  private detectProtocol(session: WebSocketSession): ProtocolDetectionResult {
    const reasoning: string[] = [];
    let protocol = WebSocketProtocol.RAW;
    let confidence = 0.5;

    // Check for Socket.IO patterns
    const hasSocketIOPatterns = session.messages.some(msg => {
      if (typeof msg.data === 'string') {
        return msg.data.startsWith('42') || msg.data.includes('"event"') || msg.data.includes('"data"');
      }
      return false;
    });

    if (hasSocketIOPatterns) {
      protocol = WebSocketProtocol.SOCKET_IO;
      confidence = 0.8;
      reasoning.push('Detected Socket.IO message patterns');
    }

    // Check for STOMP patterns
    const hasSTOMPPatterns = session.messages.some(msg => {
      if (typeof msg.data === 'string') {
        return msg.data.startsWith('CONNECT') || msg.data.startsWith('SEND') || msg.data.startsWith('MESSAGE');
      }
      return false;
    });

    if (hasSTOMPPatterns) {
      protocol = WebSocketProtocol.STOMP;
      confidence = 0.9;
      reasoning.push('Detected STOMP protocol commands');
    }

    // Check for JSON-based messages
    const jsonMessages = session.messages.filter(msg => msg.type === WebSocketMessageType.JSON);
    if (jsonMessages.length > 0) {
      confidence = Math.max(confidence, 0.7);
      reasoning.push(`Found ${jsonMessages.length} JSON messages`);
    }

    if (reasoning.length === 0) {
      reasoning.push('No specific protocol patterns detected, assuming raw WebSocket');
    }

    return {
      protocol,
      confidence,
      reasoning,
      metadata: {
        totalMessages: session.messages.length,
        jsonMessages: jsonMessages.length,
        events: session.events.length
      }
    };
  }

  /**
   * Generate warnings based on introspection results
   */
  private generateWarnings(session: WebSocketSession, patterns: WebSocketMessagePattern[]): string[] {
    const warnings: string[] = [];

    if (session.messages.length === 0) {
      warnings.push('No messages were captured during introspection');
    }

    if (session.messages.length < 10) {
      warnings.push('Limited message sample - schema may be incomplete');
    }

    if (patterns.length === 0) {
      warnings.push('No message patterns detected - unable to infer structured schema');
    }

    if (session.statistics.connectionDuration < 5000) {
      warnings.push('Short connection duration - consider longer introspection for better results');
    }

    return warnings;
  }
}
