import { apiCircuitBreaker } from './CircuitBreaker';
import { standardBackoff } from './ExponentialBackoff';
import { offlineStorage } from '../offline/OfflineStorage';
import { logError } from '../../utils/errorHandler';
import { environment } from '../../config/environment';

export interface ApiRequestConfig {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
  useOfflineStorage?: boolean;
  retryOnFailure?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  fromCache?: boolean;
  timestamp: string;
}

class ResilientApiService {
  private baseUrl: string;
  private defaultTimeout: number = 10000; // 10 seconds

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || environment.api.url;
  }

  // Main request method with full resilience
  async request<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const {
      endpoint,
      method = 'GET',
      data,
      headers = {},
      timeout = this.defaultTimeout,
      useOfflineStorage = true,
      retryOnFailure = true,
    } = config;

    const url = `${this.baseUrl}${endpoint}`;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Check if we should use offline storage for GET requests
      if (method === 'GET' && useOfflineStorage) {
        const cachedData = await this.getFromOfflineStorage(endpoint);
        if (cachedData) {
          console.log(`📦 Serving cached data for ${endpoint}`);
          return {
            success: true,
            data: cachedData,
            fromCache: true,
            timestamp: new Date().toISOString(),
          };
        }
      }

      // Execute request with circuit breaker and exponential backoff
      const result = await apiCircuitBreaker.execute(
        () => this.executeRequest<T>(url, method, data, headers, timeout, requestId),
        retryOnFailure ? () => this.getFallbackData<T>(endpoint) : undefined
      );

      // Store successful responses in offline storage
      if (result.success && useOfflineStorage) {
        await this.storeInOfflineStorage(endpoint, result.data);
      }

      return {
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      // Log error with context
      logError(error, {
        service: 'api',
        operation: `${method.toLowerCase()}-${endpoint}`,
      }, 'medium');

      // Try to get fallback data from offline storage
      if (useOfflineStorage) {
        const fallbackData = await this.getFromOfflineStorage(endpoint);
        if (fallbackData) {
          console.log(`📦 Using fallback data for ${endpoint}`);
          return {
            success: true,
            data: fallbackData,
            fromCache: true,
            timestamp: new Date().toISOString(),
          };
        }
      }

      // Queue failed requests for later sync (for non-GET requests)
      if (method !== 'GET' && useOfflineStorage) {
        await this.queueForSync(method, endpoint, data);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Execute actual HTTP request with timeout
  private async executeRequest<T>(
    url: string,
    method: string,
    data?: any,
    headers: Record<string, string> = {},
    timeout: number = this.defaultTimeout,
    requestId: string
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          ...headers,
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      
      throw new Error('Unknown error occurred');
    }
  }

  // Get fallback data with exponential backoff
  private async getFallbackData<T>(endpoint: string): Promise<T> {
    return standardBackoff.execute(async () => {
      const cachedData = await this.getFromOfflineStorage(endpoint);
      if (cachedData) {
        return cachedData;
      }
      throw new Error('No fallback data available');
    });
  }

  // Offline storage methods
  private async getFromOfflineStorage(endpoint: string): Promise<any | null> {
    try {
      const dataType = this.getDataTypeFromEndpoint(endpoint);
      const id = this.getStorageId(endpoint);
      return await offlineStorage.getData(dataType, id);
    } catch (error) {
      console.warn('Failed to get data from offline storage:', error);
      return null;
    }
  }

  private async storeInOfflineStorage(endpoint: string, data: any): Promise<void> {
    try {
      const dataType = this.getDataTypeFromEndpoint(endpoint);
      const id = this.getStorageId(endpoint);
      await offlineStorage.storeData(dataType, id, data);
    } catch (error) {
      console.warn('Failed to store data in offline storage:', error);
    }
  }

  private async queueForSync(method: string, endpoint: string, data: any): Promise<void> {
    try {
      const operation = method === 'DELETE' ? 'delete' : 
                      method === 'PUT' ? 'update' : 'create';
      await offlineStorage.addToSyncQueue(operation, endpoint, data);
    } catch (error) {
      console.warn('Failed to queue request for sync:', error);
    }
  }

  // Helper methods
  private getDataTypeFromEndpoint(endpoint: string): 'bus' | 'route' | 'location' | 'driver' | 'user' {
    if (endpoint.includes('/buses')) return 'bus';
    if (endpoint.includes('/routes')) return 'route';
    if (endpoint.includes('/locations')) return 'location';
    if (endpoint.includes('/drivers')) return 'driver';
    if (endpoint.includes('/users')) return 'user';
    return 'bus'; // Default
  }

  private getStorageId(endpoint: string): string {
    // Remove query parameters and create a unique ID
    const cleanEndpoint = endpoint.split('?')[0];
    return cleanEndpoint.replace(/[^a-zA-Z0-9]/g, '_');
  }

  // Convenience methods for common operations
  async get<T>(endpoint: string, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      endpoint,
      method: 'GET',
      ...config,
    });
  }

  async post<T>(endpoint: string, data: any, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      endpoint,
      method: 'POST',
      data,
      ...config,
    });
  }

  async put<T>(endpoint: string, data: any, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      endpoint,
      method: 'PUT',
      data,
      ...config,
    });
  }

  async delete<T>(endpoint: string, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      endpoint,
      method: 'DELETE',
      ...config,
    });
  }

  // Health check with resilience
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.get('/health', {
      timeout: 5000,
      retryOnFailure: true,
      useOfflineStorage: false,
    });
  }

  // Get offline storage statistics
  async getOfflineStats() {
    return await offlineStorage.getStats();
  }

  // Clear offline storage
  async clearOfflineStorage() {
    return await offlineStorage.clearAll();
  }

  // Force sync pending data
  async syncPendingData() {
    return await offlineStorage.syncPendingData();
  }
}

// Global resilient API service instance
export const resilientApiService = new ResilientApiService();

export default ResilientApiService;
