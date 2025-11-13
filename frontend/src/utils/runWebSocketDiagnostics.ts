/**
 * Run WebSocket Diagnostics
 * Can be called from browser console to diagnose connection issues
 */

import { diagnoseWebSocketConnection, testWebSocketConnection } from './websocketDiagnostics';
import { logger } from './logger';
import { environment } from '../config/environment';
import { authService } from '../services/authService';
import { unifiedWebSocketService } from '../services/UnifiedWebSocketService';

/**
 * Run comprehensive WebSocket diagnostics and log results
 * Can be called from browser console: window.runWebSocketDiagnostics()
 */
export async function runWebSocketDiagnostics(): Promise<void> {
  console.log('🔍 Running WebSocket Diagnostics...');
  console.log('='.repeat(60));
  
  try {
    // 1. Check configuration
    console.log('\n📋 Configuration:');
    console.log('  WebSocket URL:', environment.api.websocketUrl);
    console.log('  API URL:', environment.api.baseUrl);
    console.log('  Protocol:', window.location.protocol);
    console.log('  Hostname:', window.location.hostname);
    console.log('  Origin:', window.location.origin);
    
    // 2. Check authentication
    console.log('\n🔐 Authentication:');
    const token = authService.getAccessToken();
    console.log('  Has Token:', !!token);
    if (token) {
      console.log('  Token Length:', token.length);
      console.log('  Token Prefix:', token.substring(0, 20) + '...');
      
      // Try to decode token
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('  Token Payload:', {
          userId: payload.sub,
          email: payload.email,
          exp: new Date(payload.exp * 1000).toISOString(),
          expired: payload.exp * 1000 < Date.now(),
        });
      } catch (e) {
        console.log('  Token Decode Error:', e);
      }
    } else {
      console.log('  ❌ No authentication token found');
    }
    
    // 3. Check backend reachability
    console.log('\n🌐 Backend Reachability:');
    try {
      const healthUrl = `${environment.api.baseUrl}/health`;
      console.log('  Checking:', healthUrl);
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      console.log('  Status:', response.status, response.statusText);
      if (response.ok) {
        const data = await response.json();
        console.log('  Backend Status:', data.status || 'unknown');
        console.log('  ✅ Backend is reachable');
      } else {
        console.log('  ⚠️ Backend returned error:', response.status);
      }
    } catch (error) {
      console.log('  ❌ Backend not reachable:', error instanceof Error ? error.message : String(error));
      console.log('  💡 Suggestion: Ensure backend server is running on', environment.api.baseUrl);
    }
    
    // 4. Run diagnostics
    console.log('\n🔍 Running Diagnostics...');
    const diagnostics = await diagnoseWebSocketConnection();
    
    console.log('\n📊 Diagnostics Results:');
    console.log('  Backend Reachable:', diagnostics.backendReachable);
    console.log('  Backend Running:', diagnostics.backendRunning);
    console.log('  Has Auth Token:', diagnostics.hasAuthToken);
    console.log('  Token Valid:', diagnostics.tokenValid);
    console.log('  Token Expired:', diagnostics.tokenExpired);
    console.log('  Network Issue:', diagnostics.networkIssue);
    console.log('  CORS Issue:', diagnostics.corsIssue);
    
    if (diagnostics.errors.length > 0) {
      console.log('\n❌ Errors:');
      diagnostics.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (diagnostics.suggestions.length > 0) {
      console.log('\n💡 Suggestions:');
      diagnostics.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    }
    
    // 5. Test WebSocket connection
    console.log('\n🔌 Testing WebSocket Connection...');
    const connectionTest = await testWebSocketConnection();
    console.log('  Success:', connectionTest.success);
    console.log('  Connected:', connectionTest.connected);
    if (connectionTest.error) {
      console.log('  Error:', connectionTest.error);
    }
    
    // 6. Check current connection state
    console.log('\n📡 Current Connection State:');
    console.log('  Connection Status:', unifiedWebSocketService.getConnectionStatus());
    const stats = unifiedWebSocketService.getConnectionStats();
    console.log('  Connection State:', stats.connectionState);
    console.log('  Is Connected:', stats.isConnected);
    console.log('  Is Authenticated:', stats.isAuthenticated);
    console.log('  Reconnect Attempts:', stats.reconnectAttempts);
    console.log('  Total Connections:', stats.totalConnections);
    console.log('  Failed Connections:', stats.failedConnections);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnostics Complete');
    
    // Return diagnostics for programmatic use
    return diagnostics as any;
  } catch (error) {
    console.error('❌ Error running diagnostics:', error);
    logger.error('Error running WebSocket diagnostics', 'diagnostics', { error });
    throw error;
  }
}

// Make function available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).runWebSocketDiagnostics = runWebSocketDiagnostics;
  (window as any).diagnoseWebSocket = runWebSocketDiagnostics;
}

export default runWebSocketDiagnostics;

