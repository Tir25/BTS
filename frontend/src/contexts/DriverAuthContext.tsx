import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
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
  }, []);

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
        // PRODUCTION FIX: Wait for AuthService to fully initialize before validation
        // This prevents the timing issue where DriverAuthContext validates before profile loads
        let validationResult;
        let retryCount = 0;
        const maxRetries = 8; // Increased from 3 to 8 to allow more time
        const retryDelay = 500; // Reduced to 500ms for more frequent checks
        
        logger.debug('🔄 Waiting for AuthService initialization before validation', 'driver-auth', { requestId });
        
        while (retryCount < maxRetries) {
          // Check if AuthService has completed initialization
          if (authService.currentProfile) {
            // AuthService is ready, proceed with validation
            logger.info('✅ AuthService ready, proceeding with validation', 'driver-auth', { requestId, retryCount });
            validationResult = await authService.validateDriverSession();
            break;
          } else {
            // AuthService not ready yet, wait and retry
            logger.debug(`🔄 AuthService not ready, waiting... (attempt ${retryCount + 1}/${maxRetries})`, 'driver-auth', { requestId });
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryCount++;
            
            // Verify request is still current after delay
            if (initializationRequestIdRef.current !== requestId) {
              logger.debug('⚠️ Initialization request superseded during retry wait', 'driver-auth', { requestId });
              return;
            }
          }
        }
        
        // If we still don't have a validation result, try once more (fallback)
        if (!validationResult) {
          logger.warn('⚠️ AuthService still not ready after retries, attempting validation anyway', 'driver-auth', { requestId, totalWaitTime: maxRetries * retryDelay });
          validationResult = await authService.validateDriverSession();
        }
        
        // Verify request is still current after validation
        if (initializationRequestIdRef.current !== requestId) {
          logger.debug('⚠️ Initialization request superseded after validation', 'driver-auth', { requestId });
          return;
        }
        
        if (validationResult.isValid && validationResult.assignment) {
          setIsAuthenticated(true);
          setIsDriver(true);
          setDriverId(validationResult.assignment.driver_id);
          setDriverEmail(session.user.email || null);
          setDriverName(validationResult.assignment.driver_name);
          setBusAssignment(validationResult.assignment);
          
          // Store assignment data offline for reliability
          offlineStorage.storeData('driver', `assignment_${validationResult.assignment.driver_id}`, validationResult.assignment as unknown as Record<string, unknown>);
          
          logger.info('✅ Driver session validated successfully', 'driver-auth', { requestId });
        } else {
          logger.warn('❌ Driver validation failed', 'driver-auth', { error: validationResult.errorMessage, requestId });
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
      
      // SIMPLIFIED: Use centralized authService for login
      const loginPromise = authService.signIn(email, password);

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
      let loginResult: { success: boolean; error?: string; user?: any } | null = null;
      
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
        if (result.success && result.user) {
          // SIMPLIFIED: Get driver assignment after successful login
          const assignment = await authService.getDriverBusAssignment(result.user.id);
          
          if (assignment) {
            setIsAuthenticated(true);
            setIsDriver(true);
            setDriverId(result.user.id);
            setDriverEmail(email);
            setDriverName(assignment.driver_name);
            setBusAssignment(assignment);
            
            // Store assignment data offline for reliability
            offlineStorage.storeData('driver', `assignment_${result.user.id}`, assignment as unknown as Record<string, unknown>);
            
            logger.info('✅ Driver login successful', 'driver-auth', { driverId: result.user.id });
            return { success: true };
          } else {
            logger.warn('❌ No bus assignment found after login', 'driver-auth');
            await authService.signOut(); // Sign out if no assignment
            return { success: false, error: 'No bus assignment found. Please contact your administrator.' };
          }
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
  }, []);

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

  // PRODUCTION FIX: Simplified WebSocket connection management with event-driven state
  useEffect(() => {
    let isMounted = true;

    const connectWebSocket = async () => {
      if (!isMounted) return;

      try {
        setIsWebSocketInitializing(true);
        setIsWebSocketConnected(false);
        setIsWebSocketAuthenticated(false);
        
        // Set client type for WebSocket
        unifiedWebSocketService.setClientType('driver');
        
        // Connect to WebSocket
        await unifiedWebSocketService.connect();
        
        // Initialize as driver
        const initResult = await unifiedWebSocketService.initializeAsDriver();
        
        if (isMounted) {
          setIsWebSocketInitializing(false);
          setIsWebSocketConnected(true);
          setIsWebSocketAuthenticated(initResult);
          
          if (initResult) {
            logger.info('✅ WebSocket connected and authenticated as driver', 'driver-auth');
          } else {
            logger.error('❌ WebSocket driver initialization failed', 'driver-auth');
          }
        }
      } catch (err) {
        if (isMounted) {
          logger.error('❌ Failed to connect WebSocket', 'driver-auth', { error: err });
          setIsWebSocketInitializing(false);
          setIsWebSocketConnected(false);
          setIsWebSocketAuthenticated(false);
        }
      }
    };

    // PRODUCTION FIX: Event-driven connection state management
    const unsubscribeConnectionState = unifiedWebSocketService.onConnectionStateChange((state) => {
      if (!isMounted) return;
      
      setIsWebSocketInitializing(state.connectionState === 'connecting' || state.connectionState === 'reconnecting');
      setIsWebSocketConnected(state.isConnected);
      setIsWebSocketAuthenticated(state.isAuthenticated);
    });

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
      unsubscribeConnectionState();
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