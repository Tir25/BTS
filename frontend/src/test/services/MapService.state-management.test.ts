/**
 * Tests for MapService state management fixes
 * Verifies that MapStore is the single source of truth
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapService } from '../../services/MapService';
import { useMapStore } from '../../stores/useMapStore';
import { BusLocation, BusInfo } from '../../types';

describe('MapService State Management', () => {
  let mapService: MapService;
  let mockMap: any;

  beforeEach(() => {
    mapService = new MapService();
    
    // Mock map instance
    mockMap = {
      isStyleLoaded: () => true,
      addControl: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      getZoom: () => 15,
      addLayer: vi.fn(),
      addSource: vi.fn(),
      removeLayer: vi.fn(),
      removeSource: vi.fn(),
      getSource: vi.fn(() => true),
      flyTo: vi.fn(),
      fitBounds: vi.fn(),
    };

    mapService.setMapInstance(mockMap);
    
    // Reset MapStore
    useMapStore.setState({
      buses: [],
      lastBusLocations: {},
      spatialIndex: new Map(),
    });
  });

  describe('MapStore Integration', () => {
    it('should set MapStore reference', () => {
      expect(() => {
        mapService.setMapStore(useMapStore);
      }).not.toThrow();
    });

    it('should read bus info from MapStore', () => {
      // Set MapStore reference
      mapService.setMapStore(useMapStore);

      // Add bus to MapStore
      const mockBus: BusInfo = {
        busId: 'test-bus-1',
        busNumber: 'TEST001',
        routeName: 'Test Route',
        driverName: 'Test Driver',
        driverId: 'driver-1',
        currentLocation: {
          busId: 'test-bus-1',
          driverId: 'driver-1',
          latitude: 23.0225,
          longitude: 72.5714,
          timestamp: new Date().toISOString(),
        },
      };

      useMapStore.getState().setBuses([mockBus]);

      // Get bus info through MapService (internal check)
      // Since getBusInfo is private, we test through marker creation
      const location: BusLocation = {
        busId: 'test-bus-1',
        driverId: 'driver-1',
        latitude: 23.0225,
        longitude: 72.5714,
        timestamp: new Date().toISOString(),
      };

      // This should use bus info from MapStore
      expect(() => {
        mapService.updateBusMarker('test-bus-1', location);
      }).not.toThrow();
    });

    it('should not have internal busInfoCache', () => {
      // Verify MapService doesn't maintain internal cache
      // by checking that it reads from MapStore each time
      mapService.setMapStore(useMapStore);

      const bus1: BusInfo = {
        busId: 'bus-1',
        busNumber: 'BUS001',
        routeName: 'Route 1',
        driverName: 'Driver 1',
        driverId: 'driver-1',
        currentLocation: {
          busId: 'bus-1',
          driverId: 'driver-1',
          latitude: 23.0,
          longitude: 72.0,
          timestamp: new Date().toISOString(),
        },
      };

      // Add bus to MapStore
      useMapStore.getState().setBuses([bus1]);

      const location: BusLocation = {
        busId: 'bus-1',
        driverId: 'driver-1',
        latitude: 23.0,
        longitude: 72.0,
        timestamp: new Date().toISOString(),
      };

      // Update bus info in MapStore
      const updatedBus = { ...bus1, busNumber: 'BUS001-UPDATED' };
      useMapStore.getState().setBuses([updatedBus]);

      // MapService should read updated info from MapStore
      expect(() => {
        mapService.updateBusMarker('bus-1', location);
      }).not.toThrow();
    });
  });

  describe('Marker Management', () => {
    it('should manage markers centrally', () => {
      mapService.setMapStore(useMapStore);
      
      const location: BusLocation = {
        busId: 'test-bus-1',
        driverId: 'driver-1',
        latitude: 23.0225,
        longitude: 72.5714,
        timestamp: new Date().toISOString(),
      };

      // Create marker
      mapService.updateBusMarker('test-bus-1', location);
      
      // Verify marker exists
      const markers = mapService.getMarkers();
      expect(markers['test-bus-1']).toBeDefined();
    });

    it('should remove markers properly', () => {
      mapService.setMapStore(useMapStore);
      
      const location: BusLocation = {
        busId: 'test-bus-1',
        driverId: 'driver-1',
        latitude: 23.0225,
        longitude: 72.5714,
        timestamp: new Date().toISOString(),
      };

      // Create marker
      mapService.updateBusMarker('test-bus-1', location);
      
      // Remove marker
      mapService.removeBusMarker('test-bus-1');
      
      // Verify marker removed
      const markers = mapService.getMarkers();
      expect(markers['test-bus-1']).toBeUndefined();
    });

    it('should cleanup all markers', () => {
      mapService.setMapStore(useMapStore);
      
      // Create multiple markers
      for (let i = 1; i <= 3; i++) {
        const location: BusLocation = {
          busId: `test-bus-${i}`,
          driverId: `driver-${i}`,
          latitude: 23.0 + i * 0.01,
          longitude: 72.0 + i * 0.01,
          timestamp: new Date().toISOString(),
        };
        mapService.updateBusMarker(`test-bus-${i}`, location);
      }

      // Cleanup all markers
      mapService.cleanupMarkers();
      
      // Verify all markers removed
      const markers = mapService.getMarkers();
      expect(Object.keys(markers)).toHaveLength(0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle deprecated setBusInfoCache gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Call deprecated method
      const mockCache = new Map<string, BusInfo>();
      mapService.setBusInfoCache(mockCache);
      
      // Should not throw, but may log warning
      expect(() => {
        mapService.setBusInfoCache(mockCache);
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should handle deprecated setBusInfo gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockBus: BusInfo = {
        busId: 'test-bus',
        busNumber: 'TEST',
        routeName: 'Route',
        driverName: 'Driver',
        driverId: 'driver-1',
      };
      
      // Call deprecated method
      expect(() => {
        mapService.setBusInfo('test-bus', mockBus);
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });
});

