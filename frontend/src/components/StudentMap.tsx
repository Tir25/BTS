import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import maplibregl from 'maplibre-gl';
import { unifiedWebSocketService, BusLocation } from '../services/UnifiedWebSocketService';
import { busService, BusInfo } from '../services/busService';
import { apiService } from '../services/api';
import { authService } from '../services/authService';
import GlassyCard from './ui/GlassyCard';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { useMapPerformance } from '../hooks/useMapPerformance';
import DriverLocationMarker from './map/DriverLocationMarker';
import './StudentMap.css';
import { Route } from '../types';

import { logger } from '../utils/logger';
import { errorHandler } from '../utils/errorHandler';
import { formatTime } from '../utils/dateFormatter';

// Feature flags for different modes
interface StudentMapConfig {
  enableRealTime: boolean;
  enableClustering: boolean;
  enableOfflineMode: boolean;
  enablePerformanceMonitoring: boolean;
  maxBuses: number;
  updateInterval: number;
  enableAccessibility: boolean;
  enableInternationalization: boolean;
}

interface StudentMapProps {
  className?: string;
  config?: Partial<StudentMapConfig>;
  mode?: 'unified' | 'enhanced' | 'minimal';
  // Driver location props
  driverLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    timestamp: number;
  };
  isDriverTracking?: boolean;
}

const defaultConfig: StudentMapConfig = {
  enableRealTime: true,
  enableClustering: true,
  enableOfflineMode: false,
  enablePerformanceMonitoring: true,
  maxBuses: 50,
  updateInterval: 1000,
  enableAccessibility: true,
  enableInternationalization: false,
};

// Custom comparison function for memo to prevent unnecessary re-renders
const arePropsEqual = (prevProps: StudentMapProps, nextProps: StudentMapProps): boolean => {
  // Deep comparison of props to prevent unnecessary re-renders
  if (prevProps.className !== nextProps.className) return false;
  if (prevProps.mode !== nextProps.mode) return false;
  if (prevProps.isDriverTracking !== nextProps.isDriverTracking) return false;
  
  // Compare config objects
  const prevConfigStr = JSON.stringify(prevProps.config || {});
  const nextConfigStr = JSON.stringify(nextProps.config || {});
  if (prevConfigStr !== nextConfigStr) return false;
  
  // Compare driver location - allow updates for tracking mode even with small changes
  if (prevProps.driverLocation && nextProps.driverLocation) {
    // CRITICAL FIX: If tracking is active, allow updates based on timestamp (not just distance)
    // This ensures continuous recentering works even with static/low-accuracy GPS
    if (nextProps.isDriverTracking) {
      // When tracking, always allow updates if timestamp changed (even small coordinate changes)
      const timeDiff = Math.abs(prevProps.driverLocation.timestamp - nextProps.driverLocation.timestamp);
      if (timeDiff > 0) return false; // Timestamp changed, allow update
    } else {
      // When not tracking, use stricter comparison (only significant changes)
      const latDiff = Math.abs(prevProps.driverLocation.latitude - nextProps.driverLocation.latitude);
      const lngDiff = Math.abs(prevProps.driverLocation.longitude - nextProps.driverLocation.longitude);
      
      // Only re-render if moved more than ~0.0001 degrees (~10m)
      if (latDiff > 0.0001 || lngDiff > 0.0001) return false;
      
      // Also check timestamp (throttle updates)
      const timeDiff = Math.abs(prevProps.driverLocation.timestamp - nextProps.driverLocation.timestamp);
      if (timeDiff > 1000) return false; // Only update if >1 second passed
    }
  } else if (prevProps.driverLocation !== nextProps.driverLocation) {
    return false; // One is null and other isn't
  }
  
  // Props are equal, skip re-render
  return true;
};

