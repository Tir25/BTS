import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase, getDriverSupabaseClient } from '../config/supabase';
import { DriverBusAssignment, authService } from '../services/authService';
import { unifiedWebSocketService } from '../services/UnifiedWebSocketService';
import { offlineStorage } from '../services/offline/OfflineStorage';
import { timeoutConfig, withTimeout } from '../config/timeoutConfig';
import { logger } from '../utils/logger';
import { apiService } from '../api/api';

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
  
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; code?: string }>;
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

    // PRODUCTION FIX: Don't set loading state if already authenticated (prevents blocking redirect after login)
    // Only set loading if we're not already authenticated, to avoid interfering with post-login redirect
    if (!isAuthenticated) {
      setIsLoading(true);
    }
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
        
        // PRODUCTION FIX: Ensure AuthService is ready before validation
        // Wait for AuthService to be initialized (with timeout protection)
        let authServiceReady = false;
        const maxAuthServiceWaitAttempts = 10;
        const authServiceWaitDelay = 200;
        
        for (let waitAttempt = 0; waitAttempt < maxAuthServiceWaitAttempts; waitAttempt++) {
          if (authService.isInitialized()) {
            authServiceReady = true;
            logger.debug('✅ AuthService ready', 'driver-auth', { 
              requestId, 
              waitAttempt: waitAttempt + 1 
            });
            break;
          }
          
          if (waitAttempt < maxAuthServiceWaitAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, authServiceWaitDelay));
          }
        }
        
        if (!authServiceReady) {
          logger.warn('⚠️ AuthService not ready after waiting, proceeding anyway', 'driver-auth', {
            requestId,
            waitAttempts: maxAuthServiceWaitAttempts
          });
        }
        
        // PRODUCTION FIX: Ensure profile is loaded before validation
        // Try to load profile if not available
        if (!authService.getCurrentProfile() && session.user) {
          logger.info('🔄 Profile not loaded, attempting to load now', 'driver-auth', { requestId });
          try {
            // Wait a bit for authService to initialize after session check
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // If still no profile, try to trigger profile loading
            if (!authService.getCurrentProfile()) {
              logger.info('🔄 Triggering profile load', 'driver-auth', { requestId });
              // Profile will be loaded by validateDriverSession if needed
            }
          } catch (loadError) {
            logger.warn('⚠️ Error during profile load attempt', 'driver-auth', { error: loadError, requestId });
          }
        }
        
        while (retryCount < maxRetries) {
          if (authService.getCurrentProfile()) {
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
      setIsLoading(false);
    }
  };

  const loginRequestIdRef = useRef<string | null>(null);
  const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loginAbortControllerRef = useRef<AbortController | null>(null);
  const isLoginInProgressRef = useRef<boolean>(false);

  const login = useCallback(async (email: string, password: string) => {
    // PRODUCTION FIX: Prevent concurrent login attempts
    if (isLoginInProgressRef.current) {
      logger.warn('⚠️ Login already in progress, rejecting concurrent attempt', 'driver-auth');
      return { success: false, error: 'Login is already in progress. Please wait.' };
    }
    
    isLoginInProgressRef.current = true;
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
      logger.info('🔐 Attempting driver login via backend API...', 'driver-auth', { email, requestId });
      
      // PRODUCTION FIX: Call backend API instead of direct Supabase authentication
      // This ensures proper validation, assignment fetching, and error handling
      const loginTimeoutMs = timeoutConfig.auth.signIn;
      const loginPromise = apiService.driverLogin(email, password);
      
      // PRODUCTION FIX: Create timeout promise that can be cancelled
      let timeoutHandle: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          if (loginRequestIdRef.current === requestId && !abortController.signal.aborted) {
            abortController.abort();
            reject(new Error(`Login timeout after ${loginTimeoutMs / 1000}s`));
          }
        }, loginTimeoutMs);
        loginTimeoutRef.current = timeoutHandle;
      });

      try {
        // PRODUCTION FIX: Use Promise.race to get the first result (login or timeout)
        // This ensures we don't wait for the timeout if login completes first
        logger.debug('⏳ Waiting for login (with timeout protection)', 'driver-auth', { requestId, timeoutMs: loginTimeoutMs });
        
        const result = await Promise.race([
          loginPromise.then(result => {
            // Clear timeout immediately when login completes
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
              loginTimeoutRef.current = null;
            }
            logger.debug('✅ Login promise resolved', 'driver-auth', { 
              success: result.success, 
              hasError: !!result.error,
              requestId 
            });
            
            // Check if request was cancelled
            if (loginRequestIdRef.current !== requestId || abortController.signal.aborted) {
              logger.warn('⚠️ Login completed but request was cancelled', 'driver-auth', { requestId });
              throw new Error('Login request cancelled');
            }
            
            return result;
          }),
          timeoutPromise.catch(error => {
            // Clear timeout reference
            loginTimeoutRef.current = null;
            logger.error('❌ Login timeout', 'driver-auth', { 
              error: error instanceof Error ? error.message : String(error),
              requestId 
            });
            throw error;
          })
        ]);
        
        // Check if request was superseded
        if (loginRequestIdRef.current !== requestId) {
          logger.warn('⚠️ Login request superseded by newer request', 'driver-auth');
          setIsLoading(false);
          return { success: false, error: 'Login cancelled' };
        }
        
        logger.debug('🔍 Processing login result', 'driver-auth', { 
          success: result.success, 
          hasData: !!result.data,
          hasError: !!result.error,
          requestId 
        });
        
        if (result.success && result.data) {
          // PRODUCTION FIX: Backend API returns user, assignment, and session in one response
          const { user, assignment, session } = result.data;

          if (!session?.access_token || !session?.refresh_token) {
            logger.error('❌ Invalid session payload received from backend login', 'driver-auth', {
              hasAccessToken: !!session?.access_token,
              hasRefreshToken: !!session?.refresh_token,
              driverId: user?.id,
            });
            setError('Authentication failed due to invalid session data. Please try again.');
            if (loginRequestIdRef.current === requestId) {
              setIsLoading(false);
            }
            return { success: false, error: 'Invalid session data received' };
          }
          
          if (!user || !user.id) {
            logger.error('❌ Invalid user data returned from backend API', 'driver-auth');
            setError('Authentication succeeded but user data is invalid. Please try again.');
            return { success: false, error: 'Invalid user data received' };
          }
          
          // PRODUCTION FIX: Set Supabase session using token from backend response with retry logic
          // This ensures Supabase client has the session for subsequent API calls
          // Critical: This must succeed for profile loading to work properly
          let sessionSetSuccessfully = false;
          const maxSessionRetries = 3;
          const sessionRetryDelay = 500;
          
          for (let attempt = 0; attempt < maxSessionRetries; attempt++) {
          try {
            const driverSupabase = getDriverSupabaseClient();
              
              // Use longer timeout for session setting (critical operation)
              const sessionTimeout = attempt === 0 
                ? timeoutConfig.auth.tokenValidation 
                : timeoutConfig.auth.tokenValidation * 2; // Double timeout on retries
              
            const { error: setSessionError } = await withTimeout(
              driverSupabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              }),
                sessionTimeout,
                `Setting Supabase session timed out after ${sessionTimeout}ms (attempt ${attempt + 1}/${maxSessionRetries})`
            );
            
            if (setSessionError) {
                logger.warn(`⚠️ Failed to set Supabase session (attempt ${attempt + 1}/${maxSessionRetries})`, 'driver-auth', { 
                  error: setSessionError.message,
                  attempt: attempt + 1
                });
                
                // If not the last attempt, wait before retrying
                if (attempt < maxSessionRetries - 1) {
                  await new Promise(resolve => setTimeout(resolve, sessionRetryDelay * (attempt + 1)));
                  continue;
            } else {
                  // Last attempt failed - log error but continue
                  logger.error('❌ Failed to set Supabase session after all retries', 'driver-auth', {
                    error: setSessionError.message,
                    attempts: maxSessionRetries
                  });
                }
              } else {
                sessionSetSuccessfully = true;
                logger.info('✅ Supabase session set successfully', 'driver-auth', {
                  attempt: attempt + 1
                });
                break;
            }
          } catch (sessionError) {
              logger.warn(`⚠️ Error setting Supabase session (attempt ${attempt + 1}/${maxSessionRetries})`, 'driver-auth', { 
                error: sessionError instanceof Error ? sessionError.message : String(sessionError),
                attempt: attempt + 1
              });
              
              // If not the last attempt, wait before retrying
              if (attempt < maxSessionRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, sessionRetryDelay * (attempt + 1)));
                continue;
              } else {
                // Last attempt failed - log error
                logger.error('❌ Error setting Supabase session after all retries', 'driver-auth', {
                  error: sessionError instanceof Error ? sessionError.message : String(sessionError),
                  attempts: maxSessionRetries
                });
              }
            }
          }
          
          // PRODUCTION FIX: If session setting failed, we still continue but log a warning
          // The backend auth succeeded, so we can proceed, but profile loading might be slower
          if (!sessionSetSuccessfully) {
            logger.warn('⚠️ Continuing login despite session setting failure - profile loading may be slower', 'driver-auth', {
              driverId: user.id
            });
          }
          
          // PRODUCTION FIX: Set authentication state with data from backend response
          setIsAuthenticated(true);
          setIsDriver(true);
          setDriverId(user.id);
          setDriverEmail(user.email || email);
          setDriverName(user.full_name || assignment.driver_name || email);
          
          // PRODUCTION FIX: Set assignment from backend response (already includes all data)
          if (assignment) {
            const driverAssignment: DriverBusAssignment = {
              driver_id: assignment.driver_id,
              bus_id: assignment.bus_id,
              bus_number: assignment.bus_number,
              route_id: assignment.route_id,
              route_name: assignment.route_name,
              driver_name: assignment.driver_name,
              created_at: assignment.created_at,
              updated_at: assignment.updated_at,
              shift_id: assignment.shift_id,
              shift_name: assignment.shift_name,
              shift_start_time: assignment.shift_start_time,
              shift_end_time: assignment.shift_end_time,
            };
            setBusAssignment(mergeAssignmentShift(driverAssignment));
            offlineStorage.storeData('driver', `assignment_${user.id}`, driverAssignment as unknown as Record<string, unknown>);
            logger.info('✅ Driver login successful with assignment', 'driver-auth', { 
              driverId: user.id,
              busNumber: assignment.bus_number,
              routeName: assignment.route_name
            });
            setError(null); // Clear any previous errors
          } else {
            // PRODUCTION FIX: Allow login to proceed even without assignment
            logger.warn('⚠️ No bus assignment in backend response (allowing login to proceed)', 'driver-auth', {
              driverId: user.id
            });
            setError('No active bus assignment found. Please contact your administrator to get assigned to a bus.');
          }
          
          // PRODUCTION FIX: Ensure loading is false BEFORE returning to allow redirect to happen
          // This is critical - the redirect depends on !isLoading, so we must set it false here
          // Set all state flags atomically to prevent race conditions
          setIsLoading(false);
          setIsAuthenticated(true); // Ensure this is set (redundant but safe)
          initializationInProgressRef.current = false;
          initializationRef.current = null;
          initializationRequestIdRef.current = null;
          
          // PRODUCTION FIX: Use requestAnimationFrame for state propagation instead of setTimeout
          // This ensures state updates are flushed before next render cycle
          await new Promise(resolve => {
            // Use double RAF to ensure state is fully propagated
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve(undefined);
              });
            });
          });
          
          // PRODUCTION FIX: authService will automatically update via Supabase auth state change listener
          // The session we set above will trigger the listener and load the profile
          // No need to manually call loadUserProfile as it's handled automatically
          
          logger.info('✅ Login complete, state synced, ready for redirect', 'driver-auth', {
            driverId: user.id,
            hasAssignment: !!assignment
          });
          
          return { success: true };
        } else {
          // PRODUCTION FIX: Handle login failure - set error and clear loading state immediately
          const errorMsg = result.error || result.message || 'Login failed';
          const errorCode = result.code || 'LOGIN_ERROR';
          const statusCode = result.status;

          if (errorCode === 'ROUTE_NOT_ASSIGNED' || statusCode === 409) {
            const assignmentPendingMessage =
              'Your driver assignment is still being configured. Please contact your administrator to complete the route assignment before logging in.';

            logger.warn('⚠️ Driver login blocked: assignment missing route', 'driver-auth', {
              email,
              statusCode,
              errorCode,
            });

            setError(assignmentPendingMessage);
            if (loginRequestIdRef.current === requestId) {
              setIsLoading(false);
            }

            return { success: false, error: assignmentPendingMessage, code: 'ROUTE_NOT_ASSIGNED' };
          }
          
          logger.error('❌ Driver login failed via backend API', 'driver-auth', { 
            error: errorMsg,
            code: errorCode,
            result,
            requestId
          });
          
          // PRODUCTION FIX: Set error state and clear loading immediately
          // This ensures UI updates immediately on error
          setError(errorMsg);
          // Clear loading state immediately - finally block will also clear it as safety net
          if (loginRequestIdRef.current === requestId) {
            setIsLoading(false);
          }
          
          return { success: false, error: errorMsg };
        }
      } catch (raceError) {
        // PRODUCTION FIX: Handle race condition errors
        if (raceError instanceof Error && raceError.message.includes('cancelled')) {
          logger.warn('⚠️ Login request was cancelled', 'driver-auth');
          setError('Login was cancelled');
          return { success: false, error: 'Login was cancelled' };
        }
        // Re-throw to be caught by outer catch
        throw raceError;
      }
    } catch (err) {
      // PRODUCTION FIX: Handle all errors and ensure loading state is cleared
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      let finalError = errorMessage;
      
      if (errorMessage.includes('timeout')) {
        finalError = 'Login is taking longer than expected. Please check your connection and try again.';
        logger.error('❌ Driver login timeout', 'driver-auth', { error: errorMessage });
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        finalError = 'Unable to connect to the server. Please check your internet connection and try again.';
        logger.error('❌ Driver login network error', 'driver-auth', { error: errorMessage });
      } else {
        logger.error('❌ Driver login error', 'driver-auth', { error: errorMessage, err });
      }
      
      // Set error state - loading will be cleared in finally block
      setError(finalError);
      
      return { success: false, error: finalError };
    } finally {
      // PRODUCTION FIX: Always clear loading state and cleanup timeouts
      // This is a safety net to ensure loading is cleared even if error handling fails
      logger.debug('🧹 Finally block executing', 'driver-auth', { 
        requestId, 
        currentRequestId: loginRequestIdRef.current 
      });
      
      // PRODUCTION FIX: Always clear loading state for this request (safety net)
      // The error handling above should have already cleared it, but this ensures it's cleared
      if (loginRequestIdRef.current === requestId || !loginRequestIdRef.current) {
        logger.debug('✅ Clearing loading state in finally (safety net)', 'driver-auth', { requestId });
        setIsLoading(false);
      }
      
      // Cleanup timeout
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
        loginTimeoutRef.current = null;
      }
      
      // PRODUCTION FIX: Reset login in progress flag
      isLoginInProgressRef.current = false;
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      logger.debug('Auth state changed', 'driver-auth', { event, hasSession: !!session });

      // PRODUCTION FIX: Handle SIGNED_IN events to ensure state synchronization
      // Previously skipped, but this can cause state desync after login
      if (event === 'SIGNED_IN' && session?.user) {
        logger.debug('SIGNED_IN event detected, syncing state', 'driver-auth', { userId: session.user.id });
        
        // If we're already authenticated, just ensure state is synced
        // Don't re-initialize if login just completed (to avoid race conditions)
        // But do sync the state to ensure store is updated
        if (isAuthenticated) {
          logger.debug('Already authenticated, skipping re-initialization on SIGNED_IN', 'driver-auth');
          // State should already be set by login flow, but ensure loading is false
          setIsLoading(false);
        } else {
          // If not authenticated yet, initialize to sync state
          logger.debug('Not authenticated yet, initializing on SIGNED_IN', 'driver-auth');
          initializeAuth();
        }
        return;
      }

      // Only re-initialize if we're signed out or session removed
      if (event === 'SIGNED_OUT' || !session) {
        initializeAuth();
      } else {
        // For other events (TOKEN_REFRESHED, etc.) fall back to initialize to keep state in sync
        initializeAuth();
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [initializeAuth, isAuthenticated]);

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

