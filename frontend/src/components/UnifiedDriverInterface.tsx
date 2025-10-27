import React, { useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverInterface, useDriverInterfaceActions, useDriverStatus } from '../stores/useDriverInterfaceStore';
// Removed unused bridge hooks to prevent infinite loops
import { useDriverAuth } from '../contexts/DriverAuthContext';
import { useDriverTracking } from '../hooks/useDriverTracking';
import { unifiedWebSocketService } from '../services/UnifiedWebSocketService';
import { authService } from '../services/authService';
import DriverHeader from './driver/DriverHeader';
import StudentMap from './StudentMap';
import DriverControls from './driver/DriverControls';
import DriverInstructions from './driver/DriverInstructions';
import DriverLogin from './DriverLogin';
// Removed old DriverErrorBoundary - using new DriverDashboardErrorBoundary
import DriverDashboardErrorBoundary from './error/DriverDashboardErrorBoundary';
import { logger } from '../utils/logger';
import { errorHandler, CustomError, createNetworkError } from '../utils/errorHandler';
import { useUnifiedLoadingState } from '../hooks/useUnifiedLoadingState';
import { formatTime } from '../utils/dateFormatter';

import './DriverInterface.css';
import './DriverDashboard.css';
import { 
  BusInfo, 
  UnifiedDriverInterfaceProps,
  DriverLocationData 
} from '../types/driver';

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
        // PRODUCTION FIX: Only log warning, don't set error during normal operation
        logger.debug('Driver interface: WebSocket connected but authentication pending', 'component');
        // Only set error if authenticated and not initializing
        if (isAuthenticatedRef.current && !isWebSocketInitializing) {
          const appError = errorHandler.handleError(
            new Error('WebSocket authentication failed'), 
            'UnifiedDriverInterface-websocket-auth'
          );
          driverActionsRef.current.setInitializationState({
            initializationError: appError.userMessage || appError.message
          });
        }
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
      const appError = errorHandler.handleError(err, 'UnifiedDriverInterface-websocket-status-update');
      // Only set error if not initializing
      if (!isWebSocketInitializing) {
        driverActionsRef.current.setInitializationState({
          initializationError: appError.userMessage || appError.message
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

  const handleSignOut = useCallback(async () => {
    try {
      logger.info('🚪 Driver sign-out initiated', 'UnifiedDriverInterface');
      
      // Stop tracking first
      driverActionsRef.current.stopTracking();
      
      // Disconnect WebSocket if connected
      if (isWebSocketConnected) {
        try {
          await unifiedWebSocketService.disconnect();
          logger.info('🔌 WebSocket disconnected during sign-out', 'UnifiedDriverInterface');
        } catch (wsError) {
          logger.warn('⚠️ Error disconnecting WebSocket during sign-out', 'UnifiedDriverInterface', { error: wsError });
        }
      }
      
      // Call logout from context
      await logout();
      
      // Also call authService.signOut to ensure all tokens are cleared
      await authService.signOut();
      
      // Clear all localStorage and sessionStorage items related to auth
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-') || key.includes('driver_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear sessionStorage as well
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-') || key.includes('driver_'))) {
            sessionStorage.removeItem(key);
          }
        }
        
        logger.info('✅ All authentication data cleared from storage', 'UnifiedDriverInterface');
      } catch (storageError) {
        logger.warn('⚠️ Error clearing storage during sign-out', 'UnifiedDriverInterface', { error: storageError });
      }
      
      // Navigate to landing page
      logger.info('🔄 Redirecting to landing page', 'UnifiedDriverInterface');
      navigate('/', { replace: true });
    } catch (err) {
      const appError = errorHandler.handleError(err, 'UnifiedDriverInterface-sign-out');
      logger.error('❌ Sign-out error', 'UnifiedDriverInterface', { error: appError });
      
      // Even if there's an error, try to navigate to landing page
      try {
        navigate('/', { replace: true });
      } catch (navError) {
        logger.error('❌ Navigation error during sign-out', 'UnifiedDriverInterface', { error: navError });
        // Last resort: force reload to landing page
        window.location.href = '/';
      }
    }
  }, [logout, navigate, isWebSocketConnected]);

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
  
  // OPTIMIZED: Memoize driver location to prevent unnecessary StudentMap re-renders
  const memoizedDriverLocation = useMemo(() => {
    if (!locationState.currentLocation) return undefined;
    
    return {
      latitude: locationState.currentLocation.coords.latitude,
      longitude: locationState.currentLocation.coords.longitude,
      accuracy: locationState.currentLocation.coords.accuracy,
      heading: locationState.currentLocation.coords.heading || undefined,
      speed: locationState.currentLocation.coords.speed || undefined,
      timestamp: locationState.currentLocation.timestamp,
    };
  }, [
    locationState.currentLocation?.coords.latitude,
    locationState.currentLocation?.coords.longitude,
    locationState.currentLocation?.coords.accuracy,
    locationState.currentLocation?.coords.heading,
    locationState.currentLocation?.coords.speed,
    locationState.currentLocation?.timestamp,
  ]);

  // Track current loading phase to prevent infinite loops
  const currentPhaseRef = useRef<string>('idle');
  const loadingStateRef = useRef(loadingState);
  loadingStateRef.current = loadingState;
  
  // Coordinate loading phases based on driver state
  useEffect(() => {
    // Skip if not in dashboard mode
    if (mode !== 'dashboard') return;

    // Determine target phase based on current state
    let targetPhase: string = 'idle';
    let phaseMessage: string = '';

    // Authentication phase
    if (driverState.isLoading && !driverState.isAuthenticated) {
      targetPhase = 'authenticating';
      phaseMessage = 'Authenticating driver...';
    }
    // Assignment loading phase
    else if (driverState.isAuthenticated && !driverState.busAssignment && !initProgressRef.current.assignment) {
      targetPhase = 'loading_assignment';
      phaseMessage = 'Loading bus assignment...';
    }
    // WebSocket connection phase
    else if (driverState.isAuthenticated && driverState.busAssignment && !driverState.isWebSocketConnected) {
      targetPhase = 'connecting_websocket';
      phaseMessage = 'Connecting to real-time service...';
    }
    // WebSocket authentication phase
    else if (driverState.isWebSocketConnected && !driverState.isWebSocketAuthenticated && !initProgressRef.current.websocket) {
      targetPhase = 'authenticating_websocket';
      phaseMessage = 'Authenticating connection...';
    }
    // Ready phase - all conditions met
    else if (
      driverState.isAuthenticated &&
      driverState.busAssignment &&
      driverState.isWebSocketConnected &&
      driverState.isWebSocketAuthenticated &&
      !driverState.isLoading &&
      !driverState.isInitializing
    ) {
      targetPhase = 'ready';
      phaseMessage = 'Dashboard ready';
      initProgressRef.current = { auth: true, assignment: true, websocket: true };
    }
    // Error phase
    else if (driverState.error || driverState.initializationError) {
      targetPhase = 'error';
      const errorMsg = driverState.error || driverState.initializationError || 'An error occurred';
      // Only set error if phase changed
      if (currentPhaseRef.current !== 'error') {
        loadingStateRef.current.setError(errorMsg);
        currentPhaseRef.current = 'error';
      }
      return;
    }

    // Only update phase if it actually changed
    if (currentPhaseRef.current !== targetPhase && targetPhase !== 'idle') {
      currentPhaseRef.current = targetPhase;
      loadingStateRef.current.setPhase(targetPhase as any, phaseMessage);
    }
  }, [
    driverState.isAuthenticated,
    driverState.isLoading,
    driverState.isInitializing,
    driverState.busAssignment,
    driverState.isWebSocketConnected,
    driverState.isWebSocketAuthenticated,
    driverState.error,
    driverState.initializationError,
    mode,
  ]);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-md w-full px-4">
          {/* Loading spinner */}
          <div className="loading-spinner mx-auto mb-6" />
          
          {/* Progress bar */}
          {loadingState.state.progress > 0 && (
            <div className="mb-4">
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${loadingState.state.progress}%` }}
                />
              </div>
              <p className="text-white/50 text-xs mt-1">{loadingState.state.progress}%</p>
            </div>
          )}
          
          {/* Loading message */}
          <p className="text-white text-lg font-medium mb-2">
            {loadingState.state.message || 'Loading driver interface...'}
          </p>
          
          {/* Phase-specific message */}
          {loadingState.state.phase !== 'idle' && (
            <p className="text-white/70 text-sm">
              {loadingState.state.phase === 'authenticating' && 'Verifying your credentials...'}
              {loadingState.state.phase === 'loading_assignment' && 'Fetching your bus assignment...'}
              {loadingState.state.phase === 'connecting_websocket' && 'Establishing real-time connection...'}
              {loadingState.state.phase === 'authenticating_websocket' && 'Securing connection...'}
            </p>
          )}
          
          {/* Error notification */}
          {(driverState.initializationError || driverState.error) && (
            <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-yellow-200 text-sm">
                {driverState.initializationError || driverState.error}
              </p>
              <button
                onClick={() => {
                  driverActions.setInitializationState({ initializationError: null });
                  if (loadingState.state.canRetry) {
                    loadingState.retry();
                  }
                }}
                className="mt-2 text-yellow-300 hover:text-yellow-200 text-xs underline"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="card-glass p-8 max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-400"
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
            <h3 className="text-lg font-medium text-red-300 mb-2">
              Error Loading Interface
            </h3>
            <p className="text-red-200 mb-4">{displayError}</p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Retry
              </button>
              <button
                onClick={handleRetryConnection}
                className="btn-secondary"
              >
                Retry Connection
              </button>
              <button
                onClick={handleSignOut}
                className="btn-secondary"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-2 sm:p-4 driver-dashboard-container">
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
          />

          {/* Test Mode Toggle */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 flex justify-center">
              <button
                onClick={driverActions.toggleTestMode}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-friendly"
              >
                {driverState.showTestMode ? 'Hide Test Mode' : 'Show Test Mode'}
              </button>
            </div>
          )}

          {/* Status Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            {/* Connection Status */}
            <div className="card-glass p-3 sm:p-4">
              <div className="flex items-center">
                <div
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-2 sm:mr-3 ${
                    isWebSocketConnected && isWebSocketAuthenticated
                      ? 'bg-green-500'
                      : isWebSocketConnected
                        ? 'bg-yellow-500 animate-pulse'
                        : 'bg-red-500'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white text-xs sm:text-sm">Connection</h3>
                  <p className="text-xs text-white/70 truncate">
                    {isWebSocketConnected && isWebSocketAuthenticated ? 'Connected' :
                     isWebSocketConnected ? 'Connecting...' :
                     'Disconnected'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tracking Status */}
            <div className="card-glass p-3 sm:p-4">
              <div className="flex items-center">
                <div
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-2 sm:mr-3 ${locationState.isTracking ? 'bg-green-500' : 'bg-gray-400'}`}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white text-xs sm:text-sm">GPS Tracking</h3>
                  <p className="text-xs text-white/70 truncate">
                    {locationState.isTracking ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>

            {/* Update Count */}
            <div className="card-glass p-3 sm:p-4">
              <div>
                <h3 className="font-semibold text-white text-xs sm:text-sm">Updates Sent</h3>
                <p className="text-lg sm:text-xl font-bold text-blue-300">{locationState.updateCount}</p>
                {locationState.lastUpdateTime && (
                  <p className="text-xs text-white/70 truncate">
                    Last: {formatTime(locationState.lastUpdateTime)}
                  </p>
                )}
              </div>
            </div>

            {/* Location Status */}
            <div className="card-glass p-3 sm:p-4">
              <div className="flex items-center">
                <div
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-2 sm:mr-3 ${
                    locationState.locationError ? 'bg-red-500' : 
                    locationState.currentLocation ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white text-xs sm:text-sm">Location</h3>
                  <p className="text-xs text-white/70 truncate">
                    {locationState.locationError ? 'Error' :
                     locationState.currentLocation ? 'Available' : 'Waiting'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Map Section */}
            <div className="space-y-4 sm:space-y-6 order-2 xl:order-1">
              {/* CRITICAL WARNING: Show warning if GPS accuracy is poor */}
              {tracking.accuracy && tracking.accuracy > 1000 && locationState.isTracking && (
                <div className="bg-red-600/20 border-2 border-red-500/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-red-200 mb-2">
                        Location Accuracy Warning
                      </h4>
                      <p className="text-sm text-red-100 mb-2">
                        Your current location accuracy is <strong>±{(tracking.accuracy / 1000).toFixed(1)}km</strong>, which indicates IP-based positioning.
                      </p>
                      <div className="text-xs text-red-200 space-y-1">
                        <p><strong>Why this happens:</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Desktop browsers don't have GPS hardware</li>
                          <li>Browser uses your IP address to estimate location (city/region level)</li>
                          <li>This is not your exact physical location</li>
                        </ul>
                        <p className="mt-2"><strong>Solution:</strong> Use a mobile device with GPS for accurate tracking (±10-50m accuracy)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="h-[300px] sm:h-[400px] lg:h-[500px] xl:h-[600px]">
                {isAuthenticated && busAssignment ? (
                  <StudentMap 
                    config={studentMapConfig}
                    driverLocation={memoizedDriverLocation}
                    isDriverTracking={locationState.isTracking}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <div className="text-gray-500 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium">Map will load after authentication</p>
                      <p className="text-gray-500 text-sm">Please complete login to view real-time bus tracking</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls Section */}
            <div className="space-y-4 sm:space-y-6 order-1 xl:order-2">
              <DriverControls
                isTracking={tracking.isTracking}
                isAuthenticated={isAuthenticated}
                connectionStatus={tracking.connectionStatus === 'reconnecting' ? 'connecting' : tracking.connectionStatus}
                onStartTracking={tracking.startTracking}
                onStopTracking={tracking.stopTracking}
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
