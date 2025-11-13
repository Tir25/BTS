/**
 * useDriverAuth Hook
 * Handles driver authentication: login, logout, session management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase, getDriverSupabaseClient } from '../../config/supabase';
import { DriverBusAssignment } from '../../services/authService';
import { timeoutConfig, withTimeout } from '../../config/timeoutConfig';
import { logger } from '../../utils/logger';
import { apiService } from '../../api/api';
import { mergeAssignmentShift, clearDriverStorage, storeAssignmentOffline, generateRequestId } from '../utils/driverAuthUtils';

interface UseDriverAuthReturn {
  isAuthenticated: boolean;
  isDriver: boolean;
  isLoading: boolean;
  error: string | null;
  driverId: string | null;
  driverEmail: string | null;
  driverName: string | null;
  busAssignment: DriverBusAssignment | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  logout: () => Promise<void>;
  logoutWithCleanup: (socketCleanup?: () => void) => Promise<void>;
  refreshAuth: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  setBusAssignment: (assignment: DriverBusAssignment | null) => void;
  setDriverId: (id: string | null) => void;
  setDriverEmail: (email: string | null) => void;
  setDriverName: (name: string | null) => void;
  setIsAuthenticated: (value: boolean) => void;
  setIsDriver: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Hook for managing driver authentication state and operations
 */
