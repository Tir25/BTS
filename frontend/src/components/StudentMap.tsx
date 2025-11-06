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
import environment from '../config/environment';
import { MAP_TILE_URLS, MAP_TILE_ATTRIBUTION, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from '../config/map';
import { unifiedWebSocketService, BusLocation as WSBusLocation } from '../services/UnifiedWebSocketService';
import { busService, BusInfo } from '../services/busService';
import { apiService } from '../api';
// PRODUCTION FIX: Removed unused authService import - StudentMap does not require authentication
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { useMapPerformance } from '../hooks/useMapPerformance';
import DriverLocationMarker from './map/DriverLocationMarker';
import './StudentMap.css';
import StudentMapSidebar from './map/StudentMap/Sidebar';
import RouteStatusPanel from './map/StudentMap/RouteStatusPanel';
import { Route, BusLocation } from '../types';
import { onRouteStatusUpdated } from '../services/RouteStatusEvents';

import { logger } from '../utils/logger';
import { errorHandler } from '../utils/errorHandler';
import { formatTime } from '../utils/dateFormatter';
import { useMapInstance } from '../hooks/useMapInstance';
import { useStudentMapWebSocketBindings } from '../hooks/useStudentMapWebSocketBindings';

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

// PRODUCTION FIX: Generate distinct colors for routes
const routeColors = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#6366f1', // Indigo
];

