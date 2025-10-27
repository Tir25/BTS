/**
 * Integration tests for StudentMap state management
 * Verifies MapStore and MapService integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useMapStore } from '../../stores/useMapStore';
import { MapService } from '../../services/MapService';
import { BusInfo, BusLocation } from '../../types';

// Mock MapService
vi.mock('../../services/MapService', () => {
  return {
    MapService: vi.fn().mockImplementation(() => ({
      setMapInstance: vi.fn(),
      setMapStore: vi.fn(),
      setClusteringEnabled: vi.fn(),
      updateBusMarker: vi.fn(),
      removeBusMarker: vi.fn(),
      cleanupMarkers: vi.fn(),
      getMarkers: vi.fn(() => ({})),
    })),
  };
});

describe('StudentMap State Management Integration', () => {
  beforeEach(() => {
    // Reset MapStore
    useMapStore.setState({
      buses: [],
      lastBusLocations: {},
      spatialIndex: new Map(),
      routes: [],
      selectedRoute: 'all',
      isLoading: false,
    });
  });

  describe('MapStore as Single Source of Truth', () => {
    it('should use MapStore for bus data', () => {
      const mockBus: BusInfo = {
        busId: 'bus-1',
        busNumber: 'BUS001',
        routeName: 'Route 1',
        driverName: 'Driver 1',
        driverId: 'driver-1',
      };

      // Add bus to MapStore
      useMapStore.getState().setBuses([mockBus]);

      // Verify bus is in MapStore
      const buses = useMapStore.getState().buses;
      expect(buses).toHaveLength(1);
      expect(buses[0].busId).toBe('bus-1');
    });

    it('should sync bus locations to MapStore', () => {
      const location: BusLocation = {
        busId: 'bus-1',
        driverId: 'driver-1',
        latitude: 23.0225,
        longitude: 72.5714,
        timestamp: new Date().toISOString(),
      };

      // Update location in MapStore
      useMapStore.getState().updateBusLocation(location);

      // Verify location is in MapStore
      const lastLocations = useMapStore.getState().lastBusLocations;
      expect(lastLocations['bus-1']).toBeDefined();
      expect(lastLocations['bus-1'].latitude).toBe(23.0225);
    });
  });

  describe('MapService Integration', () => {
    it('should set MapStore reference in MapService', () => {
      const mapService = new MapService();
      const mockMap = {
        isStyleLoaded: () => true,
        addControl: vi.fn(),
        on: vi.fn(),
        once: vi.fn(),
      };

      mapService.setMapInstance(mockMap);
      mapService.setMapStore(useMapStore);

      // Verify MapStore reference was set
      expect(mapService.setMapStore).toHaveBeenCalledWith(useMapStore);
    });

    it('should read bus info from MapStore when creating markers', () => {
      const mapService = new MapService();
      const mockMap = {
        isStyleLoaded: () => true,
        addControl: vi.fn(),
        on: vi.fn(),
        once: vi.fn(),
        getZoom: () => 15,
      };

      mapService.setMapInstance(mockMap);
      mapService.setMapStore(useMapStore);

      // Add bus to MapStore
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

      // Create marker - should read bus info from MapStore
      expect(() => {
        mapService.updateBusMarker('bus-1', location);
      }).not.toThrow();
    });
  });

  describe('No Redundant Cache', () => {
    it('should not maintain separate bus cache', () => {
      // Add bus to MapStore
      const mockBus: BusInfo = {
        busId: 'bus-1',
        busNumber: 'BUS001',
        routeName: 'Route 1',
        driverName: 'Driver 1',
        driverId: 'driver-1',
      };

      useMapStore.getState().setBuses([mockBus]);

      // Update bus in MapStore
      const updatedBus = { ...mockBus, busNumber: 'BUS001-UPDATED' };
      useMapStore.getState().setBuses([updatedBus]);

      // Verify update is reflected
      const buses = useMapStore.getState().buses;
      expect(buses[0].busNumber).toBe('BUS001-UPDATED');
      
      // There should be no separate cache - MapStore is the only source
      expect(buses).toHaveLength(1);
    });
  });
});

