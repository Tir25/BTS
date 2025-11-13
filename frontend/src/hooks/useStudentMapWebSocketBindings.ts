import { useEffect, useRef } from 'react';
import { unifiedWebSocketService, BusLocation as WSBusLocation } from '../services/UnifiedWebSocketService';
import { apiService } from '../api';
import { logger } from '../utils/logger';
import { errorHandler } from '../utils/errorHandler';
import { BusInfo } from '../services/busService';

interface Params {
  enabled: boolean;
  setIsConnected: (v: boolean) => void;
  setConnectionStatus: (v: 'connected' | 'connecting' | 'disconnected' | 'reconnecting') => void;
  setConnectionError: (msg: string | null) => void;
  setBuses: (buses: BusInfo[]) => void;
  buses: BusInfo[];
  lastBusLocations: Record<string, any>;
  setLastBusLocations: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  debouncedLocationUpdate: (loc: WSBusLocation) => void;
  updateBusMarker: (loc: any) => void;
  getCanonicalBusId: (id: string) => string;
  busInfoCache: React.MutableRefObject<Map<string, BusInfo>>;
  websocketCleanupFunctions: React.MutableRefObject<Array<() => void>>;
  cleanupFunctions: React.MutableRefObject<Array<() => void>>;
  selectedRoute: string;
  selectedShift: '' | 'Day' | 'Afternoon';
  // PRODUCTION FIX: Add route status update callback
  onRouteStopReached?: (data: {
    routeId: string;
    stopId: string;
    driverId: string;
    lastStopSequence: number;
    routeStatus: {
      tracking_active: boolean;
      stops: { completed: any[]; next: any | null; remaining: any[] };
    };
    timestamp: string;
  }) => void;
  // CRITICAL FIX: Add flag to indicate if StudentMap is used in driver mode
  // When true, StudentMap should NOT create its own WebSocket connection
  // Instead, it should use the existing driver WebSocket connection
  isDriverMode?: boolean;
}

