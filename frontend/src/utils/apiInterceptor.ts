import { authService } from '../services/authService';

// Global fetch interceptor to add authorization headers
const originalFetch = window.fetch;

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  // Only add auth headers for your API requests
  if (
    typeof input === 'string' &&
    input.includes(import.meta.env.VITE_API_URL || '')
  ) {
    try {
      let token = authService.getAccessToken();

      // If no token, only try to refresh if user is authenticated
      if (!token && authService.isAuthenticated()) {
        console.log(
          '🔄 No token found but user is authenticated, attempting to refresh session...'
        );
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
