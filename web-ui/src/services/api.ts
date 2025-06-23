/**
 * API Service Layer
 * 
 * This module provides a service layer for communicating with the
 * Universal API Schema Explorer CLI backend. It handles HTTP requests,
 * error handling, and data transformation between the frontend and backend.
 */

export interface IntrospectionRequest {
  protocol: 'rest' | 'graphql' | 'websocket';
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
  save?: boolean;
  options?: {
    maxDuration?: number;
    maxMessages?: number;
    sendTestMessages?: boolean;
  };
}

export interface IntrospectionResponse {
  success: boolean;
  schema?: any;
  error?: string;
  warnings?: string[];
  metadata?: {
    duration: number;
    endpoint: string;
    timestamp: string;
    [key: string]: any;
  };
}

export interface SchemaListResponse {
  schemas: Array<{
    id: string;
    name: string;
    protocol: string;
    version: string;
    operations: number;
    types: number;
    discoveredAt: string;
    description?: string;
    baseUrl?: string;
    source: string;
  }>;
}

export interface SchemaDetailResponse {
  schema: any;
}

/**
 * API Service class for backend communication
 */
export class ApiService {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Introspect an API endpoint
   */
  async introspectApi(request: IntrospectionRequest): Promise<IntrospectionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/introspect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Introspection failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get list of stored schemas
   */
  async getSchemas(filters?: {
    protocol?: string;
    search?: string;
  }): Promise<SchemaListResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.protocol) params.append('protocol', filters.protocol);
      if (filters?.search) params.append('search', filters.search);

      const response = await fetch(`${this.baseUrl}/api/schemas?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch schemas:', error);
      return { schemas: [] };
    }
  }

  /**
   * Get detailed schema by ID
   */
  async getSchema(id: string): Promise<SchemaDetailResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/schemas/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch schema:', error);
      return null;
    }
  }

  /**
   * Delete a schema
   */
  async deleteSchema(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/schemas/${id}`, {
        method: 'DELETE',
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to delete schema:', error);
      return false;
    }
  }

  /**
   * Test connection to an API endpoint
   */
  async testConnection(url: string, protocol: string): Promise<{
    success: boolean;
    responseTime?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, protocol }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get application settings
   */
  async getSettings(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/settings`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return {};
    }
  }

  /**
   * Update application settings
   */
  async updateSettings(settings: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update settings:', error);
      return false;
    }
  }

  /**
   * Get system status and health
   */
  async getStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    protocols: Record<string, boolean>;
    storage: {
      type: string;
      available: boolean;
      schemaCount: number;
    };
    version: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch status:', error);
      return {
        status: 'unhealthy',
        protocols: { rest: false, graphql: false, websocket: false },
        storage: { type: 'unknown', available: false, schemaCount: 0 },
        version: 'unknown'
      };
    }
  }

  /**
   * Export schema in various formats
   */
  async exportSchema(id: string, format: 'json' | 'yaml' | 'typescript'): Promise<Blob | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/schemas/${id}/export?format=${format}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to export schema:', error);
      return null;
    }
  }
}

// Create a singleton instance
export const apiService = new ApiService();

// Types are already exported above with their definitions
