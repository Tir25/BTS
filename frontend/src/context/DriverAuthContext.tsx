import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { DriverBusAssignment, authService } from '../services/authService';
import { unifiedWebSocketService } from '../services/UnifiedWebSocketService';
import { offlineStorage } from '../services/offline/OfflineStorage';
import { timeoutConfig } from '../config/timeoutConfig';
import { logger } from '../utils/logger';

interface DriverAuthState {
  isAuthenticated: boolean;
  isDriver: boolean;
  isLoading: boolean;
  error: string | null;
  
  driverId: string | null;
  driverEmail: string | null;
  driverName: string | null;
  busAssignment: DriverBusAssignment | null;
  
  isWebSocketConnected: boolean;
  isWebSocketAuthenticated: boolean;
  isWebSocketInitializing: boolean;
  
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverEmail, setDriverEmail] = useState<string | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [busAssignment, setBusAssignment] = useState<DriverBusAssignment | null>(null);
  const mergeAssignmentShift = useCallback((assignment: DriverBusAssignment): DriverBusAssignment => ({
    ...assignment,
    shift_id: assignment.shift_id ?? busAssignment?.shift_id ?? null,
    shift_name: assignment.shift_name ?? busAssignment?.shift_name ?? null,
    shift_start_time: assignment.shift_start_time ?? busAssignment?.shift_start_time ?? null,
    shift_end_time: assignment.shift_end_time ?? busAssignment?.shift_end_time ?? null,
  }), [busAssignment]);
  
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [isWebSocketAuthenticated, setIsWebSocketAuthenticated] = useState(false);
  const [isWebSocketInitializing, setIsWebSocketInitializing] = useState(false);

  const initializationRef = useRef<Promise<void> | null>(null);
  const initializationInProgressRef = useRef<boolean>(false);
  const initializationRequestIdRef = useRef<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initializeAuth = useCallback(async () => {
    const requestId = `init_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (initializationInProgressRef.current && initializationRef.current) {
      logger.debug('🔄 Initialization already in progress, waiting for existing promise', 'driver-auth', { requestId });
      try {
        await initializationRef.current;
        if (initializationRequestIdRef.current === requestId || !initializationInProgressRef.current) {
          return;
        }
      } catch (error) {
        logger.warn('⚠️ Previous initialization failed, starting new one', 'driver-auth', { error, requestId });
      }
    }

    initializationInProgressRef.current = true;
    initializationRequestIdRef.current = requestId;
    const initPromise = performInitialization(requestId);
    initializationRef.current = initPromise;
    try {
      await initPromise;
    } catch (error) {
      logger.error('❌ Initialization error', 'driver-auth', { error, requestId });
      initializationInProgressRef.current = false;
      initializationRef.current = null;
      throw error;
    } finally {
      if (initializationRequestIdRef.current === requestId) {
        initializationInProgressRef.current = false;
        initializationRef.current = null;
        initializationRequestIdRef.current = null;
      }
    }
  }, []);

  const performInitialization = async (requestId: string): Promise<void> => {
    if (initializationRequestIdRef.current !== requestId) {
      logger.debug('⚠️ Initialization request superseded', 'driver-auth', { requestId });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (initializationRequestIdRef.current !== requestId) {
        logger.debug('⚠️ Initialization request superseded after session check', 'driver-auth', { requestId });
        return;
      }
      
      if (session?.user) {
        let validationResult;
        let retryCount = 0;
        const maxRetries = 8;
        const retryDelay = 500;
        
        logger.debug('🔄 Waiting for AuthService initialization before validation', 'driver-auth', { requestId });
        
        // PRODUCTION FIX: Ensure profile is loaded before validation
        // Try to load profile if not available
        if (!authService.currentProfile && session.user) {
          logger.info('🔄 Profile not loaded, attempting to load now', 'driver-auth', { requestId });
          try {
            // Wait a bit for authService to initialize after session check
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // If still no profile, try to trigger profile loading
            if (!authService.currentProfile) {
              logger.info('🔄 Triggering profile load', 'driver-auth', { requestId });
              // Profile will be loaded by validateDriverSession if needed
            }
          } catch (loadError) {
            logger.warn('⚠️ Error during profile load attempt', 'driver-auth', { error: loadError, requestId });
          }
        }
        
        while (retryCount < maxRetries) {
          if (authService.currentProfile) {
            logger.info('✅ AuthService ready, proceeding with validation', 'driver-auth', { requestId, retryCount });
            validationResult = await authService.validateDriverSession();
            break;
          } else {
            logger.debug(`🔄 AuthService not ready, waiting... (attempt ${retryCount + 1}/${maxRetries})`, 'driver-auth', { requestId });
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryCount++;
            if (initializationRequestIdRef.current !== requestId) {
              logger.debug('⚠️ Initialization request superseded during retry wait', 'driver-auth', { requestId });
              return;
            }
          }
        }
        
        // PRODUCTION FIX: Always attempt validation even if profile check failed
        // validateDriverSession will handle profile loading internally
        if (!validationResult) {
          logger.warn('⚠️ AuthService still not ready after retries, attempting validation anyway', 'driver-auth', { requestId, totalWaitTime: maxRetries * retryDelay });
          validationResult = await authService.validateDriverSession();
        }
        
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
          setBusAssignment(mergeAssignmentShift(validationResult.assignment));
          offlineStorage.storeData('driver', `assignment_${validationResult.assignment.driver_id}`, validationResult.assignment as unknown as Record<string, unknown>);
          logger.info('✅ Driver session validated successfully', 'driver-auth', { requestId });
        } else {
          logger.warn('❌ Driver validation failed', 'driver-auth', { error: validationResult.errorMessage, requestId });
          setIsAuthenticated(false);
          setIsDriver(false);
          try {
            const offlineAssignment = await offlineStorage.getData('driver', `assignment_${session.user.id}`);
            if (offlineAssignment && initializationRequestIdRef.current === requestId) {
              setBusAssignment(mergeAssignmentShift(offlineAssignment as unknown as DriverBusAssignment));
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
      if (initializationRequestIdRef.current === requestId) {
        logger.error('❌ Error initializing auth', 'driver-auth', { error: err, requestId });
        setError('Failed to initialize authentication');
        setIsAuthenticated(false);
        setIsDriver(false);
      }
    } finally {
      if (initializationRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  const loginRequestIdRef = useRef<string | null>(null);
  const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loginAbortControllerRef = useRef<AbortController | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    const requestId = `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    loginRequestIdRef.current = requestId;
    if (loginAbortControllerRef.current) {
      loginAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    loginAbortControllerRef.current = abortController;
    if (loginTimeoutRef.current) {
      clearTimeout(loginTimeoutRef.current);
      loginTimeoutRef.current = null;
    }
    try {
      logger.info('🔐 Attempting driver login...', 'driver-auth', { email, requestId });
      const loginTimeoutMs = timeoutConfig.auth.signIn;
      const loginPromise = authService.signIn(email, password);
      const timeoutPromise = new Promise<never>((_, reject) => {
        loginTimeoutRef.current = setTimeout(() => {
          if (loginRequestIdRef.current === requestId && !abortController.signal.aborted) {
            abortController.abort();
            reject(new Error(`Login timeout after ${loginTimeoutMs / 1000}s`));
          }
        }, loginTimeoutMs);
      });

      let loginCompleted = false;
      let loginResult: { success: boolean; error?: string; user?: any } | null = null;
      try {
        const trackedLoginPromise = loginPromise.then(result => {
          if (loginRequestIdRef.current === requestId && !abortController.signal.aborted) {
            loginCompleted = true;
            loginResult = result;
            if (loginTimeoutRef.current) {
              clearTimeout(loginTimeoutRef.current);
              loginTimeoutRef.current = null;
            }
            return result;
          }
          throw new Error('Login request cancelled');
        });
        const trackedTimeoutPromise = timeoutPromise.catch(error => {
          if (loginCompleted && loginResult) {
            logger.debug('⚠️ Timeout fired but login already completed', 'driver-auth');
            return loginResult;
          }
          throw error;
        });

        const [loginSettled, timeoutSettled] = await Promise.allSettled([
          trackedLoginPromise,
          trackedTimeoutPromise
        ]);
        if (loginRequestIdRef.current !== requestId) {
          logger.warn('⚠️ Login request superseded by newer request', 'driver-auth');
          return { success: false, error: 'Login cancelled' };
        }
        let result: DriverAuthResult;
        if (loginSettled.status === 'fulfilled') {
          result = loginSettled.value;
          if (loginTimeoutRef.current) {
            clearTimeout(loginTimeoutRef.current);
            loginTimeoutRef.current = null;
          }
        } else if (loginCompleted && loginResult) {
          logger.debug('⚠️ Timeout was processing but login already completed', 'driver-auth');
          result = loginResult;
          if (loginTimeoutRef.current) {
            clearTimeout(loginTimeoutRef.current);
            loginTimeoutRef.current = null;
          }
        } else if (timeoutSettled.status === 'rejected') {
          const timeoutError = timeoutSettled.reason;
          if (timeoutError instanceof Error && timeoutError.message.includes('timeout')) {
            result = { success: false, error: `Login timeout after ${loginTimeoutMs / 1000}s` } as any;
          } else {
            result = { success: false, error: 'Login timeout. Please try again.' } as any;
          }
        } else {
          const error = (loginSettled as any).reason;
          const errorMsg = error instanceof Error ? error.message : 'Login failed';
          result = { success: false, error: errorMsg } as any;
        }
        if (result.success && (result as any).user) {
          // PRODUCTION FIX: Verify user profile is valid before proceeding
          const userProfile = (result as any).user;
          if (!userProfile || !userProfile.id) {
            logger.error('❌ Invalid user profile returned from sign-in', 'driver-auth');
            setError('Authentication succeeded but user data is invalid. Please try again.');
            return { success: false, error: 'Invalid user data received' };
          }
          
          // PRODUCTION FIX: Set authentication state immediately after successful sign-in
          // Don't wait for assignment to complete - assignment can load in background
          setIsAuthenticated(true);
          setIsDriver(true);
          setDriverId(userProfile.id);
          setDriverEmail(email);
          
          // PRODUCTION FIX: Set driver name from profile if available
          if (userProfile.full_name) {
            setDriverName(userProfile.full_name);
          }
          
          // PRODUCTION FIX: Fetch assignment with timeout and proper error handling
          // Use Promise.race to enforce timeout
          const assignmentTimeout = timeoutConfig.api.busAssignment || 8000;
          const assignmentPromise = authService.getDriverBusAssignment(userProfile.id);
          const timeoutPromise = new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), assignmentTimeout);
          });
          
          try {
            const assignment = await Promise.race([assignmentPromise, timeoutPromise]);
            
            if (assignment) {
              setDriverName(assignment.driver_name || userProfile.full_name || email);
              setBusAssignment(mergeAssignmentShift(assignment));
              offlineStorage.storeData('driver', `assignment_${userProfile.id}`, assignment as unknown as Record<string, unknown>);
              logger.info('✅ Driver login successful with assignment', 'driver-auth', { 
                driverId: userProfile.id,
                busNumber: assignment.bus_number 
              });
              setError(null); // Clear any previous errors
            } else {
              // PRODUCTION FIX: Allow login to proceed even without assignment
              // Assignment can be loaded later or user can contact admin
              logger.warn('⚠️ No bus assignment found after login (allowing login to proceed)', 'driver-auth', {
                driverId: userProfile.id
              });
              setError('No active bus assignment found. Please contact your administrator to get assigned to a bus.');
              // Don't sign out - let user see the dashboard with error message
            }
            
            return { success: true };
          } catch (assignmentError) {
            // PRODUCTION FIX: Don't fail login if assignment fetch fails
            // Authentication succeeded, assignment loading can be retried
            logger.error('❌ Error fetching assignment after login (allowing login to proceed)', 'driver-auth', { 
              error: assignmentError instanceof Error ? assignmentError.message : String(assignmentError),
              driverId: userProfile.id
            });
            setError('Login successful, but unable to load bus assignment. Please refresh or contact support.');
            return { success: true }; // Still return success since auth succeeded
          }
        } else {
          const errorMsg = (result as any).error || 'Login failed';
          
          // PRODUCTION FIX: Prevent retry loops by clearing loading state immediately
          setIsLoading(false);
          setError(errorMsg);
          
          logger.error('❌ Driver login failed', 'driver-auth', { 
            error: errorMsg,
            email,
            requestId 
          });
          
          // PRODUCTION FIX: For invalid credentials, stop immediately to prevent loops
          if (errorMsg.includes('Invalid') || errorMsg.includes('invalid_credentials')) {
            logger.warn('⚠️ Invalid credentials - stopping login attempts', 'driver-auth', { email });
            // Clear any pending timeouts
            if (loginTimeoutRef.current) {
              clearTimeout(loginTimeoutRef.current);
              loginTimeoutRef.current = null;
            }
            // Clear abort controller
            if (loginAbortControllerRef.current) {
              loginAbortControllerRef.current.abort();
              loginAbortControllerRef.current = null;
            }
          }
          
          return { success: false, error: errorMsg };
        }
      } catch (raceError) {
        if (raceError instanceof Error && raceError.message.includes('cancelled')) {
          logger.warn('⚠️ Login request was cancelled', 'driver-auth');
          return { success: false, error: 'Login was cancelled' };
        }
        throw raceError;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      if (errorMessage.includes('timeout')) {
        const timeoutError = 'Login is taking longer than expected. Please check your connection and try again.';
        setError(timeoutError);
        logger.error('❌ Driver login timeout', 'driver-auth', { error: errorMessage });
        return { success: false, error: timeoutError };
      }
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
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
        loginTimeoutRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (loginAbortControllerRef.current) {
        loginAbortControllerRef.current.abort();
        loginAbortControllerRef.current = null;
      }
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
        loginTimeoutRef.current = null;
      }
      loginRequestIdRef.current = null;
    };
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      logger.info('🚪 Starting driver logout process', 'driver-auth');
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        logger.warn('⚠️ Supabase signOut error (continuing with cleanup)', 'driver-auth', { error: signOutError });
      }
      setIsAuthenticated(false);
      setIsDriver(false);
      setDriverId(null);
      setDriverEmail(null);
      setDriverName(null);
      setBusAssignment(null);
      setIsWebSocketInitializing(false);
      setIsWebSocketConnected(false);
      setIsWebSocketAuthenticated(false);
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-') || key.includes('driver_assignment'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
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

  const refreshAuth = useCallback(async () => {
    await initializeAuth();
    return { success: true };
  }, [initializeAuth]);

  const retryConnection = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      if (isAuthenticated && isDriver) {
        logger.info('🔄 Retrying WebSocket connection...', 'driver-auth');
        setIsWebSocketInitializing(true);
        setIsWebSocketConnected(false);
        setIsWebSocketAuthenticated(false);
        unifiedWebSocketService.setClientType('driver');
        unifiedWebSocketService.disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await unifiedWebSocketService.connect();
        const initResult = await unifiedWebSocketService.initializeAsDriver();
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

  const refreshAssignment = useCallback(async () => {
    if (!isAuthenticated || !driverId) {
      logger.warn('Cannot refresh assignment: Not authenticated or no driver ID', 'driver-auth');
      return;
    }
    
    try {
      logger.info('🔄 Refreshing driver assignment...', 'driver-auth', { driverId });
      
      // PRODUCTION FIX: Try both WebSocket and direct API fetch
      if (isWebSocketAuthenticated) {
        unifiedWebSocketService.requestAssignmentUpdate();
      }
      
      // Also try direct API fetch as fallback
      const assignment = await authService.getDriverBusAssignment(driverId);
      if (assignment) {
        setBusAssignment(mergeAssignmentShift(assignment));
        setDriverName(assignment.driver_name);
        offlineStorage.storeData('driver', `assignment_${driverId}`, assignment as unknown as Record<string, unknown>);
        logger.info('✅ Assignment refreshed successfully', 'driver-auth', {
          busNumber: assignment.bus_number,
          routeName: assignment.route_name
        });
        setError(null); // Clear any previous assignment errors
      } else {
        logger.warn('⚠️ No assignment found during refresh', 'driver-auth');
        setError('No active bus assignment found. Please contact your administrator.');
      }
    } catch (error) {
      logger.error('❌ Failed to refresh assignment', 'driver-auth', { error });
      setError('Failed to refresh assignment. Please try again or contact support.');
    }
  }, [isAuthenticated, isWebSocketAuthenticated, driverId]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      logger.debug('Auth state changed', 'driver-auth', { event: _event, hasSession: !!session });
      initializeAuth();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [initializeAuth]);

  useEffect(() => {
    let isMounted = true;
    const connectWebSocket = async () => {
      if (!isMounted) return;
      try {
        setIsWebSocketInitializing(true);
        setIsWebSocketConnected(false);
        setIsWebSocketAuthenticated(false);
        unifiedWebSocketService.setClientType('driver');
        await unifiedWebSocketService.connect();
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
    // PRODUCTION FIX: Wrap connection state listener in try-catch to prevent crashes
    let unsubscribeConnectionState: (() => void) | null = null;
    try {
      unsubscribeConnectionState = unifiedWebSocketService.onConnectionStateChange((state) => {
        try {
          if (!isMounted) return;
          setIsWebSocketInitializing(state.connectionState === 'connecting' || state.connectionState === 'reconnecting');
          setIsWebSocketConnected(state.isConnected);
          setIsWebSocketAuthenticated(state.isAuthenticated);
        } catch (error) {
          logger.error('Error updating WebSocket state in DriverAuthContext', 'driver-auth', { error });
        }
      });
    } catch (error) {
      logger.error('Error subscribing to WebSocket connection state', 'driver-auth', { error });
      // Continue execution even if subscription fails - set default states
      setIsWebSocketInitializing(false);
      setIsWebSocketConnected(false);
      setIsWebSocketAuthenticated(false);
    }
    // PRODUCTION FIX: Also retry assignment loading if authenticated but no assignment
    const retryAssignmentIfNeeded = async () => {
      if (isAuthenticated && isDriver && driverId && !busAssignment) {
        logger.info('🔄 Retrying assignment fetch in background', 'driver-auth', { driverId });
        try {
          const assignment = await authService.getDriverBusAssignment(driverId);
          if (assignment && isMounted) {
            setBusAssignment(mergeAssignmentShift(assignment));
            setDriverName(assignment.driver_name);
            offlineStorage.storeData('driver', `assignment_${driverId}`, assignment as unknown as Record<string, unknown>);
            logger.info('✅ Assignment loaded in background', 'driver-auth', {
              busNumber: assignment.bus_number
            });
          }
        } catch (assignmentError) {
          logger.warn('⚠️ Background assignment fetch failed', 'driver-auth', { error: assignmentError });
        }
      }
    };
    
    if (isAuthenticated && isDriver) {
      connectWebSocket();
      // PRODUCTION FIX: Retry assignment after a short delay if not already loaded
      setTimeout(() => {
        if (isMounted) {
          retryAssignmentIfNeeded();
        }
      }, 2000);
    } else {
      unifiedWebSocketService.disconnect();
      setIsWebSocketInitializing(false);
      setIsWebSocketConnected(false);
      setIsWebSocketAuthenticated(false);
    }
    return () => {
      isMounted = false;
      try {
        if (unsubscribeConnectionState) {
          unsubscribeConnectionState();
        }
      } catch (error) {
        logger.warn('Error unsubscribing from connection state', 'driver-auth', { error });
      }
      try {
        unifiedWebSocketService.disconnect();
      } catch (error) {
        logger.warn('Error disconnecting WebSocket', 'driver-auth', { error });
      }
    };
  }, [isAuthenticated, isDriver, driverId, busAssignment]);

  useEffect(() => {
    if (!isWebSocketAuthenticated) return;
    let isMounted = true;
    const handleAssignmentUpdate = (data: any) => {
      if (!isMounted) return;
      logger.info('📋 Received assignment update:', 'driver-auth', { 
        type: data.type,
        hasAssignment: !!data.assignment 
      });
      if (data.type === 'admin_update' && data.assignment) {
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
        setBusAssignment(mergeAssignmentShift(updatedAssignment));
        offlineStorage.storeData('driver', `assignment_${updatedAssignment.driver_id}`, updatedAssignment as unknown as Record<string, unknown>);
        logger.info('✅ Bus assignment updated from admin changes', 'driver-auth', {
          busNumber: updatedAssignment.bus_number,
          routeName: updatedAssignment.route_name
        });
      } else if (data.type === 'removed') {
        setBusAssignment(null);
        setError(data.message || 'Your bus assignment has been removed by an administrator');
        logger.warn('⚠️ Bus assignment removed by admin', 'driver-auth');
      } else if (data.type === 'refresh' && data.assignment) {
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
        setBusAssignment(mergeAssignmentShift(refreshedAssignment));
        offlineStorage.storeData('driver', `assignment_${refreshedAssignment.driver_id}`, refreshedAssignment as unknown as Record<string, unknown>);
        logger.info('🔄 Bus assignment refreshed', 'driver-auth');
      }
    };
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
    isWebSocketInitializing,
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

