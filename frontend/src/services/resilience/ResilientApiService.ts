import { apiCircuitBreaker } from './CircuitBreaker';
import { standardBackoff } from './ExponentialBackoff';
import { offlineStorage } from '../offline/OfflineStorage';
import { logError } from '../../utils/errorHandler';
import { environment } from '../../config/environment';
import { logger } from '../../utils/logger';
import { timeoutConfig } from '../../config/timeoutConfig';

/**
 * Safely join baseUrl and endpoint, handling trailing/leading slashes
 * PRODUCTION FIX: Prevents double-slash URLs that cause 404 errors
 */
function joinUrl(baseUrl: string, endpoint: string): string {
  // Remove trailing slashes from baseUrl
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  // Ensure endpoint starts with a single slash
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${normalizedBase}${normalizedEndpoint}`;
}

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
  // PRODUCTION FIX: Use timeoutConfig for consistency (15 seconds default)
  private defaultTimeout: number = 15000; // 15 seconds - matches timeoutConfig.api.default

  constructor(baseUrl?: string) {
    // Normalize baseUrl to never have trailing slash
    const rawBaseUrl = baseUrl || environment.api.baseUrl;
    this.baseUrl = rawBaseUrl.replace(/\/+$/, '');
    
    // PRODUCTION FIX: Use timeoutConfig for consistent timeout values
    this.defaultTimeout = timeoutConfig.api.default;
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

    // PRODUCTION FIX: Use safe URL join to prevent double-slash issues
    const url = joinUrl(this.baseUrl, endpoint);
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Check if we should use offline storage for GET requests
      if (method === 'GET' && useOfflineStorage) {
        const cachedData = await this.getFromOfflineStorage(endpoint);
        if (cachedData) {
          logger.info('📦 Serving cached data', 'component', { data: endpoint });
          return {
            success: true,
            data: cachedData,
            fromCache: true,
            timestamp: new Date().toISOString(),
          };
        }
      }

      // PRODUCTION FIX: Enhanced request execution with better error handling
      // Execute request with circuit breaker and exponential backoff
      const result = await apiCircuitBreaker.execute(
        async () => {
          try {
            return await this.executeRequest<T>(
              url,
              method,
              data,
              headers,
              timeout,
              requestId
            );
          } catch (error) {
            // PRODUCTION FIX: Enhanced error context for better debugging
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorCode = (error as any)?.code || 'UNKNOWN';
            const errorStatus = (error as any)?.status;
            
            logger.error('API request execution failed', 'resilient-api', {
              endpoint,
              method,
              url,
              requestId,
              error: errorMessage,
              code: errorCode,
              status: errorStatus,
              willRetry: retryOnFailure,
              stack: error instanceof Error ? error.stack : undefined
            });
            
            throw error;
          }
        },
        retryOnFailure ? () => this.getFallbackData<T>(endpoint) : undefined
      );

      // Store successful responses in offline storage (result is T, not ApiResponse)
      if (useOfflineStorage && result) {
        await this.storeInOfflineStorage(endpoint, result);
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Log error with context
      // Enhanced error logging with actual error details
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      const errorCode = (error as any)?.code || '';
      const isNetworkError = (error as any)?.isNetworkError || false;
      const isServerDown = errorCode === 'SERVER_NOT_RUNNING';
      const isCorsError = errorCode === 'CORS_ERROR';
      const isTimeoutError = errorCode === 'TIMEOUT';
      
      // PRODUCTION FIX: Enhanced error logging with error classification
      logger.error(`❌ API request failed for ${method} ${endpoint}`, 'api', {
        error: errorMessage,
        errorName,
        errorCode,
        isNetworkError,
        isServerDown,
        isCorsError,
        isTimeoutError,
        endpoint,
        method,
        url: `${this.baseUrl}${endpoint}`,
        baseUrl: this.baseUrl,
        originalError: (error as any)?.originalError,
        originalErrorName: (error as any)?.originalErrorName,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // PRODUCTION FIX: Log to console for visibility
      console.error('❌ API request failed:', {
        endpoint,
        method,
        url: `${this.baseUrl}${endpoint}`,
        error: errorMessage,
        errorCode,
        errorName,
        isServerDown,
        isCorsError,
        isTimeoutError,
        isNetworkError,
        fullError: error
      });
      
      logError(
        error,
        `API request failed for ${method} ${endpoint}: ${errorMessage}`
      );

      // Try to get fallback data from offline storage
      if (useOfflineStorage) {
        const fallbackData = await this.getFromOfflineStorage(endpoint);
        if (fallbackData) {
          logger.info('📦 Using fallback data', 'component', { data: endpoint });
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
  // PRODUCTION FIX: Enhanced error handling and token management
  private async executeRequest<T>(
    url: string,
    method: string,
    data: any,
    headers: Record<string, string>,
    timeout: number,
    requestId: string
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // PRODUCTION FIX: Ensure authentication token is included
      // Check if Authorization header is already set, if not, try to get token
      if (!headers['Authorization'] && !headers['authorization']) {
        try {
          const { authService } = await import('../../services/authService');
          const token = authService.getAccessToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          } else {
            // Try student auth service for student endpoints
            if (url.includes('/student/') || url.includes('/auth/student/')) {
              try {
                const { studentAuthService } = await import('../../services/auth/studentAuthService');
                const studentToken = studentAuthService.getAccessToken();
                if (studentToken) {
                  headers['Authorization'] = `Bearer ${studentToken}`;
                }
              } catch (studentAuthError) {
                // Student auth not available, continue without token
                logger.debug('Student auth service not available', 'api', { url });
              }
            }
          }
        } catch (authError) {
          // Auth service not available, continue without token (public endpoints)
          logger.debug('Auth service not available for request', 'api', { url });
        }
      }

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

      // PRODUCTION FIX: Enhanced error response parsing with better error context
      if (!response.ok) {
        let errorData: any = null;
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorCode = 'API_ERROR';

        try {
          // Try to parse JSON error response from backend
          const responseText = await response.text();
          if (responseText) {
            try {
              errorData = JSON.parse(responseText);
            } catch (parseError) {
              // If JSON parsing fails, use response text as error message
              errorMessage = responseText || errorMessage;
            }
          }
          
          // Backend returns errors in format: { success: false, error: string, message: string, code: string }
          if (errorData) {
            errorMessage = errorData.message || errorData.error || errorMessage;
            errorCode = errorData.code || errorCode;
          }
        } catch (parseError) {
          // If parsing fails completely, use status-based error messages
          logger.warn('Failed to parse error response', 'api', {
            status: response.status,
            statusText: response.statusText,
            url
          });
        }

        // Create enhanced error with status and code
        const apiError: any = new Error(errorMessage);
        apiError.status = response.status;
        apiError.code = errorCode;
        apiError.data = errorData;
        apiError.url = url;
        apiError.method = method;
        
        // Handle specific status codes
        if (response.status === 401) {
          apiError.code = 'UNAUTHORIZED';
          // Token might be expired, but don't auto-refresh here (let caller handle it)
        } else if (response.status === 403) {
          apiError.code = 'FORBIDDEN';
        } else if (response.status === 404) {
          apiError.code = 'NOT_FOUND';
        } else if (response.status === 429) {
          apiError.code = 'RATE_LIMITED';
        } else if (response.status >= 500) {
          apiError.code = 'SERVER_ERROR';
        }
        
        throw apiError;
      }

      // Parse successful response
      const responseText = await response.text();
      if (!responseText) {
        // Empty response - return null for DELETE requests, empty object for others
        return (method === 'DELETE' ? (null as unknown as T) : ({} as T));
      }

      try {
        return JSON.parse(responseText) as T;
      } catch (parseError) {
        logger.error('Failed to parse JSON response', 'api', {
          url,
          method,
          responseText: responseText.substring(0, 200), // Log first 200 chars
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
        throw new Error('Invalid JSON response from server');
      }
          } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error) {
              // PRODUCTION FIX: Enhanced error detection with better differentiation
              const errorMessage = error.message.toLowerCase();
              const errorName = error.name.toLowerCase();
              
              // PRODUCTION FIX: Log actual error details for debugging
              console.error('🔴 Fetch error in executeRequest:', {
                errorName,
                errorMessage,
                error: error.message,
                name: error.name,
                stack: error.stack,
                url,
                method,
                baseUrl: this.baseUrl,
              });
              
              // PRODUCTION FIX: More accurate server down detection
              // Only treat as "server down" if it's a clear connection refused error
              // Don't treat CORS errors or generic network errors as "server down"
              // NetworkError can occur for many reasons (CORS, timeout, browser restrictions, etc.)
              const isClearServerDown = 
                errorMessage.includes('connection refused') ||
                errorMessage.includes('econnrefused') ||
                errorMessage.includes('connect econnrefused') ||
                errorMessage.includes('getaddrinfo enotfound') ||
                errorMessage.includes('enotfound') ||
                (errorName === 'typeerror' && 
                 errorMessage.includes('failed to fetch') && 
                 !errorMessage.includes('cors') &&
                 !errorMessage.includes('timeout') &&
                 !errorMessage.includes('aborted'));
              
              // PRODUCTION FIX: Check for CORS errors separately
              const isCorsError = 
                errorMessage.includes('cors') ||
                errorMessage.includes('cross-origin') ||
                (errorName === 'typeerror' && errorMessage.includes('cors'));
              
              // PRODUCTION FIX: Check for timeout errors
              const isTimeoutError = 
                error.name === 'AbortError' || 
                errorMessage.includes('timeout') ||
                errorMessage.includes('aborted');
              
              if (isTimeoutError) {
                const timeoutError: any = new Error(`Request timeout after ${timeout}ms`);
                timeoutError.code = 'TIMEOUT';
                timeoutError.url = url;
                timeoutError.method = method;
                timeoutError.isNetworkError = true;
                logger.warn('Request timeout', 'resilient-api', {
                  url,
                  method,
                  timeout,
                  baseUrl: this.baseUrl,
                });
                throw timeoutError;
              }
              
              if (isCorsError) {
                // CORS error - server might be running but CORS is misconfigured
                const corsError: any = new Error(
                  `CORS error: Unable to connect to backend. This might be a CORS configuration issue. Please check backend CORS settings for ${this.baseUrl}`
                );
                corsError.code = 'CORS_ERROR';
                corsError.url = url;
                corsError.method = method;
                corsError.isNetworkError = true;
                logger.error('CORS error detected', 'resilient-api', {
                  url,
                  method,
                  baseUrl: this.baseUrl,
                  error: error.message,
                  suggestion: 'Check backend CORS configuration. Server might be running but CORS is blocking the request.'
                });
                throw corsError;
              }
              
              if (isClearServerDown) {
                // Only treat as server down if it's a clear connection refused error
                const serverDownError: any = new Error(
                  `Backend server is not running or not accessible. Please ensure the server is running on ${  
                  this.baseUrl.replace(/\/+$/, '')  } and try again.`
                );
                serverDownError.code = 'SERVER_NOT_RUNNING';
                serverDownError.url = url;
                serverDownError.method = method;
                serverDownError.isNetworkError = true;
                logger.error('Backend server appears to be down or not accessible', 'resilient-api', {
                  url,
                  method,
                  baseUrl: this.baseUrl,
                  error: error.message,
                  errorName,
                  suggestion: 'Please check if the backend server is running and accessible'
                });
                throw serverDownError;
              }
              
              // PRODUCTION FIX: For other network errors, don't assume server is down
              // Just treat as a generic network error that might be retriable
              // NetworkError when attempting to fetch resource can happen for many reasons
              const networkError: any = new Error(
                `Network error: ${error.message}. This might be a temporary network issue, CORS issue, or browser restriction. Please try again.`
              );
              networkError.code = 'NETWORK_ERROR';
              networkError.url = url;
              networkError.method = method;
              networkError.isNetworkError = true;
              networkError.originalError = error.message;
              networkError.originalErrorName = error.name;
              logger.warn('Network error detected (server might still be running)', 'resilient-api', {
                url,
                method,
                baseUrl: this.baseUrl,
                error: error.message,
                errorName,
                suggestion: 'This might be a temporary network issue, CORS issue, or browser restriction. The server might still be running. Check browser console for CORS errors.'
              });
              throw networkError;
            }

            const unknownError: any = new Error('Unknown error occurred');
            unknownError.code = 'UNKNOWN_ERROR';
            unknownError.url = url;
            unknownError.method = method;
            throw unknownError;
          }
  }

  // Get fallback data with exponential backoff
  private async getFallbackData<T>(endpoint: string): Promise<T> {
    const result = await standardBackoff.execute(async () => {
      const cachedData = await this.getFromOfflineStorage(endpoint);
      if (cachedData) {
        return cachedData;
      }
      throw new Error('No fallback data available');
    });
    if (result.success && result.result) {
      return result.result;
    }
    throw new Error('No fallback data available');
  }

  // Offline storage methods
  private async getFromOfflineStorage(endpoint: string): Promise<any | null> {
    try {
      const dataType = this.getDataTypeFromEndpoint(endpoint);
      const id = this.getStorageId(endpoint);
      return await offlineStorage.getData(dataType, id);
    } catch (error) {
      logger.warn('Warning', 'component', { data: 'Failed to get data from offline storage:', error });
      return null;
    }
  }

  private async storeInOfflineStorage(
    endpoint: string,
    data: any
  ): Promise<void> {
    try {
      const dataType = this.getDataTypeFromEndpoint(endpoint);
      const id = this.getStorageId(endpoint);
      await offlineStorage.storeData(dataType, id, data);
    } catch (error) {
      logger.warn('Warning', 'component', { data: 'Failed to store data in offline storage:', error });
    }
  }

  private async queueForSync(
    method: string,
    endpoint: string,
    data: any
  ): Promise<void> {
    try {
      const operation =
        method === 'DELETE' ? 'delete' : method === 'PUT' ? 'update' : 'create';
      await offlineStorage.addToSyncQueue(operation, endpoint, data);
    } catch (error) {
      logger.warn('Warning', 'component', { data: 'Failed to queue request for sync:', error });
    }
  }

  // Helper methods
  private getDataTypeFromEndpoint(
    endpoint: string
  ): 'bus' | 'route' | 'location' | 'driver' | 'user' {
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
  async get<T>(
    endpoint: string,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      endpoint,
      method: 'GET',
      ...config,
    });
  }

  async post<T>(
    endpoint: string,
    data: any,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      endpoint,
      method: 'POST',
      data,
      ...config,
    });
  }

  async put<T>(
    endpoint: string,
    data: any,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      endpoint,
      method: 'PUT',
      data,
      ...config,
    });
  }

  async delete<T>(
    endpoint: string,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      endpoint,
      method: 'DELETE',
      ...config,
    });
  }

  // Health check with resilience
  async healthCheck(): Promise<
    ApiResponse<{ status: string; timestamp: string }>
  > {
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
