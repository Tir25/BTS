/**
 * Hook for managing route status and stops
 */
import { useEffect, useState, useCallback } from 'react';
import { logger } from '../../../utils/logger';
import { apiService } from '../../../api';
import { onRouteStatusUpdated } from '../../../services/RouteStatusEvents';
import environment from '../../../config/environment';
import { unifiedWebSocketService } from '../../../services/UnifiedWebSocketService';

export interface UseRouteStatusManagementProps {
  selectedRoute: string;
  selectedShift: 'Day' | 'Afternoon' | '';
  enableRealTime: boolean;
}

export interface RouteStatus {
  tracking_active: boolean;
  stops: {
    completed: any[];
    next: any | null;
    remaining: any[];
  };
  session?: {
    bus_id?: string;
    [key: string]: any;
  };
}

/**
 * Manages route status, stops, and real-time updates
 */
export function useRouteStatusManagement({
  selectedRoute,
  selectedShift,
  enableRealTime,
}: UseRouteStatusManagementProps): {
  routeStatus: RouteStatus | null;
  setRouteStatus: (status: RouteStatus | null) => void;
  routeStops: Array<{ id: string; name?: string; sequence: number }>;
  setRouteStops: (stops: Array<{ id: string; name?: string; sequence: number }>) => void;
  handleRouteStopReached: (data: {
    routeId: string;
    stopId: string;
    driverId: string;
    lastStopSequence: number;
    routeStatus: RouteStatus;
    timestamp: string;
  }) => void;
  refreshRouteStatus: () => Promise<void>;
} {
  const [routeStatus, setRouteStatus] = useState<RouteStatus | null>(null);
  const [routeStops, setRouteStops] = useState<Array<{ id: string; name?: string; sequence: number }>>([]);

  // Load route status when route is selected
  useEffect(() => {
    (async () => {
      if (!selectedRoute || selectedRoute === 'all') {
        setRouteStatus(null);
        setRouteStops([]);
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

  // Load route stops when route is selected
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

  // Handle route stop reached events
  const handleRouteStopReached = useCallback((data: {
    routeId: string;
    stopId: string;
    driverId: string;
    lastStopSequence: number;
    routeStatus: RouteStatus;
    timestamp: string;
  }) => {
    logger.info('🛑 Route stop reached - updating student map', 'useRouteStatusManagement', {
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
            logger.info('✅ Route status refreshed after stop reached', 'useRouteStatusManagement');
          }
        } catch (error) {
          logger.error('❌ Error refreshing route status after stop reached', 'useRouteStatusManagement', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      })();
    }
  }, [selectedRoute, selectedShift]);

  // Refresh route status
  const refreshRouteStatus = useCallback(async () => {
    if (!selectedRoute || selectedRoute === 'all') return;
    
    try {
      const params: any = {};
      if (selectedShift) params.shiftName = selectedShift;
      const res = await apiService.getStudentRouteStatus(selectedRoute, params);
      if (res?.success) {
        setRouteStatus(res.data);
      }
      const stopsRes = await apiService.getRouteStops(selectedRoute);
      if (stopsRes?.success) {
        setRouteStops(stopsRes.data);
      }
    } catch (error) {
      logger.error('Error refreshing route status', 'useRouteStatusManagement', { error });
    }
  }, [selectedRoute, selectedShift]);

  // Subscribe to selected route updates via WebSocket and add polling fallback
  useEffect(() => {
    // Only when a specific route is selected
    if (!enableRealTime || !selectedRoute || selectedRoute === 'all') {
      return;
    }

    // Subscribe to route updates
    try {
      unifiedWebSocketService.subscribeToRoutes([selectedRoute]);
      logger.info('📡 Subscribed to route updates', 'useRouteStatusManagement', { routeId: selectedRoute });
    } catch (e) {
      logger.warn('⚠️ Failed to subscribe to route updates', 'useRouteStatusManagement', { 
        error: e instanceof Error ? e.message : String(e) 
      });
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
        logger.info('📴 Unsubscribed from route updates', 'useRouteStatusManagement', { routeId: selectedRoute });
      } catch (e) {
        // Ignore unsubscribe errors
      }
    };
  }, [enableRealTime, selectedRoute, selectedShift]);

  return {
    routeStatus,
    setRouteStatus,
    routeStops,
    setRouteStops,
    handleRouteStopReached,
    refreshRouteStatus,
  };
}

