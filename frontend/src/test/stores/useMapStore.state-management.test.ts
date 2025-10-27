/**
 * Tests for MapStore state management
 * Verifies single source of truth for bus data
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useMapStore } from '../../stores/useMapStore';
import { BusInfo, BusLocation } from '../../types';

describe('MapStore State Management', () => {
  beforeEach(() => {
    // Reset store state
    useMapStore.setState({
      buses: [],
      lastBusLocations: {},
      spatialIndex: new Map(),
      routes: [],
      selectedRoute: 'all',
    });
  });

  describe('Single Source of Truth', () => {
    it('should store buses in MapStore', () => {
      const mockBus: BusInfo = {
        busId: 'bus-1',
        busNumber: 'BUS001',
        routeName: 'Route 1',
        driverName: 'Driver 1',
        driverId: 'driver-1',
        currentLocation: {
          busId: 'bus-1',
          driverId: 'driver-1',
          latitude: 23.0225,
          longitude: 72.5714,
          timestamp: new Date().toISOString(),
        },
      };

      useMapStore.getState().setBuses([mockBus]);

      const buses = useMapStore.getState().buses;
      expect(buses).toHaveLength(1);
      expect(buses[0].busId).toBe('bus-1');
      expect(buses[0].busNumber).toBe('BUS001');
    });

    it('should update bus locations in MapStore', () => {
      const mockBus: BusInfo = {
        busId: 'bus-1',
        busNumber: 'BUS001',
        routeName: 'Route 1',
        driverName: 'Driver 1',
        driverId: 'driver-1',
      };

      useMapStore.getState().setBuses([mockBus]);

      const location: BusLocation = {
        busId: 'bus-1',
        driverId: 'driver-1',
        latitude: 23.0225,
        longitude: 72.5714,
        timestamp: new Date().toISOString(),
        speed: 30,
      };

      useMapStore.getState().updateBusLocation(location);

      const lastLocations = useMapStore.getState().lastBusLocations;
      expect(lastLocations['bus-1']).toBeDefined();
      expect(lastLocations['bus-1'].latitude).toBe(23.0225);
      expect(lastLocations['bus-1'].speed).toBe(30);
    });

    it('should update spatial index when buses change', () => {
      const mockBus: BusInfo = {
        busId: 'bus-1',
        busNumber: 'BUS001',
        routeName: 'Route 1',
        driverName: 'Driver 1',
        driverId: 'driver-1',
        currentLocation: {
          busId: 'bus-1',
          driverId: 'driver-1',
          latitude: 23.0225,
          longitude: 72.5714,
          timestamp: new Date().toISOString(),
        },
      };

      useMapStore.getState().setBuses([mockBus]);

      const spatialIndex = useMapStore.getState().spatialIndex;
      expect(spatialIndex.size).toBeGreaterThan(0);
    });
  });

  describe('Data Consistency', () => {
    it('should keep buses and locations in sync', () => {
      const mockBus: BusInfo = {
        busId: 'bus-1',
        busNumber: 'BUS001',
        routeName: 'Route 1',
        driverName: 'Driver 1',
        driverId: 'driver-1',
      };

      useMapStore.getState().setBuses([mockBus]);

      const location: BusLocation = {
        busId: 'bus-1',
        driverId: 'driver-1',
        latitude: 23.0225,
        longitude: 72.5714,
        timestamp: new Date().toISOString(),
      };

      useMapStore.getState().updateBusLocation(location);

      const state = useMapStore.getState();
      
      // Bus should exist
      expect(state.buses.find(b => b.busId === 'bus-1')).toBeDefined();
      
      // Location should exist
      expect(state.lastBusLocations['bus-1']).toBeDefined();
      
      // Bus should have updated location
      const bus = state.buses.find(b => b.busId === 'bus-1');
      expect(bus?.currentLocation).toBeDefined();
      expect(bus?.currentLocation?.latitude).toBe(23.0225);
    });

    it('should remove bus and location together', () => {
      const mockBus: BusInfo = {
        busId: 'bus-1',
        busNumber: 'BUS001',
        routeName: 'Route 1',
        driverName: 'Driver 1',
        driverId: 'driver-1',
      };

      useMapStore.getState().setBuses([mockBus]);

      const location: BusLocation = {
        busId: 'bus-1',
        driverId: 'driver-1',
        latitude: 23.0225,
        longitude: 72.5714,
        timestamp: new Date().toISOString(),
      };

      useMapStore.getState().updateBusLocation(location);
      useMapStore.getState().removeBus('bus-1');

      const state = useMapStore.getState();
      expect(state.buses.find(b => b.busId === 'bus-1')).toBeUndefined();
      expect(state.lastBusLocations['bus-1']).toBeUndefined();
    });
  });

  describe('Memory Efficiency', () => {
    it('should not duplicate bus data', () => {
      const mockBus: BusInfo = {
        busId: 'bus-1',
        busNumber: 'BUS001',
        routeName: 'Route 1',
        driverName: 'Driver 1',
        driverId: 'driver-1',
        currentLocation: {
          busId: 'bus-1',
          driverId: 'driver-1',
          latitude: 23.0225,
          longitude: 72.5714,
          timestamp: new Date().toISOString(),
        },
      };

      useMapStore.getState().setBuses([mockBus]);

      // Update location multiple times
      for (let i = 0; i < 10; i++) {
        const location: BusLocation = {
          busId: 'bus-1',
          driverId: 'driver-1',
          latitude: 23.0225 + i * 0.001,
          longitude: 72.5714 + i * 0.001,
          timestamp: new Date().toISOString(),
        };
        useMapStore.getState().updateBusLocation(location);
      }

      // Should still have only one bus
      const buses = useMapStore.getState().buses;
      expect(buses.filter(b => b.busId === 'bus-1')).toHaveLength(1);
    });
  });
});

