import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
  Suspense,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { realtimeManager, RealtimeEvent } from '../services/realtime/RealtimeManager';
import { busService } from '../services/busService';
import { workerService } from '../services/workerService';
import { useMapStore } from '../stores/useMapStore';
import { 
  useRoutesInViewport, 
  useBusesInViewport, 
  useLiveLocationsInViewport,
  useBusClusters 
} from '../hooks/useApiQueries';
import { BusLocation } from '../types';
import GlassyCard from './ui/GlassyCard';
import VirtualBusList from './ui/VirtualBusList';
import { MapErrorBoundary } from './error';
import './StudentMap.css';

// Lazy load heavy components
const MapContainer = React.lazy(() => import('./map/MapContainer'));
const BusMarker = React.lazy(() => import('./map/BusMarker'));

interface OptimizedStudentMapLazyProps {
  className?: string;
}

const OptimizedStudentMapLazy: React.FC<OptimizedStudentMapLazyProps> = ({
  className = '',
}) => {
  // Map references
  const map = useRef<any>(null);
  const isMapInitialized = useRef(false);
  const addedRoutes = useRef<Set<string>>(new Set());
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

  // Zustand store
  const {
    // Connection state
    isConnected,
    connectionError,
    connectionStatus,
    setConnectionState,
    
    // Data state
    lastBusLocations,
    setBuses,
    updateBusLocation,
    removeBus,
    setRoutes,
    
    // Spatial state
    viewport,
    busClusters,
    visibleBuses,
    visibleRoutes,
    setViewport,
    calculateClusters,
    isClusteringEnabled,
    isHeatmapEnabled,
    toggleClustering,
    toggleHeatmap,
    
    // UI state
    isLoading,
    setLoading,
    
    // Computed values
    getFilteredBuses,
  } = useMapStore();

  // Optimized React Query hooks for viewport-based loading
  const { data: routesData, isLoading: routesLoading } = useRoutesInViewport(
    viewport.bounds,
    isMapInitialized.current
  );
  
  const { data: busesData, isLoading: busesLoading } = useBusesInViewport(
    viewport.bounds,
    isMapInitialized.current
  );
  
  const { data: liveLocationsData } = useLiveLocationsInViewport(
    viewport.bounds,
    isMapInitialized.current
  );
  
  const { data: clustersData } = useBusClusters(
    viewport.bounds,
    viewport.zoom,
    isClusteringEnabled && isMapInitialized.current
  );

  // Memoized values
  const filteredBuses = useMemo(() => getFilteredBuses(), [getFilteredBuses]);

  // Handle map load
  const handleMapLoad = useCallback((mapInstance: any) => {
    console.log('🗺️ Map loaded successfully');
    // Prevent double assignment
    if (map.current && map.current !== mapInstance) {
      console.log('🗺️ Map already assigned, cleaning up previous instance');
      map.current.remove();
    }
    map.current = mapInstance;
    isMapInitialized.current = true;
    setLoading(false);
  }, [setLoading]);

  // Handle map error
  const handleMapError = useCallback((error: any) => {
    console.error('❌ Map error:', error);
    setConnectionState({ connectionError: 'Map loading failed' });
  }, [setConnectionState]);

  // Handle viewport changes
  const handleViewportChange = useCallback((newViewport: {
    bounds: [[number, number], [number, number]];
    zoom: number;
    center: [number, number];
  }) => {
    console.log('🗺️ Viewport changed:', newViewport);
    setViewport(newViewport);
    
    // Trigger cluster calculation when viewport changes
    if (isClusteringEnabled) {
      setTimeout(() => calculateClusters(), 100);
    }
  }, [setViewport, isClusteringEnabled, calculateClusters]);

  // Load routes from React Query (viewport-based)
  useEffect(() => {
    if (routesData?.success && routesData.data) {
      console.log('✅ Routes loaded from viewport query:', routesData.data.length);
      setRoutes(routesData.data as any);
    }
  }, [routesData, setRoutes]);

  // Load buses from React Query (viewport-based)
  useEffect(() => {
    if (busesData?.success && busesData.data) {
      console.log('✅ Buses loaded from viewport query:', busesData.data.length);
      setBuses(busesData.data.map((bus: any) => ({
        busId: bus.id,
        busNumber: bus.number_plate || bus.code,
        routeName: bus.route_name || 'Route TBD',
        driverName: bus.driver_full_name || 'Driver TBD',
        currentLocation: {
          busId: bus.id,
          driverId: bus.assigned_driver_id || '',
          latitude: 0,
          longitude: 0,
          timestamp: new Date().toISOString(),
        },
      })));
    }
  }, [busesData, setBuses]);

  // Update bus locations from live data with Web Worker optimization
  useEffect(() => {
    if (liveLocationsData?.success && liveLocationsData.data) {
      liveLocationsData.data.forEach(async (location: any) => {
        // Convert to proper BusLocation type
        const busLocation: BusLocation = {
          busId: location.busId,
          driverId: location.driverId || '',
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: location.timestamp,
          speed: location.speed,
          heading: location.heading,
          eta: location.eta,
        };

        // Use Web Worker for speed calculation if not provided
        if (!location.speed && busService.getBus(location.busId)) {
          const previousLocation = busService.getBus(location.busId)?.currentLocation;
          if (previousLocation) {
            const timeDiff = new Date(location.timestamp).getTime() - new Date(previousLocation.timestamp).getTime();
            if (timeDiff > 0) {
              const calculatedSpeed = await workerService.calculateSpeed(
                previousLocation.latitude,
                previousLocation.longitude,
                location.latitude,
                location.longitude,
                timeDiff
              );
              busLocation.speed = calculatedSpeed;
            }
          }
        }

        updateBusLocation(busLocation);
      });
    }
  }, [liveLocationsData, updateBusLocation]);

  // Remove routes from map
  const removeRoutesFromMap = useCallback(() => {
    if (!map.current) return;

    visibleRoutes.forEach((route) => {
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
  }, [visibleRoutes]);

  // Add routes to map (optimized for viewport)
  const addRoutesToMap = useCallback(() => {
    if (!map.current || visibleRoutes.length === 0) return;

    console.log('🗺️ Adding routes to map:', visibleRoutes.length, 'routes');

    visibleRoutes.forEach((route, index) => {
      const routeId = `route-${route.id}`;

      if (addedRoutes.current.has(routeId) || map.current!.getSource(routeId)) {
        console.log(`🗺️ Route ${routeId} already exists, skipping...`);
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

        console.log(`🗺️ Added route ${route.name} to map`);
        addedRoutes.current.add(routeId);
      } catch (error) {
        console.warn(`⚠️ Error adding route ${route.name}:`, error);
      }
    });
  }, [visibleRoutes]);

  // Center map on all buses
  const centerMapOnBuses = useCallback(() => {
    if (!map.current || Object.keys(lastBusLocations).length === 0) return;

    const coordinates = Object.values(lastBusLocations).map(
      (location) => [location.longitude, location.latitude] as [number, number]
    );

    if (coordinates.length === 1) {
      map.current.flyTo({
        center: coordinates[0],
        zoom: 16,
        duration: 2000,
      });
    } else if (coordinates.length > 1) {
      const bounds = new (window as any).maplibregl.LngLatBounds();
      coordinates.forEach((coord) => bounds.extend(coord));

      map.current.fitBounds(bounds, {
        padding: 50,
        duration: 2000,
      });
    }
  }, [lastBusLocations]);

  // Handle bus selection
  const handleBusSelect = useCallback((bus: any) => {
    setSelectedBusId(bus.busId);
    
    // Center map on selected bus
    if (map.current && bus.currentLocation) {
      map.current.flyTo({
        center: [bus.currentLocation.longitude, bus.currentLocation.latitude],
        zoom: 16,
        duration: 1000,
      });
    }
  }, []);

  // Handle real-time bus location updates
  const handleRealtimeBusLocationUpdate = useCallback(
    (event: RealtimeEvent) => {
      console.log('📍 Real-time bus location update:', event);
      const location = event.data;
      
      // Convert to our BusLocation type
      const busLocation: BusLocation = {
        busId: location.busId || location.new?.bus_id,
        driverId: location.driverId || location.new?.driver_id || '',
        latitude: location.latitude || location.new?.latitude,
        longitude: location.longitude || location.new?.longitude,
        timestamp: location.timestamp || location.new?.recorded_at,
        speed: location.speed || location.new?.speed_kmh,
        heading: location.heading || location.new?.heading_degrees,
        eta: location.eta,
      };
      
      updateBusLocation(busLocation);
    },
    [updateBusLocation]
  );

  // Handle real-time driver connections
  const handleRealtimeDriverConnected = useCallback(
    (event: RealtimeEvent) => {
      console.log('🚌 Real-time driver connected:', event);
    },
    []
  );

  const handleRealtimeDriverDisconnected = useCallback(
    (event: RealtimeEvent) => {
      console.log('🚌 Real-time driver disconnected:', event);
      const data = event.data;
      removeBus(data.busId);
    },
    [removeBus]
  );

  const handleRealtimeBusArriving = useCallback(
    (event: RealtimeEvent) => {
      console.log('🚌 Real-time bus arriving:', event);
    },
    []
  );

  // Handle real-time bus updates
  const handleRealtimeBusUpdate = useCallback(
    (event: RealtimeEvent) => {
      console.log('🚌 Real-time bus update:', event);
      // Update bus information in the store
      const busData = event.data;
      if (busData.new) {
        // Update bus information
        console.log('🔄 Updating bus information:', busData.new);
      }
    },
    []
  );

  // Handle real-time route updates
  const handleRealtimeRouteUpdate = useCallback(
    (event: RealtimeEvent) => {
      console.log('🛣️ Real-time route update:', event);
      // Update route information in the store
      const routeData = event.data;
      if (routeData.new) {
        // Update route information
        console.log('🔄 Updating route information:', routeData.new);
      }
    },
    []
  );

  // Real-time connection management
  useEffect(() => {
    const initializeRealtime = async () => {
      try {
        setConnectionState({ connectionStatus: 'connecting' });
        console.log('🔌 Initializing real-time services...');

        // Initialize the real-time manager
        await realtimeManager.initialize();

        // Subscribe to real-time events
        realtimeManager.on('bus-location-update', handleRealtimeBusLocationUpdate);
        realtimeManager.on('driver-connected', handleRealtimeDriverConnected);
        realtimeManager.on('driver-disconnected', handleRealtimeDriverDisconnected);
        realtimeManager.on('bus-arriving', handleRealtimeBusArriving);
        realtimeManager.on('bus-update', handleRealtimeBusUpdate);
        realtimeManager.on('route-update', handleRealtimeRouteUpdate);

        setConnectionState({
          isConnected: true,
          connectionStatus: 'connected',
          connectionError: null,
        });

        console.log('✅ Real-time services initialized successfully');
      } catch (error) {
        console.error('❌ Real-time initialization failed:', error);
        setConnectionState({
          isConnected: false,
          connectionStatus: 'disconnected',
          connectionError: 'Failed to initialize real-time services',
        });
      }
    };

    initializeRealtime();

    return () => {
      realtimeManager.destroy();
    };
  }, [setConnectionState]);

  // Add routes to map when visible routes change
  useEffect(() => {
    if (isMapInitialized.current && visibleRoutes.length > 0) {
      removeRoutesFromMap();
      addRoutesToMap();
    }
  }, [visibleRoutes, removeRoutesFromMap, addRoutesToMap]);

  // Update loading state
  useEffect(() => {
    setLoading(routesLoading || busesLoading);
  }, [routesLoading, busesLoading, setLoading]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      workerService.terminate();
    };
  }, []);

  return (
    <div className={`optimized-student-map-lazy ${className}`}>
      {/* Map Container */}
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <GlassyCard className="p-8">
            <div className="loading-spinner mx-auto mb-4" />
            <p className="text-white text-center">Loading map...</p>
          </GlassyCard>
        </div>
      }>
        <MapErrorBoundary>
          <MapContainer
            onMapLoad={handleMapLoad}
            onMapError={handleMapError}
            onViewportChange={handleViewportChange}
            enableClustering={isClusteringEnabled}
            enableHeatmap={isHeatmapEnabled}
          />
        </MapErrorBoundary>
      </Suspense>

      {/* Bus Markers - Optimized with clustering */}
      <Suspense fallback={null}>
        {isClusteringEnabled && clustersData?.success ? (
          // Render clustered markers
          clustersData.data.map((cluster: any) => (
            <BusMarker
              key={cluster.id}
              map={map.current}
              location={{
                busId: cluster.id,
                driverId: '',
                latitude: cluster.center[1],
                longitude: cluster.center[0],
                timestamp: new Date().toISOString(),
              }}
              busInfo={{
                busNumber: `Cluster ${cluster.count}`,
                driverName: '',
                routeName: '',
              }}
              isConnected={isConnected}
              onMarkerClick={handleBusSelect}
              isClustered={cluster.count > 1}
              clusterCount={cluster.count}
            />
          ))
        ) : (
          // Render individual bus markers
          Object.entries(lastBusLocations).map(([busId, location]) => {
            const bus = busService.getBus(busId);
            if (!bus || !map.current) return null;

            return (
              <BusMarker
                key={busId}
                map={map.current}
                location={location}
                busInfo={{
                  busNumber: bus.busNumber,
                  driverName: bus.driverName,
                  routeName: bus.routeName,
                }}
                isConnected={isConnected}
                onMarkerClick={handleBusSelect}
              />
            );
          })
        )}
      </Suspense>

      {/* Connection Status Overlay */}
      <AnimatePresence>
        {connectionError && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-4 left-4 z-50"
          >
            <GlassyCard className="p-4 bg-red-500/20 border-red-400/30">
              <p className="text-red-200 text-sm">{connectionError}</p>
            </GlassyCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-40"
          >
            <GlassyCard className="p-8">
              <div className="loading-spinner mx-auto mb-4" />
              <p className="text-white text-center">Loading map...</p>
            </GlassyCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time Status Indicator */}
      <div className="absolute top-4 right-4 z-50">
        <GlassyCard className="p-4">
          <div className="space-y-2">
            <h4 className="text-white text-sm font-semibold">Real-time Status</h4>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
                <span className="text-white text-xs">
                  {connectionStatus === 'connected' && 'WebSocket'}
                  {connectionStatus === 'connecting' && 'Connecting...'}
                  {connectionStatus === 'disconnected' && 'Disconnected'}
                  {connectionStatus === 'reconnecting' && 'Reconnecting...'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-white text-xs">Supabase Realtime</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-white text-xs">SSE</span>
              </div>
            </div>
          </div>
        </GlassyCard>
      </div>

      {/* Spatial Controls Panel */}
      <div className="absolute top-4 left-4 z-50 w-80">
        <GlassyCard className="p-4">
          <h3 className="text-white font-semibold mb-3">Spatial Controls</h3>
          <div className="space-y-2">
            <button
              onClick={toggleClustering}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isClusteringEnabled
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {isClusteringEnabled ? '✅' : '❌'} Clustering
            </button>
            <button
              onClick={toggleHeatmap}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isHeatmapEnabled
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {isHeatmapEnabled ? '✅' : '❌'} Heatmap
            </button>
            <div className="text-xs text-white/70 mt-2">
              <p>Viewport: {visibleBuses.length} buses, {visibleRoutes.length} routes</p>
              <p>Clusters: {busClusters.length}</p>
              <p>Zoom: {viewport.zoom.toFixed(1)}</p>
            </div>
          </div>
        </GlassyCard>
      </div>

      {/* Bus List Panel */}
      <div className="absolute top-4 left-4 z-50 w-80" style={{ top: '200px' }}>
        <GlassyCard className="p-4">
          <h3 className="text-white font-semibold mb-3">Active Buses ({filteredBuses.length})</h3>
          <VirtualBusList
            buses={filteredBuses}
            containerHeight={300}
            onBusSelect={handleBusSelect}
            selectedBusId={selectedBusId || undefined}
          />
        </GlassyCard>
      </div>

      {/* Center Map Button */}
      <button
        onClick={centerMapOnBuses}
        className="absolute bottom-4 right-4 z-50 btn-primary"
        disabled={Object.keys(lastBusLocations).length === 0}
      >
        Center Map
      </button>
    </div>
  );
};

export default OptimizedStudentMapLazy;
