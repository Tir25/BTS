import { authService } from '../services/authService';

// Global fetch interceptor to add authorization headers
const originalFetch = window.fetch;

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  // Only add auth headers for your API requests
  if (
    typeof input === 'string' &&
    (input.includes('localhost:3000') || input.includes('localhost'))
  ) {
    try {
      let token = authService.getAccessToken();

      // If no token, try to refresh session
      if (!token) {
        console.log('🔄 No token found, attempting to refresh session...');
        const refreshResult = await authService.refreshSession();
        if (refreshResult.success) {
          token = authService.getAccessToken();
          console.log('✅ Session refreshed, new token obtained');
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
      console.log('🔓 Public access - authentication not available');
    }
  }

  return originalFetch(input, init);
};
