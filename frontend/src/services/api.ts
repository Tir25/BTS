/**
 * Central API service
 * Provides minimal, reusable HTTP helpers (get/post/put/delete) with base URL and auth token injection.
 * Keep request/response shaping at call sites or domain services.
 * 
 * PRODUCTION FIX: Enhanced with better error handling and token management
 * NOTE: This is a lightweight API service. For full resilience features, use apiService from '../api/api'
 */
import { environment } from '../config/environment';
import { authService } from './authService';
import { logger } from '../utils/logger';
import { timeoutConfig } from '../config/timeoutConfig';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp?: string;
}

/**
 * Safely join baseUrl and endpoint, handling trailing/leading slashes
 * PRODUCTION FIX: Prevents double-slash URLs that cause 404 errors
 */
function joinUrl(baseUrl: string, endpoint: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${normalizedBase}${normalizedEndpoint}`;
}

async function request<T>(
  path: string,
  method: HttpMethod = 'GET',
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  // PRODUCTION FIX: Enhanced token management with student auth support
  try {
    let token = authService.getAccessToken();
    
    // If no token and endpoint is student-related, try student auth
    if (!token && (path.includes('/student/') || path.includes('/auth/student/'))) {
      try {
        const { studentAuthService } = await import('./auth/studentAuthService');
        token = studentAuthService.getAccessToken();
        if (token) {
          logger.debug('🔑 Using student auth token', 'api-service', { path });
        }
      } catch (studentAuthError) {
        // Student auth service might not be available, continue without token
        logger.debug('🔓 Student auth service not available', 'api-service', { path });
      }
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (error) {
    logger.warn('Unable to attach access token to API request.', 'api-service', { error, path });
  }

  // PRODUCTION FIX: Use safe URL join to prevent double-slash issues
  const baseUrl = environment.api.baseUrl.replace(/\/+$/, '');
  const url = joinUrl(baseUrl, path);
  
  // PRODUCTION FIX: Add timeout support
  const timeout = timeoutConfig.api.default;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      ...init,
    });

    clearTimeout(timeoutId);

    // PRODUCTION FIX: Enhanced error handling with proper error parsing
    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      let errorCode = 'API_ERROR';

      try {
        const errorText = await res.text();
        if (errorText) {
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorMessage;
            errorCode = errorData.code || errorCode;
          } catch {
            // If JSON parsing fails, use response text
            errorMessage = errorText || errorMessage;
          }
        }
      } catch (parseError) {
        // If parsing fails, use status-based error
        logger.warn('Failed to parse error response', 'api-service', {
          status: res.status,
          statusText: res.statusText,
          path
        });
      }

      // Create error with proper context
      const apiError: any = new Error(errorMessage);
      apiError.status = res.status;
      apiError.code = errorCode;
      apiError.path = path;
      apiError.method = method;
      
      // Map status codes to error codes
      if (res.status === 401) {
        apiError.code = 'UNAUTHORIZED';
      } else if (res.status === 403) {
        apiError.code = 'FORBIDDEN';
      } else if (res.status === 404) {
        apiError.code = 'NOT_FOUND';
      } else if (res.status === 429) {
        apiError.code = 'RATE_LIMITED';
      } else if (res.status >= 500) {
        apiError.code = 'SERVER_ERROR';
      }
      
      throw apiError;
    }

    // Parse response
    const responseText = await res.text();
    if (!responseText) {
      // Empty response - return null for DELETE, empty object for others
      return (method === 'DELETE' ? (null as unknown as T) : ({} as T));
    }

    try {
      return JSON.parse(responseText) as T;
    } catch (parseError) {
      logger.error('Failed to parse JSON response', 'api-service', {
        path,
        method,
        responseText: responseText.substring(0, 200),
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
      throw new Error('Invalid JSON response from server');
    }
          } catch (error) {
            clearTimeout(timeoutId);
            
            if (error instanceof Error) {
              // PRODUCTION FIX: Better error detection for server not running
              const errorMessage = error.message.toLowerCase();
              const errorName = error.name.toLowerCase();
              
              // Check for network/CORS errors that indicate server is not running
              const isServerDown = 
                errorName === 'typeerror' ||
                errorMessage.includes('failed to fetch') ||
                errorMessage.includes('networkerror') ||
                errorMessage.includes('network request failed') ||
                errorMessage.includes('cors request did not succeed') ||
                (errorMessage.includes('cors') && errorMessage.includes('null'));
              
              if (isServerDown) {
                const serverDownError: any = new Error(
                  'Backend server is not running or not accessible. Please ensure the server is running and try again.'
                );
                serverDownError.code = 'SERVER_NOT_RUNNING';
                serverDownError.path = path;
                serverDownError.method = method;
                serverDownError.isNetworkError = true;
                logger.error('Backend server appears to be down or not accessible', 'api-service', {
                  path,
                  method,
                  baseUrl: environment.api.baseUrl,
                  error: error.message,
                  suggestion: 'Please check if the backend server is running and accessible'
                });
                throw serverDownError;
              }
              
              if (error.name === 'AbortError' || error.message.includes('timeout')) {
                const timeoutError: any = new Error('Request timeout');
                timeoutError.code = 'TIMEOUT';
                timeoutError.path = path;
                timeoutError.method = method;
                throw timeoutError;
              }
              // Re-throw with context
              throw error;
            }
            
            const unknownError: any = new Error('Unknown error occurred');
            unknownError.code = 'UNKNOWN_ERROR';
            unknownError.path = path;
            unknownError.method = method;
            throw unknownError;
          }
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, 'GET', undefined, init),
  post: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>(path, 'POST', body, init),
  put: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>(path, 'PUT', body, init),
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, 'DELETE', undefined, init),
};

export default api;


