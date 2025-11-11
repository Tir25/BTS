import React, { useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverInterface, useDriverInterfaceActions, useDriverStatus } from '../stores/useDriverInterfaceStore';
// Removed unused bridge hooks to prevent infinite loops
import { useDriverAuth } from '../context/DriverAuthContext';
import { useDriverTracking } from '../hooks/useDriverTracking';
import { unifiedWebSocketService } from '../services/UnifiedWebSocketService';
import { authService } from '../services/authService';
import DriverHeader from './driver/DriverHeader';
import StudentMap from './StudentMap';
import DriverControls from './driver/DriverControls';
import DriverInstructions from './driver/DriverInstructions';
import DriverStops from './driver/DriverStops';
import DriverLogin from './DriverLogin';
// Removed old DriverErrorBoundary - using new DriverDashboardErrorBoundary
import DriverDashboardErrorBoundary from './error/DriverDashboardErrorBoundary';
import { logger } from '../utils/logger';
import { errorHandler, CustomError, createNetworkError } from '../utils/errorHandler';
import { useUnifiedLoadingState } from '../hooks/useUnifiedLoadingState';
import { formatTime } from '../utils/dateFormatter';
import { notifySuccess, notifyError, notifyWarning } from '../utils/notifications';
import DriverStatusCards from './driver/DriverStatusCards';
import DriverMapSection from './driver/DriverMapSection';
import { useDriverInitialization } from '../hooks/useDriverInitialization';

import './DriverInterface.css';
import './DriverDashboard.css';
import { 
  BusInfo, 
  UnifiedDriverInterfaceProps,
  DriverLocationData 
} from '../types/driver';

const formatShiftLabel = (
  name?: string | null,
  start?: string | null,
  end?: string | null
): string | null => {
  if (!name && !start && !end) return null;
  const normalizeTime = (time?: string | null) => {
    if (!time) return null;
    return time.length >= 5 ? time.slice(0, 5) : time;
  };
  const startFormatted = normalizeTime(start);
  const endFormatted = normalizeTime(end);
  if (startFormatted && endFormatted) {
    return name ? `${name} (${startFormatted} - ${endFormatted})` : `${startFormatted} - ${endFormatted}`;
  }
  if (name) return name;
  if (startFormatted || endFormatted) {
    return [startFormatted, endFormatted].filter(Boolean).join(' - ') || null;
  }
  return null;
};

