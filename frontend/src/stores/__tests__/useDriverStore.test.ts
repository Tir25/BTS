import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDriverStore, useDriverAuth, useDriverAssignment, useDriverConnection, useDriverUI, useDriverActions, useDriverStatus } from '../useDriverStore';
import { DriverBusAssignment } from '../../services/authService';

// Mock the logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useDriverStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useDriverStore.getState().resetAll();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useDriverStore());
      
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isDriver).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.driverId).toBe(null);
      expect(result.current.driverEmail).toBe(null);
      expect(result.current.driverName).toBe(null);
      expect(result.current.busAssignment).toBe(null);
      expect(result.current.isWebSocketConnected).toBe(false);
      expect(result.current.isWebSocketAuthenticated).toBe(false);
      expect(result.current.isInitializing).toBe(true);
      expect(result.current.initializationError).toBe(null);
      expect(result.current.showTestMode).toBe(false);
    });
  });

  describe('Authentication Actions', () => {
    it('should update authentication state correctly', () => {
      const { result } = renderHook(() => useDriverStore());
      
      act(() => {
        result.current.setAuthState({
          isAuthenticated: true,
          isDriver: true,
          isLoading: false,
          error: null,
        });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isDriver).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should set driver data correctly', () => {
      const { result } = renderHook(() => useDriverStore());
      const driverData = {
        driverId: 'driver-123',
        driverEmail: 'driver@example.com',
        driverName: 'John Driver',
        busAssignment: {
          driver_id: 'driver-123',
          bus_id: 'bus-456',
          bus_number: 'BUS-001',
          route_id: 'route-789',
          route_name: 'Route A',
          driver_name: 'John Driver',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        } as DriverBusAssignment,
      };

      act(() => {
        result.current.setDriverData(driverData);
      });

      expect(result.current.driverId).toBe('driver-123');
      expect(result.current.driverEmail).toBe('driver@example.com');
      expect(result.current.driverName).toBe('John Driver');
      expect(result.current.busAssignment).toEqual(driverData.busAssignment);
    });

    it('should clear error correctly', () => {
      const { result } = renderHook(() => useDriverStore());
      
      act(() => {
        result.current.setAuthState({ error: 'Test error' });
      });
      
      expect(result.current.error).toBe('Test error');
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBe(null);
    });
  });

  describe('Connection Actions', () => {
    it('should update connection state correctly', () => {
      const { result } = renderHook(() => useDriverStore());
      
      act(() => {
        result.current.setConnectionState({
          isWebSocketConnected: true,
          isWebSocketAuthenticated: true,
        });
      });

      expect(result.current.isWebSocketConnected).toBe(true);
      expect(result.current.isWebSocketAuthenticated).toBe(true);
    });
  });

  describe('UI Actions', () => {
    it('should update initialization state correctly', () => {
      const { result } = renderHook(() => useDriverStore());
      
      act(() => {
        result.current.setInitializationState({
          isInitializing: false,
          initializationError: 'Initialization failed',
        });
      });

      expect(result.current.isInitializing).toBe(false);
      expect(result.current.initializationError).toBe('Initialization failed');
    });

    it('should toggle test mode correctly', () => {
      const { result } = renderHook(() => useDriverStore());
      
      expect(result.current.showTestMode).toBe(false);
      
      act(() => {
        result.current.toggleTestMode();
      });
      
      expect(result.current.showTestMode).toBe(true);
      
      act(() => {
        result.current.toggleTestMode();
      });
      
      expect(result.current.showTestMode).toBe(false);
    });
  });

  describe('Assignment Actions', () => {
    it('should update bus assignment correctly', () => {
      const { result } = renderHook(() => useDriverStore());
      const assignment: DriverBusAssignment = {
        driver_id: 'driver-123',
        bus_id: 'bus-456',
        bus_number: 'BUS-001',
        route_id: 'route-789',
        route_name: 'Route A',
        driver_name: 'John Driver',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      act(() => {
        result.current.updateBusAssignment(assignment);
      });

      expect(result.current.busAssignment).toEqual(assignment);
    });

    it('should clear assignment correctly', () => {
      const { result } = renderHook(() => useDriverStore());
      const assignment: DriverBusAssignment = {
        driver_id: 'driver-123',
        bus_id: 'bus-456',
        bus_number: 'BUS-001',
        route_id: 'route-789',
        route_name: 'Route A',
        driver_name: 'John Driver',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      act(() => {
        result.current.updateBusAssignment(assignment);
      });

      expect(result.current.busAssignment).toEqual(assignment);

      act(() => {
        result.current.clearAssignment();
      });

      expect(result.current.busAssignment).toBe(null);
    });
  });

  describe('Reset Actions', () => {
    it('should reset auth state correctly', () => {
      const { result } = renderHook(() => useDriverStore());
      
      // Set some state
      act(() => {
        result.current.setAuthState({
          isAuthenticated: true,
          isDriver: true,
          isLoading: false,
        });
        result.current.setDriverData({
          driverId: 'driver-123',
          driverEmail: 'driver@example.com',
        });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.driverId).toBe('driver-123');

      act(() => {
        result.current.resetAuth();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isDriver).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.driverId).toBe(null);
      expect(result.current.driverEmail).toBe(null);
      expect(result.current.busAssignment).toBe(null);
    });

    it('should reset all state correctly', () => {
      const { result } = renderHook(() => useDriverStore());
      
      // Set some state
      act(() => {
        result.current.setAuthState({
          isAuthenticated: true,
          isDriver: true,
          isLoading: false,
        });
        result.current.setDriverData({
          driverId: 'driver-123',
        });
        result.current.setConnectionState({
          isWebSocketConnected: true,
          isWebSocketAuthenticated: true,
        });
        result.current.setInitializationState({
          isInitializing: false,
          initializationError: 'Test error',
        });
        result.current.toggleTestMode();
      });

      act(() => {
        result.current.resetAll();
      });

      // Should be back to initial state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isDriver).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.driverId).toBe(null);
      expect(result.current.isWebSocketConnected).toBe(false);
      expect(result.current.isWebSocketAuthenticated).toBe(false);
      expect(result.current.isInitializing).toBe(true);
      expect(result.current.initializationError).toBe(null);
      expect(result.current.showTestMode).toBe(false);
    });
  });

  describe('Selector Hooks', () => {
    it('useDriverAuth should return correct auth state', () => {
      const { result } = renderHook(() => useDriverAuth());
      
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isDriver).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.driverId).toBe(null);
      expect(result.current.driverEmail).toBe(null);
      expect(result.current.driverName).toBe(null);
    });

    it('useDriverAssignment should return correct assignment state', () => {
      const { result } = renderHook(() => useDriverAssignment());
      
      expect(result.current.busAssignment).toBe(null);
      expect(result.current.hasAssignment).toBe(false);
    });

    it('useDriverConnection should return correct connection state', () => {
      const { result } = renderHook(() => useDriverConnection());
      
      expect(result.current.isWebSocketConnected).toBe(false);
      expect(result.current.isWebSocketAuthenticated).toBe(false);
      expect(result.current.connectionStatus).toBe('disconnected');
    });

    it('useDriverUI should return correct UI state', () => {
      const { result } = renderHook(() => useDriverUI());
      
      expect(result.current.isInitializing).toBe(true);
      expect(result.current.initializationError).toBe(null);
      expect(result.current.showTestMode).toBe(false);
    });

    it('useDriverStatus should return correct computed status', () => {
      const { result } = renderHook(() => useDriverStatus());
      
      expect(result.current.isReady).toBe(false);
      expect(result.current.canTrackLocation).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.isFullyConnected).toBe(false);
    });
  });

  describe('Action Hooks', () => {
    it('useDriverActions should return all action functions', () => {
      const { result } = renderHook(() => useDriverActions());
      
      expect(typeof result.current.setAuthState).toBe('function');
      expect(typeof result.current.setDriverData).toBe('function');
      expect(typeof result.current.setConnectionState).toBe('function');
      expect(typeof result.current.setInitializationState).toBe('function');
      expect(typeof result.current.toggleTestMode).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.clearInitializationError).toBe('function');
      expect(typeof result.current.updateBusAssignment).toBe('function');
      expect(typeof result.current.clearAssignment).toBe('function');
      expect(typeof result.current.resetAuth).toBe('function');
      expect(typeof result.current.resetAll).toBe('function');
    });
  });
});
