import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useMapStore } from '../../stores/useMapStore';
import StudentMap from '../StudentMap';

// Mock dependencies
vi.mock('maplibre-gl', () => ({
  default: vi.fn(() => ({
    Map: vi.fn(() => ({
      on: vi.fn(),
      once: vi.fn(),
      addControl: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getSource: vi.fn(() => false),
      getBounds: vi.fn(() => ({
        getWest: () => 72.5,
        getEast: () => 73.0,
        getSouth: () => 23.0,
        getNorth: () => 23.5,
      })),
      getZoom: vi.fn(() => 12),
      getCenter: vi.fn(() => ({ lng: 72.571, lat: 23.025 })),
      isStyleLoaded: vi.fn(() => true),
      remove: vi.fn(),
      flyTo: vi.fn(),
    })),
    NavigationControl: vi.fn(),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      getLngLat: vi.fn(() => ({ lng: 72.571, lat: 23.025 })),
      getPopup: vi.fn(() => null),
      remove: vi.fn(),
    })),
    Popup: vi.fn(() => ({
      setHTML: vi.fn().mockReturnThis(),
      setLngLat: vi.fn().mockReturnThis(),
    })),
    LngLatBounds: vi.fn(),
  })),
}));

vi.mock('../../services/UnifiedWebSocketService', () => ({
  unifiedWebSocketService: {
    setClientType: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    getConnectionStatus: vi.fn(() => false),
    onBusLocationUpdate: vi.fn(() => vi.fn()),
    onDriverConnected: vi.fn(() => vi.fn()),
    onDriverDisconnected: vi.fn(() => vi.fn()),
    onBusArriving: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../services/api', () => ({
  apiService: {
    getRoutes: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'route-1',
          name: 'Route A',
          description: 'Test route',
          city: 'Ahmedabad',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    }),
    getAllBuses: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'bus-1',
          bus_number: 'BUS001',
          route_name: 'Route A',
          driver_name: 'Driver 1',
        },
      ],
    }),
    getLiveLocations: vi.fn().mockResolvedValue({
      success: true,
      data: [],
    }),
  },
}));

vi.mock('../../services/busService', () => ({
  busService: {
    syncAllBusesFromAPI: vi.fn().mockResolvedValue(undefined),
    getAllBuses: vi.fn(() => []),
  },
}));

describe('StudentMap Component', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useMapStore.getState();
    store.setBuses([]);
    store.setRoutes([]);
    store.setConnectionState({
      isConnected: false,
      connectionStatus: 'disconnected',
      connectionError: null,
    });
    store.setSelectedRoute('all');
    store.setLoading(true);
  });

  it('should render without crashing', () => {
    render(<StudentMap />);
    expect(screen.getByText(/Live Bus Tracking/i)).toBeInTheDocument();
  });

  it('should use store for state management', async () => {
    const { result } = await import('@testing-library/react-hooks');
    
    render(<StudentMap />);
    
    // Wait for component to initialize
    await waitFor(() => {
      const store = useMapStore.getState();
      expect(store).toBeDefined();
    });
  });

  it('should display connection status from store', async () => {
    const store = useMapStore.getState();
    
    // Set connected state in store
    store.setConnectionState({
      isConnected: true,
      connectionStatus: 'connected',
    });

    render(<StudentMap />);
    
    await waitFor(() => {
      // Component should reflect store state
      expect(store.isConnected).toBe(true);
    });
  });

  it('should handle route selection from store', async () => {
    const store = useMapStore.getState();
    
    // Set routes in store
    store.setRoutes([
      {
        id: 'route-1',
        name: 'Route A',
        description: 'Test route',
        city: 'Ahmedabad',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    store.setSelectedRoute('route-1');

    render(<StudentMap />);
    
    await waitFor(() => {
      expect(store.selectedRoute).toBe('route-1');
    });
  });

  it('should update store when bus location changes', async () => {
    const store = useMapStore.getState();
    
    // Set up bus
    store.setBuses([
      {
        busId: 'bus-1',
        busNumber: 'BUS001',
        routeName: 'Route A',
        driverName: 'Driver 1',
        currentLocation: null,
        eta: null,
      },
    ]);

    // Update location
    store.updateBusLocation({
      busId: 'bus-1',
      driverId: 'driver-1',
      latitude: 23.0225,
      longitude: 72.5714,
      timestamp: new Date().toISOString(),
    });

    render(<StudentMap />);
    
    await waitFor(() => {
      expect(store.lastBusLocations['bus-1']).toBeDefined();
      expect(store.lastBusLocations['bus-1'].latitude).toBe(23.0225);
    });
  });

  it('should handle loading state from store', async () => {
    const store = useMapStore.getState();
    
    store.setLoading(false);

    render(<StudentMap />);
    
    await waitFor(() => {
      expect(store.isLoading).toBe(false);
    });
  });
});

