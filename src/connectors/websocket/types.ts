/**
 * WebSocket-specific types for introspection and analysis
 * 
 * These types represent the structure of WebSocket connections, messages,
 * and protocols for schema discovery and analysis.
 */

/**
 * WebSocket protocol types
 */
export enum WebSocketProtocol {
  RAW = 'raw',
  SOCKET_IO = 'socket.io',
  SOCKJS = 'sockjs',
  STOMP = 'stomp',
  MQTT = 'mqtt',
  CUSTOM = 'custom'
}

/**
 * WebSocket message types
 */
export enum WebSocketMessageType {
  TEXT = 'text',
  BINARY = 'binary',
  JSON = 'json',
  PING = 'ping',
  PONG = 'pong',
  CLOSE = 'close',
  ERROR = 'error'
}

/**
 * WebSocket connection state
 */
export enum WebSocketState {
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed',
  ERROR = 'error'
}

/**
 * Captured WebSocket message
 */
export interface WebSocketMessage {
  /** Message ID for tracking */
  id: string;
  /** Message type */
  type: WebSocketMessageType;
  /** Message direction */
  direction: 'incoming' | 'outgoing';
  /** Raw message data */
  data: any;
  /** Parsed message content (if JSON) */
  parsed?: any;
  /** Message timestamp */
  timestamp: Date;
  /** Message size in bytes */
  size: number;
  /** Detected event name (for Socket.IO, etc.) */
  event?: string;
  /** Message metadata */
  metadata?: Record<string, unknown>;
}

/**
 * WebSocket event definition
 */
export interface WebSocketEvent {
  /** Event name */
  name: string;
  /** Event description */
  description?: string;
  /** Event direction */
  direction: 'incoming' | 'outgoing' | 'bidirectional';
  /** Message schema for this event */
  messageSchema?: any;
  /** Example messages */
  examples: WebSocketMessage[];
  /** How many times this event was observed */
  frequency: number;
  /** Whether this event is deprecated */
  deprecated?: boolean;
}

/**
 * WebSocket endpoint information
 */
export interface WebSocketEndpoint {
  /** Endpoint URL */
  url: string;
  /** Detected protocol */
  protocol: WebSocketProtocol;
  /** Supported subprotocols */
  subprotocols?: string[];
  /** Connection headers */
  headers?: Record<string, string>;
  /** Authentication requirements */
  authentication?: {
    type: 'none' | 'token' | 'cookie' | 'custom';
    description?: string;
    required?: boolean;
  };
  /** Connection timeout */
  timeout?: number;
}

/**
 * WebSocket introspection session
 */
export interface WebSocketSession {
  /** Session ID */
  id: string;
  /** Endpoint information */
  endpoint: WebSocketEndpoint;
  /** Session start time */
  startTime: Date;
  /** Session end time */
  endTime?: Date;
  /** Connection state */
  state: WebSocketState;
  /** Captured messages */
  messages: WebSocketMessage[];
  /** Detected events */
  events: WebSocketEvent[];
  /** Session statistics */
  statistics: {
    totalMessages: number;
    messagesByType: Record<string, number>;
    messagesByDirection: Record<string, number>;
    averageMessageSize: number;
    connectionDuration: number;
  };
  /** Error information */
  error?: {
    code?: number;
    message: string;
    timestamp: Date;
  };
}

/**
 * WebSocket introspection configuration
 */
export interface WebSocketIntrospectionConfig {
  /** Maximum time to listen for messages (ms) */
  maxDuration?: number;
  /** Maximum number of messages to capture */
  maxMessages?: number;
  /** Whether to send test messages */
  sendTestMessages?: boolean;
  /** Test messages to send */
  testMessages?: Array<{
    data: any;
    delay?: number;
  }>;
  /** Whether to analyze message patterns */
  analyzePatterns?: boolean;
  /** Custom message handlers */
  messageHandlers?: Record<string, (message: any) => any>;
  /** Connection timeout */
  connectionTimeout?: number;
  /** Whether to capture binary messages */
  captureBinary?: boolean;
}

/**
 * WebSocket message pattern
 */
export interface WebSocketMessagePattern {
  /** Pattern ID */
  id: string;
  /** Pattern name */
  name: string;
  /** Pattern description */
  description?: string;
  /** Message structure template */
  template: any;
  /** Required fields */
  requiredFields: string[];
  /** Optional fields */
  optionalFields: string[];
  /** Field types */
  fieldTypes: Record<string, string>;
  /** Pattern frequency */
  frequency: number;
  /** Example messages matching this pattern */
  examples: any[];
}

/**
 * WebSocket protocol detection result
 */
export interface ProtocolDetectionResult {
  /** Detected protocol */
  protocol: WebSocketProtocol;
  /** Confidence level (0-1) */
  confidence: number;
  /** Detection reasoning */
  reasoning: string[];
  /** Protocol-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * WebSocket introspection result
 */
export interface WebSocketIntrospectionResult {
  /** Whether introspection was successful */
  success: boolean;
  /** Introspection session */
  session?: WebSocketSession;
  /** Detected message patterns */
  patterns?: WebSocketMessagePattern[];
  /** Protocol detection result */
  protocolDetection?: ProtocolDetectionResult;
  /** Error message if failed */
  error?: string;
  /** Warnings encountered */
  warnings?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
