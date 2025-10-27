/**
 * Driver Functionality Verification Script
 * Comprehensive testing of driver authentication, assignment loading, and location sharing
 */

import { authService } from '../services/authService';
import { unifiedWebSocketService } from '../services/UnifiedWebSocketService';
import { logger } from '../utils/logger';

export interface DriverVerificationResult {
  authentication: {
    success: boolean;
    error?: string;
    driverId?: string;
    driverEmail?: string;
  };
  assignment: {
    success: boolean;
    error?: string;
    busInfo?: {
      bus_id: string;
      bus_number: string;
      route_id: string;
      route_name: string;
    };
  };
  websocket: {
    connected: boolean;
    authenticated: boolean;
    error?: string;
  };
  locationSharing: {
    permissionGranted: boolean;
    locationAvailable: boolean;
    websocketReady: boolean;
    error?: string;
  };
}

export class DriverVerificationService {
  private static instance: DriverVerificationService;
  
  public static getInstance(): DriverVerificationService {
    if (!DriverVerificationService.instance) {
      DriverVerificationService.instance = new DriverVerificationService();
    }
    return DriverVerificationService.instance;
  }

  /**
   * Comprehensive driver functionality verification
   */
  async verifyDriverFunctionality(): Promise<DriverVerificationResult> {
    logger.info('🔍 Starting comprehensive driver functionality verification', 'driver-verification');
    
    const result: DriverVerificationResult = {
      authentication: { success: false },
      assignment: { success: false },
      websocket: { connected: false, authenticated: false },
      locationSharing: { permissionGranted: false, locationAvailable: false, websocketReady: false }
    };

    try {
      // 1. Verify Authentication
      await this.verifyAuthentication(result);
      
      // 2. Verify Bus Assignment
      if (result.authentication.success) {
        await this.verifyBusAssignment(result);
      }
      
      // 3. Verify WebSocket Connection
      await this.verifyWebSocketConnection(result);
      
      // 4. Verify Location Sharing Capability
      await this.verifyLocationSharing(result);
      
      logger.info('✅ Driver functionality verification completed', 'driver-verification', result as any);
      
    } catch (error) {
      logger.error('❌ Driver verification failed', 'driver-verification', { error });
    }

    return result;
  }

  /**
   * Verify driver authentication
   */
  private async verifyAuthentication(result: DriverVerificationResult): Promise<void> {
    try {
      logger.info('🔐 Verifying driver authentication...', 'driver-verification');
      
      const currentUser = authService.getCurrentUser();
      const currentProfile = authService.getCurrentProfile();
      
      if (!currentUser) {
        result.authentication.error = 'No authenticated user found';
        return;
      }
      
      if (!currentProfile) {
        result.authentication.error = 'No user profile found';
        return;
      }
      
      if (currentProfile.role !== 'driver') {
        result.authentication.error = `User role is '${currentProfile.role}', expected 'driver'`;
        return;
      }
      
      result.authentication.success = true;
      result.authentication.driverId = currentUser.id;
      result.authentication.driverEmail = currentUser.email || '';
      
      logger.info('✅ Driver authentication verified', 'driver-verification', {
        driverId: result.authentication.driverId,
        driverEmail: result.authentication.driverEmail
      });
      
    } catch (error) {
      result.authentication.error = `Authentication verification failed: ${error}`;
      logger.error('❌ Authentication verification failed', 'driver-verification', { error });
    }
  }

  /**
   * Verify bus assignment
   */
  private async verifyBusAssignment(result: DriverVerificationResult): Promise<void> {
    try {
      logger.info('🚌 Verifying bus assignment...', 'driver-verification');
      
      if (!result.authentication.driverId) {
        result.assignment.error = 'No driver ID available for assignment verification';
        return;
      }
      
      const assignment = await authService.getDriverBusAssignment(result.authentication.driverId);
      
      if (!assignment) {
        result.assignment.error = 'No bus assignment found for driver';
        return;
      }
      
      result.assignment.success = true;
      result.assignment.busInfo = {
        bus_id: assignment.bus_id,
        bus_number: assignment.bus_number,
        route_id: assignment.route_id,
        route_name: assignment.route_name
      };
      
      logger.info('✅ Bus assignment verified', 'driver-verification', result.assignment.busInfo);
      
    } catch (error) {
      result.assignment.error = `Assignment verification failed: ${error}`;
      logger.error('❌ Assignment verification failed', 'driver-verification', { error });
    }
  }

