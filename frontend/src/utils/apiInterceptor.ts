/**
 * Global Fetch Interceptor
 * Adds authorization headers to API requests automatically
 * PRODUCTION FIX: Enhanced with better token management and conflict prevention
 */
import { authService } from '../services/authService';
import { environment } from '../config/environment';
import { logger } from '../utils/logger';

// Global fetch interceptor to add authorization headers
const originalFetch = window.fetch;

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  // Only add auth headers for your API requests
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : '';
  const isApiRequest = url && (
    url.includes(environment.api.baseUrl) || 
    url.includes('localhost') ||
    url.startsWith('/api/')
  );

  if (isApiRequest) {
    try {
      // PRODUCTION FIX: Check if Authorization header is already set to prevent conflicts
      const existingHeaders = init?.headers as Record<string, string> | undefined;
      const hasAuthHeader = existingHeaders?.['Authorization'] || existingHeaders?.['authorization'];
      
      if (!hasAuthHeader) {
        let token = authService.getAccessToken();

        // PRODUCTION FIX: Try student auth for student endpoints
        if (!token && (url.includes('/student/') || url.includes('/auth/student/'))) {
          try {
            const { studentAuthService } = await import('../services/auth/studentAuthService');
            token = studentAuthService.getAccessToken();
            if (token) {
              logger.debug('🔑 Using student auth token in interceptor', 'api-interceptor', { url });
            }
          } catch (studentAuthError) {
            // Student auth not available, continue
            logger.debug('🔓 Student auth service not available in interceptor', 'api-interceptor', { url });
          }
        }

        // SIMPLIFIED: Only try to refresh if user is authenticated and no token
        if (!token && authService.isAuthenticated()) {
          logger.debug('🔄 No token found but user is authenticated, attempting to refresh session...', 'api-interceptor');
          try {
            const refreshResult = await authService.refreshSession();
            if (refreshResult.success) {
              token = authService.getAccessToken();
              logger.debug('✅ Session refreshed, new token obtained', 'api-interceptor');
            } else {
              logger.warn('⚠️ Session refresh failed in interceptor', 'api-interceptor', { error: refreshResult.error });
            }
          } catch (refreshError) {
            logger.warn('⚠️ Error refreshing session in interceptor', 'api-interceptor', { 
              error: refreshError instanceof Error ? refreshError.message : String(refreshError)
            });
          }
        }

        if (token) {
          init = init || {};
          const headers = new Headers(init.headers);
          headers.set('Authorization', `Bearer ${token}`);
          init.headers = headers;
        }
      } else {
        logger.debug('🔑 Authorization header already set, skipping interceptor', 'api-interceptor', { url });
      }
    } catch (error) {
      logger.debug('🔓 Public access - authentication not available', 'api-interceptor', {
        error: error instanceof Error ? error.message : String(error),
        url
      });
    }
  }

  return originalFetch(input, init);
};