export function useDriverAuthState(): UseDriverAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverEmail, setDriverEmail] = useState<string | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [busAssignment, setBusAssignment] = useState<DriverBusAssignment | null>(null);

  const loginRequestIdRef = useRef<string | null>(null);
  const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loginAbortControllerRef = useRef<AbortController | null>(null);
  const isLoginInProgressRef = useRef<boolean>(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Prevent concurrent login attempts
    if (isLoginInProgressRef.current) {
      logger.warn('⚠️ Login already in progress, rejecting concurrent attempt', 'driver-auth');
      return { success: false, error: 'Login is already in progress. Please wait.' };
    }
    
    isLoginInProgressRef.current = true;
    setIsLoading(true);
    setError(null);
    const requestId = generateRequestId('login');
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
      
      const loginTimeoutMs = timeoutConfig.auth.signIn;
      const loginPromise = apiService.driverLogin(email, password);
      
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
        logger.debug('⏳ Waiting for login (with timeout protection)', 'driver-auth', { requestId, timeoutMs: loginTimeoutMs });
        
        const result = await Promise.race([
          loginPromise.then(result => {
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
              loginTimeoutRef.current = null;
            }
            logger.debug('✅ Login promise resolved', 'driver-auth', { 
              success: result.success, 
              hasError: !!result.error,
              requestId 
            });
            
            if (loginRequestIdRef.current !== requestId || abortController.signal.aborted) {
              logger.warn('⚠️ Login completed but request was cancelled', 'driver-auth', { requestId });
              throw new Error('Login request cancelled');
            }
            
            return result;
          }),
          timeoutPromise.catch(error => {
            loginTimeoutRef.current = null;
            logger.error('❌ Login timeout', 'driver-auth', { 
              error: error instanceof Error ? error.message : String(error),
              requestId 
            });
            throw error;
          })
        ]);
        
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
          
          // Set Supabase session with retry logic
          let sessionSetSuccessfully = false;
          const maxSessionRetries = 3;
          const sessionRetryDelay = 500;
          
          for (let attempt = 0; attempt < maxSessionRetries; attempt++) {
            try {
              const driverSupabase = getDriverSupabaseClient();
              const sessionTimeout = attempt === 0 
                ? timeoutConfig.auth.tokenValidation 
                : timeoutConfig.auth.tokenValidation * 2;
              
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
                
                if (attempt < maxSessionRetries - 1) {
                  await new Promise(resolve => setTimeout(resolve, sessionRetryDelay * (attempt + 1)));
                  continue;
                } else {
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
              
              if (attempt < maxSessionRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, sessionRetryDelay * (attempt + 1)));
                continue;
              } else {
                logger.error('❌ Error setting Supabase session after all retries', 'driver-auth', {
                  error: sessionError instanceof Error ? sessionError.message : String(sessionError),
                  attempts: maxSessionRetries
                });
              }
            }
          }
          
          if (!sessionSetSuccessfully) {
            logger.warn('⚠️ Continuing login despite session setting failure - profile loading may be slower', 'driver-auth', {
              driverId: user.id
            });
          }
          
          // Set authentication state
          setIsAuthenticated(true);
          setIsDriver(true);
          setDriverId(user.id);
          setDriverEmail(user.email || email);
          setDriverName(user.full_name || assignment.driver_name || email);
          
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
            setBusAssignment(mergeAssignmentShift(driverAssignment, busAssignment));
            storeAssignmentOffline(user.id, driverAssignment);
            logger.info('✅ Driver login successful with assignment', 'driver-auth', { 
              driverId: user.id,
              busNumber: assignment.bus_number,
              routeName: assignment.route_name
            });
            setError(null);
          } else {
            logger.warn('⚠️ No bus assignment in backend response (allowing login to proceed)', 'driver-auth', {
              driverId: user.id
            });
            setError('No active bus assignment found. Please contact your administrator to get assigned to a bus.');
          }
          
          setIsLoading(false);
          setIsAuthenticated(true);
          
          // Use requestAnimationFrame for state propagation
          await new Promise(resolve => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve(undefined);
              });
            });
          });
          
          logger.info('✅ Login complete, state synced, ready for redirect', 'driver-auth', {
            driverId: user.id,
            hasAssignment: !!assignment
          });
          
          return { success: true };
        } else {
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
          
          setError(errorMsg);
          if (loginRequestIdRef.current === requestId) {
            setIsLoading(false);
          }
          
          return { success: false, error: errorMsg };
        }
      } catch (raceError) {
        if (raceError instanceof Error && raceError.message.includes('cancelled')) {
          logger.warn('⚠️ Login request was cancelled', 'driver-auth');
          setError('Login was cancelled');
          return { success: false, error: 'Login was cancelled' };
        }
        throw raceError;
      }
    } catch (err) {
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
      
      setError(finalError);
      return { success: false, error: finalError };
    } finally {
      logger.debug('🧹 Finally block executing', 'driver-auth', { 
        requestId, 
        currentRequestId: loginRequestIdRef.current 
      });
      
      if (loginRequestIdRef.current === requestId || !loginRequestIdRef.current) {
        logger.debug('✅ Clearing loading state in finally (safety net)', 'driver-auth', { requestId });
        setIsLoading(false);
      }
      
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
        loginTimeoutRef.current = null;
      }
      
      isLoginInProgressRef.current = false;
    }
  }, [busAssignment]);

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

  const logoutWithCleanup = useCallback(async (socketCleanup?: () => void) => {
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
      
      // Cleanup WebSocket connection
      if (socketCleanup) {
        socketCleanup();
      }
      
      clearDriverStorage();
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
      
      // Cleanup WebSocket on error too
      if (socketCleanup) {
        socketCleanup();
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    // Default logout without cleanup (cleanup handled by context)
    await logoutWithCleanup();
  }, [logoutWithCleanup]);

  const refreshAuth = useCallback(async () => {
    // Note: Actual refresh is handled by useDriverInit's initializeAuth
    // This is kept for API compatibility
    return { success: true };
  }, []);

  return {
    isAuthenticated,
    isDriver,
    isLoading,
    error,
    driverId,
    driverEmail,
    driverName,
    busAssignment,
    login,
    logout,
    logoutWithCleanup,
    refreshAuth,
    clearError,
    setBusAssignment,
    setDriverId,
    setDriverEmail,
    setDriverName,
    setIsAuthenticated,
    setIsDriver,
    setIsLoading,
    setError,
  };
}

