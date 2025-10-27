import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocationStore, useLocationTracking, useLocationActions, useLocationStatus } from '../useLocationStore';

// Mock the logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useLocationStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useLocationStore.getState().resetAll();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useLocationStore());
      
      expect(result.current.isTracking).toBe(false);
      expect(result.current.hasPermission).toBe(false);
      expect(result.current.isRequestingPermission).toBe(false);
      expect(result.current.currentLocation).toBe(null);
      expect(result.current.locationError).toBe(null);
      expect(result.current.watchId).toBe(null);
      expect(result.current.trackingStartTime).toBe(null);
      expect(result.current.lastUpdateTime).toBe(null);
      expect(result.current.updateCount).toBe(0);
    });
  });

  describe('Permission Actions', () => {
    it('should update permission state correctly', () => {
      const { result } = renderHook(() => useLocationStore());
      
      act(() => {
        result.current.setPermissionState({
          hasPermission: true,
          isRequestingPermission: false,
        });
      });

      expect(result.current.hasPermission).toBe(true);
      expect(result.current.isRequestingPermission).toBe(false);
    });

    it('should handle permission request correctly', () => {
      const { result } = renderHook(() => useLocationStore());
      
      act(() => {
        result.current.requestPermission();
      });

      expect(result.current.isRequestingPermission).toBe(true);
    });
  });

  describe('Tracking Actions', () => {
    it('should start tracking correctly', () => {
      const { result } = renderHook(() => useLocationStore());
      const mockWatchId = 123;
      
      act(() => {
        result.current.startTracking(mockWatchId);
      });

      expect(result.current.isTracking).toBe(true);
      expect(result.current.watchId).toBe(mockWatchId);
      expect(result.current.trackingStartTime).toBeDefined();
    });

    it('should stop tracking correctly', () => {
      const { result } = renderHook(() => useLocationStore());
      const mockWatchId = 123;
      
      // Start tracking first
      act(() => {
        result.current.startTracking(mockWatchId);
      });

      expect(result.current.isTracking).toBe(true);

      // Stop tracking
      act(() => {
        result.current.stopTracking();
      });

      expect(result.current.isTracking).toBe(false);
      expect(result.current.watchId).toBe(null);
      expect(result.current.trackingStartTime).toBe(null);
    });
  });

  describe('Location Updates', () => {
    it('should update location correctly', () => {
      const { result } = renderHook(() => useLocationStore());
      const mockLocation = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        timestamp: Date.now(),
      };

      act(() => {
        result.current.updateLocation(mockLocation);
      });

      expect(result.current.currentLocation).toEqual(mockLocation);
      expect(result.current.lastUpdateTime).toBeDefined();
      expect(result.current.updateCount).toBe(1);
    });

    it('should increment update count on multiple updates', () => {
      const { result } = renderHook(() => useLocationStore());
      const mockLocation1 = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        timestamp: Date.now(),
      };
      const mockLocation2 = {
        latitude: 40.7130,
        longitude: -74.0058,
        accuracy: 8,
        timestamp: Date.now() + 1000,
      };

      act(() => {
        result.current.updateLocation(mockLocation1);
        result.current.updateLocation(mockLocation2);
      });

      expect(result.current.updateCount).toBe(2);
      expect(result.current.currentLocation).toEqual(mockLocation2);
    });
  });

  describe('Error Handling', () => {
    it('should set location error correctly', () => {
      const { result } = renderHook(() => useLocationStore());
      const mockError = {
        code: 1,
        message: 'Permission denied',
      };

      act(() => {
        result.current.setLocationError(mockError);
      });

      expect(result.current.locationError).toEqual(mockError);
    });

    it('should clear error correctly', () => {
      const { result } = renderHook(() => useLocationStore());
      const mockError = {
        code: 1,
        message: 'Permission denied',
      };

      act(() => {
        result.current.setLocationError(mockError);
      });

      expect(result.current.locationError).toEqual(mockError);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.locationError).toBe(null);
    });
  });

  describe('Reset Actions', () => {
    it('should reset all state correctly', () => {
      const { result } = renderHook(() => useLocationStore());
      
      // Set some state
      act(() => {
        result.current.setPermissionState({
          hasPermission: true,
          isRequestingPermission: false,
        });
        result.current.startTracking(123);
        result.current.updateLocation({
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
          timestamp: Date.now(),
        });
        result.current.setLocationError({
          code: 1,
          message: 'Test error',
        });
      });

      act(() => {
        result.current.resetAll();
      });

      // Should be back to initial state
      expect(result.current.isTracking).toBe(false);
      expect(result.current.hasPermission).toBe(false);
      expect(result.current.isRequestingPermission).toBe(false);
      expect(result.current.currentLocation).toBe(null);
      expect(result.current.locationError).toBe(null);
      expect(result.current.watchId).toBe(null);
      expect(result.current.trackingStartTime).toBe(null);
      expect(result.current.lastUpdateTime).toBe(null);
      expect(result.current.updateCount).toBe(0);
    });
  });

  describe('Selector Hooks', () => {
    it('useLocationTracking should return correct tracking state', () => {
      const { result } = renderHook(() => useLocationTracking());
      
      expect(result.current.isTracking).toBe(false);
      expect(result.current.watchId).toBe(null);
      expect(result.current.trackingStartTime).toBe(null);
      expect(result.current.lastUpdateTime).toBe(null);
      expect(result.current.updateCount).toBe(0);
    });

    it('useLocationStatus should return correct computed status', () => {
      const { result } = renderHook(() => useLocationStatus());
      
      expect(result.current.canTrack).toBe(false);
      expect(result.current.isReady).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.trackingDuration).toBe(0);
    });
  });

  describe('Action Hooks', () => {
    it('useLocationActions should return all action functions', () => {
      const { result } = renderHook(() => useLocationActions());
      
      expect(typeof result.current.startTracking).toBe('function');
      expect(typeof result.current.stopTracking).toBe('function');
      expect(typeof result.current.requestPermission).toBe('function');
      expect(typeof result.current.updateLocation).toBe('function');
      expect(typeof result.current.setLocationError).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.setPermissionState).toBe('function');
      expect(typeof result.current.resetAll).toBe('function');
    });
  });

  describe('Computed Values', () => {
    it('should calculate tracking duration correctly', () => {
      const { result } = renderHook(() => useLocationStore());
      
      // Start tracking
      act(() => {
        result.current.startTracking(123);
      });

      const startTime = result.current.trackingStartTime;
      expect(startTime).toBeDefined();

      // Simulate time passing
      const mockCurrentTime = startTime! + 5000; // 5 seconds later
      vi.spyOn(Date, 'now').mockReturnValue(mockCurrentTime);

      act(() => {
        result.current.updateLocation({
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
          timestamp: mockCurrentTime,
        });
      });

      expect(result.current.lastUpdateTime).toBe(mockCurrentTime);
    });

    it('should determine if location tracking is ready', () => {
      const { result } = renderHook(() => useLocationStore());
      
      // Initially not ready
      expect(result.current.hasPermission).toBe(false);
      expect(result.current.isTracking).toBe(false);

      // Grant permission
      act(() => {
        result.current.setPermissionState({
          hasPermission: true,
          isRequestingPermission: false,
        });
      });

      // Still not ready because not tracking
      expect(result.current.hasPermission).toBe(true);
      expect(result.current.isTracking).toBe(false);

      // Start tracking
      act(() => {
        result.current.startTracking(123);
      });

      // Now ready
      expect(result.current.hasPermission).toBe(true);
      expect(result.current.isTracking).toBe(true);
    });
  });
});
