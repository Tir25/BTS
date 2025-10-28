import { authService } from '../services/authService';
import { environment } from '../config/environment';

import { logger } from '../utils/logger';

// Global fetch interceptor to add authorization headers
const originalFetch = window.fetch;

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  // Only add auth headers for your API requests
  if (
    typeof input === 'string' &&
    (input.includes(environment.api.baseUrl) || input.includes('localhost'))
  ) {
    try {
      let token = authService.getAccessToken();

      // SIMPLIFIED: Only try to refresh if user is authenticated and no token
      if (!token && authService.isAuthenticated()) {
        logger.info('🔄 No token found but user is authenticated, attempting to refresh session...', 'component');
        const refreshResult = await authService.refreshSession();
        if (refreshResult.success) {
          token = authService.getAccessToken();
          logger.info('✅ Session refreshed, new token obtained', 'component');
        } else {
          logger.warn('⚠️ Session refresh failed in interceptor', 'component', { error: refreshResult.error });
        }
      }

      if (token) {
        init = init || {};
        init.headers = {
          ...init.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    } catch (error) {
      logger.info('🔓 Public access - authentication not available', 'component');
    }
  }

  return originalFetch(input, init);
};
