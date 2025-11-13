import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { motion } from 'framer-motion';
import maplibregl from 'maplibre-gl';
import environment from '../config/environment';
// Map constants are imported by useMapInstance hook, not needed here
import { BusLocation as WSBusLocation } from '../services/UnifiedWebSocketService';
// unifiedWebSocketService is used by hooks internally
import { BusInfo } from '../services/busService';
// apiService is used by hooks internally
// PRODUCTION FIX: Removed unused authService import - StudentMap does not require authentication
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { useMapPerformance } from '../hooks/useMapPerformance';
import DriverLocationMarker from './map/DriverLocationMarker';
import './StudentMap.css';
import StudentMapSidebar from './map/StudentMap/Sidebar';
import RouteStatusPanel from './map/StudentMap/RouteStatusPanel';
import { MapCanvas } from './StudentMap/MapCanvas';
import { MapOverlays } from './StudentMap/MapOverlays';
import { Route, BusLocation } from '../types';
// onRouteStatusUpdated is handled by useRouteStatusManagement hook

import { logger } from '../utils/logger';
// formatTime is used by hooks internally, not needed here
import { useMapInstance } from '../hooks/useMapInstance';
import { useStudentMapWebSocketBindings } from '../hooks/useStudentMapWebSocketBindings';
import { useRouteFiltering } from '../hooks/useRouteFiltering';
// getRouteColor is now used by useRouteManagement hook, not needed here
import { busBelongsToRoute, getBusRouteId } from '../utils/busRouteFilter';
// Hooks for refactored StudentMap
import { useStudentMapState } from './map/hooks/useStudentMapState';
import { useDebouncedLocationUpdates } from './map/hooks/useDebouncedLocationUpdates';
import { useBusIdManagement } from './map/hooks/useBusIdManagement';
import { useBusDataLoading } from './map/hooks/useBusDataLoading';
import { useRouteStatusManagement } from './map/hooks/useRouteStatusManagement';
import { useBusMarkerManagement } from './map/hooks/useBusMarkerManagement';
import { useRouteManagement } from './map/hooks/useRouteManagement';
import { convertBusToBusInfo } from './map/utils/busInfoConverter';

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
  // Logout handler
  onSignOut?: () => void;
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
  onSignOut,
}) => {
  // Merge config with defaults - CRITICAL FIX: Simplified logic without caching bugs
  const finalConfig = useMemo(() => {
    // CRITICAL FIX: Handle undefined config properly
    if (!config) {
      return defaultConfig;
    }
    
    const mergedConfig = { ...defaultConfig, ...config };
    return mergedConfig;
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

  // Map references (markers and popups now come from useBusMarkerManagement hook)
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
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
  const handleBusLocationUpdateRef = useRef<(location: WSBusLocation) => void>();
  const handleDriverConnectedRef = useRef<(data: { driverId: string; busId: string; timestamp: string }) => void>();
  const handleDriverDisconnectedRef = useRef<(data: { driverId: string; busId: string; timestamp: string }) => void>();
  const handleBusArrivingRef = useRef<(data: { busId: string; routeId: string; stopId: string; eta: number; timestamp: string }) => void>();

  // Phase 1: State Management - Use centralized state hook
  const {
    // Connection state
    isConnected,
    setIsConnected,
    connectionError,
    setConnectionError,
    connectionStatus,
    setConnectionStatus,
    // Data state
    buses,
    setBuses,
    routes,
    setRoutes,
    selectedRoute,
    setSelectedRoute,
    selectedShift,
    setSelectedShift,
    // Note: routeStatus and routeStops are managed by useRouteStatusManagement hook
    isLoading,
    setIsLoading,
    lastBusLocations,
    setLastBusLocations,
    // UI state
    isNavbarCollapsed,
    setIsNavbarCollapsed,
    isRouteFilterOpen,
    setIsRouteFilterOpen,
  } = useStudentMapState();

  // Phase 2: Debounced Location Updates - Use centralized hook
  const debouncedLocationUpdate = useDebouncedLocationUpdates(setLastBusLocations);

  // REMOVED: loadRoutes function - now handled by useRouteFiltering hook

  // REDUNDANT CODE REMOVED: removeRoutesFromMap and addRoutesToMap functions
  // These were unused and replaced by inline route management in useEffect

  // Phase 3: Bus ID Management - Use centralized hook
  const {
    busIdAliases,
    busInfoCache,
    pendingBusFetches,
    getCanonicalBusId,
    setBusAlias,
  } = useBusIdManagement({ buses });

  // Phase 4: Bus Data Loading - Use centralized hook
  useBusDataLoading({
    busInfoCache,
    setBuses,
    lastBusLocations,
    busIdAliases,
  });

  // Update bus info cache when buses change (sync with hook)
  useEffect(() => {
    buses.forEach(bus => {
      const busId = bus.busId;
      if (busId && !busInfoCache.current.has(busId)) {
        busInfoCache.current.set(busId, bus);
      }
    });
  }, [buses, busInfoCache]);

  // Phase 6: Bus Marker Management - Use centralized hook
  const {
    markers,
    popups,
    updateBusMarker,
    removeBusMarker,
  } = useBusMarkerManagement({
    map,
    selectedRoute,
    getCanonicalBusId,
    busInfoCache,
    convertBusToBusInfo,
    buses,
    setBuses,
    busIdAliases,
    pendingBusFetches,
    lastBusLocations,
  });

  // REDUNDANT CODE REMOVED: Unused variables and functions
  // - centerMapOnBuses: unused function
  // - removeRoutesFromMap: unused function  
  // - addRoutesToMap: unused function
  // - filteredBuses: replaced by displayBuses

  // Initialize map via hook (markers and popups refs come from useBusMarkerManagement hook)
  useMapInstance({
    mapContainer,
    mapRef: map as any,
    markersRef: markers as any, // Use refs from useBusMarkerManagement hook
    popupsRef: popups as any, // Use refs from useBusMarkerManagement hook
    addedRoutesRef: addedRoutes as any,
    cleanupFunctionsRef: cleanupFunctions as any,
    mapEventListenersRef: mapEventListeners as any,
    isMapInitializedRef: isMapInitialized as any,
    eventListenersAddedRef: eventListenersAdded as any,
    setIsLoading,
    setConnectionError,
  });

  // PRODUCTION FIX: Use custom hook for route filtering
  // This hook handles:
  // - Loading all routes when no shift is selected
  // - Loading filtered routes when a shift is selected
  const {
    isLoading: isLoadingRoutes,
    error: routesError,
  } = useRouteFiltering({
    selectedShift,
    onRoutesLoaded: useCallback((loadedRoutes: Route[]) => {
      // Update routes state with loaded routes
      setRoutes(loadedRoutes);
      // If current selected route isn't in the new list, reset to 'all'
      setSelectedRoute((currentRoute: string) => {
        if (currentRoute !== 'all' && !loadedRoutes.find((r: Route) => r.id === currentRoute)) {
          return 'all';
        }
        return currentRoute;
      });
    }, []), // Empty deps - use functional update to avoid stale closure
    onError: undefined, // Let the useEffect below handle errors to avoid duplication
  });

  // Handle routes error display (single source of truth for error handling)
  useEffect(() => {
    if (routesError) {
      setConnectionError(routesError);
      const timeoutId = setTimeout(() => setConnectionError(null), 5000);
      return () => clearTimeout(timeoutId);
    }
  }, [routesError]);

  // Phase 5: Route Status Management - Use centralized hook (single source of truth)
  const {
    routeStatus,
    setRouteStatus,
    routeStops,
    setRouteStops,
    handleRouteStopReached,
    refreshRouteStatus,
  } = useRouteStatusManagement({
    selectedRoute,
    selectedShift,
    enableRealTime: finalConfig.enableRealTime,
  });

  // WebSocket bindings via hook
  // CRITICAL FIX: Pass isDriverMode flag to prevent creating duplicate WebSocket connection
  // When StudentMap is used in driver dashboard, it should use the existing driver WebSocket
  useStudentMapWebSocketBindings({
    isDriverMode: isDriverTracking, // Use isDriverTracking prop to detect driver mode
    enabled: finalConfig.enableRealTime,
    setIsConnected,
    setConnectionStatus,
    setConnectionError,
    setBuses,
    buses,
    lastBusLocations,
    setLastBusLocations,
    debouncedLocationUpdate,
    updateBusMarker,
    getCanonicalBusId,
    busInfoCache,
    websocketCleanupFunctions,
    cleanupFunctions,
    selectedRoute,
    selectedShift,
    onRouteStopReached: handleRouteStopReached,
  });

  // Phase 7: Route Management - Use centralized hook
  const {
    addedRoutes: addedRoutesFromHook,
    routeColorsMap,
    addRouteToMap,
    removeRouteFromMap,
    updateRouteVisibility,
  } = useRouteManagement({
    map,
    routes,
    selectedRoute,
    isMapInitialized,
  });

  // Sync addedRoutes from hook to component ref (for useMapInstance compatibility)
  useEffect(() => {
    addedRoutes.current = addedRoutesFromHook.current;
  }, [addedRoutesFromHook]);

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
          threshold,
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
      
      // Note: Markers and popups cleanup is handled by useBusMarkerManagement hook
      // No need to call removeAllMarkers() here as the hook has its own cleanup effect
      
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

  // Get buses with live locations - CRITICAL FIX: Include buses from cache
  const busesWithLiveLocations = useMemo(() => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const activeBuses = new Map<string, any>();
    
    // First, add buses from main array that have live locations
    buses.forEach(bus => {
      const busId = (bus as any).id || (bus as any).bus_id;
      const location = lastBusLocations[busId];
      if (location) {
        const lastUpdate = new Date(location.timestamp).getTime();
        if (lastUpdate > fiveMinutesAgo) {
          activeBuses.set(busId, bus);
        }
      }
    });
    
    // PRODUCTION FIX: Also include buses from cache that have recent location updates
    for (const [busId, location] of Object.entries(lastBusLocations)) {
      const lastUpdate = new Date(location.timestamp).getTime();
      if (lastUpdate > fiveMinutesAgo && !activeBuses.has(busId)) {
        const cachedBus = busInfoCache.current.get(busId);
        if (cachedBus) {
          activeBuses.set(busId, cachedBus);
          logger.info('📊 Including cached bus in active count', 'component', { busId });
        }
      }
    }
    
    return Array.from(activeBuses.values());
  }, [buses, lastBusLocations]);

  // Center map on a specific bus by its latest known location
  const handleCenterOnBus = useCallback((busId: string) => {
    const location = lastBusLocations[busId];
    if (!location || !map.current) return;
    map.current.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 15,
      duration: 1000,
    });
    logger.info('✅ Map centered on bus', 'component', { busId, location });
  }, [lastBusLocations]);

  // PRODUCTION FIX: Center on bus for selected route
  // Note: This is defined before displayBuses to avoid temporal dead zone errors
  // It calculates route buses inline using buses and lastBusLocations
  const handleCenterOnBusForRoute = useCallback(() => {
    if (!selectedRoute || selectedRoute === 'all' || !map.current) {
      logger.warn('⚠️ Cannot center on bus: no route selected', 'component');
      return;
    }

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    let targetBusId: string | null = null;
    let targetLocation: BusLocation | null = null;

    // Method 1: Check routeStatus session first (most reliable)
    if (routeStatus?.session?.bus_id) {
      const sessionBusId = routeStatus.session.bus_id;
      const location = lastBusLocations[sessionBusId];
      if (location) {
        const lastUpdate = new Date(location.timestamp).getTime();
        if (lastUpdate > fiveMinutesAgo) {
          targetBusId = sessionBusId;
          targetLocation = location;
          logger.info('✅ Found bus from routeStatus session', 'component', { busId: sessionBusId, routeId: selectedRoute });
        }
      }
    }

    // Method 2: If no session bus, check busesWithLiveLocations filtered by route
    if (!targetBusId) {
      // Calculate filtered buses inline from busesWithLiveLocations
      // PRODUCTION FIX: Use centralized utility function
      // Apply maxBuses limit and filter by route
      const maxBuses = finalConfig.maxBuses;
      const busesToCheck = busesWithLiveLocations.slice(0, maxBuses);
      const filteredBuses = busesToCheck.filter(bus => busBelongsToRoute(bus, selectedRoute));
      
      if (filteredBuses.length > 0) {
        for (const bus of filteredBuses) {
          const busId = (bus as any).id || (bus as any).bus_id;
          const location = lastBusLocations[busId];
          if (location) {
            const lastUpdate = new Date(location.timestamp).getTime();
            if (lastUpdate > fiveMinutesAgo) {
              targetBusId = busId;
              targetLocation = location;
              logger.info('✅ Found bus from filtered buses', 'component', { busId, routeId: selectedRoute });
              break;
            }
          }
        }
      }
    }

    // Method 3: Check all buses with live locations for this route
    if (!targetBusId) {
      for (const [busId, location] of Object.entries(lastBusLocations)) {
        const lastUpdate = new Date(location.timestamp).getTime();
        if (lastUpdate > fiveMinutesAgo) {
          // Check if this bus belongs to the selected route
          // PRODUCTION FIX: Use centralized utility function
          const bus = buses.find(b => {
            const bId = (b as any).id || (b as any).bus_id;
            return bId === busId;
          });
          
          if (bus && busBelongsToRoute(bus, selectedRoute)) {
            targetBusId = busId;
            targetLocation = location;
            logger.info('✅ Found bus from buses array', 'component', { busId, routeId: selectedRoute });
            break;
          }
          
          // Also check cached bus
          const cachedBus = busInfoCache.current.get(busId);
          if (cachedBus && busBelongsToRoute(cachedBus, selectedRoute)) {
            targetBusId = busId;
            targetLocation = location;
            logger.info('✅ Found bus from cache', 'component', { busId, routeId: selectedRoute });
            break;
          }
        }
      }
    }

    if (!targetBusId || !targetLocation) {
      // Calculate filtered buses count for logging
      // PRODUCTION FIX: Use centralized utility function
      const maxBuses = finalConfig.maxBuses;
      const busesToCheck = busesWithLiveLocations.slice(0, maxBuses);
      const filteredBusesCount = busesToCheck.filter(bus => busBelongsToRoute(bus, selectedRoute)).length;
      
      logger.warn('⚠️ No buses found for selected route', 'component', { 
        selectedRoute,
        routeStatus: routeStatus?.session,
        filteredBusesCount,
        lastBusLocationsCount: Object.keys(lastBusLocations).length
      });
      setConnectionError('No active bus found for this route');
      setTimeout(() => setConnectionError(null), 3000);
      return;
    }

    // Center map on bus with smooth animation
    map.current.flyTo({
      center: [targetLocation.longitude, targetLocation.latitude],
      zoom: 15,
      duration: 1000,
      essential: true,
    });

    logger.info('✅ Map centered on bus for route', 'component', { 
      routeId: selectedRoute,
      busId: targetBusId,
      location: { lat: targetLocation.latitude, lng: targetLocation.longitude }
    });
  }, [selectedRoute, buses, lastBusLocations, routeStatus, busesWithLiveLocations, finalConfig.maxBuses]);

  // Limit buses based on config
  const limitedBuses = useMemo(() => {
    if (busesWithLiveLocations.length <= finalConfig.maxBuses) {
      return busesWithLiveLocations;
    }
    return busesWithLiveLocations.slice(0, finalConfig.maxBuses);
  }, [busesWithLiveLocations, finalConfig.maxBuses]);

  // Filter buses based on selected route - OPTIMIZED with caching
  // PRODUCTION FIX: Use centralized utility function to avoid duplication
  const displayBuses = useMemo(() => {
    if (selectedRoute === 'all') return limitedBuses;
    return limitedBuses.filter(bus => busBelongsToRoute(bus, selectedRoute));
  }, [limitedBuses, selectedRoute]);

  // PRODUCTION FIX: Check if there's a bus available for the selected route
  // Defined after displayBuses to avoid temporal dead zone
  const hasBusForSelectedRoute = useMemo(() => {
    if (!selectedRoute || selectedRoute === 'all') return false;
    
    // Method 1: Check routeStatus session for bus_id (most reliable)
    if (routeStatus?.session?.bus_id) {
      const sessionBusId = routeStatus.session.bus_id;
      if (lastBusLocations[sessionBusId]) {
        return true;
      }
    }
    
    // Method 2: Check displayBuses (already filtered by route)
    const hasDisplayBus = displayBuses.some(bus => {
      const busId = (bus as any).id || (bus as any).bus_id;
      return lastBusLocations[busId] !== undefined;
    });
    if (hasDisplayBus) return true;
    
    // Method 3: Check all buses with live locations for this route
    // PRODUCTION FIX: Use centralized utility function
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [busId, location] of Object.entries(lastBusLocations)) {
      const lastUpdate = new Date(location.timestamp).getTime();
      if (lastUpdate > fiveMinutesAgo) {
        // Check if this bus belongs to the selected route
        const bus = buses.find(b => {
          const bId = (b as any).id || (b as any).bus_id;
          return bId === busId;
        });
        if (bus && busBelongsToRoute(bus, selectedRoute)) return true;
        
        // Also check cached bus
        const cachedBus = busInfoCache.current.get(busId);
        if (cachedBus && busBelongsToRoute(cachedBus, selectedRoute)) {
          return true;
        }
      }
    }
    
    return false;
  }, [selectedRoute, routeStatus, displayBuses, lastBusLocations, buses]);

  // Route visibility is handled by useRouteManagement hook

  // PRODUCTION FIX: Filter bus markers by selected route
  // Hide markers for buses not on selected route, show all when "all" is selected
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    // Get all buses with live locations
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const activeBusIds = new Set<string>();
    
    // Collect all active bus IDs
    for (const [busId, location] of Object.entries(lastBusLocations)) {
      const lastUpdate = new Date(location.timestamp).getTime();
      if (lastUpdate > fiveMinutesAgo) {
        activeBusIds.add(busId);
      }
    }

    // Also check buses array
    buses.forEach(bus => {
      const busId = (bus as any).id || (bus as any).bus_id || bus.busId;
      if (busId) {
        activeBusIds.add(busId);
      }
    });

    // Update marker visibility based on route selection
    activeBusIds.forEach(busId => {
      const marker = markers.current[busId];
      if (!marker) return; // Marker doesn't exist yet

      // Get bus info from cache or buses array
      let bus: BusInfo | undefined = busInfoCache.current.get(busId);
      if (!bus) {
        bus = buses.find(b => {
          const bId = (b as any).id || (b as any).bus_id || b.busId;
          return bId === busId;
        });
      }

      const shouldShow = selectedRoute === 'all' || (bus && busBelongsToRoute(bus, selectedRoute));

      if (shouldShow && map.current) {
        // Show marker - ensure it's added to map if it was removed
        if (!marker._map) {
          marker.addTo(map.current);
        }
        // Make marker visible
        const element = marker.getElement();
        if (element) {
          element.style.display = '';
          element.style.opacity = '1';
        }
      } else {
        // Hide marker - remove from map
        if (marker._map) {
          marker.remove();
        }
        logger.debug('🚫 Hiding bus marker - not on selected route', 'component', {
          busId,
          selectedRoute,
          busRouteId: getBusRouteId(bus)
        });
      }
    });

    // Re-add markers for buses on selected route that were previously hidden
    if (selectedRoute !== 'all') {
      // Check all buses and re-add markers for buses on selected route
      buses.forEach(bus => {
        const busId = (bus as any).id || (bus as any).bus_id || bus.busId;
        if (!busId) return;

        if (busBelongsToRoute(bus, selectedRoute)) {
          const location = lastBusLocations[busId];
          if (location) {
            const lastUpdate = new Date(location.timestamp).getTime();
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            if (lastUpdate > fiveMinutesAgo) {
              // Bus is active and on selected route - ensure marker exists
              if (!markers.current[busId]) {
                // Trigger marker creation by calling updateBusMarker
                // This will be handled by the WebSocket update, but we can trigger it here
                // if we have the location data
                const wsLocation: WSBusLocation = {
                  busId,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  timestamp: location.timestamp,
                  speed: location.speed,
                  heading: location.heading,
                };
                updateBusMarker(wsLocation);
              } else if (!markers.current[busId]._map && map.current) {
                // Marker exists but was removed - re-add it
                markers.current[busId].addTo(map.current);
              }
            }
          }
        }
      });
    } else {
      // "All" selected - re-add all markers that were hidden
      Object.entries(markers.current).forEach(([busId, marker]) => {
        if (!marker._map && map.current) {
          marker.addTo(map.current);
        }
        const element = marker.getElement();
        if (element) {
          element.style.display = '';
          element.style.opacity = '1';
        }
      });
    }
  }, [selectedRoute, buses, lastBusLocations, updateBusMarker]);

  // PRODUCTION FIX: Auto-fit map bounds when route is selected
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || selectedRoute === 'all') return;
    
    const route = routes.find(r => r.id === selectedRoute);
    if (!route) return;
    
    const coords = (route as any).coordinates || 
                   (route as any).geom?.coordinates || 
                   (route as any).stops?.coordinates;
    
    if (coords && coords.length > 0) {
      try {
        // Calculate bounds from route coordinates
        const bounds = new maplibregl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]);
        coords.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });
        
        // Fit map to route bounds with padding
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 1000,
          maxZoom: 15
        });
        
        logger.info('✅ Map bounds fitted to selected route', 'component', { 
          routeId: selectedRoute,
          routeName: route.name
        });
      } catch (error) {
        logger.warn('⚠️ Error fitting bounds to route', 'component', { error });
      }
    }
  }, [selectedRoute, routes]);

  // Route options for filter
  const routeOptions = useMemo(() => {
    return routes.map((route: Route) => ({
      value: route.id,
      label: route.name,
    }));
  }, [routes]);

  // WebSocket subscription and polling for route status is handled by useRouteStatusManagement hook

  return (
    <div className={`student-map-container ${className} bg-white`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="h-full w-full flex relative"
      >
        {/* Left Sidebar - Filters */}
        <StudentMapSidebar
          isNavbarCollapsed={isNavbarCollapsed}
          setIsNavbarCollapsed={setIsNavbarCollapsed}
          isConnected={isConnected}
          busesCount={buses.length}
          activeCount={busesWithLiveLocations.length}
          selectedShift={selectedShift}
          setSelectedShift={(v:any) => setSelectedShift(v)}
          selectedRoute={selectedRoute}
          setSelectedRoute={setSelectedRoute}
          routeOptions={routeOptions}
          displayBuses={displayBuses as any}
          lastBusLocations={lastBusLocations as any}
          onCenterOnBus={handleCenterOnBus}
          isLoadingRoutes={isLoadingRoutes}
          onCenterOnBusForRoute={handleCenterOnBusForRoute}
          onSignOut={onSignOut}
        />

        {/* Right Side - Map Container */}
        <div className="flex-1 h-full relative">
          <MapCanvas mapContainerRef={mapContainer} />
          
          {/* Driver Location Marker */}
          {map.current && driverLocation && (
            <DriverLocationMarker
              map={map.current}
              location={driverLocation}
              isTracking={isDriverTracking}
              onMarkerClick={handleDriverMarkerClick}
            />
          )}
          
          {/* Loading and Error Overlays */}
          <MapOverlays isLoading={isLoading} connectionError={connectionError} />

          {/* Route status panel for students */}
          <RouteStatusPanel
            selectedRoute={selectedRoute}
            selectedShift={selectedShift}
            routeStatus={routeStatus as any}
            routeStops={routeStops as any}
            onRefresh={refreshRouteStatus}
            onCenterOnBus={handleCenterOnBusForRoute}
            hasBusForRoute={hasBusForSelectedRoute}
          />
        </div>
      </motion.div>
    </div>
  );
};

StudentMap.displayName = 'StudentMap';

// Apply custom comparison function to memo for optimal performance
const OptimizedStudentMap = memo(StudentMap, arePropsEqual);
OptimizedStudentMap.displayName = 'OptimizedStudentMap';

export default OptimizedStudentMap;