export function useStudentMapWebSocketBindings(p: Params) {
  const handleBusLocationUpdateRef = useRef<(location: WSBusLocation) => void>();
  const handleDriverConnectedRef = useRef<(data: any) => void>();
  const handleDriverDisconnectedRef = useRef<(data: any) => void>();
  const handleBusArrivingRef = useRef<(data: any) => void>();

  useEffect(() => {
    if (!p.enabled) return;
    let isMounted = true;

    const loadBusData = async (): Promise<BusInfo[]> => {
      try {
        logger.info('🔄 Loading initial bus data from API...', 'component');
        const response = await apiService.getAllBuses();
        if (response.success && Array.isArray(response.data)) {
          const busInfos: BusInfo[] = response.data.map((bus: any) => ({
            busId: bus.id,
            busNumber: bus.bus_number || bus.code || `Bus ${bus.id}`,
            routeName: bus.route_name || 'Route TBD',
            driverName: bus.driver_full_name || 'Driver TBD',
            driverId: bus.assigned_driver_profile_id || '',
            routeId: bus.route_id || '',
            currentLocation: { busId: bus.id, driverId: bus.assigned_driver_profile_id || '', latitude: 0, longitude: 0, timestamp: new Date().toISOString() },
          }));
          p.setBuses(busInfos);
          // Sync pending locations
          const pendingLocations = Object.values(p.lastBusLocations);
          if (pendingLocations.length > 0) {
            pendingLocations.forEach((location: any) => {
              const matchingBus = busInfos.find((b) => b.busId === location.busId);
              if (matchingBus) requestAnimationFrame(() => p.updateBusMarker(location));
            });
          }
          return busInfos;
        }
        p.setBuses([]);
        return [];
      } catch (error) {
        const busError = errorHandler.handleError(error, 'StudentMap-loadBuses');
        logger.error('Bus loading error', 'component', { error: busError.message, code: busError.code });
        p.setBuses([]);
        p.setConnectionError(busError.userMessage || 'Failed to load bus data');
        return [];
      }
    };

    const initializeWebSocket = async (loadedBuses: BusInfo[]) => {
      try {
        // CRITICAL FIX: If in driver mode, skip creating a new WebSocket connection
        // The driver WebSocket connection already exists and can be used for bus location updates
        if (p.isDriverMode) {
          logger.info('🚌 StudentMap in driver mode - using existing driver WebSocket connection', 'component', { 
            busCount: loadedBuses.length,
            note: 'Will listen to bus location updates from driver WebSocket connection'
          });
          
          // CRITICAL FIX: Import connectionManager to check client type
          const { connectionManager } = await import('../services/websocket/connectionManager');
          const currentClientType = connectionManager.getClientType();
          const connectionStatus = unifiedWebSocketService.getConnectionStatus();
          
          // If already connected as driver, use it
          if (connectionStatus && currentClientType === 'driver') {
            logger.info('✅ Driver WebSocket connection available for StudentMap', 'component', {
              clientType: currentClientType,
              isConnected: connectionStatus
            });
            p.setIsConnected(true);
            p.setConnectionStatus('connected');
            return;
          } 
          // If connected but not as driver, we need to wait for driver connection
          // This shouldn't happen in normal flow, but handle it gracefully
          else if (connectionStatus && currentClientType !== 'driver') {
            logger.warn('⚠️ WebSocket connected but not as driver - StudentMap will wait for driver connection', 'component', {
              currentClientType,
              note: 'This may indicate a race condition - driver connection should be established first'
            });
            p.setConnectionStatus('connecting');
            // Wait for driver connection (max 10 seconds)
            let attempts = 0;
            const maxAttempts = 100; // 100 * 100ms = 10 seconds
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 100));
              const newClientType = connectionManager.getClientType();
              const newConnectionStatus = unifiedWebSocketService.getConnectionStatus();
              if (newConnectionStatus && newClientType === 'driver') {
                logger.info('✅ Driver WebSocket connection established - StudentMap ready', 'component');
                p.setIsConnected(true);
                p.setConnectionStatus('connected');
                return;
              }
              attempts++;
            }
            logger.warn('⚠️ Driver WebSocket connection timeout - StudentMap will continue without live updates', 'component');
            p.setConnectionStatus('disconnected');
            return;
          } 
          // Not connected yet - wait for driver connection
          else {
            logger.warn('⚠️ Driver WebSocket not connected yet - StudentMap will wait for connection', 'component');
            p.setConnectionStatus('connecting');
            // Wait for driver connection (max 10 seconds)
            let attempts = 0;
            const maxAttempts = 100; // 100 * 100ms = 10 seconds
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 100));
              const newClientType = connectionManager.getClientType();
              const newConnectionStatus = unifiedWebSocketService.getConnectionStatus();
              if (newConnectionStatus && newClientType === 'driver') {
                logger.info('✅ Driver WebSocket connection established - StudentMap ready', 'component');
                p.setIsConnected(true);
                p.setConnectionStatus('connected');
                return;
              }
              attempts++;
            }
            logger.warn('⚠️ Driver WebSocket connection timeout - StudentMap will continue without live updates', 'component');
            p.setConnectionStatus('disconnected');
            return;
          }
        }
        
        logger.info('🔌 Initializing WebSocket connection for live bus updates...', 'component', { busCount: loadedBuses.length });
        
        // CRITICAL FIX: Set client type BEFORE connecting to prevent race conditions
        unifiedWebSocketService.setClientType('student');
        
        // CRITICAL FIX: Check if already connected with correct client type
        const connectionStatus = unifiedWebSocketService.getConnectionStatus();
        if (connectionStatus) {
          logger.info('✅ WebSocket already connected for student map', 'component');
          return;
        }
        
        await unifiedWebSocketService.connect();
        logger.info('✅ WebSocket connection established for student map', 'component');
      } catch (error) {
        // PRODUCTION FIX: Log full error details before processing
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = (error as any)?.code || '';
        const errorStack = error instanceof Error ? error.stack : undefined;
        const isAuthError = (error as any)?.isAuthError || false;
        const isNetworkError = (error as any)?.isNetworkError || false;
        
        // PRODUCTION FIX: Log to console for visibility
        console.error('❌ StudentMap WebSocket connection error:', {
          message: errorMessage,
          code: errorCode,
          isAuthError,
          isNetworkError,
          error: error instanceof Error ? error : String(error),
          stack: errorStack,
          fullError: error
        });
        
        const wsError = errorHandler.handleError(error, 'StudentMap-WebSocketInit');
        logger.error('WebSocket connection error', 'component', { 
          error: wsError.message, 
          code: wsError.code,
          originalError: errorMessage,
          originalCode: errorCode,
          isAuthError,
          isNetworkError,
          stack: errorStack
        });
        p.setConnectionError(wsError.userMessage || 'Failed to connect to live updates');
      }
    };

    const initializeSequentially = async () => {
      try {
        const loadedBuses = await loadBusData();
        if (!isMounted) return;
        await initializeWebSocket(loadedBuses);
      } catch (error) {
        const initError = errorHandler.handleError(error, 'StudentMap-SequentialInit');
        logger.error('Sequential initialization error', 'component', { error: initError.message, code: initError.code });
        p.setConnectionError(initError.userMessage || 'Failed to initialize map components');
      }
    };

    initializeSequentially();

    // CRITICAL FIX: Optimized handler for concurrent location updates from multiple drivers
    // Uses requestAnimationFrame to batch updates and prevent blocking the main thread
    handleBusLocationUpdateRef.current = (location: WSBusLocation) => {
      // Use requestAnimationFrame to batch concurrent updates efficiently
      requestAnimationFrame(() => {
        if (!isMounted) return;
        
        const canonicalBusId = p.getCanonicalBusId(location.busId);
        const busLocation: any = {
          busId: canonicalBusId,
          driverId: (location as any).driverId || '',
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: location.timestamp,
          speed: location.speed,
          heading: location.heading,
        };
        
        // CRITICAL FIX: Batch state updates for concurrent location updates
        // React will batch these automatically, but we ensure atomic updates
        p.setLastBusLocations(prev => {
          // Only update if this location is newer than existing one
          const existing = prev[canonicalBusId];
          if (existing && existing.timestamp && location.timestamp) {
            const existingTime = new Date(existing.timestamp).getTime();
            const newTime = new Date(location.timestamp).getTime();
            if (newTime <= existingTime) {
              // Older location, skip update
              return prev;
            }
          }
          return { ...prev, [canonicalBusId]: busLocation };
        });
        
        // Debounced update for API sync (handles multiple concurrent updates)
        p.debouncedLocationUpdate(location);
        
        // Update marker asynchronously to prevent blocking
        requestAnimationFrame(() => {
          if (isMounted) {
            p.updateBusMarker({ ...location, busId: canonicalBusId });
          }
        });
        
        // Update cache if needed (non-blocking)
        if (!p.busInfoCache.current.get(canonicalBusId)) {
          p.busInfoCache.current.set(canonicalBusId, {
            busId: canonicalBusId,
            busNumber: `Bus ${canonicalBusId.slice(0, 8)}...`,
            routeName: 'Loading...',
            driverName: 'Loading...',
            driverId: (location as any).driverId || '',
            routeId: '',
            currentLocation: busLocation,
          } as any);
        }
      });
    };

    handleDriverConnectedRef.current = (data: any) => { logger.debug('🚌 Driver connected:', 'component', { data }); };
    handleDriverDisconnectedRef.current = (data: any) => { logger.debug('🚌 Driver disconnected:', 'component', { data }); };
    handleBusArrivingRef.current = (data: any) => { logger.debug('🚌 Bus arriving:', 'component', { data }); };

    const unsubscribeConnectionState = unifiedWebSocketService.onConnectionStateChange((state) => {
      if (!isMounted) return;
      p.setIsConnected(state.isConnected);
      p.setConnectionStatus(state.isConnected ? 'connected' : 'disconnected');
      if (state.error) p.setConnectionError(state.error); else if (state.isConnected) p.setConnectionError(null);
    });
    const unsubscribeBusLocation = unifiedWebSocketService.onBusLocationUpdate((location) => handleBusLocationUpdateRef.current?.(location));
    const unsubscribeDriverConnected = unifiedWebSocketService.onDriverConnected((data) => handleDriverConnectedRef.current?.(data));
    const unsubscribeDriverDisconnected = unifiedWebSocketService.onDriverDisconnected((data) => handleDriverDisconnectedRef.current?.(data));
    const unsubscribeBusArriving = unifiedWebSocketService.onBusArriving((data) => handleBusArrivingRef.current?.(data));
    
    // PRODUCTION FIX: Listen for route stop reached events to update student map in real-time
    const unsubscribeRouteStopReached = unifiedWebSocketService.onRouteStopReached((data) => {
      if (!isMounted) return;
      logger.info('🛑 Route stop reached event received in student map', 'component', {
        routeId: data.routeId,
        selectedRoute: p.selectedRoute,
        stopId: data.stopId
      });
      
      // Only update if the stop is for the currently selected route
      if (p.selectedRoute && p.selectedRoute !== 'all' && data.routeId === p.selectedRoute) {
        if (p.onRouteStopReached) {
          p.onRouteStopReached(data);
        }
      }
    });

    p.websocketCleanupFunctions.current = [
      unsubscribeConnectionState,
      unsubscribeBusLocation,
      unsubscribeDriverConnected,
      unsubscribeDriverDisconnected,
      unsubscribeBusArriving,
      unsubscribeRouteStopReached,
    ];

    const cleanup = () => {
      isMounted = false;
      p.websocketCleanupFunctions.current.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch (error) {
          logger.warn('Failed to unsubscribe StudentMap WebSocket listener.', 'StudentMapWebSocketBindings', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
      p.websocketCleanupFunctions.current = [];
      logger.info('🧹 StudentMap WebSocket listener cleanup complete', 'component');
    };
    p.cleanupFunctions.current.push(cleanup);
    return cleanup;
     
  }, [p.enabled, p.isDriverMode]); // CRITICAL FIX: Include isDriverMode in dependencies
}


