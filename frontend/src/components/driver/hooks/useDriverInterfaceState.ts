/**
 * Hook for managing driver interface state synchronization
 */
import { useEffect, useRef, useCallback } from 'react';
import { logger } from '../../../utils/logger';
import { errorHandler } from '../../../utils/errorHandler';
import { createNetworkError } from '../../../utils/errorHandler';

export interface UseDriverInterfaceStateProps {
  busAssignment: {
    driver_id: string;
    bus_number: string;
    route_name?: string;
    driver_name?: string;
  } | null;
  isAuthenticated: boolean;
  isWebSocketConnected: boolean;
  isWebSocketAuthenticated: boolean;
  isWebSocketInitializing: boolean;
  driverState: {
    busAssignment: any;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    isInitializing: boolean;
    initializationError: string | null;
  };
  driverActions: {
    setDriverData: (data: any) => void;
    setAuthState: (state: any) => void;
    setConnectionState: (state: any) => void;
    setInitializationState: (state: any) => void;
    stopTracking?: () => void;
    cleanup: () => void;
  };
}

/**
 * Manages synchronization between context and store state
 */
export function useDriverInterfaceState({
  busAssignment,
  isAuthenticated,
  isWebSocketConnected,
  isWebSocketAuthenticated,
  isWebSocketInitializing,
  driverState,
  driverActions,
}: UseDriverInterfaceStateProps) {
  // Store driverActions in ref to prevent infinite loops
  const driverActionsRef = useRef(driverActions);
  driverActionsRef.current = driverActions;

  // Track previous values to prevent infinite loops
  const prevValuesRef = useRef({
    driverId: null as string | null,
    busNumber: null as string | null,
    routeName: null as string | null,
    isAuthenticated: false,
    isWebSocketConnected: false,
    isWebSocketAuthenticated: false,
  });

  // PRODUCTION FIX: Sync authentication state immediately when authenticated, even without busAssignment
  // This prevents the stuck at 20% issue by ensuring isInitializing is cleared as soon as auth completes
  // Critical: This must happen synchronously to prevent race conditions
  useEffect(() => {
    if (isAuthenticated) {
      const prevValues = prevValuesRef.current;
      
      // Sync auth state immediately when authenticated (don't wait for busAssignment)
      // Use synchronous updates to prevent race conditions
      if (prevValues.isAuthenticated !== isAuthenticated) {
        // PRODUCTION FIX: Set all state flags atomically in a single batch
        // This prevents intermediate states that could cause phase detection issues
        driverActionsRef.current.setAuthState({
          isAuthenticated: true,
          isLoading: false, // Critical: Clear loading immediately
          error: null,
        });
        
        // PRODUCTION FIX: Clear isInitializing immediately when authenticated
        // This prevents phase detection from getting stuck at 20%
        driverActionsRef.current.setInitializationState({
          isInitializing: false, // Critical: Clear initialization flag
          initializationError: null,
        });
        
        // Update ref immediately to prevent re-triggering
        prevValuesRef.current = {
          ...prevValuesRef.current,
          isAuthenticated: true,
        };
        
        logger.info('Authentication state synced to stores (immediate)', 'useDriverInterfaceState', {
          isAuthenticated,
          hasBusAssignment: !!busAssignment,
        });
      }
      
      // Sync bus assignment data if available
      if (busAssignment) {
        const needsUpdate = 
          prevValues.driverId !== busAssignment.driver_id ||
          prevValues.busNumber !== busAssignment.bus_number ||
          prevValues.routeName !== busAssignment.route_name;
        
        if (needsUpdate) {
          // React 18 automatically batches these updates
          driverActionsRef.current.setDriverData({
            driverId: busAssignment.driver_id,
            driverEmail: busAssignment.driver_name,
            driverName: busAssignment.driver_name,
            busAssignment,
          });
          
          // Update ref values immediately
          prevValuesRef.current = {
            driverId: busAssignment.driver_id,
            busNumber: busAssignment.bus_number,
            routeName: busAssignment.route_name ?? null,
            isAuthenticated,
            isWebSocketConnected: prevValuesRef.current.isWebSocketConnected,
            isWebSocketAuthenticated: prevValuesRef.current.isWebSocketAuthenticated,
          };
          
          logger.info('Bus assignment data synced to stores', 'useDriverInterfaceState', {
            driverId: busAssignment.driver_id,
            busNumber: busAssignment.bus_number,
            routeName: busAssignment.route_name ?? null,
          });
        }
      }
      
      // Update ref to track authentication state
      prevValuesRef.current = {
        ...prevValuesRef.current,
        isAuthenticated,
      };
    }
  }, [
    busAssignment?.driver_id, 
    busAssignment?.bus_number, 
    busAssignment?.route_name, 
    isAuthenticated
  ]);

  // Track previous bus assignment to prevent infinite loops
  const prevBusAssignmentRef = useRef<string | null>(null);
  
  // Update bus info when assignment changes
  useEffect(() => {
    try {
      const currentAssignment = driverState.busAssignment;
      const currentAssignmentId = currentAssignment ? `${currentAssignment.driver_id}-${currentAssignment.bus_number}` : null;
      
      // Only update if assignment actually changed
      if (prevBusAssignmentRef.current !== currentAssignmentId) {
        prevBusAssignmentRef.current = currentAssignmentId;
        
        if (currentAssignment) {
          logger.info('📋 Bus assignment updated in driver interface', 'useDriverInterfaceState', {
            busNumber: currentAssignment.bus_number,
            routeName: currentAssignment.route_name
          });
          driverActionsRef.current.setInitializationState({ initializationError: null });
        } else {
          logger.warn('⚠️ No bus assignment available', 'useDriverInterfaceState');
          if (driverState.isAuthenticated) {
            const appError = errorHandler.handleError(
              new Error('No bus assignment found for authenticated driver'), 
              'useDriverInterfaceState-bus-assignment'
            );
            driverActionsRef.current.setInitializationState({
              initializationError: appError.userMessage || appError.message
            });
          }
        }
      }
    } catch (err) {
      const appError = errorHandler.handleError(err, 'useDriverInterfaceState-bus-assignment-update');
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
  
  // Update connection status based on WebSocket state
  useEffect(() => {
    // Read ONLY from context values, never from store to prevent circular updates
    const currentState = {
      isWebSocketConnected,
      isWebSocketAuthenticated,
      isWebSocketInitializing
    };
    
    // Only update if context values actually changed
    const hasChanged = !prevConnectionStateRef.current || 
        prevConnectionStateRef.current.isWebSocketConnected !== currentState.isWebSocketConnected ||
        prevConnectionStateRef.current.isWebSocketAuthenticated !== currentState.isWebSocketAuthenticated;
    
    if (!hasChanged && !isWebSocketInitializing) {
      return;
    }
    
    // Update ref FIRST to prevent re-triggering on next render
    prevConnectionStateRef.current = {
      isWebSocketConnected: currentState.isWebSocketConnected,
      isWebSocketAuthenticated: currentState.isWebSocketAuthenticated
    };
    
    // Suppress warnings during initialization
    try {
      if (isWebSocketInitializing) {
        // During initialization, don't show warnings
        driverActionsRef.current.setConnectionState({ 
          isWebSocketConnected: false,
          isWebSocketAuthenticated: false 
        });
        // Clear any previous errors during initialization
        if (initializationErrorRef.current) {
          driverActionsRef.current.setInitializationState({ initializationError: null });
        }
        logger.debug('Driver interface: WebSocket initializing (suppressing warnings)', 'useDriverInterfaceState');
      } else if (currentState.isWebSocketConnected && currentState.isWebSocketAuthenticated) {
        // Fully connected
        driverActionsRef.current.setConnectionState({ 
          isWebSocketConnected: true,
          isWebSocketAuthenticated: true 
        });
        // Only clear error if it exists to prevent unnecessary updates
        if (initializationErrorRef.current) {
          driverActionsRef.current.setInitializationState({ initializationError: null });
        }
        logger.info('Driver interface: WebSocket fully connected and authenticated', 'useDriverInterfaceState');
      } else if (currentState.isWebSocketConnected && !currentState.isWebSocketAuthenticated) {
        // Connected but not authenticated
        driverActionsRef.current.setConnectionState({ 
          isWebSocketConnected: true,
          isWebSocketAuthenticated: false 
        });
        logger.debug('Driver interface: WebSocket connected, waiting for authentication', 'useDriverInterfaceState', {
          isInitializing: isWebSocketInitializing,
          isAuthenticated: currentState.isWebSocketAuthenticated
        });
      } else {
        // Disconnected
        driverActionsRef.current.setConnectionState({ 
          isWebSocketConnected: false,
          isWebSocketAuthenticated: false 
        });
        logger.debug('Driver interface: WebSocket disconnected', 'useDriverInterfaceState');
        // Only set error if authenticated and not initializing
        if (isAuthenticatedRef.current && !isWebSocketInitializing) {
          const appError = errorHandler.handleError(
            new Error('WebSocket connection lost'), 
            'useDriverInterfaceState-websocket-connection'
          );
          driverActionsRef.current.setInitializationState({
            initializationError: appError.userMessage || appError.message
          });
        }
      }
    } catch (err) {
      // Don't create error loops
      try {
        const appError = errorHandler.handleError(err, 'useDriverInterfaceState-websocket-status-update');
        // Only set error if not initializing
        if (!isWebSocketInitializing) {
          driverActionsRef.current.setInitializationState({
            initializationError: appError.userMessage || appError.message
          });
        }
      } catch (handlerError) {
        // Error handler itself failed - just log the original error
        logger.debug('Error in error handler (non-critical)', 'useDriverInterfaceState', { 
          originalError: err instanceof Error ? err.message : String(err)
        });
      }
    }
  }, [isWebSocketConnected, isWebSocketAuthenticated, isWebSocketInitializing]);

  // PRODUCTION FIX: Clear initialization state more aggressively with timeout protection
  // Clear isInitializing as soon as authenticated, don't wait for all conditions
  // Critical: This prevents getting stuck at 20% loading
  const prevReadyStateRef = useRef(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear any existing timeout
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
      initializationTimeoutRef.current = null;
    }
    
    const isReady = driverState.isAuthenticated && 
                    driverState.busAssignment && 
                    !driverState.isLoading && 
                    !driverState.error;
    
    // PRODUCTION FIX: Clear isInitializing immediately when authenticated
    // Don't wait for isLoading to clear - if authenticated, we're past initialization
    if (driverState.isAuthenticated && driverState.isInitializing) {
      // Clear immediately - authentication means initialization is complete
      driverActionsRef.current.setInitializationState({ isInitializing: false });
      logger.debug('Cleared isInitializing flag (authenticated)', 'useDriverInterfaceState', {
        hasBusAssignment: !!driverState.busAssignment,
        isLoading: driverState.isLoading
      });
    }
    
    // PRODUCTION FIX: Add timeout fallback - if authenticated but still initializing after 1 second, force clear
    // This is a safety net in case state sync fails
    if (driverState.isAuthenticated && driverState.isInitializing) {
      initializationTimeoutRef.current = setTimeout(() => {
        if (driverState.isAuthenticated && driverState.isInitializing) {
          logger.warn('Timeout fallback: Force clearing isInitializing flag', 'useDriverInterfaceState');
          driverActionsRef.current.setInitializationState({ isInitializing: false });
        }
      }, 1000); // 1 second timeout - very aggressive
    }
    
    // Also clear when fully ready
    if (isReady && !prevReadyStateRef.current) {
      prevReadyStateRef.current = true;
      driverActionsRef.current.setInitializationState({ isInitializing: false });
      logger.debug('Dashboard fully ready', 'useDriverInterfaceState');
    } else if (!isReady) {
      prevReadyStateRef.current = false;
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
    };
  }, [
    driverState.isAuthenticated, 
    driverState.busAssignment?.driver_id,
    driverState.isLoading, 
    driverState.error,
    driverState.isInitializing
  ]);

  // PRODUCTION FIX: Handle initialization timeout with fallback to clear isInitializing
  const handleInitializationTimeout = useCallback(() => {
    const timeoutError = createNetworkError('Dashboard initialization timed out. Please check your connection and try again.');
    driverActionsRef.current.setInitializationState({
      initializationError: timeoutError.userMessage,
      isInitializing: false
    });
    logger.error('Dashboard initialization timeout', 'useDriverInterfaceState', { 
      error: timeoutError.message,
      code: timeoutError.code 
    });
  }, []);

  // PRODUCTION FIX: This effect is now redundant - handled in the main initialization effect above
  // Removed to prevent duplicate logic and potential race conditions

  // Initialize timeout handling for full initialization
  useEffect(() => {
    if (driverState.isAuthenticated) {
      // Set initialization timeout (30 seconds) for full dashboard initialization
      const timeout = setTimeout(() => {
        if (driverState.isInitializing) {
          handleInitializationTimeout();
        }
      }, 30000);
      
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [driverState.isAuthenticated, driverState.isInitializing, handleInitializationTimeout]);

  return {
    handleInitializationTimeout,
  };
}