const UnifiedDriverInterface: React.FC<UnifiedDriverInterfaceProps> = memo(({ 
  mode = 'login' 
}) => {
  const navigate = useNavigate();
  
  // Unified loading state management
  const loadingState = useUnifiedLoadingState({
    onPhaseChange: (phase) => {
      logger.debug('Loading phase changed', 'UnifiedDriverInterface', { phase });
    },
    onComplete: () => {
      logger.info('Driver interface initialization complete', 'UnifiedDriverInterface');
    },
    onError: (error) => {
      logger.error('Loading error in driver interface', 'UnifiedDriverInterface', { error });
    },
  });
  
  // New state management stores
  const driverState = useDriverInterface();
  const driverActions = useDriverInterfaceActions();
  
  // Simplified bridge that only syncs essential data without causing infinite loops
  const { busAssignment, isAuthenticated, isWebSocketConnected, isWebSocketAuthenticated, isWebSocketInitializing, error, logout, retryConnection, refreshAssignment } = useDriverAuth();
  
  // NEW: Simplified tracking hook with driver and bus IDs
  const tracking = useDriverTracking(
    isAuthenticated, 
    isWebSocketConnected, 
    isWebSocketAuthenticated,
    busAssignment?.driver_id,
    busAssignment?.bus_id
  );

  // Stops state from backend assignment
  // PRODUCTION FIX: Enhanced stops loading with route information
  const [stopsState, setStopsState] = React.useState<{ completed: any[]; next: any | null; remaining: any[] } | null>(null);
  const [currentShiftName, setCurrentShiftName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!busAssignment) {
      setCurrentShiftName(null);
      return;
    }
    setCurrentShiftName(
      formatShiftLabel(
        busAssignment.shift_name,
        busAssignment.shift_start_time,
        busAssignment.shift_end_time
      )
    );
  }, [
    busAssignment?.shift_name,
    busAssignment?.shift_start_time,
    busAssignment?.shift_end_time,
    busAssignment?.bus_id
  ]);

  const refreshStops = React.useCallback(async () => {
    if (!isAuthenticated || !busAssignment) {
      logger.debug('Cannot refresh stops: not authenticated or no assignment', 'UnifiedDriverInterface', {
        isAuthenticated,
        hasAssignment: !!busAssignment
      });
      return;
    }
    
    try {
      logger.info('🔄 Refreshing stops and route information', 'UnifiedDriverInterface', {
        driverId: busAssignment.driver_id,
        routeId: busAssignment.route_id,
        routeName: busAssignment.route_name
      });
      
      const { apiService } = await import('../api');
      const res = await apiService.getDriverAssignmentWithStops(busAssignment.driver_id);
      
      if (res?.success && res.data) {
        // PRODUCTION FIX: Enhanced logging and validation
        const stopsData = res.data.stops;
        logger.info('✅ Stops data received', 'UnifiedDriverInterface', {
          hasStops: !!stopsData,
          completed: stopsData?.completed?.length || 0,
          remaining: stopsData?.remaining?.length || 0,
          hasNext: !!stopsData?.next,
          nextStopName: stopsData?.next?.name,
          stopsData: JSON.stringify(stopsData)
        });
        
        // PRODUCTION FIX: Validate stops data structure
        if (!stopsData || typeof stopsData !== 'object') {
          logger.error('❌ Invalid stops data structure', 'UnifiedDriverInterface', {
            stopsData,
            type: typeof stopsData
          });
        } else {
          setStopsState(stopsData);
          setCurrentShiftName(
            formatShiftLabel(
              res.data.shift_name,
              res.data.shift_start_time,
              res.data.shift_end_time
            )
          );
          
          driverActions.updateBusAssignment?.({
            ...busAssignment,
            shift_id: res.data.shift_id ?? busAssignment.shift_id ?? null,
            shift_name: res.data.shift_name ?? busAssignment.shift_name ?? null,
            shift_start_time: res.data.shift_start_time ?? busAssignment.shift_start_time ?? null,
            shift_end_time: res.data.shift_end_time ?? busAssignment.shift_end_time ?? null,
          });
          
          // PRODUCTION FIX: Update route information if provided
          if (res.data.route_name && !busAssignment.route_name) {
            logger.info('✅ Route name updated from assignment API', 'UnifiedDriverInterface', {
              routeName: res.data.route_name
            });
          }
          
          logger.info('✅ Stops state updated successfully', 'UnifiedDriverInterface', {
            completedCount: stopsData.completed?.length || 0,
            remainingCount: stopsData.remaining?.length || 0,
            hasNext: !!stopsData.next,
            nextStopId: stopsData.next?.id,
            nextStopName: stopsData.next?.name
          });
        }
      } else {
        logger.warn('⚠️ Failed to refresh stops', 'UnifiedDriverInterface', {
          error: res?.error,
          success: res?.success,
          data: res?.data,
          driverId: busAssignment.driver_id,
          routeId: busAssignment.route_id
        });
        // PRODUCTION FIX: Clear stops state on error to prevent stale data
        // Only clear if we have a definitive error (not just missing data)
        if (res?.error && !res.error.includes('No assignment found')) {
          setStopsState({ completed: [], next: null, remaining: [] });
        }
        
        // PRODUCTION FIX: Show user-friendly message for drivers without assignment
        if (res?.error?.includes('No assignment found')) {
          logger.info('Driver has no assignment', 'UnifiedDriverInterface', {
            driverId: busAssignment.driver_id,
            message: 'Driver needs to be assigned to a bus and route by admin'
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = (error as any)?.status;
      const errorCode = (error as any)?.code;
      
      // PRODUCTION FIX: Handle specific error cases - reduce error spam
      if (statusCode === 401 || errorCode === 'MISSING_TOKEN' || errorCode === 'INVALID_TOKEN') {
        // Authentication error - log at debug level (expected during initialization)
        logger.debug('Authentication error while fetching stops (may be expected)', 'UnifiedDriverInterface', {
          driverId: busAssignment?.driver_id,
          error: errorMessage,
          status: statusCode,
          code: errorCode
        });
      } else if (statusCode === 404 || errorMessage.includes('No assignment found')) {
        // No assignment found - this is expected for drivers without assignment
        logger.debug('Driver has no assignment (expected)', 'UnifiedDriverInterface', {
          driverId: busAssignment?.driver_id,
          message: 'Driver needs to be assigned to a bus and route by admin'
        });
        setStopsState({ completed: [], next: null, remaining: [] });
      } else if (errorMessage.includes('fetch') || 
                 errorMessage.includes('network') || 
                 errorMessage.includes('Failed to fetch')) {
        // Network error - log at warn level (not error, as it may be temporary)
        logger.warn('⚠️ Network error while fetching stops', 'UnifiedDriverInterface', {
          error: errorMessage,
          driverId: busAssignment?.driver_id,
          routeId: busAssignment?.route_id
        });
        setStopsState({ completed: [], next: null, remaining: [] });
      } else {
        // Unexpected error - log at error level
        logger.error('❌ Error refreshing stops', 'UnifiedDriverInterface', {
          error: errorMessage,
          status: statusCode,
          code: errorCode,
          driverId: busAssignment?.driver_id,
          routeId: busAssignment?.route_id,
          stack: error instanceof Error ? error.stack : undefined
        });
        setStopsState({ completed: [], next: null, remaining: [] });
      }
    }
  }, [isAuthenticated, busAssignment]);

  React.useEffect(() => {
    refreshStops();
  }, [refreshStops]);
  
  // Convert tracking state to location state format for UI components
  const locationState = useMemo(() => ({
    isTracking: tracking.isTracking,
    currentLocation: tracking.lastLocation ? {
      coords: {
        latitude: tracking.lastLocation.latitude,
        longitude: tracking.lastLocation.longitude,
        accuracy: tracking.lastLocation.accuracy,
        altitude: null,
        altitudeAccuracy: null,
        heading: tracking.lastLocation.heading || null,
        speed: tracking.lastLocation.speed || null,
      },
      timestamp: tracking.lastLocation.timestamp,
    } : null,
    locationError: tracking.locationError,
    updateCount: tracking.updateCount,
    lastUpdateTime: tracking.lastUpdateTime ? tracking.lastUpdateTime.toString() : null,
  }), [tracking.isTracking, tracking.lastLocation, tracking.locationError, tracking.updateCount, tracking.lastUpdateTime]);
  
  // Progress tracking ref to prevent duplicate phase changes
  const initProgressRef = useRef({ auth: false, assignment: false, websocket: false });
  
  // Memoized function to sync driver data - prevents infinite loops
  const syncDriverData = useCallback(() => {
    if (busAssignment && isAuthenticated) {
      driverActions.setDriverData({
        driverId: busAssignment.driver_id,
        driverEmail: busAssignment.driver_name, // Using driver_name as email fallback
        driverName: busAssignment.driver_name,
        busAssignment: busAssignment,
      });
      
      driverActions.setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      driverActions.setConnectionState({
        isWebSocketConnected: isWebSocketConnected,
        isWebSocketAuthenticated: isWebSocketAuthenticated,
      });
      
      logger.info('Essential driver data synced to stores', 'UnifiedDriverInterface', {
        driverId: busAssignment.driver_id,
        busNumber: busAssignment.bus_number,
        routeName: busAssignment.route_name,
      });
    }
  }, [busAssignment, isAuthenticated, isWebSocketConnected, isWebSocketAuthenticated]);

  // Track previous values to prevent infinite loops
  const prevValuesRef = useRef({
    driverId: null as string | null,
    busNumber: null as string | null,
    routeName: null as string | null,
    isAuthenticated: false,
    isWebSocketConnected: false,
    isWebSocketAuthenticated: false,
  });

  // Store driverActions in ref to prevent infinite loops
  const driverActionsRef = useRef(driverActions);
  driverActionsRef.current = driverActions;
  
  // Sync essential data from context to stores (FIXED - NO INFINITE LOOPS)
  // Using React 18 automatic batching and proper change detection
  useEffect(() => {
    if (busAssignment && isAuthenticated) {
      const prevValues = prevValuesRef.current;
      
      // Only sync if values have actually changed (using stable comparisons)
      const needsUpdate = 
        prevValues.driverId !== busAssignment.driver_id ||
        prevValues.busNumber !== busAssignment.bus_number ||
        prevValues.routeName !== busAssignment.route_name ||
        prevValues.isAuthenticated !== isAuthenticated;
      
      if (needsUpdate) {
        // React 18 automatically batches these updates - no setTimeout needed
        driverActionsRef.current.setDriverData({
          driverId: busAssignment.driver_id,
          driverEmail: busAssignment.driver_name,
          driverName: busAssignment.driver_name,
          busAssignment: busAssignment,
        });
        
        driverActionsRef.current.setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        // Update ref values immediately (only for values we're tracking)
        prevValuesRef.current = {
          driverId: busAssignment.driver_id,
          busNumber: busAssignment.bus_number,
          routeName: busAssignment.route_name,
          isAuthenticated: isAuthenticated,
          isWebSocketConnected: prevValuesRef.current.isWebSocketConnected, // Preserve existing value
          isWebSocketAuthenticated: prevValuesRef.current.isWebSocketAuthenticated, // Preserve existing value
        };
        
        logger.info('Essential driver data synced to stores', 'UnifiedDriverInterface', {
          driverId: busAssignment.driver_id,
          busNumber: busAssignment.bus_number,
          routeName: busAssignment.route_name,
        });
      }
    }
    // Note: Connection state syncing is handled separately in the useEffect below to prevent conflicts
  }, [
    busAssignment?.driver_id, 
    busAssignment?.bus_number, 
    busAssignment?.route_name, 
    isAuthenticated
    // Note: Connection state is synced separately to prevent circular dependencies
  ]);
  
  // Legacy context for backward compatibility during transition
  // Removed duplicate declaration to prevent confusion
  
  // Error handling is now done inline in useEffect hooks to prevent infinite render loops

  const handleInitializationTimeout = useCallback(() => {
    const timeoutError = createNetworkError('Dashboard initialization timed out. Please check your connection and try again.');
    driverActions.setInitializationState({
      initializationError: timeoutError.userMessage,
      isInitializing: false
    });
    logger.error('Dashboard initialization timeout', 'component', { 
      error: timeoutError.message,
      code: timeoutError.code 
    });
  }, []); // Removed driverActions and driverState dependencies to prevent infinite loops

  // Track previous bus assignment to prevent infinite loops
  const prevBusAssignmentRef = useRef<string | null>(null);
  
  // Update bus info when assignment changes with error handling - INLINE LOGIC TO PREVENT INFINITE LOOPS
  useEffect(() => {
    try {
      const currentAssignment = driverState.busAssignment;
      const currentAssignmentId = currentAssignment ? `${currentAssignment.driver_id}-${currentAssignment.bus_number}` : null;
      
      // Only update if assignment actually changed
      if (prevBusAssignmentRef.current !== currentAssignmentId) {
        prevBusAssignmentRef.current = currentAssignmentId;
        
        if (currentAssignment) {
          logger.info('📋 Bus assignment updated in driver interface', 'component', {
            busNumber: currentAssignment.bus_number,
            routeName: currentAssignment.route_name
          });
          driverActionsRef.current.setInitializationState({ initializationError: null });
        } else {
          logger.warn('⚠️ No bus assignment available', 'component');
          if (driverState.isAuthenticated) {
            const appError = errorHandler.handleError(
              new Error('No bus assignment found for authenticated driver'), 
              'UnifiedDriverInterface-bus-assignment'
            );
            driverActionsRef.current.setInitializationState({
              initializationError: appError.userMessage || appError.message
            });
          }
        }
      }
    } catch (err) {
      const appError = errorHandler.handleError(err, 'UnifiedDriverInterface-bus-assignment-update');
      driverActionsRef.current.setInitializationState({
        initializationError: appError.userMessage || appError.message
      });
    }
  }, [driverState.busAssignment?.driver_id, driverState.busAssignment?.bus_number, driverState.isAuthenticated]);

  // Track previous connection state to prevent infinite loops
  const prevConnectionStateRef = useRef<{isWebSocketConnected: boolean, isWebSocketAuthenticated: boolean} | null>(null);
  
  // Use refs to track authentication state without triggering re-renders
  const isAuthenticatedRef = useRef(isAuthenticated);
  const initializationErrorRef = useRef(driverState.initializationError);
  
  // Update refs when values change
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
    initializationErrorRef.current = driverState.initializationError;
  }, [isAuthenticated, driverState.initializationError]);
  
  // Update connection status based on WebSocket state - PRODUCTION FIX: Handle initialization state
  useEffect(() => {
    // CRITICAL FIX: Read ONLY from context values, never from store to prevent circular updates
    const currentState = {
      isWebSocketConnected: isWebSocketConnected, // From context only
      isWebSocketAuthenticated: isWebSocketAuthenticated, // From context only
      isWebSocketInitializing: isWebSocketInitializing // PRODUCTION FIX: Track initialization
    };
    
    // Only update if context values actually changed (using ref comparison)
    const hasChanged = !prevConnectionStateRef.current || 
        prevConnectionStateRef.current.isWebSocketConnected !== currentState.isWebSocketConnected ||
        prevConnectionStateRef.current.isWebSocketAuthenticated !== currentState.isWebSocketAuthenticated;
    
    if (!hasChanged && !isWebSocketInitializing) {
      return; // Early return to prevent unnecessary processing
    }
    
    // CRITICAL: Update ref FIRST to prevent re-triggering on next render
    prevConnectionStateRef.current = {
      isWebSocketConnected: currentState.isWebSocketConnected,
      isWebSocketAuthenticated: currentState.isWebSocketAuthenticated
    };
    
    // PRODUCTION FIX: Suppress warnings during initialization
    try {
      if (isWebSocketInitializing) {
        // PRODUCTION FIX: During initialization, don't show warnings
        // Just set connection state without error messages
        driverActionsRef.current.setConnectionState({ 
          isWebSocketConnected: false, // Not fully connected until auth completes
          isWebSocketAuthenticated: false 
        });
        // Clear any previous errors during initialization
        if (initializationErrorRef.current) {
          driverActionsRef.current.setInitializationState({ initializationError: null });
        }
        logger.debug('Driver interface: WebSocket initializing (suppressing warnings)', 'component');
      } else if (currentState.isWebSocketConnected && currentState.isWebSocketAuthenticated) {
        // Fully connected - batch both updates
        driverActionsRef.current.setConnectionState({ 
          isWebSocketConnected: true,
          isWebSocketAuthenticated: true 
        });
        // Only clear error if it exists to prevent unnecessary updates
        if (initializationErrorRef.current) {
          driverActionsRef.current.setInitializationState({ initializationError: null });
        }
        logger.info('Driver interface: WebSocket fully connected and authenticated', 'component');
      } else if (currentState.isWebSocketConnected && !currentState.isWebSocketAuthenticated) {
        // Connected but not authenticated (only show error if not initializing)
        driverActionsRef.current.setConnectionState({ 
          isWebSocketConnected: true,
          isWebSocketAuthenticated: false 
        });
        // PRODUCTION FIX: Wait for initialization to complete before showing errors
        // Don't show errors during initialization or immediately after connection
        // The connection state listener in DriverAuthContext will update authentication state
        // when driver:initialized event is received, so we should wait for that
        logger.debug('Driver interface: WebSocket connected, waiting for authentication', 'component', {
          isInitializing: isWebSocketInitializing,
          isAuthenticated: currentState.isWebSocketAuthenticated
        });
      } else {
        // Disconnected
        driverActionsRef.current.setConnectionState({ 
          isWebSocketConnected: false,
          isWebSocketAuthenticated: false 
        });
        logger.debug('Driver interface: WebSocket disconnected', 'component');
        // Only set error if authenticated and not initializing
        if (isAuthenticatedRef.current && !isWebSocketInitializing) {
          const appError = errorHandler.handleError(
            new Error('WebSocket connection lost'), 
            'UnifiedDriverInterface-websocket-connection'
          );
          driverActionsRef.current.setInitializationState({
            initializationError: appError.userMessage || appError.message
          });
        }
      }
    } catch (err) {
      // PRODUCTION FIX: Don't create error loops - only log if it's a real error
      // The error handler might throw, but we don't want to call handleError on its output
      try {
        const appError = errorHandler.handleError(err, 'UnifiedDriverInterface-websocket-status-update');
        // Only set error if not initializing
        if (!isWebSocketInitializing) {
          driverActionsRef.current.setInitializationState({
            initializationError: appError.userMessage || appError.message
          });
        }
      } catch (handlerError) {
        // Error handler itself failed - just log the original error
        logger.debug('Error in error handler (non-critical)', 'component', { 
          originalError: err instanceof Error ? err.message : String(err)
        });
      }
    }
  }, [isWebSocketConnected, isWebSocketAuthenticated, isWebSocketInitializing]); // Added isWebSocketInitializing

  // Handle navigation for unauthenticated users
  // PRODUCTION FIX: Add delay to prevent race condition with login state propagation
  useEffect(() => {
    if (!driverState.isLoading && !driverState.isAuthenticated && mode === 'dashboard') {
      // Small delay to allow authentication state to propagate if user just logged in
      const redirectTimer = setTimeout(() => {
        // Double-check authentication state before redirecting
        if (!isAuthenticated && !driverState.isLoading) {
          logger.info('Redirecting unauthenticated user to login', 'UnifiedDriverInterface');
          navigate('/driver-login', { replace: true });
        }
      }, 500); // 500ms delay to allow state propagation
      
      return () => clearTimeout(redirectTimer);
    }
  }, [driverState.isLoading, driverState.isAuthenticated, isAuthenticated, mode, navigate]);

  // Initialize timeout handling
  useEffect(() => {
    if (mode === 'dashboard' && driverState.isAuthenticated) {
      // Set initialization timeout (30 seconds)
      const timeout = setTimeout(() => {
        if (driverState.isInitializing) {
          handleInitializationTimeout();
        }
      }, 30000);
      
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [mode, driverState.isAuthenticated, driverState.isInitializing, handleInitializationTimeout]);

  // Clear initialization state when dashboard is ready - PRODUCTION FIX: Prevent unnecessary updates
  const prevReadyStateRef = useRef(false);
  useEffect(() => {
    const isReady = driverState.isAuthenticated && 
                    driverState.busAssignment && 
                    !driverState.isLoading && 
                    !driverState.error;
    
    // Only update if state changed from not-ready to ready
    if (isReady && !prevReadyStateRef.current && driverState.isInitializing) {
      prevReadyStateRef.current = true;
      driverActionsRef.current.setInitializationState({ isInitializing: false });
    } else if (!isReady) {
      prevReadyStateRef.current = false;
    }
  }, [
    driverState.isAuthenticated, 
    driverState.busAssignment?.driver_id, // Use stable ID instead of entire object
    driverState.isLoading, 
    driverState.error,
    driverState.isInitializing
  ]);

  // REMOVED: Duplicate location sending logic
  // Location updates are now handled exclusively by useDriverTracking hook
  // UnifiedWebSocketService.sendLocationUpdate now has built-in deduplication and throttling
  // This prevents the 16ms duplicate issue and browser slowdowns
  
  // Note: useDriverTracking hook (line 53-59) handles all location sending to WebSocket
  // No need for additional location sending logic here

  // REMOVED: Old tracking handlers - now using useDriverTracking hook

  // Add handleRetryConnection
  const handleRetryConnection = useCallback(async () => {
    try {
      driverActionsRef.current.setInitializationState({ initializationError: null });
      await retryConnection();
    } catch (err) {
      const appError = errorHandler.handleError(err, 'UnifiedDriverInterface-retry-connection');
      driverActionsRef.current.setInitializationState({
        initializationError: appError.userMessage || appError.message
      });
    }
  }, [retryConnection]);

  // Reintroduce logoutRef for current logout
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  // Robust sign-out using refs to avoid stale closures
  const handleSignOut = useCallback(async () => {
    try {
      logger.info('🚪 Driver sign-out initiated', 'UnifiedDriverInterface');

      // Stop tracking first (soft-fail)
      try { driverActionsRef.current.stopTracking?.(); } catch (err) { logger.warn('Tracking stop on signout failed', err ? String(err) : undefined); }

      // Disconnect WebSocket (soft-fail)
      try { await unifiedWebSocketService.disconnect?.(); } catch (wsError) { logger.warn('WebSocket signout disconnect error', wsError ? String(wsError) : undefined); }

      // Context logout (use latest ref)
      try { await logoutRef.current?.(); } catch (err) { logger.warn('Driver context logout not completed', err ? String(err) : undefined); }

      // Global auth sign out (soft-fail)
      try { await authService.signOut?.(); } catch (err) { logger.warn('authService.signOut failed', err ? String(err) : undefined); }

      // Clear auth-related storage keys
      try {
        if (typeof localStorage !== 'undefined') {
          const localKeys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-') || key.includes('driver_'))) {
              localKeys.push(key);
            }
          }
          localKeys.forEach(k => localStorage.removeItem(k));
        }
        if (typeof sessionStorage !== 'undefined') {
          const sessionKeys: string[] = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-') || key.includes('driver_'))) {
              sessionKeys.push(key);
            }
          }
          sessionKeys.forEach(k => sessionStorage.removeItem(k));
        }
        logger.info('✅ All authentication-related storage cleared', 'UnifiedDriverInterface');
      } catch (storageError) {
        logger.warn('⚠️ Error clearing storage during sign-out', storageError ? String(storageError) : undefined);
      }

      // Optional: reset store if available
      if ((driverActionsRef.current as any).reset && typeof (driverActionsRef.current as any).reset === 'function') {
        try { (driverActionsRef.current as any).reset(); } catch (e) { logger.warn('Driver store reset failed', e ? String(e) : undefined); }
      }

      // Final redirect
      logger.info('🔄 Redirecting to /driver-login', 'UnifiedDriverInterface');
      window.location.replace('/driver-login');
    } catch (err) {
      logger.error('❌ Sign-out fatal error', 'UnifiedDriverInterface', { error: err ? String(err) : undefined });
      window.location.replace('/driver-login');
    }
  }, []);

  // Memoized StudentMap configuration for better performance
  const studentMapConfig = useMemo(() => ({
    enableRealTime: true,
    enableClustering: true,
    enableOfflineMode: true,
    enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
    maxBuses: 50,
    updateInterval: 1000,
    enableAccessibility: true,
    enableInternationalization: false,
  }), []);
  
  // PRODUCTION-GRADE: Optimized driver location memoization to prevent unnecessary StudentMap re-renders
  const memoizedDriverLocation = useMemo(() => {
    if (!locationState.currentLocation) return undefined;
    
    // Create stable object with normalized values to prevent identity changes
    const coords = locationState.currentLocation.coords;
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy || undefined, // Normalize null to undefined
      heading: coords.heading || undefined,   // Normalize null to undefined
      speed: coords.speed || undefined,       // Normalize null to undefined
      timestamp: locationState.currentLocation.timestamp,
    };
  }, [
    // PRODUCTION FIX: Only depend on actual values, not object identity
    locationState.currentLocation?.coords.latitude,
    locationState.currentLocation?.coords.longitude,
    locationState.currentLocation?.coords.accuracy,
    locationState.currentLocation?.coords.heading,
    locationState.currentLocation?.coords.speed,
    locationState.currentLocation?.timestamp,
  ]);

  // Coordinate loading phases via hook
  useDriverInitialization(mode, driverState as any, loadingState as any);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Cleanup driver interface store subscriptions
      try {
        driverActions.cleanup();
      } catch (error) {
        logger.warn('Error during driver interface cleanup', 'component', { error });
      }
      
      logger.debug('UnifiedDriverInterface component cleaned up', 'component');
    };
  }, [driverActions]);

  // Show login if not authenticated
  if (mode === 'login' || (!isAuthenticated && !loadingState.state.isLoading)) {
    return <DriverLogin />;
  }

  // Unified loading state with progress indication
  // Only show loading if we're actually loading OR if we don't have the essential data
  if ((loadingState.state.isLoading && (!isAuthenticated || !busAssignment)) || !isAuthenticated || !busAssignment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md w-full px-4">
          {/* Loading spinner */}
          <div className="loading-spinner mx-auto mb-6" />
          
          {/* Progress bar */}
          {loadingState.state.progress > 0 && (
            <div className="mb-4">
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${loadingState.state.progress}%` }}
                />
              </div>
              <p className="text-slate-600 text-xs mt-1">{loadingState.state.progress}%</p>
            </div>
          )}
          
          {/* Loading message */}
          <p className="text-slate-900 text-lg font-medium mb-2">
            {loadingState.state.message || 'Loading driver interface...'}
          </p>
          
          {/* Phase-specific message */}
          {loadingState.state.phase !== 'idle' && (
            <p className="text-slate-600 text-sm">
              {loadingState.state.phase === 'authenticating' && 'Verifying your credentials...'}
              {loadingState.state.phase === 'loading_assignment' && 'Fetching your bus assignment...'}
              {loadingState.state.phase === 'connecting_websocket' && 'Establishing real-time connection...'}
              {loadingState.state.phase === 'authenticating_websocket' && 'Securing connection...'}
            </p>
          )}
          
          {/* Error notification */}
          {(driverState.initializationError || driverState.error) && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-300">
              <p className="text-yellow-900 text-sm">
                {driverState.initializationError || driverState.error}
              </p>
              <button
                onClick={() => {
                  driverActions.setInitializationState({ initializationError: null });
                  if (loadingState.state.canRetry) {
                    loadingState.retry();
                  }
                }}
                className="mt-2 text-yellow-700 hover:text-yellow-800 text-xs underline font-medium"
              >
                {loadingState.state.canRetry ? 'Retry' : 'Dismiss'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Enhanced error state with specific error handling
  if (error) {
    const displayError = error;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8 max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">
              Error Loading Interface
            </h3>
            <p className="text-red-800 mb-4">{displayError}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] touch-friendly"
              >
                Retry
              </button>
              <button
                onClick={handleRetryConnection}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl transition-colors text-sm font-medium min-h-[44px] touch-friendly"
              >
                Retry Connection
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] touch-friendly"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DriverDashboardErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-2 sm:p-4 driver-dashboard-container">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <DriverHeader
            busInfo={busAssignment ? {
              bus_id: busAssignment.bus_id,
              bus_number: busAssignment.bus_number,
              route_id: busAssignment.route_id,
              route_name: busAssignment.route_name,
              driver_id: busAssignment.driver_id,
              driver_name: busAssignment.driver_name,
            } : null}
            connectionStatus={isWebSocketConnected && isWebSocketAuthenticated ? 'connected' : 'disconnected'}
            onSignOut={handleSignOut}
            onRetryConnection={handleRetryConnection}
            onRefreshAssignment={refreshAssignment}
            reconnectAttempts={0}
            lastHeartbeat={Date.now()}
            shiftName={currentShiftName || undefined}
          />

          <DriverStatusCards
            isWebSocketConnected={isWebSocketConnected}
            isWebSocketAuthenticated={isWebSocketAuthenticated}
            isTracking={locationState.isTracking}
            updateCount={locationState.updateCount}
            lastUpdateTime={locationState.lastUpdateTime}
            locationError={locationState.locationError}
          />

          {/* Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <DriverMapSection
              isAuthenticated={isAuthenticated}
              busAssignment={busAssignment || null}
              tracking={{ accuracy: tracking.accuracy, isTracking: locationState.isTracking }}
              studentMapConfig={studentMapConfig}
            />

            {/* Controls Section */}
            <div className="space-y-4 sm:space-y-6 order-1 xl:order-2">
              <DriverControls
                isTracking={tracking.isTracking}
                isAuthenticated={isAuthenticated}
                connectionStatus={tracking.connectionStatus === 'reconnecting' ? 'connecting' : tracking.connectionStatus}
                onStartTracking={async () => {
                  const { apiService } = await import('../api');
                  await apiService.startTracking(busAssignment?.driver_id, busAssignment?.shift_id || null);
                  await tracking.startTracking();
                  await refreshStops();
                }}
                onStopTracking={async () => {
                  const { apiService } = await import('../api');
                  await apiService.stopTracking(busAssignment?.driver_id);
                  tracking.stopTracking();
                  await refreshStops();
                }}
                lastUpdateTime={tracking.lastUpdateTime ? tracking.lastUpdateTime.toString() : null}
                updateCount={tracking.updateCount}
                locationError={tracking.locationError}
                onClearError={tracking.clearError}
                onRequestPermission={tracking.requestPermission}
                accuracy={tracking.accuracy}
                accuracyLevel={tracking.accuracyLevel}
                accuracyMessage={tracking.accuracyMessage}
                accuracyWarning={tracking.accuracyWarning}
              />

              {/* Stops List */}
              <DriverStops
                completed={stopsState?.completed || []}
                remaining={stopsState?.remaining || []}
                next={stopsState?.next || null}
                disabled={!isAuthenticated}
                onRefresh={refreshStops}
                onReachStop={async (stopId) => {
                  const { apiService } = await import('../api');
                  const { notifyRouteStatusUpdated } = await import('../services/RouteStatusEvents');
                  
                  // PRODUCTION FIX: Capture stop info before API call for better user feedback
                  const tappedStop = stopsState?.next || stopsState?.remaining.find(s => s.id === stopId);
                  const stopName = tappedStop?.name || `Stop #${tappedStop?.sequence || 'N/A'}`;
                  
                  logger.info('🛑 Stop reached handler called', 'UnifiedDriverInterface', {
                    stopId,
                    stopName,
                    driverId: busAssignment?.driver_id,
                    routeId: busAssignment?.route_id
                  });
                  
                  try {
                    // PRODUCTION FIX: Disable button state to prevent double-clicks
                    // Ensure tracking session exists first (idempotent on backend)
                    logger.info('Starting tracking session...', 'UnifiedDriverInterface', {
                      driverId: busAssignment?.driver_id
                    });
                    const startResult = await apiService.startTracking(busAssignment?.driver_id, busAssignment?.shift_id || null);
                    
                    if (!startResult.success) {
                      logger.warn('Failed to start tracking session', 'UnifiedDriverInterface', {
                        error: startResult.error,
                        driverId: busAssignment?.driver_id
                      });
                      notifyError('Tracking Failed', `Failed to start tracking: ${startResult.error || 'Unknown error'}. Please try again.`);
                      return;
                    }
                    
                    // PRODUCTION FIX: Wait a moment for session to be fully created in database
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // PRODUCTION FIX: Mark stop as reached
                    logger.info('Marking stop as reached...', 'UnifiedDriverInterface', {
                      stopId,
                      driverId: busAssignment?.driver_id
                    });
                    const result = await apiService.markStopReached(busAssignment?.driver_id, stopId);
                    
                    logger.info('Stop reached API response', 'UnifiedDriverInterface', {
                      success: result.success,
                      error: result.error,
                      stopId
                    });
                    
                    if (!result.success) {
                      logger.warn('⚠️ Failed to mark stop as reached', 'UnifiedDriverInterface', {
                        error: result.error,
                        stopId,
                        driverId: busAssignment?.driver_id
                      });
                      // PRODUCTION FIX: Show error to user - don't silently fail
                      notifyError('Stop Update Failed', `Failed to mark stop: ${result.error || 'Unknown error'}`);
                      return; // Don't refresh or notify if marking failed
                    }
                    
                    logger.info('✅ Stop marked successfully, waiting before refresh...', 'UnifiedDriverInterface', {
                      stopId,
                      stopName
                    });
                    
                    // PRODUCTION FIX: Show success feedback to user
                    notifySuccess(
                      'Stop Reached',
                      `Successfully marked "${stopName}" as reached`
                    );
                    
                    // PRODUCTION FIX: Wait a brief moment for backend to update, then refresh
                    // This prevents race conditions where we fetch before the update completes
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Notify students to refresh route status
                    if (busAssignment?.route_id) {
                      logger.info('Notifying route status update', 'UnifiedDriverInterface', {
                        routeId: busAssignment.route_id
                      });
                      notifyRouteStatusUpdated(busAssignment.route_id);
                    }
                    
                    // PRODUCTION FIX: Refresh stops after successful update
                    logger.info('Refreshing stops...', 'UnifiedDriverInterface');
                    await refreshStops();
                    logger.info('✅ Stops refreshed successfully', 'UnifiedDriverInterface');
                  } catch (e) {
                    logger.error('❌ Error marking stop as reached', 'UnifiedDriverInterface', {
                      error: e instanceof Error ? e.message : String(e),
                      stack: e instanceof Error ? e.stack : undefined,
                      stopId,
                      driverId: busAssignment?.driver_id
                    });
                    // PRODUCTION FIX: Show error to user
                    notifyError('Stop Update Error', `Error marking stop: ${e instanceof Error ? e.message : String(e)}`);
                    
                    // Attempt to auto-start tracking, then retry once
                    try {
                      logger.info('Retrying stop reached...', 'UnifiedDriverInterface');
                      notifyWarning('Retrying', 'Attempting to retry marking stop as reached...');
                      await apiService.startTracking(busAssignment?.driver_id, busAssignment?.shift_id || null);
                      const retryResult = await apiService.markStopReached(busAssignment?.driver_id, stopId);
                      if (retryResult.success) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        if (busAssignment?.route_id) notifyRouteStatusUpdated(busAssignment.route_id);
                        await refreshStops();
                        logger.info('✅ Retry successful', 'UnifiedDriverInterface');
                        notifySuccess('Stop Reached', `Successfully marked "${stopName}" as reached (retry successful)`);
                      } else {
                        logger.error('❌ Retry failed', 'UnifiedDriverInterface', {
                          error: retryResult.error
                        });
                        notifyError('Retry Failed', `Retry failed: ${retryResult.error || 'Unknown error'}`);
                      }
                    } catch (retryError) {
                      logger.error('❌ Retry exception', 'UnifiedDriverInterface', {
                        error: retryError instanceof Error ? retryError.message : String(retryError),
                        stack: retryError instanceof Error ? retryError.stack : undefined
                      });
                      notifyError('Retry Failed', `Retry failed: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
                    }
                  }
                }}
              />

              <DriverInstructions />
            </div>
          </div>
        </div>
      </div>
    </DriverDashboardErrorBoundary>
  );
});

// Set display name for debugging
UnifiedDriverInterface.displayName = 'UnifiedDriverInterface';

export default UnifiedDriverInterface;
