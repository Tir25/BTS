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
        logger.info('🔌 Initializing WebSocket connection for live bus updates...', 'component', { busCount: loadedBuses.length });
        unifiedWebSocketService.setClientType('student');
        await unifiedWebSocketService.connect();
        logger.info('✅ WebSocket connection established for student map', 'component');
      } catch (error) {
        const wsError = errorHandler.handleError(error, 'StudentMap-WebSocketInit');
        logger.error('WebSocket connection error', 'component', { error: wsError.message, code: wsError.code });
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

    handleBusLocationUpdateRef.current = (location: WSBusLocation) => {
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
      p.setLastBusLocations(prev => ({ ...prev, [canonicalBusId]: busLocation }));
      p.debouncedLocationUpdate(location);
      p.updateBusMarker({ ...location, busId: canonicalBusId });
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
      p.websocketCleanupFunctions.current.forEach(unsubscribe => { try { unsubscribe(); } catch {} });
      p.websocketCleanupFunctions.current = [];
      logger.info('🧹 StudentMap WebSocket listener cleanup complete', 'component');
    };
    p.cleanupFunctions.current.push(cleanup);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.enabled]);
}


