/**
 * WebSocket Connection Diagnostics
 * Helps diagnose WebSocket connection issues
 */

import { environment } from '../config/environment';
import { logger } from './logger';
import { authService } from '../services/authService';

export interface ConnectionDiagnostics {
  websocketUrl: string;
  backendReachable: boolean;
  hasAuthToken: boolean;
  tokenValid: boolean;
  tokenExpired: boolean;
  corsIssue: boolean;
  networkIssue: boolean;
  backendRunning: boolean;
  errors: string[];
  suggestions: string[];
}

/**
 * Run comprehensive WebSocket connection diagnostics
 */
export async function diagnoseWebSocketConnection(): Promise<ConnectionDiagnostics> {
  const diagnostics: ConnectionDiagnostics = {
    websocketUrl: environment.api.websocketUrl,
    backendReachable: false,
    hasAuthToken: false,
    tokenValid: false,
    tokenExpired: false,
    corsIssue: false,
    networkIssue: false,
    backendRunning: false,
    errors: [],
    suggestions: [],
  };

  try {
    // 1. Check WebSocket URL
    logger.info('🔍 WebSocket Diagnostics: Checking URL...', 'diagnostics', {
      url: diagnostics.websocketUrl,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
    });

    // 2. Check if backend is reachable (try HTTP health check first)
    const apiUrl = environment.api.baseUrl;
    const healthCheckUrl = `${apiUrl}/health`;
    
    try {
      const response = await fetch(healthCheckUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      if (response.ok) {
        diagnostics.backendReachable = true;
        diagnostics.backendRunning = true;
        logger.info('✅ Backend is reachable', 'diagnostics');
      } else {
        diagnostics.errors.push(`Backend returned status ${response.status}`);
        diagnostics.suggestions.push('Backend server is running but returned an error. Check backend logs.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      diagnostics.errors.push(`Backend not reachable: ${errorMessage}`);
      diagnostics.networkIssue = true;
      diagnostics.suggestions.push('Backend server is not running or not accessible. Please ensure the backend is running on ' + apiUrl);
      diagnostics.suggestions.push('Check if the backend server is running: `cd backend && npm run dev`');
      diagnostics.suggestions.push('Verify the backend URL is correct in your environment configuration');
    }

    // 3. Check authentication token
    try {
      const token = authService.getAccessToken();
      if (token) {
        diagnostics.hasAuthToken = true;
        logger.info('✅ Authentication token found', 'diagnostics', {
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 20) + '...',
        });

        // Try to decode token to check expiration
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const expirationTime = payload.exp * 1000; // Convert to milliseconds
          const currentTime = Date.now();
          
          if (expirationTime > currentTime) {
            diagnostics.tokenValid = true;
            const timeUntilExpiry = expirationTime - currentTime;
            const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60000);
            logger.info('✅ Token is valid', 'diagnostics', {
              expiresIn: `${minutesUntilExpiry} minutes`,
            });
          } else {
            diagnostics.tokenExpired = true;
            diagnostics.errors.push('Authentication token is expired');
            diagnostics.suggestions.push('Your authentication token has expired. Please log out and log in again.');
          }
        } catch (decodeError) {
          diagnostics.errors.push('Failed to decode authentication token');
          diagnostics.suggestions.push('Authentication token format is invalid. Please log out and log in again.');
        }
      } else {
        diagnostics.errors.push('No authentication token found');
        diagnostics.suggestions.push('You are not authenticated. Please log in first.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      diagnostics.errors.push(`Error checking authentication token: ${errorMessage}`);
    }

    // 4. Check WebSocket URL format
    if (!diagnostics.websocketUrl.startsWith('ws://') && !diagnostics.websocketUrl.startsWith('wss://')) {
      diagnostics.errors.push('WebSocket URL format is invalid');
      diagnostics.suggestions.push('WebSocket URL must start with ws:// or wss://');
    }

    // 5. Check protocol mismatch
    const isHttps = window.location.protocol === 'https:';
    const isWss = diagnostics.websocketUrl.startsWith('wss://');
    if (isHttps && !isWss) {
      diagnostics.errors.push('Protocol mismatch: HTTPS page trying to connect to non-secure WebSocket');
      diagnostics.suggestions.push('Use wss:// (secure WebSocket) when the page is served over HTTPS');
    }

    // 6. Check CORS (can't directly test, but provide suggestions)
    if (!diagnostics.backendReachable) {
      diagnostics.corsIssue = true;
      diagnostics.suggestions.push('Possible CORS issue. Check backend CORS configuration allows your origin.');
      diagnostics.suggestions.push('Backend should allow origin: ' + window.location.origin);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    diagnostics.errors.push(`Diagnostics error: ${errorMessage}`);
    logger.error('Error running WebSocket diagnostics', 'diagnostics', { error });
  }

  // Log diagnostics summary
  logger.info('🔍 WebSocket Diagnostics Summary', 'diagnostics', {
    backendReachable: diagnostics.backendReachable,
    backendRunning: diagnostics.backendRunning,
    hasAuthToken: diagnostics.hasAuthToken,
    tokenValid: diagnostics.tokenValid,
    tokenExpired: diagnostics.tokenExpired,
    errors: diagnostics.errors.length,
    suggestions: diagnostics.suggestions.length,
  });

  return diagnostics;
}

/**
 * Test WebSocket connection directly
 */
export async function testWebSocketConnection(): Promise<{
  success: boolean;
  error?: string;
  connected: boolean;
}> {
  const wsUrl = environment.api.websocketUrl;
  
  return new Promise((resolve) => {
    try {
      // Create a test WebSocket connection
      const testSocket = new WebSocket(wsUrl.replace('ws://', 'ws://').replace('wss://', 'wss://'));
      
      const timeout = setTimeout(() => {
        testSocket.close();
        resolve({
          success: false,
          error: 'Connection timeout',
          connected: false,
        });
      }, 5000);

      testSocket.onopen = () => {
        clearTimeout(timeout);
        testSocket.close();
        resolve({
          success: true,
          connected: true,
        });
      };

      testSocket.onerror = (error) => {
        clearTimeout(timeout);
        testSocket.close();
        resolve({
          success: false,
          error: 'WebSocket connection error',
          connected: false,
        });
      };

      testSocket.onclose = (event) => {
        clearTimeout(timeout);
        if (!event.wasClean) {
          resolve({
            success: false,
            error: `Connection closed: ${event.code} ${event.reason}`,
            connected: false,
          });
        }
      };
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        connected: false,
      });
    }
  });
}

