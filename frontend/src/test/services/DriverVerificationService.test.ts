/**
 * Comprehensive tests for DriverVerificationService
 * Tests all driver functionality verification features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { driverVerificationService, DriverVerificationResult } from '../../services/DriverVerificationService';
import { authService } from '../../services/authService';
import { unifiedWebSocketService } from '../../services/UnifiedWebSocketService';

// Mock dependencies
vi.mock('../../services/authService', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    getCurrentProfile: vi.fn(),
    getDriverBusAssignment: vi.fn(),
  },
}));

vi.mock('../../services/UnifiedWebSocketService', () => ({
  unifiedWebSocketService: {
    isConnected: vi.fn(),
    isAuthenticated: vi.fn(),
  },
}));

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock permissions API
const mockPermissions = {
  query: vi.fn(),
};

Object.defineProperty(global.navigator, 'permissions', {
  value: mockPermissions,
  writable: true,
});

describe('DriverVerificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    vi.mocked(authService.getCurrentUser).mockReturnValue(null);
    vi.mocked(authService.getCurrentProfile).mockReturnValue(null);
    vi.mocked(authService.getDriverBusAssignment).mockResolvedValue(null);
    vi.mocked(unifiedWebSocketService.isConnected).mockReturnValue(false);
    vi.mocked(unifiedWebSocketService.isAuthenticated).mockReturnValue(false);
    
    // Reset geolocation mocks
    mockGeolocation.getCurrentPosition.mockClear();
    mockPermissions.query.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('verifyDriverFunctionality', () => {
    it('returns comprehensive verification result', async () => {
      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result).toHaveProperty('authentication');
      expect(result).toHaveProperty('assignment');
      expect(result).toHaveProperty('websocket');
      expect(result).toHaveProperty('locationSharing');
    });

    it('handles all verification steps', async () => {
      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.authentication).toHaveProperty('success');
      expect(result.assignment).toHaveProperty('success');
      expect(result.websocket).toHaveProperty('connected');
      expect(result.websocket).toHaveProperty('authenticated');
      expect(result.locationSharing).toHaveProperty('permissionGranted');
      expect(result.locationSharing).toHaveProperty('locationAvailable');
      expect(result.locationSharing).toHaveProperty('websocketReady');
    });
  });

  describe('Authentication Verification', () => {
    it('verifies successful authentication', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'driver@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockProfile = {
        id: 'user-1',
        email: 'driver@example.com',
        role: 'driver',
        full_name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(authService.getCurrentUser).mockReturnValue(mockUser);
      vi.mocked(authService.getCurrentProfile).mockReturnValue(mockProfile);

      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.authentication.success).toBe(true);
      expect(result.authentication.driverId).toBe('user-1');
      expect(result.authentication.driverEmail).toBe('driver@example.com');
    });

    it('handles missing user', async () => {
      vi.mocked(authService.getCurrentUser).mockReturnValue(null);

      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.authentication.success).toBe(false);
      expect(result.authentication.error).toBe('No authenticated user found');
    });

    it('handles missing profile', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'driver@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(authService.getCurrentUser).mockReturnValue(mockUser);
      vi.mocked(authService.getCurrentProfile).mockReturnValue(null);

      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.authentication.success).toBe(false);
      expect(result.authentication.error).toBe('No user profile found');
    });

    it('handles non-driver role', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'admin@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockProfile = {
        id: 'user-1',
        email: 'admin@example.com',
        role: 'admin',
        full_name: 'Admin User',
        first_name: 'Admin',
        last_name: 'User',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(authService.getCurrentUser).mockReturnValue(mockUser);
      vi.mocked(authService.getCurrentProfile).mockReturnValue(mockProfile);

      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.authentication.success).toBe(false);
      expect(result.authentication.error).toBe("User role is 'admin', expected 'driver'");
    });
  });

  describe('Assignment Verification', () => {
    it('verifies successful bus assignment', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'driver@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockProfile = {
        id: 'user-1',
        email: 'driver@example.com',
        role: 'driver',
        full_name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockAssignment = {
        driver_id: 'user-1',
        bus_id: 'bus-1',
        bus_number: 'BUS-001',
        route_id: 'route-1',
        route_name: 'Route A',
        driver_name: 'John Doe',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(authService.getCurrentUser).mockReturnValue(mockUser);
      vi.mocked(authService.getCurrentProfile).mockReturnValue(mockProfile);
      vi.mocked(authService.getDriverBusAssignment).mockResolvedValue(mockAssignment);

      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.assignment.success).toBe(true);
      expect(result.assignment.busInfo).toEqual({
        bus_id: 'bus-1',
        bus_number: 'BUS-001',
        route_id: 'route-1',
        route_name: 'Route A',
      });
    });

    it('handles missing assignment', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'driver@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockProfile = {
        id: 'user-1',
        email: 'driver@example.com',
        role: 'driver',
        full_name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(authService.getCurrentUser).mockReturnValue(mockUser);
      vi.mocked(authService.getCurrentProfile).mockReturnValue(mockProfile);
      vi.mocked(authService.getDriverBusAssignment).mockResolvedValue(null);

      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.assignment.success).toBe(false);
      expect(result.assignment.error).toBe('No bus assignment found for driver');
    });

    it('handles assignment service error', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'driver@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockProfile = {
        id: 'user-1',
        email: 'driver@example.com',
        role: 'driver',
        full_name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(authService.getCurrentUser).mockReturnValue(mockUser);
      vi.mocked(authService.getCurrentProfile).mockReturnValue(mockProfile);
      vi.mocked(authService.getDriverBusAssignment).mockRejectedValue(new Error('Service error'));

      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.assignment.success).toBe(false);
      expect(result.assignment.error).toContain('Assignment verification failed');
    });
  });

  describe('WebSocket Verification', () => {
    it('verifies successful WebSocket connection', async () => {
      vi.mocked(unifiedWebSocketService.isConnected).mockReturnValue(true);
      vi.mocked(unifiedWebSocketService.isAuthenticated).mockReturnValue(true);

      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.websocket.connected).toBe(true);
      expect(result.websocket.authenticated).toBe(true);
      expect(result.websocket.error).toBeUndefined();
    });

    it('handles WebSocket disconnection', async () => {
      vi.mocked(unifiedWebSocketService.isConnected).mockReturnValue(false);
      vi.mocked(unifiedWebSocketService.isAuthenticated).mockReturnValue(false);

      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.websocket.connected).toBe(false);
      expect(result.websocket.authenticated).toBe(false);
      expect(result.websocket.error).toBe('WebSocket not connected');
    });

    it('handles WebSocket connection without authentication', async () => {
      vi.mocked(unifiedWebSocketService.isConnected).mockReturnValue(true);
      vi.mocked(unifiedWebSocketService.isAuthenticated).mockReturnValue(false);

      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.websocket.connected).toBe(true);
      expect(result.websocket.authenticated).toBe(false);
      expect(result.websocket.error).toBe('WebSocket connected but not authenticated');
    });
  });

  describe('Location Sharing Verification', () => {
    it('verifies successful location sharing capability', async () => {
      vi.mocked(unifiedWebSocketService.isConnected).mockReturnValue(true);
      vi.mocked(unifiedWebSocketService.isAuthenticated).mockReturnValue(true);

      mockPermissions.query.mockResolvedValue({ state: 'granted' });
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
      });

      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.locationSharing.permissionGranted).toBe(true);
      expect(result.locationSharing.locationAvailable).toBe(true);
      expect(result.locationSharing.websocketReady).toBe(true);
      expect(result.locationSharing.error).toBeUndefined();
    });

    it('handles location permission denial', async () => {
      vi.mocked(unifiedWebSocketService.isConnected).mockReturnValue(true);
      vi.mocked(unifiedWebSocketService.isAuthenticated).mockReturnValue(true);

      mockPermissions.query.mockResolvedValue({ state: 'denied' });

      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.locationSharing.permissionGranted).toBe(false);
      expect(result.locationSharing.error).toBe('Location permission denied');
    });

    it('handles missing geolocation API', async () => {
      const originalGeolocation = global.navigator.geolocation;
      // @ts-ignore
      global.navigator.geolocation = undefined;

      vi.mocked(unifiedWebSocketService.isConnected).mockReturnValue(true);
      vi.mocked(unifiedWebSocketService.isAuthenticated).mockReturnValue(true);

      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.locationSharing.error).toBe('Geolocation API not available');

      global.navigator.geolocation = originalGeolocation;
    });

    it('handles location API error', async () => {
      vi.mocked(unifiedWebSocketService.isConnected).mockReturnValue(true);
      vi.mocked(unifiedWebSocketService.isAuthenticated).mockReturnValue(true);

      mockPermissions.query.mockResolvedValue({ state: 'granted' });
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error({
          code: 1,
          message: 'User denied geolocation',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      });

      const result = await driverVerificationService.verifyDriverFunctionality();

      expect(result.locationSharing.locationAvailable).toBe(false);
      expect(result.locationSharing.error).toContain('Location not available');
    });
  });

  describe('Utility Methods', () => {
    it('generates correct verification summary', () => {
      const mockResult: DriverVerificationResult = {
        authentication: { success: true },
        assignment: { success: true },
        websocket: { connected: true, authenticated: true },
        locationSharing: { permissionGranted: true, locationAvailable: true, websocketReady: true },
      };

      const summary = driverVerificationService.getVerificationSummary(mockResult);
      expect(summary).toBe('Driver Verification: 6/6 checks passed');
    });

    it('correctly determines driver readiness', () => {
      const readyResult: DriverVerificationResult = {
        authentication: { success: true },
        assignment: { success: true },
        websocket: { connected: true, authenticated: true },
        locationSharing: { permissionGranted: true, locationAvailable: true, websocketReady: true },
      };

      const notReadyResult: DriverVerificationResult = {
        authentication: { success: false },
        assignment: { success: false },
        websocket: { connected: false, authenticated: false },
        locationSharing: { permissionGranted: false, locationAvailable: false, websocketReady: false },
      };

      expect(driverVerificationService.isDriverReady(readyResult)).toBe(true);
      expect(driverVerificationService.isDriverReady(notReadyResult)).toBe(false);
    });
  });
});
