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

// PRODUCTION-GRADE: Ultra-optimized comparison function - eliminates complex calculations
const arePropsEqual = (prevProps: StudentMapProps, nextProps: StudentMapProps): boolean => {
  // Basic prop comparisons - fastest checks first
  if (prevProps.className !== nextProps.className) return false;
  if (prevProps.mode !== nextProps.mode) return false;
  if (prevProps.isDriverTracking !== nextProps.isDriverTracking) return false;
  
  // OPTIMIZED: Simple config comparison - no complex object iteration
  const prevConfig = prevProps.config;
  const nextConfig = nextProps.config;
  if (prevConfig === nextConfig) {
    // Same reference - definitely equal
  } else if (!prevConfig || !nextConfig) {
    return false; // One is null, other isn't
  } else {
    // Quick shallow comparison for config changes
    const prevKeys = Object.keys(prevConfig);
    const nextKeys = Object.keys(nextConfig);
    if (prevKeys.length !== nextKeys.length) return false;
    
    for (let i = 0; i < prevKeys.length; i++) {
      const key = prevKeys[i];
      if ((prevConfig as any)[key] !== (nextConfig as any)[key]) return false;
    }
  }
  
  // CRITICAL FIX: Simplified driver location comparison - no distance calculations
  const prevLocation = prevProps.driverLocation;
  const nextLocation = nextProps.driverLocation;
  
  if (prevLocation === nextLocation) {
    // Same reference - definitely equal
  } else if (!prevLocation || !nextLocation) {
    return false; // One is null, other isn't
  } else {
    // CRITICAL FIX: Only check essential properties - no complex calculations
    if (prevLocation.latitude !== nextLocation.latitude) return false;
    if (prevLocation.longitude !== nextLocation.longitude) return false;
    
    // CRITICAL FIX: Throttle based on timestamp only - no accuracy calculations
    const timeDiff = Math.abs(prevLocation.timestamp - nextLocation.timestamp);
    const minTimeThreshold = nextProps.isDriverTracking ? 3000 : 10000; // Increased thresholds
    
    if (timeDiff < minTimeThreshold) return true; // Skip re-render if too recent
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

  // MEMORY LEAK FIX: Disable performance monitoring in production to eliminate render overhead
  const isDevMode = process.env.NODE_ENV === 'development';
  const shouldMonitor = finalConfig.enablePerformanceMonitoring && isDevMode;
  
  // CRITICAL FIX: Minimal performance monitoring - only essential metrics
  const { metrics: performanceMetrics } = usePerformanceMonitor('StudentMap', {
    trackMemory: false, // Disable memory tracking to reduce overhead
    slowRenderThreshold: 32, // Increased threshold to reduce false positives
    logPerformance: shouldMonitor,
  });
  
  const { metrics: mapMetrics } = useMapPerformance({
    enableMonitoring: shouldMonitor,
    updateInterval: 120000, // Increased interval to 2 minutes to reduce overhead
  });
  
  // CRITICAL FIX: Store in refs to prevent unnecessary re-renders
  const performanceMetricsRef = useRef(performanceMetrics);
  const mapMetricsRef = useRef(mapMetrics);
  
  // CRITICAL FIX: Throttled metrics update to prevent render loops
  useEffect(() => {
    // Only update refs if metrics actually changed significantly
    const perfChanged = Math.abs(performanceMetricsRef.current.lastRenderTime - performanceMetrics.lastRenderTime) > 5;
    const mapChanged = Math.abs(mapMetricsRef.current.renderTime - mapMetrics.renderTime) > 5;
    
    if (perfChanged || mapChanged) {
      performanceMetricsRef.current = performanceMetrics;
      mapMetricsRef.current = mapMetrics;
    }
  }, [performanceMetrics.lastRenderTime, mapMetrics.renderTime]); // Only depend on specific values

  // Map references
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<{ [busId: string]: maplibregl.Marker }>({});
  const popups = useRef<{ [busId: string]: maplibregl.Popup }>({});
  const isMapInitialized = useRef(false);
  const addedRoutes = useRef<Set<string>>(new Set());
  const cleanupFunctions = useRef<(() => void)[]>([]);
  const websocketCleanupFunctions = useRef<(() => void)[]>([]);
  const eventListenersAdded = useRef(false);
  
  // MEMORY LEAK FIX: Track all event listeners for proper cleanup
  const mapEventListeners = useRef<Map<string, () => void>>(new Map());
  const performanceObservers = useRef<PerformanceObserver[]>([]);
  const animationFrames = useRef<number[]>([]);
  
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

  // CRITICAL FIX: Ultra-optimized debounced location update with minimal overhead
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
        }, 200); // CRITICAL FIX: Increased from 100ms to 200ms to reduce CPU usage further
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

  // REDUNDANT CODE REMOVED: removeRoutesFromMap and addRoutesToMap functions
  // These were unused and replaced by inline route management in useEffect

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

  // CRITICAL FIX: Ultra-optimized marker update with minimal DOM manipulation
  const updateBusMarker = useCallback(
    (location: BusLocation) => {
      if (!map.current) return;

      // Use cached bus info instead of searching array
      const bus = busInfoCache.current.get(location.busId);
      if (!bus) return;

      // Check if marker already exists
      let marker = markers.current[location.busId];

      if (marker) {
        // CRITICAL FIX: Simplified position update - no distance calculations
        const currentPos = marker.getLngLat();
        const latDiff = Math.abs(currentPos.lat - location.latitude);
        const lngDiff = Math.abs(currentPos.lng - location.longitude);
        
        // CRITICAL FIX: Only update if moved more than ~0.0001 degrees (~10m) - simplified check
        if (latDiff > 0.0001 || lngDiff > 0.0001) {
          marker.setLngLat([location.longitude, location.latitude]);
        }
        
        // CRITICAL FIX: Reduce popup update frequency from 30s to 60s to minimize DOM manipulation
        const popup = popups.current[location.busId];
        if (popup) {
          const lastUpdate = (popup as any)._lastUpdate || 0;
          const now = Date.now();
          
          if (now - lastUpdate > 60000) { // Increased from 30000ms to 60000ms
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

        // Create popup for new marker and track it
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
        popups.current[location.busId] = popup;
        (popup as any)._lastUpdate = Date.now();
      }
    },
    [] // Empty deps - use refs instead
  );

  // MEMORY LEAK FIX: Enhanced marker removal with popup cleanup
  const removeBusMarker = useCallback((busId: string) => {
    if (markers.current[busId]) {
      // Remove popup first
      if (popups.current[busId]) {
        popups.current[busId].remove();
        delete popups.current[busId];
      }
      
      // Remove marker
      markers.current[busId].remove();
      delete markers.current[busId];
    }
  }, []);

  // REDUNDANT CODE REMOVED: Unused variables and functions
  // - centerMapOnBuses: unused function
  // - removeRoutesFromMap: unused function  
  // - addRoutesToMap: unused function
  // - filteredBuses: replaced by displayBuses

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

      // MEMORY LEAK FIX: Track event listeners for proper cleanup
      const handleMapLoad = () => {
        logger.info('🗺️ Map loaded successfully', 'component');
        setIsLoading(false);
        // Don't load routes here - let the separate useEffect handle it
      };

      const handleMapError = (e: any) => {
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
      };

      // Store event listeners for cleanup
      mapEventListeners.current.set('load', handleMapLoad);
      mapEventListeners.current.set('error', () => handleMapError({}));

      map.current.once('load', handleMapLoad);
      map.current.on('error', handleMapError);

      // MEMORY LEAK FIX: Enhanced cleanup function
      const cleanup = () => {
        if (map.current) {
          // Remove all tracked event listeners
          mapEventListeners.current.forEach((handler, event) => {
            try {
              map.current?.off(event, handler);
            } catch (error) {
              logger.warn('Warning', 'component', { data: `⚠️ Error removing map event listener ${event}:`, error });
            }
          });
          mapEventListeners.current.clear();

          // Remove all markers and popups
          Object.values(markers.current).forEach(marker => {
            try {
              marker.remove();
            } catch (error) {
              logger.warn('Warning', 'component', { data: '⚠️ Error removing marker:', error });
            }
          });
          Object.values(popups.current).forEach(popup => {
            try {
              popup.remove();
            } catch (error) {
              logger.warn('Warning', 'component', { data: '⚠️ Error removing popup:', error });
            }
          });

          // Clear all references
          markers.current = {};
          popups.current = {};
          addedRoutes.current.clear();
          
          // Remove map instance
          map.current.remove();
          map.current = null;
          isMapInitialized.current = false;
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

  // PRODUCTION FIX: Simplified WebSocket event subscription with event-driven state management
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

    // PRODUCTION FIX: Set up handlers using refs to prevent useEffect re-runs
    handleBusLocationUpdateRef.current = (location: BusLocation) => {
      requestAnimationFrame(() => {
        debouncedLocationUpdate(location);
        updateBusMarker(location);
      });
    };

    handleDriverConnectedRef.current = (data: { driverId: string; busId: string; timestamp: string }) => {
      logger.debug('🚌 Driver connected:', 'component', { data });
    };

    handleDriverDisconnectedRef.current = (data: { driverId: string; busId: string; timestamp: string }) => {
      logger.debug('🚌 Driver disconnected:', 'component', { data });
    };

    handleBusArrivingRef.current = (data: { busId: string; routeId: string; stopId: string; eta: number; timestamp: string }) => {
      logger.debug('🚌 Bus arriving:', 'component', { data });
    };

    // PRODUCTION FIX: Event-driven connection state management
    const unsubscribeConnectionState = unifiedWebSocketService.onConnectionStateChange((state) => {
      if (!isMounted) return;
      
      setIsConnected(state.isConnected);
      setConnectionStatus(state.isConnected ? 'connected' : 'disconnected');
      
      if (state.error) {
        setConnectionError(state.error);
      } else if (state.isConnected) {
        setConnectionError(null);
      }
    });

    // Subscribe to WebSocket events
    const unsubscribeBusLocation = unifiedWebSocketService.onBusLocationUpdate((location) => handleBusLocationUpdateRef.current?.(location));
    const unsubscribeDriverConnected = unifiedWebSocketService.onDriverConnected((data) => handleDriverConnectedRef.current?.(data));
    const unsubscribeDriverDisconnected = unifiedWebSocketService.onDriverDisconnected((data) => handleDriverDisconnectedRef.current?.(data));
    const unsubscribeBusArriving = unifiedWebSocketService.onBusArriving((data) => handleBusArrivingRef.current?.(data));
    
    // Store cleanup functions
    websocketCleanupFunctions.current = [
      unsubscribeConnectionState,
      unsubscribeBusLocation,
      unsubscribeDriverConnected,
      unsubscribeDriverDisconnected,
      unsubscribeBusArriving,
    ];
    
    logger.info('✅ WebSocket event listeners registered', 'component');

    const cleanup = () => {
      isMounted = false;
      
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

  // CRITICAL FIX: Ultra-simplified recentering logic to minimize map animation overhead
  const lastRecenterLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const isTrackingRef = useRef(false);
  const recenterThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const lastRecenterTimeRef = useRef<number>(0);
  
  // CRITICAL FIX: Simplified distance calculation - no complex Haversine formula
  const calculateSimpleDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    // Simple Euclidean distance approximation - much faster than Haversine
    const latDiff = lat2 - lat1;
    const lonDiff = lon2 - lon1;
    return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111000; // Rough conversion to meters
  }, []);
  
  // CRITICAL FIX: Simplified threshold calculation - no complex accuracy logic
  const getSimpleThreshold = useCallback((accuracy?: number): number => {
    // Simplified threshold based on accuracy
    if (!accuracy) return 50; // Default 50m threshold
    
    if (accuracy > 1000) return 100; // Desktop/IP-based: 100m threshold
    if (accuracy > 100) return 50;   // Poor GPS: 50m threshold
    return 25; // Good GPS: 25m threshold
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

  // PRODUCTION FIX: Optimized recentering logic with better throttling and adaptive thresholds
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

    // PRODUCTION FIX: Check GPS accuracy before displaying location
    if (driverLocation.accuracy && driverLocation.accuracy > 1000) {
      logger.warn('Low accuracy location detected - likely IP-based positioning', 'StudentMap', {
        accuracy: driverLocation.accuracy,
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        warning: 'Location may be inaccurate - desktop browsers use IP-based positioning'
      });
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
    // CRITICAL FIX: Ultra-simplified recentering logic to minimize overhead
    else if (lastRecenterLocationRef.current) {
      const distance = calculateSimpleDistance(
        lastRecenterLocationRef.current.latitude,
        lastRecenterLocationRef.current.longitude,
        currentLocation.latitude,
        currentLocation.longitude
      );

      // CRITICAL FIX: Simplified threshold calculation
      const threshold = getSimpleThreshold(driverLocation.accuracy);
      
      // CRITICAL FIX: Much more conservative recentering to reduce map animation overhead
      const MAX_TIME_BETWEEN_RECENTERS = 10000; // Increased to 10 seconds
      const MIN_TIME_BETWEEN_RECENTERS = 2000;  // Increased to 2 seconds
      
      const shouldRecenterByDistance = distance > threshold;
      const shouldRecenterByTime = timeSinceLastRecenter > MAX_TIME_BETWEEN_RECENTERS;
      const hasEnoughTimeSinceLastRecenter = timeSinceLastRecenter > MIN_TIME_BETWEEN_RECENTERS;
      
      // CRITICAL FIX: Only recenter if moved significantly AND enough time has passed
      if (shouldRecenterByDistance && hasEnoughTimeSinceLastRecenter) {
        shouldRecenter = true;
      } else if (shouldRecenterByTime && hasEnoughTimeSinceLastRecenter) {
        shouldRecenter = true;
      }
      
      if (shouldRecenter) {
        logger.info('🔄 Recentering: Driver location update', 'StudentMap', {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
          distance: Math.round(distance),
          threshold: threshold,
          accuracy: driverLocation.accuracy,
          reason: shouldRecenterByDistance ? 'distance' : 'time',
          timeSinceLastRecenter: Math.round(timeSinceLastRecenter),
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

    // PRODUCTION FIX: Enhanced throttling to avoid too frequent updates
    if (shouldRecenter) {
      // Clear any pending throttle
      if (recenterThrottleRef.current) {
        clearTimeout(recenterThrottleRef.current);
      }

      // CRITICAL FIX: Increased throttle delay to reduce map animation overhead
      recenterThrottleRef.current = setTimeout(() => {
        try {
          map.current?.flyTo({
            center: [currentLocation.longitude, currentLocation.latitude],
            zoom: 15,
            duration: 2000, // CRITICAL FIX: Increased from 1500ms to 2000ms to reduce CPU usage further
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
      }, 300); // CRITICAL FIX: Increased from 200ms to 300ms to reduce CPU usage further
    }
  }, [isDriverTracking, driverLocation?.latitude, driverLocation?.longitude, driverLocation?.timestamp, driverLocation?.accuracy]); // Removed callback dependencies

  // MEMORY LEAK FIX: Comprehensive cleanup on unmount
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
      
      // MEMORY LEAK FIX: Cancel all pending animation frames
      animationFrames.current.forEach(rafId => {
        try {
          cancelAnimationFrame(rafId);
        } catch (error) {
          logger.warn('Warning', 'component', { data: '⚠️ Error canceling animation frame:', error });
        }
      });
      animationFrames.current = [];
      
      // MEMORY LEAK FIX: Disconnect all performance observers
      performanceObservers.current.forEach(observer => {
        try {
          observer.disconnect();
        } catch (error) {
          logger.warn('Warning', 'component', { data: '⚠️ Error disconnecting performance observer:', error });
        }
      });
      performanceObservers.current = [];
      
      // Cleanup all markers and popups to prevent memory leaks
      Object.values(markers.current).forEach(marker => {
        try {
          marker.remove();
        } catch (error) {
          logger.warn('Warning', 'component', { data: '⚠️ Error removing marker during cleanup:', error });
        }
      });
      Object.values(popups.current).forEach(popup => {
        try {
          popup.remove();
        } catch (error) {
          logger.warn('Warning', 'component', { data: '⚠️ Error removing popup during cleanup:', error });
        }
      });
      markers.current = {};
      popups.current = {};
      
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
      cleanupFunctions.current = [];
      
      // MEMORY LEAK FIX: Clear all map event listeners
      mapEventListeners.current.clear();
      
      // Reset flags to allow proper re-initialization if component remounts
      eventListenersAdded.current = false;
      
      logger.info('🧹 StudentMap comprehensive cleanup complete - all markers, listeners, and observers removed', 'component');
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

  // Filter buses based on selected route - OPTIMIZED with caching
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