const getRouteColor = (routeId: string, index: number): string => {
  // Use route ID hash for consistent color assignment
  const hash = routeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return routeColors[hash % routeColors.length];
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

  // Map references
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<{ [busId: string]: maplibregl.Marker }>({});
  const popups = useRef<{ [busId: string]: maplibregl.Popup }>({});
  // Map various incoming IDs (uuid, legacy id, bus_number) to a single canonical busId
  const busIdAliases = useRef<Map<string, string>>(new Map());
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

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'disconnected' | 'reconnecting'
  >('disconnected');
  const [buses, setBuses] = useState<BusInfo[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<'Day' | 'Afternoon' | ''>('');
  const [routeStatus, setRouteStatus] = useState<{ tracking_active: boolean; stops: { completed: any[]; next: any | null; remaining: any[] } } | null>(null);
  const [routeStops, setRouteStops] = useState<Array<{ id: string; name?: string; sequence: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastBusLocations, setLastBusLocations] = useState<{
    [busId: string]: BusLocation;
  }>({});

  // UI state
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const [isRouteFilterOpen, setIsRouteFilterOpen] = useState(true);

  // CRITICAL FIX: Ultra-optimized debounced location update with minimal overhead
  const debouncedLocationUpdate = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      let rafId: number | null = null;
      const pendingUpdates = new Map<string, WSBusLocation>();
      
      return (location: WSBusLocation) => {
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
              // CRITICAL DEBUG: Log state update
              logger.info('🔍 DEBUG: Updating lastBusLocations state', 'component', { 
                pendingUpdatesCount: pendingUpdates.size,
                busIds: Array.from(pendingUpdates.keys())
              });
              
              setLastBusLocations(prev => {
                const updates = { ...prev };
                pendingUpdates.forEach((loc, busId) => {
                  // Convert WSBusLocation to BusLocation with required driverId
                  const busLocation: BusLocation = {
                    busId: loc.busId,
                    driverId: (loc as any).driverId || '',
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    timestamp: loc.timestamp,
                    speed: loc.speed,
                    heading: loc.heading,
                  };
                  updates[busId] = busLocation;
                  logger.info('🔍 DEBUG: Adding location to state', 'component', { 
                    busId,
                    timestamp: loc.timestamp 
                  });
                });
                pendingUpdates.clear();
                
                // CRITICAL DEBUG: Log final state
                logger.info('🔍 DEBUG: Final lastBusLocations state', 'component', { 
                  totalLocations: Object.keys(updates).length,
                  busIds: Object.keys(updates)
                });
                
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
  // PRODUCTION FIX: Track pending bus info fetches to avoid duplicate API calls
  const pendingBusFetches = useRef<Set<string>>(new Set());
  // Resolve a canonical busId for any incoming identifier
  const getCanonicalBusId = useCallback((incomingId: string): string => {
    // 1) If we already mapped it, return cached canonical id
    const existing = busIdAliases.current.get(incomingId);
    if (existing) return existing;

    // 2) Try direct match with loaded buses
    const direct = buses.find(b => (b as any).id === incomingId || (b as any).busId === incomingId || (b as any).bus_id === incomingId);
    if (direct) {
      const canonical = (direct as any).id || (direct as any).busId || (direct as any).bus_id || incomingId;
      busIdAliases.current.set(incomingId, canonical);
      return canonical;
    }

    // 3) Try match by bus number
    const numMatch = buses.find(b => (b as any).bus_number === incomingId || (b as any).code === incomingId || (b as any).busNumber === incomingId);
    if (numMatch) {
      const canonical = (numMatch as any).id || (numMatch as any).busId || (numMatch as any).bus_id || incomingId;
      busIdAliases.current.set(incomingId, canonical);
      return canonical;
    }

    // 4) Try any cached bus info keys
    for (const [cacheKey, cachedBus] of busInfoCache.current.entries()) {
      if (cacheKey === incomingId || String(cacheKey) === String(incomingId) || cachedBus.busNumber === incomingId) {
        busIdAliases.current.set(incomingId, cacheKey);
        return cacheKey;
      }
    }

    // 5) As a last resort, use incoming id as canonical for now
    busIdAliases.current.set(incomingId, incomingId);
    return incomingId;
  }, [buses]);
  
  // PRODUCTION FIX: Convert API Bus data to BusInfo format
  const convertBusToBusInfo = useCallback((apiBus: any): BusInfo => {
    const busId = apiBus.id || apiBus.bus_id || '';
    const currentLocation = lastBusLocations[busId];
    
    return {
      busId,
      busNumber: apiBus.bus_number || apiBus.code || `Bus ${busId.slice(0, 8)}`,
      routeName: apiBus.route_name || 'Unknown Route',
      driverName: apiBus.driver_full_name || apiBus.driver_name || 'Unknown Driver',
      driverId: apiBus.assigned_driver_profile_id || apiBus.driver_id || '',
      routeId: apiBus.route_id || '',
      currentLocation: currentLocation || {
        busId,
        driverId: apiBus.assigned_driver_profile_id || apiBus.driver_id || '',
        latitude: 0,
        longitude: 0,
        timestamp: new Date().toISOString(),
      },
    };
  }, [lastBusLocations]);

  // PRODUCTION FIX: Load buses from API on component mount
  useEffect(() => {
    const loadBuses = async () => {
      try {
        logger.info('🔄 Loading buses from API...', 'component');
        const response = await apiService.getAllBuses();
        
        if (response.success && response.data && Array.isArray(response.data)) {
          // Convert API buses to BusInfo format
          const busesInfo: BusInfo[] = response.data.map(apiBus => convertBusToBusInfo(apiBus));
          
          setBuses(busesInfo);
          logger.info('✅ Buses loaded successfully', 'component', { 
            count: busesInfo.length 
          });
          
          // Update cache with loaded buses
          busesInfo.forEach(bus => {
            const busId = bus.busId;
            busInfoCache.current.set(busId, bus);
            
            // Also cache by other possible IDs
            const apiBus = response.data.find((b: any) => 
              (b.id === busId || b.bus_id === busId) ||
              (b.bus_number === bus.busNumber || b.code === bus.busNumber)
            );
            if (apiBus) {
              const altId = (apiBus as any).id || (apiBus as any).bus_id;
              if (altId && altId !== busId) {
                busInfoCache.current.set(altId, bus);
              }
            }
          });
        } else {
          logger.warn('⚠️ No buses data received or invalid format', 'component', {
            success: response.success,
            hasData: !!response.data,
            isArray: Array.isArray(response.data)
          });
        }
      } catch (error) {
        logger.error('❌ Failed to load buses', 'component', { 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    };
    
    loadBuses();
  }, [convertBusToBusInfo]);

  // Update bus info cache when buses change
  useEffect(() => {
    buses.forEach(bus => {
      const busId = bus.busId;
      if (busId) {
        busInfoCache.current.set(busId, bus);
      }
    });
  }, [buses]);

  // CRITICAL FIX: Ultra-optimized marker update with minimal DOM manipulation
  const updateBusMarker = useCallback(
    (location: WSBusLocation) => {
      if (!map.current) return;

      // Normalize bus id to avoid duplicate markers created by aliasing
      const canonicalBusId = getCanonicalBusId(location.busId);

      // CRITICAL FIX: Use enhanced matching for bus lookup in updateBusMarker
      let bus = busInfoCache.current.get(canonicalBusId);
      
      // PRODUCTION FIX: If not found, try enhanced matching in cache
      if (!bus) {
        for (const [cacheKey, cachedBus] of busInfoCache.current.entries()) {
          const exactMatch = cacheKey === location.busId;
          const stringMatch = String(cacheKey) === String(location.busId);
          const busNumberMatch = cachedBus.busNumber === location.busId;
          const partialMatch = cacheKey.includes(location.busId) || location.busId.includes(cacheKey);
          
          if (exactMatch || stringMatch || busNumberMatch || partialMatch) {
            bus = cachedBus;
            // Record alias to canonical
            busIdAliases.current.set(location.busId, cacheKey);
            logger.info('🔍 ENHANCED DEBUG: Found bus in updateBusMarker cache using enhanced matching', 'component', {
              cacheKey: cacheKey,
              incomingBusId: location.busId,
              matchType: exactMatch ? 'exact' : stringMatch ? 'string' : busNumberMatch ? 'busNumber' : 'partial'
            });
            break;
          }
        }
      }
      
      // PRODUCTION FIX: Handle missing bus info - fetch from API on-demand
      if (!bus) {
        logger.warn('⚠️ No bus info found for location update - fetching from API', 'component', {
          busId: location.busId,
          canonicalBusId,
          lat: location.latitude,
          lng: location.longitude
        });
        
        // Create minimal bus info for immediate display
        const minimalLocation = {
          busId: location.busId,
          driverId: (location as any).driverId || '',
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: location.timestamp,
          speed: location.speed,
          heading: location.heading,
        } as BusLocation;
        
        bus = {
          busId: location.busId,
          busNumber: location.busId.slice(0, 8) + '...', // Truncated bus ID as fallback
          routeName: 'Unknown Route',
          driverName: 'Unknown Driver',
          driverId: (location as any).driverId || '',
          routeId: '',
          currentLocation: minimalLocation,
        };
        
        // Add to cache for immediate use
        busInfoCache.current.set(canonicalBusId, bus);
        busIdAliases.current.set(location.busId, canonicalBusId);
        
        // PRODUCTION FIX: Fetch bus info from API asynchronously (only if not already fetching)
        if (!pendingBusFetches.current.has(canonicalBusId)) {
          pendingBusFetches.current.add(canonicalBusId);
          
          (async () => {
            try {
              const busInfoResponse = await apiService.getBusInfo(location.busId);
              
              if (busInfoResponse.success && busInfoResponse.data) {
                // Convert API bus to BusInfo format
                const fullBusInfo = convertBusToBusInfo(busInfoResponse.data);
                
                // Update cache with full bus info
                busInfoCache.current.set(canonicalBusId, fullBusInfo);
                
                // Update buses state
                setBuses(prev => {
                  const existing = prev.find(b => b.busId === canonicalBusId);
                  if (existing) {
                    return prev.map(b => b.busId === canonicalBusId ? fullBusInfo : b);
                  } else {
                    return [...prev, fullBusInfo];
                  }
                });
                
                // Update marker popup if it exists
                const existingMarker = markers.current[canonicalBusId];
                const existingPopup = popups.current[canonicalBusId];
                if (existingMarker && existingPopup && map.current) {
                  existingPopup.setHTML(`
                    <div class="p-4 min-w-[220px]">
                      <div class="flex items-center mb-3 pb-2 border-b border-slate-200">
                        <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl mr-3">
                          🚌
                        </div>
                        <h3 class="font-bold text-slate-900 text-lg">Bus ${fullBusInfo.busNumber}</h3>
                      </div>
                      <div class="space-y-2">
                        <div class="flex items-center text-sm">
                          <span class="text-slate-500 w-16">Route:</span>
                          <span class="font-medium text-slate-900">${fullBusInfo.routeName}</span>
                        </div>
                        <div class="flex items-center text-sm">
                          <span class="text-slate-500 w-16">Driver:</span>
                          <span class="font-medium text-slate-900">${fullBusInfo.driverName}</span>
                        </div>
                        <div class="flex items-center text-xs text-slate-600 mt-3 pt-2 border-t border-slate-200">
                          <span>Last Update: ${formatTime(location.timestamp)}</span>
                        </div>
                        ${location.speed ? `
                          <div class="flex items-center justify-between mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                            <span class="text-xs font-medium text-green-700">Speed</span>
                            <span class="text-sm font-bold text-green-900">${location.speed} km/h</span>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  `);
                  logger.info('✅ Bus info fetched and marker updated', 'component', {
                    busId: location.busId,
                    routeName: fullBusInfo.routeName,
                    driverName: fullBusInfo.driverName
                  });
                }
              }
            } catch (error) {
              logger.error('❌ Failed to fetch bus info from API', 'component', {
                busId: location.busId,
                error: error instanceof Error ? error.message : String(error)
              });
            } finally {
              // Remove from pending fetches
              pendingBusFetches.current.delete(canonicalBusId);
            }
          })();
        }
      }

      // Check if marker already exists
      let marker = markers.current[canonicalBusId];

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
        const popup = popups.current[canonicalBusId];
        if (popup && bus) {
          const lastUpdate = (popup as any)._lastUpdate || 0;
          const now = Date.now();
          
          if (now - lastUpdate > 60000) { // Increased from 30000ms to 60000ms
            popup.setHTML(`
              <div class="p-4 min-w-[220px]">
                <div class="flex items-center mb-3 pb-2 border-b border-slate-200">
                  <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl mr-3">
                    🚌
                  </div>
                  <h3 class="font-bold text-slate-900 text-lg">Bus ${bus.busNumber}</h3>
                </div>
                <div class="space-y-2">
                  <div class="flex items-center text-sm">
                    <span class="text-slate-500 w-16">Route:</span>
                    <span class="font-medium text-slate-900">${bus.routeName}</span>
                  </div>
                  <div class="flex items-center text-sm">
                    <span class="text-slate-500 w-16">Driver:</span>
                    <span class="font-medium text-slate-900">${bus.driverName}</span>
                  </div>
                  <div class="flex items-center text-xs text-slate-600 mt-3 pt-2 border-t border-slate-200">
                    <span>Last Update: ${formatTime(location.timestamp)}</span>
                  </div>
                  ${location.speed ? `
                    <div class="flex items-center justify-between mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <span class="text-xs font-medium text-green-700">Speed</span>
                      <span class="text-sm font-bold text-green-900">${location.speed} km/h</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            `);
            (popup as any)._lastUpdate = now;
          }
        }
      } else {
        // Create new marker only if it doesn't exist with custom HTML element
        const el = document.createElement('div');
        el.className = 'bus-marker-container';
        el.innerHTML = `
          <div class="bus-marker-pulse"></div>
          <div class="bus-marker-icon-wrapper">
            <div class="bus-marker-icon">🚌</div>
          </div>
        `;
        el.style.width = '50px';
        el.style.height = '50px';
        
        marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([location.longitude, location.latitude])
          .addTo(map.current);

        markers.current[canonicalBusId] = marker;

        // CRITICAL FIX: Auto-center map on first active bus location
        logger.info('📍 New bus marker created - centering map', 'component', {
          busId: location.busId,
          coordinates: [location.longitude, location.latitude]
        });
        
        // Center and zoom to show the bus location
        map.current.setCenter([location.longitude, location.latitude]);
        map.current.setZoom(15); // Good zoom level for city view

        // Create popup for new marker and track it
        const popup = new maplibregl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          className: 'bus-popup-clean'
        }).setHTML(`
          <div class="p-4 min-w-[220px]">
            <div class="flex items-center mb-3 pb-2 border-b border-slate-200">
              <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl mr-3">
                🚌
              </div>
              <h3 class="font-bold text-slate-900 text-lg">Bus ${bus ? bus.busNumber : 'Unknown'}</h3>
            </div>
            <div class="space-y-2">
              <div class="flex items-center text-sm">
                <span class="text-slate-500 w-16">Route:</span>
                <span class="font-medium text-slate-900">${bus ? bus.routeName : 'Unknown'}</span>
              </div>
              <div class="flex items-center text-sm">
                <span class="text-slate-500 w-16">Driver:</span>
                <span class="font-medium text-slate-900">${bus ? bus.driverName : 'Unknown'}</span>
              </div>
              <div class="flex items-center text-xs text-slate-600 mt-3 pt-2 border-t border-slate-200">
                <span>Last Update: ${formatTime(location.timestamp)}</span>
              </div>
              ${location.speed ? `
                <div class="flex items-center justify-between mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                  <span class="text-xs font-medium text-green-700">Speed</span>
                  <span class="text-sm font-bold text-green-900">${location.speed} km/h</span>
                </div>
              ` : ''}
            </div>
          </div>
        `);
        
        marker.setPopup(popup);
        popups.current[canonicalBusId] = popup;
        (popup as any)._lastUpdate = Date.now();
      }
    },
    [getCanonicalBusId] // Use canonical mapping
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

  // Initialize map via hook
  useMapInstance({
    mapContainer,
    mapRef: map as any,
    markersRef: markers as any,
    popupsRef: popups as any,
    addedRoutesRef: addedRoutes as any,
    cleanupFunctionsRef: cleanupFunctions as any,
    mapEventListenersRef: mapEventListeners as any,
    isMapInitializedRef: isMapInitialized as any,
    eventListenersAddedRef: eventListenersAdded as any,
    setIsLoading,
    setConnectionError,
  });

  // PRODUCTION FIX: Track loading state for routes
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  
  // Load routes when component mounts (no-op until shift chosen)
  useEffect(() => {
    if (!selectedShift) {
      setRoutes([]);
      setSelectedRoute('all');
      setIsLoadingRoutes(false);
      return;
    }
    (async () => {
      setIsLoadingRoutes(true);
      try {
        logger.info('Loading routes for shift', 'StudentMap', { shiftName: selectedShift });
        const res = await apiService.getRoutesByShift({ shiftName: selectedShift });
        logger.info('Routes API response', 'StudentMap', { 
          success: res?.success, 
          dataType: Array.isArray(res?.data) ? 'array' : typeof res?.data,
          dataLength: Array.isArray(res?.data) ? res.data.length : 0,
          data: res?.data 
        });
        if (res?.success && Array.isArray(res.data)) {
          setRoutes(res.data as any);
          logger.info('Routes set successfully', 'StudentMap', { count: res.data.length, routes: res.data });
          // If current selected route isn't in list, reset to 'all'
          if (selectedRoute !== 'all' && !res.data.find(r => r.id === selectedRoute)) {
            setSelectedRoute('all');
          }
        } else {
          logger.warn('Invalid response format or empty data', 'StudentMap', { response: res });
          setRoutes([]);
          setSelectedRoute('all');
        }
      } catch (error) {
        logger.error('Failed to load routes for shift', 'StudentMap', { 
          shiftName: selectedShift, 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        setRoutes([]);
        setSelectedRoute('all');
        setConnectionError(`Failed to load routes for ${selectedShift} shift`);
      } finally {
        setIsLoadingRoutes(false);
      }
    })();
  }, [selectedShift]);

  // Load student route status when a route is selected
  useEffect(() => {
    (async () => {
      if (!selectedRoute || selectedRoute === 'all') {
        setRouteStatus(null);
        return;
      }
      try {
        const params: any = {};
        if (selectedShift) params.shiftName = selectedShift;
        const res = await apiService.getStudentRouteStatus(selectedRoute, params);
        if (res?.success) {
          setRouteStatus(res.data);
        } else {
          setRouteStatus({ tracking_active: false, stops: { completed: [], next: null, remaining: [] } });
        }
      } catch (e) {
        setRouteStatus({ tracking_active: false, stops: { completed: [], next: null, remaining: [] } });
      }
    })();
  }, [selectedRoute, selectedShift]);

  // Always load static route stops when a route is selected
  useEffect(() => {
    (async () => {
      if (!selectedRoute || selectedRoute === 'all') {
        setRouteStops([]);
        return;
      }
      try {
        const res = await apiService.getRouteStops(selectedRoute);
        if (res?.success && Array.isArray(res.data)) {
          setRouteStops(res.data);
        } else {
          setRouteStops([]);
        }
      } catch {
        setRouteStops([]);
      }
    })();
  }, [selectedRoute]);

  // Listen for driver stop updates and refresh when matching route changes
  useEffect(() => {
    const unsubscribe = onRouteStatusUpdated((routeId) => {
      if (!selectedRoute || selectedRoute === 'all') return;
      if (routeId !== selectedRoute) return;
      // Re-fetch status for current selection
      (async () => {
        try {
          const params: any = {};
          if (selectedShift) params.shiftName = selectedShift;
          const res = await apiService.getStudentRouteStatus(selectedRoute, params);
          if (res?.success) setRouteStatus(res.data);
        } catch {}
      })();
    });
    return () => unsubscribe();
  }, [selectedRoute, selectedShift]);

  // PRODUCTION FIX: Handle route stop reached events for real-time updates
  const handleRouteStopReached = useCallback((data: {
    routeId: string;
    stopId: string;
    driverId: string;
    lastStopSequence: number;
    routeStatus: {
      tracking_active: boolean;
      stops: { completed: any[]; next: any | null; remaining: any[] };
    };
    timestamp: string;
  }) => {
    logger.info('🛑 Route stop reached - updating student map', 'component', {
      routeId: data.routeId,
      selectedRoute,
      stopId: data.stopId
    });
    
    // Update route status immediately with received data
    if (data.routeStatus) {
      setRouteStatus(data.routeStatus);
    }
    
    // Also refresh route status from API to ensure consistency
    if (selectedRoute && selectedRoute !== 'all' && data.routeId === selectedRoute) {
      (async () => {
        try {
          const params: any = {};
          if (selectedShift) params.shiftName = selectedShift;
          const res = await apiService.getStudentRouteStatus(selectedRoute, params);
          if (res?.success && res.data) {
            setRouteStatus(res.data);
            logger.info('✅ Route status refreshed after stop reached', 'component');
          }
        } catch (error) {
          logger.error('❌ Error refreshing route status after stop reached', 'component', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      })();
    }
  }, [selectedRoute, selectedShift]);

  // WebSocket bindings via hook
  useStudentMapWebSocketBindings({
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

  // PRODUCTION FIX: Track route colors for consistent highlighting
  const routeColorsMap = useRef<Map<string, string>>(new Map());
  
  // Add routes to map when routes are loaded - ONLY ADD NEW ROUTES
  const routesProcessed = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (routes.length > 0 && map.current && map.current.isStyleLoaded()) {
      // Only add routes that haven't been added yet
      routes.forEach((route, index) => {
        if (!routesProcessed.current.has(route.id) && !addedRoutes.current.has(route.id)) {
          // Add individual route
          if (map.current && !map.current.getSource(`route-${route.id}`)) {
            try {
              const coords = (route as any).coordinates || 
                             (route as any).geom?.coordinates || 
                             (route as any).stops?.coordinates ||
                             null;
              
              if (coords && coords.length > 0) {
                // PRODUCTION FIX: Generate distinct color for each route
                const routeColor = getRouteColor(route.id, index);
                routeColorsMap.current.set(route.id, routeColor);
                
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

                // PRODUCTION FIX: Add route layer with distinct color
                map.current.addLayer({
                  id: `route-${route.id}`,
                  type: 'line',
                  source: `route-${route.id}`,
                  layout: { 
                    'line-join': 'round', 
                    'line-cap': 'round',
                    'visibility': 'visible'
                  },
                  paint: {
                    'line-color': routeColor,
                    'line-width': 4,
                    'line-opacity': selectedRoute === 'all' || selectedRoute === route.id ? 0.9 : 0.3, // Dim unselected routes
                  },
                });

                // PRODUCTION FIX: Add click handler for route info
                map.current.on('click', `route-${route.id}`, (e: any) => {
                  const routeName = e.features[0]?.properties?.name || route.name;
                  new maplibregl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(`
                      <div class="p-3">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">${routeName}</h3>
                        <div class="space-y-1 text-sm text-slate-600">
                          ${route.description ? `<p>${route.description}</p>` : ''}
                          ${(route as any).distance_km ? `<p>📏 Distance: ${(route as any).distance_km} km</p>` : ''}
                          ${(route as any).estimated_duration_minutes ? `<p>⏱️ Duration: ${(route as any).estimated_duration_minutes} min</p>` : ''}
                        </div>
                      </div>
                    `)
                    .addTo(map.current!);
                });

                // PRODUCTION FIX: Change cursor on hover
                map.current.on('mouseenter', `route-${route.id}`, () => {
                  if (map.current) {
                    map.current.getCanvas().style.cursor = 'pointer';
                  }
                });

                map.current.on('mouseleave', `route-${route.id}`, () => {
                  if (map.current) {
                    map.current.getCanvas().style.cursor = '';
                  }
                });

                addedRoutes.current.add(route.id);
                routesProcessed.current.add(route.id);
                
                logger.info('✅ Route added to map', 'component', { 
                  routeId: route.id, 
                  routeName: route.name,
                  color: routeColor,
                  coordinatesCount: coords.length 
                });
              } else {
                logger.warn('⚠️ Route has no coordinates', 'component', { 
                  routeId: route.id, 
                  routeName: route.name 
                });
              }
            } catch (error) {
              logger.warn('Warning', 'component', { data: `⚠️ Error adding route ${route.name}:`, error });
            }
          }
        }
      });
    }
  }, [routes, selectedRoute]);

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
      // Apply maxBuses limit and filter by route
      const maxBuses = finalConfig.maxBuses;
      const busesToCheck = busesWithLiveLocations.slice(0, maxBuses);
      const filteredBuses = busesToCheck.filter(bus => {
        const busRouteId = (bus as any).routeId || (bus as any).route_id;
        return busRouteId === selectedRoute;
      });
      
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
          const bus = buses.find(b => {
            const bId = (b as any).id || (b as any).bus_id;
            const bRouteId = (b as any).routeId || (b as any).route_id;
            return bId === busId && bRouteId === selectedRoute;
          });
          
          if (bus) {
            targetBusId = busId;
            targetLocation = location;
            logger.info('✅ Found bus from buses array', 'component', { busId, routeId: selectedRoute });
            break;
          }
          
          // Also check cached bus
          const cachedBus = busInfoCache.current.get(busId);
          if (cachedBus) {
            const busRouteId = (cachedBus as any).routeId || (cachedBus as any).route_id;
            if (busRouteId === selectedRoute) {
              targetBusId = busId;
              targetLocation = location;
              logger.info('✅ Found bus from cache', 'component', { busId, routeId: selectedRoute });
              break;
            }
          }
        }
      }
    }

    if (!targetBusId || !targetLocation) {
      // Calculate filtered buses count for logging
      const maxBuses = finalConfig.maxBuses;
      const busesToCheck = busesWithLiveLocations.slice(0, maxBuses);
      const filteredBusesCount = busesToCheck.filter(bus => {
        const busRouteId = (bus as any).routeId || (bus as any).route_id;
        return busRouteId === selectedRoute;
      }).length;
      
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
  const displayBuses = useMemo(() => {
    if (selectedRoute === 'all') return limitedBuses;
    return limitedBuses.filter(bus => {
      const busRouteId = (bus as any).routeId || (bus as any).route_id;
      return busRouteId === selectedRoute;
    });
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
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [busId, location] of Object.entries(lastBusLocations)) {
      const lastUpdate = new Date(location.timestamp).getTime();
      if (lastUpdate > fiveMinutesAgo) {
        // Check if this bus belongs to the selected route
        const bus = buses.find(b => {
          const bId = (b as any).id || (b as any).bus_id;
          const bRouteId = (b as any).routeId || (b as any).route_id;
          return bId === busId && bRouteId === selectedRoute;
        });
        if (bus) return true;
        
        // Also check cached bus
        const cachedBus = busInfoCache.current.get(busId);
        if (cachedBus && 
            ((cachedBus as any).routeId === selectedRoute || (cachedBus as any).route_id === selectedRoute)) {
          return true;
        }
      }
    }
    
    return false;
  }, [selectedRoute, routeStatus, displayBuses, lastBusLocations, buses]);

  // PRODUCTION FIX: Update route visibility and opacity based on selection
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    routes.forEach((route) => {
      const layerId = `route-${route.id}`;
      if (map.current && map.current.getLayer(layerId)) {
        const isSelected = selectedRoute === 'all' || selectedRoute === route.id;
        map.current.setPaintProperty(layerId, 'line-opacity', isSelected ? 0.9 : 0.3);
        map.current.setPaintProperty(layerId, 'line-width', isSelected ? 5 : 3);
      }
    });
  }, [selectedRoute, routes]);

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

  // Subscribe to selected route updates via WebSocket and add polling fallback
  useEffect(() => {
    // Only when a specific route is selected
    if (!finalConfig.enableRealTime || !selectedRoute || selectedRoute === 'all') {
      return;
    }

    // Subscribe to route updates
    try {
      unifiedWebSocketService.subscribeToRoutes([selectedRoute]);
      logger.info('📡 Subscribed to route updates', 'StudentMap', { routeId: selectedRoute });
    } catch (e) {
      logger.warn('⚠️ Failed to subscribe to route updates', 'StudentMap', { error: e instanceof Error ? e.message : String(e) });
    }

    // Polling fallback for route status (in case WS events are not received)
    const POLL_INTERVAL = environment.performance.locationUpdateInterval;
    const poller = setInterval(async () => {
      try {
        const params: any = {};
        if (selectedShift) params.shiftName = selectedShift;
        const res = await apiService.getStudentRouteStatus(selectedRoute, params);
        if (res?.success) setRouteStatus(res.data);
      } catch {
        // Ignore polling errors
      }
    }, POLL_INTERVAL);

    return () => {
      // Cleanup
      clearInterval(poller);
      try {
        unifiedWebSocketService.unsubscribeFromRoutes([selectedRoute]);
        logger.info('📴 Unsubscribed from route updates', 'StudentMap', { routeId: selectedRoute });
      } catch (e) {
        // Ignore unsubscribe errors
      }
    };
  }, [finalConfig.enableRealTime, selectedRoute, selectedShift]);

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
        />

        {/* Right Side - Map Container */}
        <div className="flex-1 h-full relative">
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
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
              <div className="text-slate-900 text-center">
                <div className="loading-spinner mx-auto mb-4" />
                <p className="font-medium">Loading map...</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {connectionError && (
            <div className="absolute top-4 right-4 z-10">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-red-900">
                      Connection Error
                    </h3>
                    <p className="text-sm text-red-700 mt-1">{connectionError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Route status panel for students */}
          <RouteStatusPanel
            selectedRoute={selectedRoute}
            selectedShift={selectedShift}
            routeStatus={routeStatus as any}
            routeStops={routeStops as any}
            onRefresh={async () => {
                      try {
                        const params: any = {};
                        if (selectedShift) params.shiftName = selectedShift;
                        const res = await apiService.getStudentRouteStatus(selectedRoute, params);
                        if (res?.success) setRouteStatus(res.data);
                        const stopsRes = await apiService.getRouteStops(selectedRoute);
                        if (stopsRes?.success) setRouteStops(stopsRes.data);
                      } catch {}
                    }}
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