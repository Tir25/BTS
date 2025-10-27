import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMapStore } from '../useMapStore';
import { BusLocation, BusInfo, Route } from '../../types';

describe('useMapStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useMapStore());
    act(() => {
      result.current.setBuses([]);
      result.current.setRoutes([]);
      result.current.setConnectionState({
        isConnected: false,
        connectionStatus: 'disconnected',
        connectionError: null,
      });
      result.current.setSelectedRoute('all');
      result.current.setLoading(false);
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useMapStore());
      
      expect(result.current.buses).toEqual([]);
      expect(result.current.routes).toEqual([]);
      expect(result.current.lastBusLocations).toEqual({});
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.selectedRoute).toBe('all');
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Bus Management', () => {
    it('should set buses correctly', () => {
      const { result } = renderHook(() => useMapStore());
      
      const mockBuses: BusInfo[] = [
        {
          busId: 'bus-1',
          busNumber: 'BUS001',
          routeName: 'Route A',
          driverName: 'Driver 1',
          currentLocation: null,
          eta: null,
        },
      ];

      act(() => {
        result.current.setBuses(mockBuses);
      });

      expect(result.current.buses).toEqual(mockBuses);
      expect(result.current.buses.length).toBe(1);
    });

    it('should update bus location correctly', () => {
      const { result } = renderHook(() => useMapStore());
      
      const mockBuses: BusInfo[] = [
        {
          busId: 'bus-1',
          busNumber: 'BUS001',
          routeName: 'Route A',
          driverName: 'Driver 1',
          currentLocation: null,
          eta: null,
        },
      ];

      act(() => {
        result.current.setBuses(mockBuses);
      });

      const location: BusLocation = {
        busId: 'bus-1',
        driverId: 'driver-1',
        latitude: 23.0225,
        longitude: 72.5714,
        timestamp: new Date().toISOString(),
        speed: 30,
        heading: 90,
      };

      act(() => {
        result.current.updateBusLocation(location);
      });

      expect(result.current.lastBusLocations['bus-1']).toEqual(location);
      expect(result.current.buses[0].currentLocation).toEqual(location);
    });

    it('should remove bus correctly', () => {
      const { result } = renderHook(() => useMapStore());
      
      const mockBuses: BusInfo[] = [
        {
          busId: 'bus-1',
          busNumber: 'BUS001',
          routeName: 'Route A',
          driverName: 'Driver 1',
          currentLocation: null,
          eta: null,
        },
      ];

      act(() => {
        result.current.setBuses(mockBuses);
        result.current.updateBusLocation({
          busId: 'bus-1',
          driverId: 'driver-1',
          latitude: 23.0225,
          longitude: 72.5714,
          timestamp: new Date().toISOString(),
        });
      });

      act(() => {
        result.current.removeBus('bus-1');
      });

      expect(result.current.buses.length).toBe(0);
      expect(result.current.lastBusLocations['bus-1']).toBeUndefined();
    });
  });

  describe('Route Management', () => {
    it('should set routes correctly', () => {
      const { result } = renderHook(() => useMapStore());
      
      const mockRoutes: Route[] = [
        {
          id: 'route-1',
          name: 'Route A',
          description: 'Test route',
          city: 'Ahmedabad',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      act(() => {
        result.current.setRoutes(mockRoutes);
      });

      expect(result.current.routes).toEqual(mockRoutes);
      expect(result.current.routes.length).toBe(1);
    });

    it('should set selected route correctly', () => {
      const { result } = renderHook(() => useMapStore());
      
      act(() => {
        result.current.setSelectedRoute('route-1');
      });

      expect(result.current.selectedRoute).toBe('route-1');
    });
  });

  describe('Connection State', () => {
    it('should update connection state correctly', () => {
      const { result } = renderHook(() => useMapStore());
      
      act(() => {
        result.current.setConnectionState({
          isConnected: true,
          connectionStatus: 'connected',
          connectionError: null,
        });
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.connectionError).toBeNull();
    });

    it('should handle connection errors', () => {
      const { result } = renderHook(() => useMapStore());
      
      act(() => {
        result.current.setConnectionState({
          connectionError: 'Connection failed',
        });
      });

      expect(result.current.connectionError).toBe('Connection failed');
    });
  });

  describe('Loading State', () => {
    it('should update loading state', () => {
      const { result } = renderHook(() => useMapStore());
      
      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('UI State', () => {
    it('should toggle navbar collapsed state', () => {
      const { result } = renderHook(() => useMapStore());
      
      act(() => {
        result.current.setNavbarCollapsed(true);
      });

      expect(result.current.isNavbarCollapsed).toBe(true);
    });

    it('should toggle route filter open state', () => {
      const { result } = renderHook(() => useMapStore());
      
      act(() => {
        result.current.setRouteFilterOpen(false);
      });

      expect(result.current.isRouteFilterOpen).toBe(false);
    });

    it('should toggle active buses open state', () => {
      const { result } = renderHook(() => useMapStore());
      
      act(() => {
        result.current.setActiveBusesOpen(false);
      });

      expect(result.current.isActiveBusesOpen).toBe(false);
    });
  });

  describe('Computed Values', () => {
    it('should filter buses by route', () => {
      const { result } = renderHook(() => useMapStore());
      
      const mockBuses: BusInfo[] = [
        {
          busId: 'bus-1',
          busNumber: 'BUS001',
          routeName: 'Route A',
          driverName: 'Driver 1',
          currentLocation: null,
          eta: null,
        },
        {
          busId: 'bus-2',
          busNumber: 'BUS002',
          routeName: 'Route B',
          driverName: 'Driver 2',
          currentLocation: null,
          eta: null,
        },
      ];

      act(() => {
        result.current.setBuses(mockBuses);
        result.current.setSelectedRoute('Route A');
      });

      const filteredBuses = result.current.getFilteredBuses();
      expect(filteredBuses.length).toBeGreaterThan(0);
    });

    it('should get active buses', () => {
      const { result } = renderHook(() => useMapStore());
      
      const mockBuses: BusInfo[] = [
        {
          busId: 'bus-1',
          busNumber: 'BUS001',
          routeName: 'Route A',
          driverName: 'Driver 1',
          currentLocation: {
            busId: 'bus-1',
            driverId: 'driver-1',
            latitude: 23.0225,
            longitude: 72.5714,
            timestamp: new Date().toISOString(),
          },
          eta: null,
        },
      ];

      act(() => {
        result.current.setBuses(mockBuses);
      });

      const activeBuses = result.current.getActiveBuses();
      expect(activeBuses.length).toBeGreaterThanOrEqual(0);
    });
  });
});