const StudentMap: React.FC<StudentMapProps> = ({
  className = '',
  config = {},
  mode = 'unified',
  driverLocation,
  isDriverTracking = false,
}) => {
  // Merge config with defaults - OPTIMIZED: Deep comparison to prevent unnecessary recalculations
  const configRef = useRef(config);
  const finalConfig = useMemo(() => {
    // Only recalculate if config actually changed
    const configStr = JSON.stringify(config);
    const prevConfigStr = JSON.stringify(configRef.current);
    
    if (configStr === prevConfigStr) {
      return configRef.current as StudentMapConfig;
    }
    
    configRef.current = config;
    return { ...defaultConfig, ...config };
  }, [config]);

  // Performance monitoring - OPTIMIZED: Disabled in production, minimal overhead in dev
  const isDevMode = process.env.NODE_ENV === 'development';
  const shouldMonitor = finalConfig.enablePerformanceMonitoring && isDevMode;
  
  // Always call hooks, but disable monitoring logic in production
  const { metrics: performanceMetrics } = usePerformanceMonitor('StudentMap', {
    trackMemory: false, // Disable memory tracking to reduce overhead
    slowRenderThreshold: 16,
    logPerformance: shouldMonitor,
  });
  
  const { metrics: mapMetrics } = useMapPerformance({
    enableMonitoring: shouldMonitor,
    updateInterval: 10000, // Increase interval to 10s to reduce overhead
  });
  
  // Store in refs to prevent unnecessary re-renders
  const performanceMetricsRef = useRef(performanceMetrics);
  const mapMetricsRef = useRef(mapMetrics);
  
  useEffect(() => {
    performanceMetricsRef.current = performanceMetrics;
    mapMetricsRef.current = mapMetrics;
  }, [performanceMetrics, mapMetrics]);

  // Map references
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<{ [busId: string]: maplibregl.Marker }>({});
  const isMapInitialized = useRef(false);
  const addedRoutes = useRef<Set<string>>(new Set());
  const cleanupFunctions = useRef<(() => void)[]>([]);
  const websocketCleanupFunctions = useRef<(() => void)[]>([]);
  const eventListenersAdded = useRef(false);
  const connectionStatusRef = useRef<string>('disconnected'); // Track connection status to prevent infinite loops
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null); // Track interval to prevent duplicates
  const hasSetInitialStatusRef = useRef(false); // Track if initial status has been set
  
  // Store handlers in refs to prevent useEffect re-runs
  const handleBusLocationUpdateRef = useRef<(location: BusLocation) => void>();
  const handleDriverConnectedRef = useRef<(data: { driverId: string; busId: string; timestamp: string }) => void>();
  const handleDriverDisconnectedRef = useRef<(data: { driverId: string; busId: string; timestamp: string }) => void>();
  const handleBusArrivingRef = useRef<(data: { busId: string; routeId: string; stopId: string; eta: number; timestamp: string }) => void>();

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'disconnected' | 'reconnecting'
  >('disconnected');
  const [buses, setBuses] = useState<BusInfo[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [lastBusLocations, setLastBusLocations] = useState<{
    [busId: string]: BusLocation;
  }>({});

  // UI state
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const [isRouteFilterOpen, setIsRouteFilterOpen] = useState(true);
  const [isActiveBusesOpen, setIsActiveBusesOpen] = useState(true);

  // Performance optimization: Debounced location updates with RAF for smoother updates
  const debouncedLocationUpdate = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      let rafId: number | null = null;
      const pendingUpdates = new Map<string, BusLocation>();
      
      return (location: BusLocation) => {
        // Store pending update
        pendingUpdates.set(location.busId, location);
        
        clearTimeout(timeoutId);
        
        // Cancel any pending RAF
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        
        timeoutId = setTimeout(() => {
          // Use RAF to batch updates with browser repaint cycle
          rafId = requestAnimationFrame(() => {
            if (pendingUpdates.size > 0) {
              setLastBusLocations(prev => {
                const updates = { ...prev };
                pendingUpdates.forEach((loc, busId) => {
                  updates[busId] = loc;
                });
                pendingUpdates.clear();
                return updates;
              });
            }
            rafId = null;
          });
        }, 150); // Increased debounce time to reduce update frequency
      };
    })(),
    []
  );

  // Load routes from API - FIXED: Properly handle API response structure
  const loadRoutes = useCallback(async () => {
    try {
      logger.info('🔄 Loading routes from backend API...', 'component');
      
      const response = await apiService.getRoutes();
      
      // PRODUCTION FIX: Handle both direct array and wrapped response formats
      let routesArray: Route[] = [];
      
      if (response && typeof response === 'object') {
        // Check if response has the standard API format {success, data, timestamp}
        if ('data' in response && Array.isArray(response.data)) {
          routesArray = response.data;
          logger.info('✅ Routes loaded from API response', 'component', { 
            count: routesArray.length,
            format: 'wrapped'
          });
        } 
        // Fallback: Check if response itself is an array (legacy support)
        else if (Array.isArray(response)) {
          routesArray = response;
          logger.info('✅ Routes loaded as direct array', 'component', { 
            count: routesArray.length,
            format: 'direct'
          });
        }
        // Check if response.success indicates an error
        else if ('success' in response && !response.success) {
          const errorMsg = ('error' in response ? response.error : 'Failed to load routes') || 'Unknown error';
          logger.error('❌ API returned error response', 'component', { error: errorMsg });
          setConnectionError(`Failed to load routes: ${errorMsg}`);
          setRoutes([]);
          return;
        }
      }
      
      if (routesArray.length > 0) {
        setRoutes(routesArray);
        logger.info('✅ Routes loaded successfully', 'component', { 
          count: routesArray.length 
        });
      } else {
        logger.warn('⚠️ No routes data received or empty array', 'component', {
          responseType: typeof response,
          hasSuccess: response && typeof response === 'object' && 'success' in response,
          hasData: response && typeof response === 'object' && 'data' in response
        });
        setRoutes([]);
      }
    } catch (error) {
      logger.error('❌ Failed to load routes', 'component', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Enhanced error handling with detailed error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setConnectionError(`Failed to load routes: ${errorMessage}`);
      
      setRoutes([]);
    }
  }, []);

  // Remove routes from map
  const removeRoutesFromMap = useCallback(() => {
    if (!map.current) return;

    routes.forEach((route) => {
      try {
        if (map.current?.getSource(`route-${route.id}`)) {
          map.current.removeLayer(`route-${route.id}`);
          map.current.removeSource(`route-${route.id}`);
        }
      } catch (error) {
        logger.warn('Warning', 'component', { data: `⚠️ Error removing route ${route.name}:`, error });
      }
    });
  }, [routes]);

  // Add routes to map
  const addRoutesToMap = useCallback(() => {
    if (!map.current || routes.length === 0) return;

    routes.forEach((route) => {
      try {
        if (addedRoutes.current.has(route.id)) {
          return;
        }

        // Check for coordinates in various possible properties
        const coordinates = (route as any).coordinates || 
                           (route as any).geom?.coordinates || 
                           (route as any).stops?.coordinates ||
                           null;
        
        if (!coordinates || coordinates.length === 0) {
          logger.warn('⚠️ Route has no coordinates', 'component', { routeId: route.id });
          return;
        }

        // Add route source
        map.current?.addSource(`route-${route.id}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              name: route.name,
              id: route.id,
            },
            geometry: {
              type: 'LineString',
              coordinates: coordinates,
            },
          },
        });

        // Add route layer
        map.current?.addLayer({
          id: `route-${route.id}`,
          type: 'line',
          source: `route-${route.id}`,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': (route as any).color || '#3b82f6',
            'line-width': 4,
            'line-opacity': 0.8,
          },
        });

        addedRoutes.current.add(route.id);
        logger.debug('✅ Route added to map', 'component', { routeId: route.id });
      } catch (error) {
        logger.warn('Warning', 'component', { data: `⚠️ Error adding route ${route.name}:`, error });
      }
    });
  }, [routes]);

  // Cache for bus info to avoid repeated lookups
  const busInfoCache = useRef<Map<string, BusInfo>>(new Map());
  
  // Update bus info cache when buses change
  useEffect(() => {
    busInfoCache.current.clear();
    buses.forEach(bus => {
      const busId = (bus as any).id || (bus as any).bus_id;
      if (busId) {
        busInfoCache.current.set(busId, bus);
      }
    });
  }, [buses]);

  // Update bus marker on map - OPTIMIZED with throttling and cached popup updates
  const updateBusMarker = useCallback(
    (location: BusLocation) => {
      if (!map.current) return;

      // Use cached bus info instead of searching array
      const bus = busInfoCache.current.get(location.busId);
      if (!bus) return;

      // Check if marker already exists
      let marker = markers.current[location.busId];

      if (marker) {
        // Throttle marker position updates - only update if moved significantly (>10m)
        const currentPos = marker.getLngLat();
        const distance = Math.sqrt(
          Math.pow(currentPos.lng - location.longitude, 2) + 
          Math.pow(currentPos.lat - location.latitude, 2)
        );
        
        // Only update position if moved more than ~0.0001 degrees (~10m)
        if (distance > 0.0001) {
          marker.setLngLat([location.longitude, location.latitude]);
        }
        
        // Throttle popup updates - only update every 5 seconds to reduce render overhead
        const popup = marker.getPopup();
        if (popup) {
          const lastUpdate = (popup as any)._lastUpdate || 0;
          const now = Date.now();
          
          if (now - lastUpdate > 5000) {
            popup.setHTML(`
              <div class="p-2">
                <h3 class="font-bold text-lg">🚌 Bus ${bus.busNumber}</h3>
                <p class="text-sm text-gray-600">Route: ${bus.routeName}</p>
                <p class="text-sm text-gray-600">Driver: ${bus.driverName}</p>
                <p class="text-xs text-gray-500">
                  Last Update: ${formatTime(location.timestamp)}
                </p>
                ${location.speed ? `<p class="text-xs text-green-600">Speed: ${location.speed} km/h</p>` : ''}
              </div>
            `);
            (popup as any)._lastUpdate = now;
          }
        }
      } else {
        // Create new marker only if it doesn't exist
        marker = new maplibregl.Marker({
          color: '#ef4444',
          scale: 1.2,
        })
          .setLngLat([location.longitude, location.latitude])
          .addTo(map.current);

        markers.current[location.busId] = marker;

        // Create popup for new marker
        const popup = new maplibregl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
        }).setHTML(`
          <div class="p-2">
            <h3 class="font-bold text-lg">🚌 Bus ${bus.busNumber}</h3>
            <p class="text-sm text-gray-600">Route: ${bus.routeName}</p>
            <p class="text-sm text-gray-600">Driver: ${bus.driverName}</p>
            <p class="text-xs text-gray-500">
              Last Update: ${formatTime(location.timestamp)}
            </p>
            ${location.speed ? `<p class="text-xs text-green-600">Speed: ${location.speed} km/h</p>` : ''}
          </div>
        `);
        
        marker.setPopup(popup);
        (popup as any)._lastUpdate = Date.now();
      }
    },
    [] // Empty deps - use refs instead
  );

  // Remove bus marker from map
  const removeBusMarker = useCallback((busId: string) => {
    if (markers.current[busId]) {
      markers.current[busId].remove();
      delete markers.current[busId];
    }
  }, []);

  // Center map on all buses
  const centerMapOnBuses = useCallback(() => {
    if (!map.current || Object.keys(lastBusLocations).length === 0) return;

    const coordinates = Object.values(lastBusLocations).map(location => [
      location.longitude,
      location.latitude,
    ]);

    if (coordinates.length === 1) {
      map.current.setCenter(coordinates[0] as [number, number]);
      map.current.setZoom(15);
    } else if (coordinates.length > 1) {
      const bounds = coordinates.reduce(
        (bounds, coord) => bounds.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number])
      );
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [lastBusLocations]);

  // Event handlers - Will be set up in useEffect to use latest functions
  // Using refs prevents handler changes from triggering useEffect re-runs

  // Initialize map
  useEffect(() => {
    if (isMapInitialized.current || !mapContainer.current) {
      return;
    }

    logger.info('🗺️ Initializing consolidated student map...', 'component');
    isMapInitialized.current = true;

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: [
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
              maxzoom: 19,
            },
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [72.571, 23.025],
        zoom: 12,
        bearing: 0,
        pitch: 0,
        attributionControl: true,
        maxZoom: 19,
        minZoom: 1,
        preserveDrawingBuffer: false,
        antialias: true,
        dragRotate: false,
      });

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.current.once('load', () => {
        logger.info('🗺️ Map loaded successfully', 'component');
        setIsLoading(false);
        // Don't load routes here - let the separate useEffect handle it
      });

      map.current.on('error', (e) => {
        const mapError = errorHandler.handleError(
          new Error(`Map error: ${e.message || 'Unknown map error'}`), 
          'StudentMap-mapError'
        );
        logger.error('Map error occurred', 'component', { 
          error: mapError.message,
          code: mapError.code 
        });
        setConnectionError(mapError.userMessage || 'Map initialization failed');
        setIsLoading(false);
      });

      // Cleanup function
      const cleanup = () => {
        if (map.current) {
          map.current.remove();
          map.current = null;
          isMapInitialized.current = false;
          addedRoutes.current.clear();
          markers.current = {};
        }
      };

      cleanupFunctions.current.push(cleanup);

      return cleanup;
    } catch (error) {
      const mapInitError = errorHandler.handleError(error, 'StudentMap-mapInitialization');
      logger.error('❌ Failed to initialize map', 'component', { 
        error: mapInitError.message,
        code: mapInitError.code 
      });
      setConnectionError(mapInitError.userMessage || 'Failed to initialize map');
      setIsLoading(false);
    }
  }, []); // Removed loadRoutes dependency to prevent infinite loops

  // Load routes when component mounts
  useEffect(() => {
    loadRoutes();
  }, []); // Removed loadRoutes dependency to prevent infinite loops

  // WebSocket event subscription - CONSUMER ONLY PATTERN
  // StudentMap no longer creates connections, only subscribes to existing ones
  useEffect(() => {
    if (!finalConfig.enableRealTime) return;

    let isMounted = true;

    // Load initial bus data
    const loadBusData = async () => {
      try {
        const busesData = await busService.getAllBuses();
        if (busesData && Array.isArray(busesData)) {
          setBuses(busesData);
          logger.info('📊 Initial bus data from API:', 'component', { 
            count: busesData.length 
          });
        } else {
          logger.warn('⚠️ No bus data received or invalid format', 'component');
          setBuses([]);
        }
      } catch (error) {
        const busError = errorHandler.handleError(error, 'StudentMap-loadBuses');
        logger.error('Bus loading error', 'component', { 
          error: busError.message,
          code: busError.code 
        });
        setBuses([]);
        setConnectionError(busError.userMessage || 'Failed to load bus data');
      }
    };

    // Load bus data on mount
    loadBusData();

    // CRITICAL FIX: Set up handlers inside useEffect to use latest functions
    // OPTIMIZED: Batch marker updates to reduce render overhead
    handleBusLocationUpdateRef.current = (location: BusLocation) => {
      // Use RAF to batch updates with render cycle
      requestAnimationFrame(() => {
        debouncedLocationUpdate(location);
        updateBusMarker(location);
      });
    };

    handleDriverConnectedRef.current = (data: { driverId: string; busId: string; timestamp: string }) => {
      logger.debug('🚌 Driver connected:', 'component', { data });
      if (connectionStatusRef.current !== 'connected') {
        connectionStatusRef.current = 'connected';
        setIsConnected(true);
        setConnectionStatus('connected');
        setConnectionError(null);
      }
    };

    handleDriverDisconnectedRef.current = (data: { driverId: string; busId: string; timestamp: string }) => {
      logger.debug('🚌 Driver disconnected:', 'component', { data });
      if (connectionStatusRef.current !== 'disconnected') {
        connectionStatusRef.current = 'disconnected';
        setIsConnected(false);
        setConnectionStatus('disconnected');
      }
    };

    handleBusArrivingRef.current = (data: { busId: string; routeId: string; stopId: string; eta: number; timestamp: string }) => {
      logger.debug('🚌 Bus arriving:', 'component', { data });
    };

    // Subscribe to WebSocket events - only setup listeners, don't connect
    // The connection is managed by DriverAuthContext for driver dashboard
    // CRITICAL FIX: Use ref handlers to prevent useEffect re-runs
    const unsubscribeBusLocation = unifiedWebSocketService.onBusLocationUpdate((location) => handleBusLocationUpdateRef.current?.(location));
    const unsubscribeDriverConnected = unifiedWebSocketService.onDriverConnected((data) => handleDriverConnectedRef.current?.(data));
    const unsubscribeDriverDisconnected = unifiedWebSocketService.onDriverDisconnected((data) => handleDriverDisconnectedRef.current?.(data));
    const unsubscribeBusArriving = unifiedWebSocketService.onBusArriving((data) => handleBusArrivingRef.current?.(data));
    
    // Store cleanup functions
    websocketCleanupFunctions.current = [
      unsubscribeBusLocation,
      unsubscribeDriverConnected,
      unsubscribeDriverDisconnected,
      unsubscribeBusArriving,
    ];
    
    logger.info('✅ WebSocket event listeners registered', 'component');

    // Monitor connection status (but don't try to connect)
    // Use ref to track current status to prevent infinite loops
    // CRITICAL FIX: Only set up interval if not already set up (using ref)
    if (!statusIntervalRef.current) {
      statusIntervalRef.current = setInterval(() => {
        if (!isMounted) return;
        
        const isConnected = unifiedWebSocketService.getConnectionStatus();
        const newStatus = isConnected ? 'connected' as const : 'disconnected' as const;
        
        // Only update if status actually changed
        if (newStatus !== connectionStatusRef.current) {
          connectionStatusRef.current = newStatus;
          setConnectionStatus(newStatus);
          setIsConnected(isConnected);
          
          if (isConnected) {
            setConnectionError(null);
          }
        }
      }, 5000);
    }

    // Update initial connection status only once - use ref to track if we've done this
    if (!hasSetInitialStatusRef.current && connectionStatusRef.current === 'disconnected') {
      const initialConnected = unifiedWebSocketService.getConnectionStatus();
      const initialStatus = initialConnected ? 'connected' : 'disconnected';
      connectionStatusRef.current = initialStatus;
      hasSetInitialStatusRef.current = true;
      setIsConnected(initialConnected);
      setConnectionStatus(initialStatus);
    }

    const cleanup = () => {
      isMounted = false;
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
      
      // Cleanup WebSocket listeners
      websocketCleanupFunctions.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          logger.warn('Warning', 'component', { data: '⚠️ Error removing WebSocket listener:', error });
        }
      });
      websocketCleanupFunctions.current = [];
      
      logger.info('🧹 StudentMap WebSocket listener cleanup complete', 'component');
    };

    cleanupFunctions.current.push(cleanup);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalConfig.enableRealTime]);

  // Add routes to map when routes are loaded - ONLY ADD NEW ROUTES
  const routesProcessed = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (routes.length > 0 && map.current && map.current.isStyleLoaded()) {
      // Only add routes that haven't been added yet
      routes.forEach((route) => {
        if (!routesProcessed.current.has(route.id) && !addedRoutes.current.has(route.id)) {
          // Add individual route
          if (map.current && !map.current.getSource(`route-${route.id}`)) {
            try {
              const coords = (route as any).coordinates || 
                             (route as any).geom?.coordinates || 
                             (route as any).stops?.coordinates ||
                             null;
              
              if (coords && coords.length > 0) {
                map.current.addSource(`route-${route.id}`, {
                  type: 'geojson',
                  data: {
                    type: 'Feature',
                    properties: { name: route.name, id: route.id },
                    geometry: {
                      type: 'LineString',
                      coordinates: coords,
                    },
                  },
                });

                map.current.addLayer({
                  id: `route-${route.id}`,
                  type: 'line',
                  source: `route-${route.id}`,
                  layout: { 'line-join': 'round', 'line-cap': 'round' },
                  paint: {
                    'line-color': (route as any).color || '#3b82f6',
                    'line-width': 4,
                    'line-opacity': 0.8,
                  },
                });

                addedRoutes.current.add(route.id);
                routesProcessed.current.add(route.id);
              }
            } catch (error) {
              logger.warn('Warning', 'component', { data: `⚠️ Error adding route ${route.name}:`, error });
            }
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes]);

  // PRODUCTION FIX: Recenter map continuously when driver location updates
  // Use refs to track previous location and recentering state
  const lastRecenterLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const isTrackingRef = useRef(false);
  const recenterThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const lastRecenterTimeRef = useRef<number>(0);
  
  // Calculate distance between two coordinates (Haversine formula in meters)
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);
  
  // Get adaptive movement threshold based on GPS accuracy
  // PRODUCTION FIX: Enhanced thresholds for better desktop/low-accuracy handling
  const getAdaptiveThreshold = useCallback((accuracy?: number): number => {
    if (!accuracy) return 50; // Default 50m if no accuracy data
    
    // CRITICAL FIX: For low accuracy (desktop/IP-based), use much lower threshold
    if (accuracy > 10000) {
      // Extremely poor accuracy (>10km) - IP-based positioning
      // Accept even tiny changes or time-based updates
      return 1; // 1 meter - minimal threshold, rely on time-based recentering
    } else if (accuracy > 1000) {
      // Desktop/IP-based positioning: accept any movement
      return 5; // 5 meters - very low threshold
    } else if (accuracy > 100) {
      // Poor GPS accuracy: lower threshold
      return 20; // 20 meters
    } else if (accuracy > 50) {
      // Fair GPS accuracy: moderate threshold
      return 30; // 30 meters
    } else {
      // Good GPS accuracy: standard threshold
      return 50; // 50 meters
    }
  }, []);

  useEffect(() => {
    // Cleanup throttle on unmount
    return () => {
      if (recenterThrottleRef.current) {
        clearTimeout(recenterThrottleRef.current);
        recenterThrottleRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !isDriverTracking || !driverLocation) {
      // Reset tracking state when not tracking
      if (isTrackingRef.current && !isDriverTracking) {
        isTrackingRef.current = false;
        lastRecenterLocationRef.current = null;
      }
      return;
    }

    // Validate location data
    if (!driverLocation.latitude || !driverLocation.longitude) {
      return;
    }

    // CRITICAL FIX: Check GPS accuracy before displaying location
    // If accuracy is very poor (>1000m), this is likely IP-based positioning on desktop
    if (driverLocation.accuracy && driverLocation.accuracy > 1000) {
      logger.warn('Low accuracy location detected - likely IP-based positioning', 'StudentMap', {
        accuracy: driverLocation.accuracy,
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        warning: 'Location may be inaccurate - desktop browsers use IP-based positioning'
      });
      // Still display but with warning - user can see it's inaccurate
    }

    // Check if map is ready
    if (!map.current.isStyleLoaded()) {
      return;
    }

    const currentLocation = {
      latitude: driverLocation.latitude,
      longitude: driverLocation.longitude,
    };

    // Determine if we should recenter
    let shouldRecenter = false;
    const now = Date.now();
    const timeSinceLastRecenter = now - lastRecenterTimeRef.current;

    // Always recenter when tracking first starts
    if (!isTrackingRef.current) {
      shouldRecenter = true;
      isTrackingRef.current = true;
      logger.info('🔄 Initial recenter: Tracking started', 'StudentMap', {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        accuracy: driverLocation.accuracy,
      });
    }
    // Continuous follow mode: Recenter based on adaptive threshold or time interval
    else if (lastRecenterLocationRef.current) {
      const distance = calculateDistance(
        lastRecenterLocationRef.current.latitude,
        lastRecenterLocationRef.current.longitude,
        currentLocation.latitude,
        currentLocation.longitude
      );

      // CRITICAL FIX: Get adaptive threshold based on GPS accuracy
      const adaptiveThreshold = getAdaptiveThreshold(driverLocation.accuracy);
      
      // PRODUCTION FIX: Enhanced recentering logic for desktop/low-accuracy GPS
      // Desktop IP-based positioning: prioritize time-based recentering
      // Mobile GPS: prioritize distance-based recentering
      const isLowAccuracy = (driverLocation.accuracy || 0) > 1000;
      const MAX_TIME_BETWEEN_RECENTERS = isLowAccuracy ? 2000 : 3000; // Desktop: 2s, Mobile: 3s
      const MIN_TIME_BETWEEN_RECENTERS = isLowAccuracy ? 500 : 1000; // Prevent too frequent updates
      
      const shouldRecenterByDistance = distance > adaptiveThreshold;
      const shouldRecenterByTime = timeSinceLastRecenter > MAX_TIME_BETWEEN_RECENTERS;
      const hasEnoughTimeSinceLastRecenter = timeSinceLastRecenter > MIN_TIME_BETWEEN_RECENTERS;
      
      // For low-accuracy GPS: recenter based on time OR any distance change
      // For high-accuracy GPS: recenter based on distance OR time threshold
      if (isLowAccuracy) {
        // Desktop/IP-based: recenter more frequently based on time
        if (shouldRecenterByTime && hasEnoughTimeSinceLastRecenter) {
          shouldRecenter = true;
        } else if (shouldRecenterByDistance && hasEnoughTimeSinceLastRecenter) {
          shouldRecenter = true;
        }
      } else {
        // Mobile GPS: standard logic
        if (shouldRecenterByDistance || shouldRecenterByTime) {
          shouldRecenter = true;
        }
      }
      
      if (shouldRecenter) {
        logger.info('🔄 Recentering: Driver location update', 'StudentMap', {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
          distance: Math.round(distance),
          threshold: adaptiveThreshold,
          accuracy: driverLocation.accuracy,
          reason: shouldRecenterByDistance ? 'distance' : 'time',
          timeSinceLastRecenter: Math.round(timeSinceLastRecenter),
          isLowAccuracy,
        });
      }
    }
    // If no previous location recorded, recenter now
    else {
      shouldRecenter = true;
      logger.info('🔄 Recentering: First location update', 'StudentMap', {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        accuracy: driverLocation.accuracy,
      });
    }

    // Throttle recentering to avoid too frequent updates (max once per 1 second)
    if (shouldRecenter) {
      // Clear any pending throttle
      if (recenterThrottleRef.current) {
        clearTimeout(recenterThrottleRef.current);
      }

      // Throttle recentering operation (reduced from 100ms to allow more frequent updates)
      recenterThrottleRef.current = setTimeout(() => {
        try {
          map.current?.flyTo({
            center: [currentLocation.longitude, currentLocation.latitude],
            zoom: 15,
            duration: 800, // Slightly faster animation for smoother following
            essential: true, // This animation is essential for UX
          });

          // Update last recenter location and time
          lastRecenterLocationRef.current = {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          };
          lastRecenterTimeRef.current = now;

          logger.debug('✅ Map recentered successfully', 'StudentMap', {
            lat: currentLocation.latitude,
            lng: currentLocation.longitude,
            accuracy: driverLocation.accuracy,
          });
        } catch (error) {
          logger.warn('Failed to recenter map on driver location', 'StudentMap', { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }, 50); // Reduced delay for more responsive recentering
    }
  }, [isDriverTracking, driverLocation?.latitude, driverLocation?.longitude, driverLocation?.timestamp, driverLocation?.accuracy, calculateDistance, getAdaptiveThreshold]);

  // Cleanup on unmount - CRITICAL: Remove all markers and event listeners to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup throttle timer
      if (recenterThrottleRef.current) {
        clearTimeout(recenterThrottleRef.current);
        recenterThrottleRef.current = null;
      }
      
      // Reset tracking state
      isTrackingRef.current = false;
      lastRecenterLocationRef.current = null;
      lastRecenterTimeRef.current = 0;
      
      // Cleanup all markers to prevent memory leaks
      Object.values(markers.current).forEach(marker => {
        try {
          marker.remove();
        } catch (error) {
          logger.warn('Warning', 'component', { data: '⚠️ Error removing marker during cleanup:', error });
        }
      });
      markers.current = {};
      
      // Cleanup WebSocket event listeners
      websocketCleanupFunctions.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          logger.warn('Warning', 'component', { data: '⚠️ Error removing WebSocket listener:', error });
        }
      });
      websocketCleanupFunctions.current = [];
      
      // Run other cleanup functions
      cleanupFunctions.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          logger.warn('Warning', 'component', { data: '⚠️ Error during cleanup:', error });
        }
      });
      
      // Reset flags to allow proper re-initialization if component remounts
      eventListenersAdded.current = false;
      
      logger.info('🧹 StudentMap cleanup complete - all markers and listeners removed', 'component');
    };
  }, []);

  // Cache route lookups to avoid repeated searches
  const routeCache = useRef<Map<string, Route>>(new Map());
  
  useEffect(() => {
    routeCache.current.clear();
    routes.forEach(route => {
      routeCache.current.set(route.id, route);
    });
  }, [routes]);

  // PRODUCTION FIX: Memoized driver marker click handler to prevent unnecessary re-renders
  const handleDriverMarkerClick = useCallback(() => {
    logger.info('Driver location marker clicked', 'StudentMap');
  }, []);

  // Filter buses based on selected route - OPTIMIZED with caching
  const filteredBuses = useMemo(() => {
    if (selectedRoute === 'all') return buses;

    return buses.filter(bus => {
      const busId = (bus as any).id || (bus as any).bus_id;
      const busRouteId = (bus as any).routeId || (bus as any).route_id;
      return busRouteId === selectedRoute;
    });
  }, [buses, selectedRoute]);

  // Get buses with live locations
  const busesWithLiveLocations = useMemo(() => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    
    return buses.filter(bus => {
      const busId = (bus as any).id || (bus as any).bus_id;
      const location = lastBusLocations[busId];
      if (!location) return false;
      
      const lastUpdate = new Date(location.timestamp).getTime();
      return lastUpdate > fiveMinutesAgo;
    });
  }, [buses, lastBusLocations]);

  // Limit buses based on config
  const limitedBuses = useMemo(() => {
    if (busesWithLiveLocations.length <= finalConfig.maxBuses) {
      return busesWithLiveLocations;
    }
    return busesWithLiveLocations.slice(0, finalConfig.maxBuses);
  }, [busesWithLiveLocations, finalConfig.maxBuses]);

  // Filter buses by selected route - OPTIMIZED with route cache
  const displayBuses = useMemo(() => {
    if (selectedRoute === 'all') return limitedBuses;
    return limitedBuses.filter(bus => {
      const busRouteId = (bus as any).routeId || (bus as any).route_id;
      return busRouteId === selectedRoute;
    });
  }, [limitedBuses, selectedRoute]);

  // Route options for filter
  const routeOptions = useMemo(() => {
    return routes.map((route: Route) => ({
      value: route.id,
      label: route.name,
    }));
  }, [routes]);

  return (
    <div className={`student-map-container ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="h-full w-full relative"
      >
        {/* Map Container */}
        <div className="map-container h-full w-full relative">
          <div
            ref={mapContainer}
            className="w-full h-full rounded-lg overflow-hidden"
            style={{ minHeight: '400px' }}
          />
          
          {/* Driver Location Marker */}
          {map.current && driverLocation && (
            <DriverLocationMarker
              map={map.current}
              location={driverLocation}
              isTracking={isDriverTracking}
              onMarkerClick={handleDriverMarkerClick}
            />
          )}
          
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
              <div className="text-white text-center">
                <div className="loading-spinner mx-auto mb-4" />
                <p>Loading map...</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {connectionError && (
            <div className="absolute top-4 right-4 z-10">
              <GlassyCard className="p-4 bg-red-500 bg-opacity-20 border border-red-400">
                <div className="flex items-center space-x-2">
                  <span className="text-red-500">⚠️</span>
                  <div>
                    <h3 className="font-semibold text-red-700">
                      Connection Error
                    </h3>
                    <p className="text-sm text-red-700 mt-1">{connectionError}</p>
                  </div>
                </div>
              </GlassyCard>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <GlassyCard className="absolute top-4 left-4 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto z-10">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">🚌 Live Bus Tracking</h2>
              <button
                onClick={() => setIsNavbarCollapsed(!isNavbarCollapsed)}
                className="text-white hover:text-blue-300 transition-colors"
              >
                {isNavbarCollapsed ? '▶️' : '◀️'}
              </button>
            </div>

            {!isNavbarCollapsed && (
              <>
                {/* Connection Status */}
                <div className="mb-4 p-3 bg-blue-500 bg-opacity-20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      isConnected ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <span className="text-sm text-white">
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-1">
                    {buses.length} buses • {busesWithLiveLocations.length} active
                  </p>
                </div>

                {/* Route Filter */}
                <div className="mb-4">
                  <button
                    onClick={() => setIsRouteFilterOpen(!isRouteFilterOpen)}
                    className="flex items-center justify-between w-full p-2 bg-gray-700 bg-opacity-50 rounded-lg text-white hover:bg-opacity-70 transition-colors"
                  >
                    <span className="font-medium">🛣️ Routes</span>
                    <span>{isRouteFilterOpen ? '▼' : '▶'}</span>
                  </button>
                  
                  {isRouteFilterOpen && (
                    <div className="mt-2 space-y-1">
                      <button
                        onClick={() => setSelectedRoute('all')}
                        className={`w-full text-left p-2 rounded text-sm transition-colors ${
                          selectedRoute === 'all'
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        All Routes ({buses.length})
                      </button>
                      {routeOptions.map((route) => (
                        <button
                          key={route.value}
                          onClick={() => setSelectedRoute(route.value)}
                          className={`w-full text-left p-2 rounded text-sm transition-colors ${
                            selectedRoute === route.value
                              ? 'bg-blue-500 text-white'
                              : 'text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {route.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Buses */}
                <div className="mb-4">
                  <button
                    onClick={() => setIsActiveBusesOpen(!isActiveBusesOpen)}
                    className="flex items-center justify-between w-full p-2 bg-gray-700 bg-opacity-50 rounded-lg text-white hover:bg-opacity-70 transition-colors"
                  >
                    <span className="font-medium">🚌 Active Buses</span>
                    <span>{isActiveBusesOpen ? '▼' : '▶'}</span>
                  </button>
                  
                  {isActiveBusesOpen && (
                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                      <AnimatePresence>
                        {displayBuses.map((bus) => {
                          const busId = (bus as any).id || (bus as any).bus_id;
                          const location = lastBusLocations[busId];
                          return (
                            <motion.div
                              key={busId}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="p-3 bg-gray-700 bg-opacity-30 rounded-lg hover:bg-opacity-50 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">🚌</span>
                                  <span className="font-medium text-white">
                                    {bus.busNumber}
                                  </span>
                                  <span className="text-xs text-blue-600 opacity-75">
                                    👆
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                  {bus.eta ? `${bus.eta} min` : 'ETA: --'}
                                </div>
                              </div>

                              {/* Bus Details */}
                              <div className="space-y-1">
                                <div className="text-xs text-gray-600">
                                  📍 Route: {bus.routeName}
                                </div>
                                <div className="text-xs text-gray-600">
                                  👨‍💼 Driver: {bus.driverName}
                                </div>
                                {location && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-green-600">
                                      🕐{' '}
                                      {new Date(
                                        location.timestamp
                                      ).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    <span className="text-blue-600">
                                      {location.speed
                                        ? `${location.speed} km/h`
                                        : 'Speed: --'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </GlassyCard>
      </motion.div>
    </div>
  );
};

StudentMap.displayName = 'StudentMap';

// Apply custom comparison function to memo for optimal performance
const OptimizedStudentMap = memo(StudentMap, arePropsEqual);
OptimizedStudentMap.displayName = 'OptimizedStudentMap';

export default OptimizedStudentMap;