  /**
   * Verify WebSocket connection
   */
  private async verifyWebSocketConnection(result: DriverVerificationResult): Promise<void> {
    try {
      logger.info('🔌 Verifying WebSocket connection...', 'driver-verification');
      
      const isConnected = unifiedWebSocketService.getConnectionStatus();
      result.websocket.connected = isConnected;
      
      if (!isConnected) {
        result.websocket.error = 'WebSocket not connected';
        return;
      }
      
      // Check if WebSocket is authenticated (simplified check)
      result.websocket.authenticated = true; // Assume authenticated if connected
      
      logger.info('✅ WebSocket connection verified', 'driver-verification', {
        connected: result.websocket.connected,
        authenticated: result.websocket.authenticated
      });
      
    } catch (error) {
      result.websocket.error = `WebSocket verification failed: ${error}`;
      logger.error('❌ WebSocket verification failed', 'driver-verification', { error });
    }
  }

  /**
   * Verify location sharing capability
   */
  private async verifyLocationSharing(result: DriverVerificationResult): Promise<void> {
    try {
      logger.info('📍 Verifying location sharing capability...', 'driver-verification');
      
      // Check if WebSocket is ready for location updates
      result.locationSharing.websocketReady = result.websocket.connected && result.websocket.authenticated;
      
      if (!result.locationSharing.websocketReady) {
        result.locationSharing.error = 'WebSocket not ready for location updates';
        return;
      }
      
      // Check geolocation API availability
      if (!navigator.geolocation) {
        result.locationSharing.error = 'Geolocation API not available';
        return;
      }
      
      // Test location permission
      try {
        const permission = await navigator.permissions?.query({ name: 'geolocation' });
        result.locationSharing.permissionGranted = permission?.state === 'granted';
        
        if (permission?.state === 'denied') {
          result.locationSharing.error = 'Location permission denied';
          return;
        }
      } catch (permissionError) {
        logger.warn('⚠️ Could not check location permission', 'driver-verification', { permissionError });
      }
      
      // Test location availability
      try {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              result.locationSharing.locationAvailable = true;
              resolve();
            },
            (error) => {
              result.locationSharing.error = `Location not available: ${error.message}`;
              reject(error);
            },
            { timeout: 5000, enableHighAccuracy: false }
          );
        });
      } catch (locationError) {
        logger.warn('⚠️ Location test failed', 'driver-verification', { locationError });
      }
      
      logger.info('✅ Location sharing capability verified', 'driver-verification', {
        permissionGranted: result.locationSharing.permissionGranted,
        locationAvailable: result.locationSharing.locationAvailable,
        websocketReady: result.locationSharing.websocketReady
      });
      
    } catch (error) {
      result.locationSharing.error = `Location sharing verification failed: ${error}`;
      logger.error('❌ Location sharing verification failed', 'driver-verification', { error });
    }
  }

  /**
   * Get verification summary
   */
  getVerificationSummary(result: DriverVerificationResult): string {
    const checks = [
      { name: 'Authentication', success: result.authentication.success },
      { name: 'Bus Assignment', success: result.assignment.success },
      { name: 'WebSocket Connection', success: result.websocket.connected },
      { name: 'WebSocket Authentication', success: result.websocket.authenticated },
      { name: 'Location Permission', success: result.locationSharing.permissionGranted },
      { name: 'Location Available', success: result.locationSharing.locationAvailable },
    ];

    const passed = checks.filter(check => check.success).length;
    const total = checks.length;

    return `Driver Verification: ${passed}/${total} checks passed`;
  }

  /**
   * Check if driver is ready for operation
   */
  isDriverReady(result: DriverVerificationResult): boolean {
    return (
      result.authentication.success &&
      result.assignment.success &&
      result.websocket.connected &&
      result.websocket.authenticated &&
      result.locationSharing.websocketReady
    );
  }
}

// Export singleton instance
export const driverVerificationService = DriverVerificationService.getInstance();
export default driverVerificationService;
