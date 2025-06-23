/**
 * Error types for the Universal API Schema Explorer
 * 
 * This module defines standardized error types used throughout the application
 * to provide consistent error handling and reporting.
 */

/**
 * Base error class for all API Explorer errors
 */
export abstract class APIExplorerError extends Error {
  /** Error code for programmatic handling */
  public readonly code: string;
  
  /** Additional error context */
  public readonly context?: Record<string, unknown>;

  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Connection-related errors
 */
export class ConnectionError extends APIExplorerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONNECTION_ERROR', context);
  }
}

/**
 * Authentication-related errors
 */
export class AuthenticationError extends APIExplorerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', context);
  }
}

/**
 * Schema parsing errors
 */
export class SchemaParsingError extends APIExplorerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'SCHEMA_PARSING_ERROR', context);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends APIExplorerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends APIExplorerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', context);
  }
}

/**
 * Connector-specific errors
 */
export class ConnectorError extends APIExplorerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONNECTOR_ERROR', context);
  }
}

/**
 * Introspection errors
 */
export class IntrospectionError extends APIExplorerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'INTROSPECTION_ERROR', context);
  }
}

/**
 * Code generation errors
 */
export class CodeGenerationError extends APIExplorerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CODE_GENERATION_ERROR', context);
  }
}

/**
 * Storage errors
 */
export class StorageError extends APIExplorerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'STORAGE_ERROR', context);
  }
}
