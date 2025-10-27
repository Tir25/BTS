import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { DriverAuthService, DriverAuthResult } from '../services/DriverAuthService';
import { DriverBusAssignment, authService } from '../services/authService';
import { unifiedWebSocketService } from '../services/UnifiedWebSocketService';
import { offlineStorage } from '../services/offline/OfflineStorage';
import { timeoutConfig } from '../config/timeoutConfig';
import { logger } from '../utils/logger';

interface DriverAuthState {
  // Authentication status
  isAuthenticated: boolean;
  isDriver: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Driver data
  driverId: string | null;
  driverEmail: string | null;
  driverName: string | null;
  busAssignment: DriverBusAssignment | null;
  
  // Connection status
  isWebSocketConnected: boolean;
  isWebSocketAuthenticated: boolean;
  isWebSocketInitializing: boolean; // PRODUCTION FIX: Track initialization state
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  retryConnection: () => Promise<void>;
  refreshAssignment: () => Promise<void>;
}

const DriverAuthContext = createContext<DriverAuthState | undefined>(undefined);

interface DriverAuthProviderProps {
  children: React.ReactNode;
}

export const DriverAuthProvider: React.FC<DriverAuthProviderProps> = ({ children }) => {
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverEmail, setDriverEmail] = useState<string | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [busAssignment, setBusAssignment] = useState<DriverBusAssignment | null>(null);
  
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [isWebSocketAuthenticated, setIsWebSocketAuthenticated] = useState(false);
  const [isWebSocketInitializing, setIsWebSocketInitializing] = useState(false);

  // Initialize DriverAuthService
  const driverAuthService = DriverAuthService.getInstance();
  
  // Enhanced concurrency control for initialization
  const initializationRef = useRef<Promise<void> | null>(null);
  const initializationInProgressRef = useRef<boolean>(false);
  const initializationRequestIdRef = useRef<string | null>(null);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize authentication state with enhanced race condition protection
  const initializeAuth = useCallback(async () => {
    // Generate unique request ID for this initialization attempt
    const requestId = `init_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if initialization is already in progress
    if (initializationInProgressRef.current && initializationRef.current) {
      logger.debug('🔄 Initialization already in progress, waiting for existing promise', 'driver-auth', { requestId });
      
      // Wait for existing initialization but verify it's still current
      try {
        await initializationRef.current;
        
        // Double-check this is still the request we want
        if (initializationRequestIdRef.current === requestId || !initializationInProgressRef.current) {
          return;
        }
      } catch (error) {
        logger.warn('⚠️ Previous initialization failed, starting new one', 'driver-auth', { error, requestId });
        // Fall through to start new initialization
      }
    }

    // Mark initialization as in progress
    initializationInProgressRef.current = true;
    initializationRequestIdRef.current = requestId;

    // Start new initialization
    const initPromise = performInitialization(requestId);
    initializationRef.current = initPromise;

    try {
      await initPromise;
    } catch (error) {
      logger.error('❌ Initialization error', 'driver-auth', { error, requestId });
      // Reset state on error so retry is possible
      initializationInProgressRef.current = false;
      initializationRef.current = null;
      throw error;
    } finally {
      // Only clear if this is still the current request
      if (initializationRequestIdRef.current === requestId) {
        initializationInProgressRef.current = false;
        initializationRef.current = null;
        initializationRequestIdRef.current = null;
      }
    }
  }, [driverAuthService]);

  // Internal initialization function with request ID tracking
  const performInitialization = async (requestId: string): Promise<void> => {
    // Verify this is still the current request
    if (initializationRequestIdRef.current !== requestId) {
      logger.debug('⚠️ Initialization request superseded', 'driver-auth', { requestId });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Verify request is still current after async operation
      if (initializationRequestIdRef.current !== requestId) {
        logger.debug('⚠️ Initialization request superseded after session check', 'driver-auth', { requestId });
        return;
      }
      
      if (session?.user) {
        // Validate existing session instead of calling authenticateDriver
        const validationResult = await driverAuthService.validateCurrentSession();
        
        // Verify request is still current after validation
        if (initializationRequestIdRef.current !== requestId) {
          logger.debug('⚠️ Initialization request superseded after validation', 'driver-auth', { requestId });
          return;
        }
        
        if (validationResult.success && validationResult.driverId) {
          setIsAuthenticated(true);
          setIsDriver(true);
          setDriverId(validationResult.driverId);
          setDriverEmail(session.user.email || null);
          setDriverName(validationResult.driverName || null);
          setBusAssignment(validationResult.busAssignment || null);
          
          // Store assignment data offline for reliability
          if (validationResult.busAssignment) {
            offlineStorage.storeData('driver', `assignment_${validationResult.driverId}`, validationResult.busAssignment as unknown as Record<string, unknown>);
          }
          
          logger.info('✅ Driver session validated successfully', 'driver-auth', { requestId });
        } else {
          logger.warn('❌ Driver validation failed', 'driver-auth', { error: validationResult.error, requestId });
          setIsAuthenticated(false);
          setIsDriver(false);
          
          // Try to recover from offline storage
          try {
            const offlineAssignment = await offlineStorage.getData('driver', `assignment_${session.user.id}`);
            if (offlineAssignment && initializationRequestIdRef.current === requestId) {
              setBusAssignment(offlineAssignment as unknown as DriverBusAssignment);
              logger.info('📱 Recovered assignment from offline storage', 'driver-auth', { requestId });
            }
          } catch (offlineError) {
            logger.warn('⚠️ Failed to recover offline assignment data', 'driver-auth', { error: offlineError, requestId });
          }
        }
      } else {
        logger.info('ℹ️ No active session found', 'driver-auth', { requestId });
        setIsAuthenticated(false);
        setIsDriver(false);
      }
    } catch (err) {
      // Only set error if this is still the current request
      if (initializationRequestIdRef.current === requestId) {
        logger.error('❌ Error initializing auth', 'driver-auth', { error: err, requestId });
        setError('Failed to initialize authentication');
        setIsAuthenticated(false);
        setIsDriver(false);
      }
    } finally {
      // Only update loading state if this is still the current request
      if (initializationRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  // Request tracking to prevent race conditions
  const loginRequestIdRef = useRef<string | null>(null);
  const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loginAbortControllerRef = useRef<AbortController | null>(null);

  // Login function with timeout protection and enhanced error handling
  // FIXED: Proper race condition handling with request tracking
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    // Generate unique request ID for this login attempt
    const requestId = `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    loginRequestIdRef.current = requestId;
    
    // Cancel any previous login attempt
    if (loginAbortControllerRef.current) {
      loginAbortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    const abortController = new AbortController();
    loginAbortControllerRef.current = abortController;
    
    // Clear any existing timeout
    if (loginTimeoutRef.current) {
      clearTimeout(loginTimeoutRef.current);
      loginTimeoutRef.current = null;
    }
    
    try {
      logger.info('🔐 Attempting driver login...', 'driver-auth', { email, requestId });
      
      // Use centralized timeout configuration
      const loginTimeoutMs = timeoutConfig.api.default; // Use centralized config
      
      // Create login promise with progress callback
      const loginPromise = driverAuthService.authenticateDriver(email, password, (step: string, progress: number) => {
        logger.debug('Authentication progress', 'driver-auth', { step, progress });
        // The progress is handled by the UnifiedDriverInterface loading state
      });

      // Create timeout promise that checks if request is still current
      const timeoutPromise = new Promise<never>((_, reject) => {
        loginTimeoutRef.current = setTimeout(() => {
          // Only reject if this is still the current request
          if (loginRequestIdRef.current === requestId && !abortController.signal.aborted) {
            abortController.abort();
            reject(new Error(`Login timeout after ${loginTimeoutMs / 1000}s`));
          }
        }, loginTimeoutMs);
      });

      // Execute login with proper cancellation support
      // FIXED: Use a better pattern that checks login completion before timing out
      let loginCompleted = false;
      let loginResult: DriverAuthResult | null = null;
      
      try {
        // Start login promise with completion tracking
        const trackedLoginPromise = loginPromise.then(result => {
          // Only process if this is still the current request
          if (loginRequestIdRef.current === requestId && !abortController.signal.aborted) {
            loginCompleted = true;
            loginResult = result;
            
            // Clear timeout since login succeeded
            if (loginTimeoutRef.current) {
              clearTimeout(loginTimeoutRef.current);
              loginTimeoutRef.current = null;
            }
            
            return result;
          }
          // Request was cancelled or superseded
          throw new Error('Login request cancelled');
        });

        // Start timeout that checks if login completed
        const trackedTimeoutPromise = timeoutPromise.catch(error => {
          // If login completed while timeout was firing, ignore timeout
          if (loginCompleted && loginResult) {
            logger.debug('⚠️ Timeout fired but login already completed', 'driver-auth');
            return loginResult; // Return the successful result instead
          }
          throw error;
        });

        // IMPROVED: Use Promise.allSettled to avoid race condition
        // This ensures we check completion status before timing out
        const [loginSettled, timeoutSettled] = await Promise.allSettled([
          trackedLoginPromise,
          trackedTimeoutPromise
        ]);
        
        // Verify this is still the current request before processing
        if (loginRequestIdRef.current !== requestId) {
          logger.warn('⚠️ Login request superseded by newer request', 'driver-auth');
          return { success: false, error: 'Login cancelled' };
        }
        
        // Determine the result based on what completed first
        let result: DriverAuthResult;
        
        if (loginSettled.status === 'fulfilled') {
          // Login completed successfully - use its result
          result = loginSettled.value;
          // Clear timeout since login succeeded
          if (loginTimeoutRef.current) {
            clearTimeout(loginTimeoutRef.current);
            loginTimeoutRef.current = null;
          }
        } else if (loginCompleted && loginResult) {
          // Login completed while timeout was processing - use login result
          logger.debug('⚠️ Timeout was processing but login already completed', 'driver-auth');
          result = loginResult;
          // Clear timeout
          if (loginTimeoutRef.current) {
            clearTimeout(loginTimeoutRef.current);
            loginTimeoutRef.current = null;
          }
        } else if (timeoutSettled.status === 'rejected') {
          // Timeout occurred - check if login failed or timed out
          const timeoutError = timeoutSettled.reason;
          if (timeoutError instanceof Error && timeoutError.message.includes('timeout')) {
            result = { success: false, error: `Login timeout after ${loginTimeoutMs / 1000}s` };
          } else {
            // Unexpected timeout error
            result = { success: false, error: 'Login timeout. Please try again.' };
          }
        } else {
          // Login failed for other reasons
          const error = loginSettled.reason;
          const errorMsg = error instanceof Error ? error.message : 'Login failed';
          result = { success: false, error: errorMsg };
        }
        
        // Process result
        if (result.success) {
          setIsAuthenticated(true);
          setIsDriver(true);
          setDriverId(result.driverId || null);
          setDriverEmail(email);
          setDriverName(result.driverName || null);
          setBusAssignment(result.busAssignment || null);
          
          // Store assignment data offline for reliability
          if (result.busAssignment) {
            offlineStorage.storeData('driver', `assignment_${result.driverId}`, result.busAssignment as unknown as Record<string, unknown>);
          }
          
          logger.info('✅ Driver login successful', 'driver-auth', { driverId: result.driverId });
          return { success: true };
        } else {
          const errorMsg = result.error || 'Login failed';
          setError(errorMsg);
          logger.error('❌ Driver login failed', 'driver-auth', { error: errorMsg });
          return { success: false, error: errorMsg };
        }
      } catch (raceError) {
        // Handle race condition errors
        if (raceError instanceof Error && raceError.message.includes('cancelled')) {
          logger.warn('⚠️ Login request was cancelled', 'driver-auth');
          return { success: false, error: 'Login was cancelled' };
        }
        throw raceError;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      
      // Handle timeout specifically
      if (errorMessage.includes('timeout')) {
        const timeoutError = 'Login is taking longer than expected. Please check your connection and try again.';
        setError(timeoutError);
        logger.error('❌ Driver login timeout', 'driver-auth', { error: errorMessage });
        return { success: false, error: timeoutError };
      }
      
      // Handle network errors
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        const networkError = 'Unable to connect to the server. Please check your internet connection and try again.';
        setError(networkError);
        logger.error('❌ Driver login network error', 'driver-auth', { error: errorMessage });
        return { success: false, error: networkError };
      }
      
      setError(errorMessage);
      logger.error('❌ Driver login error', 'driver-auth', { error: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
      // Cleanup timeout if still pending
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
        loginTimeoutRef.current = null;
      }
    }
  }, [driverAuthService]);

  // Cleanup login resources on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending login request
      if (loginAbortControllerRef.current) {
        loginAbortControllerRef.current.abort();
        loginAbortControllerRef.current = null;
      }
      
      // Clear any pending timeout
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
        loginTimeoutRef.current = null;
      }
      
      // Reset request ID
      loginRequestIdRef.current = null;
    };
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      logger.info('🚪 Starting driver logout process', 'driver-auth');
      
      // Sign out from Supabase
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        logger.warn('⚠️ Supabase signOut error (continuing with cleanup)', 'driver-auth', { error: signOutError });
      }
      
      // Clear all state
      setIsAuthenticated(false);
      setIsDriver(false);
      setDriverId(null);
      setDriverEmail(null);
      setDriverName(null);
      setBusAssignment(null);
      setIsWebSocketInitializing(false);
      setIsWebSocketConnected(false);
      setIsWebSocketAuthenticated(false);
      
      // Clear localStorage and sessionStorage
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-') || key.includes('driver_assignment'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear sessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-') || key.includes('driver_assignment'))) {
            sessionStorage.removeItem(key);
          }
        }
        
        logger.info('✅ All driver auth data cleared from storage', 'driver-auth');
      } catch (storageError) {
        logger.warn('⚠️ Error clearing storage during logout', 'driver-auth', { error: storageError });
      }
      
      logger.info('✅ Driver logout successful', 'driver-auth');
    } catch (err) {
      logger.error('❌ Driver logout error', 'driver-auth', { error: err });
      setError('Failed to log out');
      // Still clear state even if there's an error
      setIsAuthenticated(false);
      setIsDriver(false);
      setDriverId(null);
      setDriverEmail(null);
      setDriverName(null);
      setBusAssignment(null);
      setIsWebSocketInitializing(false);
      setIsWebSocketConnected(false);
      setIsWebSocketAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh authentication
  const refreshAuth = useCallback(async () => {
    await initializeAuth();
    return { success: true };
  }, [initializeAuth]);

  // Retry WebSocket connection - PRODUCTION FIX: Proper state management
  const retryConnection = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      if (isAuthenticated && isDriver) {
        logger.info('🔄 Retrying WebSocket connection...', 'driver-auth');
        
        // PRODUCTION FIX: Set initializing state
        setIsWebSocketInitializing(true);
        setIsWebSocketConnected(false);
        setIsWebSocketAuthenticated(false);
        
        // Set client type for WebSocket
        unifiedWebSocketService.setClientType('driver');
        
        // Disconnect existing connection if any
        unifiedWebSocketService.disconnect();
        
        // Wait a moment before reconnecting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Connect to WebSocket
        await unifiedWebSocketService.connect();
        
        // Initialize as driver
        const initResult = await unifiedWebSocketService.initializeAsDriver();
        
        // PRODUCTION FIX: Only set connected/authenticated after successful init
        if (initResult) {
          setIsWebSocketConnected(true);
          setIsWebSocketAuthenticated(true);
          setIsWebSocketInitializing(false);
          logger.info('✅ WebSocket connection retried successfully', 'driver-auth');
        } else {
          logger.warn('⚠️ WebSocket driver initialization returned false', 'driver-auth');
          setIsWebSocketInitializing(false);
          setIsWebSocketConnected(false);
          setIsWebSocketAuthenticated(false);
        }
      } else {
        logger.warn('⚠️ Cannot retry WebSocket: not authenticated or not a driver', 'driver-auth');
        setError('Not authenticated as driver');
      }
    } catch (err) {
      logger.error('❌ WebSocket retry failed', 'driver-auth', { error: err });
      setError(`Failed to reconnect: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsWebSocketInitializing(false);
      setIsWebSocketConnected(false);
      setIsWebSocketAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isDriver]);

  // Refresh assignment data
  const refreshAssignment = useCallback(async () => {
    if (!isWebSocketAuthenticated) {
      logger.warn('Cannot refresh assignment: WebSocket not authenticated', 'driver-auth');
      return;
    }

    try {
      logger.info('🔄 Refreshing driver assignment...', 'driver-auth');
      unifiedWebSocketService.requestAssignmentUpdate();
    } catch (error) {
      logger.error('❌ Failed to refresh assignment', 'driver-auth', { error });
    }
  }, [isWebSocketAuthenticated]);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      logger.debug('Auth state changed', 'driver-auth', { event: _event, hasSession: !!session });
      initializeAuth();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initializeAuth]);

  // WebSocket connection management with proper cleanup
  // PRODUCTION FIX: Prevent race condition by tracking initialization state
  useEffect(() => {
    let isMounted = true;
    let connectionTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = async () => {
      if (!isMounted) return;

      try {
        // PRODUCTION FIX: Set initializing state BEFORE connection
        setIsWebSocketInitializing(true);
        setIsWebSocketConnected(false);
        setIsWebSocketAuthenticated(false);
        
        // Set client type for WebSocket
        unifiedWebSocketService.setClientType('driver');
        
        // Set connection timeout
        connectionTimeout = setTimeout(() => {
          if (isMounted) {
            logger.warn('WebSocket connection timeout', 'driver-auth');
            setIsWebSocketInitializing(false);
            setIsWebSocketConnected(false);
            setIsWebSocketAuthenticated(false);
          }
        }, 10000); // 10 second timeout for complete connection + auth

        // Connect to WebSocket
        await unifiedWebSocketService.connect();
        
        if (!isMounted) return;
        
        // PRODUCTION FIX: Don't set connected yet - wait for authentication
        
        // Get access token for WebSocket authentication
        const token = authService.getAccessToken();
        if (!token) {
          logger.error('No access token available for WebSocket authentication', 'driver-auth');
          setIsWebSocketInitializing(false);
          setIsWebSocketConnected(false);
          setIsWebSocketAuthenticated(false);
          return;
        }

        // Initialize as driver (authentication already handled by middleware)
        const initResult = await unifiedWebSocketService.initializeAsDriver();
        
        if (!isMounted) return;
        
        // PRODUCTION FIX: Only set connected and authenticated states AFTER successful initialization
        if (initResult) {
          setIsWebSocketConnected(true);
          setIsWebSocketAuthenticated(true);
          setIsWebSocketInitializing(false);
          logger.info('✅ WebSocket connected and authenticated as driver', 'driver-auth');
        } else {
          logger.error('❌ WebSocket driver initialization failed', 'driver-auth');
          setIsWebSocketInitializing(false);
          setIsWebSocketConnected(false);
          setIsWebSocketAuthenticated(false);
        }
      } catch (err) {
        if (isMounted) {
          logger.error('❌ Failed to connect WebSocket', 'driver-auth', { error: err });
          setIsWebSocketInitializing(false);
          setIsWebSocketConnected(false);
          setIsWebSocketAuthenticated(false);
        }
      } finally {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
      }
    };

    if (isAuthenticated && isDriver) {
      connectWebSocket();
    } else {
      // Disconnect WebSocket if not authenticated
      unifiedWebSocketService.disconnect();
      setIsWebSocketInitializing(false);
      setIsWebSocketConnected(false);
      setIsWebSocketAuthenticated(false);
    }

    return () => {
      isMounted = false;
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      unifiedWebSocketService.disconnect();
    };
  }, [isAuthenticated, isDriver]);

  // Listen for real-time assignment updates with proper cleanup
  useEffect(() => {
    if (!isWebSocketAuthenticated) return;

    let isMounted = true;

    const handleAssignmentUpdate = (data: any) => {
      if (!isMounted) return; // Prevent state updates on unmounted component

      logger.info('📋 Received assignment update:', 'driver-auth', { 
        type: data.type,
        hasAssignment: !!data.assignment 
      });

      if (data.type === 'admin_update' && data.assignment) {
        // Update bus assignment with new data from admin
        const updatedAssignment: DriverBusAssignment = {
          driver_id: data.assignment.driverId,
          bus_id: data.assignment.busId,
          bus_number: data.assignment.busNumber,
          route_id: data.assignment.routeId,
          route_name: data.assignment.routeName,
          driver_name: data.assignment.driverName,
          created_at: new Date().toISOString(),
          updated_at: data.assignment.lastUpdated
        };

        setBusAssignment(updatedAssignment);
        
        // Store assignment data offline for reliability
        offlineStorage.storeData('driver', `assignment_${updatedAssignment.driver_id}`, updatedAssignment as unknown as Record<string, unknown>);
        
        logger.info('✅ Bus assignment updated from admin changes', 'driver-auth', {
          busNumber: updatedAssignment.bus_number,
          routeName: updatedAssignment.route_name
        });
      } else if (data.type === 'removed') {
        // Assignment was removed by admin
        setBusAssignment(null);
        setError(data.message || 'Your bus assignment has been removed by an administrator');
        logger.warn('⚠️ Bus assignment removed by admin', 'driver-auth');
      } else if (data.type === 'refresh' && data.assignment) {
        // Refresh assignment data
        const refreshedAssignment: DriverBusAssignment = {
          driver_id: data.assignment.driverId,
          bus_id: data.assignment.busId,
          bus_number: data.assignment.busNumber,
          route_id: data.assignment.routeId,
          route_name: data.assignment.routeName,
          driver_name: data.assignment.driverName,
          created_at: new Date().toISOString(),
          updated_at: data.assignment.lastUpdated
        };

        setBusAssignment(refreshedAssignment);
        
        // Store refreshed assignment data offline
        offlineStorage.storeData('driver', `assignment_${refreshedAssignment.driver_id}`, refreshedAssignment as unknown as Record<string, unknown>);
        
        logger.info('🔄 Bus assignment refreshed', 'driver-auth');
      }
    };

    // Subscribe to assignment updates
    const unsubscribe = unifiedWebSocketService.onDriverAssignmentUpdate(handleAssignmentUpdate);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isWebSocketAuthenticated]);

  const value: DriverAuthState = {
    isAuthenticated,
    isDriver,
    isLoading,
    error,
    driverId,
    driverEmail,
    driverName,
    busAssignment,
    isWebSocketConnected,
    isWebSocketAuthenticated,
    isWebSocketInitializing, // PRODUCTION FIX: Expose initialization state
    login,
    logout,
    refreshAuth,
    clearError,
    retryConnection,
    refreshAssignment,
  };

  return (
    <DriverAuthContext.Provider value={value}>
      {children}
    </DriverAuthContext.Provider>
  );
};

export const useDriverAuth = (): DriverAuthState => {
  const context = useContext(DriverAuthContext);
  if (context === undefined) {
    throw new Error('useDriverAuth must be used within a DriverAuthProvider');
  }
  return context;
};