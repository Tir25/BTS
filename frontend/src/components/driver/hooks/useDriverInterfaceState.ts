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

  // Sync essential data from context to stores
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
        // React 18 automatically batches these updates
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
        
        // Update ref values immediately
        prevValuesRef.current = {
          driverId: busAssignment.driver_id,
          busNumber: busAssignment.bus_number,
          routeName: busAssignment.route_name,
          isAuthenticated: isAuthenticated,
          isWebSocketConnected: prevValuesRef.current.isWebSocketConnected,
          isWebSocketAuthenticated: prevValuesRef.current.isWebSocketAuthenticated,
        };
        
        logger.info('Essential driver data synced to stores', 'useDriverInterfaceState', {
          driverId: busAssignment.driver_id,
          busNumber: busAssignment.bus_number,
          routeName: busAssignment.route_name,
        });
      }
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
      isWebSocketConnected: isWebSocketConnected,
      isWebSocketAuthenticated: isWebSocketAuthenticated,
      isWebSocketInitializing: isWebSocketInitializing
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

  // Clear initialization state when dashboard is ready
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
    driverState.busAssignment?.driver_id,
    driverState.isLoading, 
    driverState.error,
    driverState.isInitializing
  ]);

  // Handle initialization timeout
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

  // Initialize timeout handling
  useEffect(() => {
    if (driverState.isAuthenticated) {
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
  }, [driverState.isAuthenticated, driverState.isInitializing, handleInitializationTimeout]);

  return {
    handleInitializationTimeout,
  };
}

