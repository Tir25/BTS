// frontend/src/components/optimized/OptimizedStudentMap.tsx

import React, {
  useEffect,
  useRef,
  useMemo,
  memo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Marker } from 'maplibre-gl';
import { websocketService, BusLocation } from '../../services/websocket';
import { busService, BusInfo } from '../../services/busService';
import { apiService } from '../../services/api';
// import { authService } from '../../services/authService';
import GlassyCard from '../ui/GlassyCard';
import { Route } from '../../types';
import {
  // useDebounce,
  useThrottle,
  useStableCallback,
  useRenderPerformance,
  useBatchedState,
  // useComputedValue,
  withPerformanceTracking,
} from '../../utils/performanceOptimization';
import MapErrorBoundary from '../error/MapErrorBoundary';

interface OptimizedStudentMapProps {
  className?: string;
}

// Memoized route filter component
const RouteFilter = memo<{
  routes: Route[];
  selectedRoute: string;
  onRouteChange: (routeId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}>(({ routes, selectedRoute, onRouteChange, isOpen, onToggle }) => {
  const filteredRoutes = useMemo(() => {
    return routes.filter(route => route.is_active);
  }, [routes]);

  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full text-left font-semibold text-white mb-2 flex items-center justify-between"
      >
        <span>Route Filter</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2">
              <label className="flex items-center text-white cursor-pointer">
                <input
                  type="radio"
                  name="route"
                  value="all"
                  checked={selectedRoute === 'all'}
                  onChange={(e) => onRouteChange(e.target.value)}
                  className="mr-2"
                />
                All Routes
              </label>
              {filteredRoutes.map((route) => (
                <label key={route.id} className="flex items-center text-white cursor-pointer">
                  <input
                    type="radio"
                    name="route"
                    value={route.id}
                    checked={selectedRoute === route.id}
                    onChange={(e) => onRouteChange(e.target.value)}
                    className="mr-2"
                  />
                  {route.name}
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Memoized active buses component
const ActiveBuses = memo<{
  buses: BusInfo[];
  lastBusLocations: { [busId: string]: BusLocation };
  selectedRoute: string;
  isOpen: boolean;
  onToggle: () => void;
}>(({ buses, lastBusLocations, selectedRoute, isOpen, onToggle }) => {
  const filteredBuses = useMemo(() => {
    if (selectedRoute === 'all') {
      return buses; // All buses are considered active
    }
    return buses.filter(bus => bus.routeName === selectedRoute);
  }, [buses, selectedRoute]);

  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full text-left font-semibold text-white mb-2 flex items-center justify-between"
      >
        <span>Active Buses ({filteredBuses.length})</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredBuses.map((bus) => {
                const location = lastBusLocations[bus.busId];
                return (
                  <div
                    key={bus.busId}
                    className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-white"
                  >
                    <div className="font-semibold">Bus {bus.busNumber}</div>
                    <div className="text-sm opacity-80">
                      Route: {bus.routeName}
                    </div>
                    {location && (
                      <div className="text-sm opacity-80">
                        Speed: {location.speed ? `${location.speed} km/h` : 'N/A'}
                        {location.eta && (
                          <span className="ml-2">
                            ETA: {location.eta.estimated_arrival_minutes} min
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Memoized connection status component
const ConnectionStatus = memo<{
  isConnected: boolean;
  connectionStatus: string;
  connectionError: string | null;
}>(({ connectionStatus, connectionError }) => {
  const statusColor = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-400';
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-400';
      case 'disconnected':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }, [connectionStatus]);

  return (
    <div className="mb-4">
      <div className={`text-sm ${statusColor}`}>
        Status: {connectionStatus}
        {connectionError && (
          <div className="text-red-400 text-xs mt-1">
            Error: {connectionError}
          </div>
        )}
      </div>
    </div>
  );
});

const OptimizedStudentMap: React.FC<OptimizedStudentMapProps> = ({
  className = '',
}) => {
  // Performance tracking
  const endRender = useRenderPerformance('OptimizedStudentMap');

  // Map references
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const markers = useRef<{ [busId: string]: Marker }>({});
  const isMapInitialized = useRef(false);
  const addedRoutes = useRef<Set<string>>(new Set());

  // State management with batching for better performance
  const [connectionState, setConnectionState] = useBatchedState({
    isConnected: false,
    connectionError: null as string | null,
    connectionStatus: 'disconnected' as 'connected' | 'connecting' | 'disconnected' | 'reconnecting',
  });

  const [mapData, setMapData] = useBatchedState({
    buses: [] as BusInfo[],
    routes: [] as Route[],
    selectedRoute: 'all',
    isLoading: true,
    lastBusLocations: {} as { [busId: string]: BusLocation },
  });

  const [uiState, setUiState] = useBatchedState({
    isNavbarCollapsed: false,
    isRouteFilterOpen: true,
    isActiveBusesOpen: true,
  });

  // Debounced route selection to prevent excessive re-renders (used in filtering)

  // Filter buses based on selected route (used in map rendering)

  // Stable callbacks
  const loadRoutes = useStableCallback(async () => {
    try {
      console.log('🔄 Loading routes from backend API...');
      const response = await apiService.getRoutes();
      if (response.success && response.data) {
        console.log('✅ Routes loaded from backend:', response.data.length, 'routes');
        setMapData(prev => ({ ...prev, routes: response.data as unknown as Route[] }));
      } else {
        console.error('❌ Failed to load routes:', response);
      }
    } catch (error) {
      console.error('❌ Error loading routes:', error);
    }
  }, []);

  const removeRoutesFromMap = useStableCallback(() => {
    if (!map.current) return;

    mapData.routes.forEach(route => {
      const routeId = `route-${route.id}`;
      try {
        if (map.current!.getLayer(routeId)) {
          map.current!.removeLayer(routeId);
        }
        if (map.current!.getSource(routeId)) {
          map.current!.removeSource(routeId);
        }
        addedRoutes.current.delete(routeId);
      } catch (error) {
        console.warn(`⚠️ Error removing route ${route.name}:`, error);
      }
    });
  }, [mapData.routes]);

  const addRoutesToMap = useStableCallback(() => {
    if (!map.current || mapData.routes.length === 0) return;

    console.log('🗺️ Adding routes to map:', mapData.routes.length, 'routes');

    mapData.routes.forEach((route, index) => {
      const routeId = `route-${route.id}`;

      if (addedRoutes.current.has(routeId) || map.current!.getSource(routeId)) {
        return;
      }

      try {
        map.current!.addSource(routeId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              name: route.name,
              description: route.description,
              distance: route.distance_km,
              duration: route.estimated_duration_minutes,
            },
            geometry: route.stops,
          },
        });

        map.current!.addLayer({
          id: routeId,
          type: 'line',
          source: routeId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
            'line-width': 4,
            'line-opacity': 0.8,
          },
        });

        addedRoutes.current.add(routeId);
      } catch (error) {
        console.warn(`⚠️ Error adding route ${route.name}:`, error);
      }
    });
  }, [mapData.routes]);

  // Throttled marker update to prevent excessive DOM updates
  const throttledUpdateBusMarker = useThrottle((location: BusLocation) => {
    if (!map.current) return;

    const { busId, latitude, longitude, speed } = location;
    const bus = busService.getBus(busId);

    if (!bus) return;

    // Coordinates are already validated by the validation middleware
    // No need for additional validation here

    if (!markers.current[busId]) {
      const el = document.createElement('div');
      el.className = 'bus-marker';
      el.innerHTML = `
        <div class="bus-marker-pin">
          <div class="bus-marker-icon">🚌</div>
          <div class="bus-marker-pulse"></div>
        </div>
        <div class="bus-marker-content">
          <div class="bus-number">${bus.busNumber}</div>
          <div class="bus-speed">${speed ? `${speed} km/h` : 'N/A'}</div>
          <div class="bus-eta">${location.eta ? `ETA: ${location.eta.estimated_arrival_minutes} min` : 'ETA: N/A'}</div>
        </div>
      `;

      const marker = new Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([longitude, latitude])
        .addTo(map.current);

      markers.current[busId] = marker;
    } else {
      markers.current[busId].setLngLat([longitude, latitude]);
    }
  }, 100); // Throttle to 10fps for marker updates

  // Stable callback for bus location updates
  const handleBusLocationUpdate = useStableCallback((location: BusLocation) => {
    console.log('🔌 WebSocket: Received bus location update:', location);
    
    // Update bus service first
    busService.updateBusLocation(location);
    
    // Update local state
    setMapData(prev => ({
      ...prev,
      lastBusLocations: {
        ...prev.lastBusLocations,
        [location.busId]: location,
      },
    }));

    // Update marker on map
    throttledUpdateBusMarker(location);
  }, []);

  // Initialize map
  const initializeMap = useStableCallback(() => {
    if (!mapContainer.current || isMapInitialized.current) return;

    console.log('🗺️ Initializing optimized map...');

    map.current = new Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: [77.2090, 28.6139], // Delhi coordinates
      zoom: 12,
      maxZoom: 18,
      minZoom: 10,
    });

    map.current.on('load', () => {
      console.log('🗺️ Map loaded successfully');
      isMapInitialized.current = true;
      addRoutesToMap();
    });

    map.current.on('error', (e) => {
      console.error('❌ Map error:', e);
    });
  }, []);

  // WebSocket connection management
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        setConnectionState(prev => ({ ...prev, connectionStatus: 'connecting' }));
        
        await websocketService.connect();
        
        setConnectionState(prev => ({
          ...prev,
          isConnected: true,
          connectionStatus: 'connected',
          connectionError: null,
        }));

        websocketService.onBusLocationUpdate(handleBusLocationUpdate);
      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          connectionStatus: 'disconnected',
          connectionError: error instanceof Error ? error.message : 'Connection failed',
        }));
      }
    };

    connectWebSocket();

    return () => {
      websocketService.disconnect();
    };
  }, [handleBusLocationUpdate]);

  // Initialize map and load data
  useEffect(() => {
    initializeMap();
    loadRoutes();
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initializeMap, loadRoutes]);

  // Update routes when they change
  useEffect(() => {
    if (isMapInitialized.current) {
      removeRoutesFromMap();
      addRoutesToMap();
    }
  }, [removeRoutesFromMap, addRoutesToMap]);

  // Load buses from service
  useEffect(() => {
    const loadBuses = () => {
      const allBuses = busService.getAllBuses();
      setMapData(prev => ({ ...prev, buses: allBuses, isLoading: false }));
    };

    loadBuses();
    
    // Set up interval to refresh buses
    const interval = setInterval(loadBuses, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // UI event handlers
  const handleRouteChange = useStableCallback((routeId: string) => {
    setMapData(prev => ({ ...prev, selectedRoute: routeId }));
  }, []);

  const handleNavbarToggle = useStableCallback(() => {
    setUiState(prev => ({ ...prev, isNavbarCollapsed: !prev.isNavbarCollapsed }));
  }, []);

  const handleRouteFilterToggle = useStableCallback(() => {
    setUiState(prev => ({ ...prev, isRouteFilterOpen: !prev.isRouteFilterOpen }));
  }, []);

  const handleActiveBusesToggle = useStableCallback(() => {
    setUiState(prev => ({ ...prev, isActiveBusesOpen: !prev.isActiveBusesOpen }));
  }, []);

  // Log render performance
  useEffect(() => {
    const renderTime = endRender();
    if (renderTime > 16) {
      console.warn(`🐌 OptimizedStudentMap render took ${renderTime.toFixed(2)}ms`);
    }
  });

  return (
    <MapErrorBoundary
      mapType="student"
      onMapError={(error, errorInfo) => {
        console.error('Optimized student map error:', error, errorInfo);
      }}
    >
      <div className={`relative w-full h-screen ${className}`}>
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
      />

      {/* Collapsible Navbar */}
      <motion.div
        className="absolute top-4 left-4 z-10"
        initial={{ x: 0 }}
        animate={{ x: uiState.isNavbarCollapsed ? -300 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <GlassyCard className="w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Bus Tracker</h2>
              <button
                onClick={handleNavbarToggle}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {uiState.isNavbarCollapsed ? '→' : '←'}
              </button>
            </div>

            <ConnectionStatus
              isConnected={connectionState.isConnected}
              connectionStatus={connectionState.connectionStatus}
              connectionError={connectionState.connectionError}
            />

            <RouteFilter
              routes={mapData.routes}
              selectedRoute={mapData.selectedRoute}
              onRouteChange={handleRouteChange}
              isOpen={uiState.isRouteFilterOpen}
              onToggle={handleRouteFilterToggle}
            />

            <ActiveBuses
              buses={mapData.buses}
              lastBusLocations={mapData.lastBusLocations}
              selectedRoute={mapData.selectedRoute}
              isOpen={uiState.isActiveBusesOpen}
              onToggle={handleActiveBusesToggle}
            />

            {mapData.isLoading && (
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                <div className="mt-2">Loading...</div>
              </div>
            )}
          </div>
        </GlassyCard>
      </motion.div>

      {/* Expand Button when collapsed */}
      {uiState.isNavbarCollapsed && (
        <motion.button
          onClick={handleNavbarToggle}
          className="absolute top-4 left-4 z-20 bg-white/20 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-white/30 transition-colors"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          →
        </motion.button>
      )}
      </div>
    </MapErrorBoundary>
  );
};

// Export with performance tracking
export default withPerformanceTracking(OptimizedStudentMap, 'OptimizedStudentMap');

