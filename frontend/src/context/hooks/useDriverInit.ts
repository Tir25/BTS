/**
 * useDriverInit Hook
 * Handles app initialization, session validation, and data prefetching
 */

import { useCallback, useRef, useEffect } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import { authService } from '../../services/authService';
import { DriverBusAssignment } from '../../services/authService';
import { logger } from '../../utils/logger';
import { mergeAssignmentShift, storeAssignmentOffline } from '../utils/driverAuthUtils';
import { offlineStorage } from '../../services/offline/OfflineStorage';

interface UseDriverInitParams {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  setIsDriver: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setDriverId: (id: string | null) => void;
  setDriverEmail: (email: string | null) => void;
  setDriverName: (name: string | null) => void;
  setBusAssignment: (assignment: DriverBusAssignment | null) => void;
  busAssignment: DriverBusAssignment | null;
}

interface UseDriverInitReturn {
  initializeAuth: () => Promise<void>;
}

/**
 * Hook for managing driver authentication initialization
 */
export function useDriverInit({
  isAuthenticated,
  setIsAuthenticated,
  setIsDriver,
  setIsLoading,
  setError,
  setDriverId,
  setDriverEmail,
  setDriverName,
  setBusAssignment,
  busAssignment,
}: UseDriverInitParams): UseDriverInitReturn {
  const initializationRef = useRef<Promise<void> | null>(null);
  const initializationInProgressRef = useRef<boolean>(false);
  const initializationRequestIdRef = useRef<string | null>(null);
  // PRODUCTION FIX: Track if we've already validated successfully to prevent re-validation loops
  const hasValidatedRef = useRef<boolean>(false);
  const lastValidatedSessionIdRef = useRef<string | null>(null);
  // PRODUCTION FIX: Use refs to access latest values without causing dependency changes
  const busAssignmentRef = useRef(busAssignment);
  const setIsAuthenticatedRef = useRef(setIsAuthenticated);
  const setIsDriverRef = useRef(setIsDriver);
  const setDriverIdRef = useRef(setDriverId);
  const setDriverEmailRef = useRef(setDriverEmail);
  const setDriverNameRef = useRef(setDriverName);
  const setBusAssignmentRef = useRef(setBusAssignment);
  const setErrorRef = useRef(setError);
  const setIsLoadingRef = useRef(setIsLoading);

  // Update refs when values change (without triggering re-renders)
  useEffect(() => {
    busAssignmentRef.current = busAssignment;
    setIsAuthenticatedRef.current = setIsAuthenticated;
    setIsDriverRef.current = setIsDriver;
    setDriverIdRef.current = setDriverId;
    setDriverEmailRef.current = setDriverEmail;
    setDriverNameRef.current = setDriverName;
    setBusAssignmentRef.current = setBusAssignment;
    setErrorRef.current = setError;
    setIsLoadingRef.current = setIsLoading;
  }, [busAssignment, setIsAuthenticated, setIsDriver, setDriverId, setDriverEmail, setDriverName, setBusAssignment, setError, setIsLoading]);

  const performInitialization = useCallback(async (requestId: string): Promise<void> => {
    if (initializationRequestIdRef.current !== requestId) {
      logger.debug('⚠️ Initialization request superseded', 'driver-init', { requestId });
      return;
    }

    if (!isAuthenticated) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (initializationRequestIdRef.current !== requestId) {
        logger.debug('⚠️ Initialization request superseded after session check', 'driver-init', { requestId });
        return;
      }
      
      if (session?.user) {
        const currentSessionId = session.user.id;
        
        // PRODUCTION FIX: Skip validation if we've already validated this session successfully
        // This prevents infinite validation loops when busAssignment changes
        if (hasValidatedRef.current && lastValidatedSessionIdRef.current === currentSessionId && isAuthenticated) {
          logger.debug('✅ Session already validated, skipping re-validation', 'driver-init', { 
            requestId, 
            sessionId: currentSessionId 
          });
          setIsLoadingRef.current(false);
          return;
        }
        
        let validationResult;
        let retryCount = 0;
        const maxRetries = 8;
        const retryDelay = 500;
        
        logger.debug('🔄 Waiting for AuthService initialization before validation', 'driver-init', { requestId });
        
        // Ensure AuthService is ready before validation
        let authServiceReady = false;
        const maxAuthServiceWaitAttempts = 10;
        const authServiceWaitDelay = 200;
        
        for (let waitAttempt = 0; waitAttempt < maxAuthServiceWaitAttempts; waitAttempt++) {
          if (authService.isInitialized()) {
            authServiceReady = true;
            logger.debug('✅ AuthService ready', 'driver-init', { 
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
          logger.warn('⚠️ AuthService not ready after waiting, proceeding anyway', 'driver-init', {
            requestId,
            waitAttempts: maxAuthServiceWaitAttempts
          });
        }
        
        // Ensure profile is loaded before validation
        if (!authService.getCurrentProfile() && session.user) {
          logger.info('🔄 Profile not loaded, attempting to load now', 'driver-init', { requestId });
          try {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (!authService.getCurrentProfile()) {
              logger.info('🔄 Triggering profile load', 'driver-init', { requestId });
            }
          } catch (loadError) {
            logger.warn('⚠️ Error during profile load attempt', 'driver-init', { error: loadError, requestId });
          }
        }
        
        while (retryCount < maxRetries) {
          if (authService.getCurrentProfile()) {
            logger.info('✅ AuthService ready, proceeding with validation', 'driver-init', { requestId, retryCount });
            validationResult = await authService.validateDriverSession();
            break;
          } else {
            logger.debug(`🔄 AuthService not ready, waiting... (attempt ${retryCount + 1}/${maxRetries})`, 'driver-init', { requestId });
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryCount++;
            if (initializationRequestIdRef.current !== requestId) {
              logger.debug('⚠️ Initialization request superseded during retry wait', 'driver-init', { requestId });
              return;
            }
          }
        }
        
        // Always attempt validation even if profile check failed
        if (!validationResult) {
          logger.warn('⚠️ AuthService still not ready after retries, attempting validation anyway', 'driver-init', { requestId, totalWaitTime: maxRetries * retryDelay });
          validationResult = await authService.validateDriverSession();
        }
        
        if (initializationRequestIdRef.current !== requestId) {
          logger.debug('⚠️ Initialization request superseded after validation', 'driver-init', { requestId });
          return;
        }
        
        if (validationResult.isValid && validationResult.assignment) {
          // PRODUCTION FIX: Mark as validated to prevent re-validation loops
          hasValidatedRef.current = true;
          lastValidatedSessionIdRef.current = currentSessionId;
          
          setIsAuthenticatedRef.current(true);
          setIsDriverRef.current(true);
          setDriverIdRef.current(validationResult.assignment.driver_id);
          setDriverEmailRef.current(session.user.email || null);
          setDriverNameRef.current(validationResult.assignment.driver_name);
          setBusAssignmentRef.current(mergeAssignmentShift(validationResult.assignment, busAssignmentRef.current));
          storeAssignmentOffline(validationResult.assignment.driver_id, validationResult.assignment);
          logger.info('✅ Driver session validated successfully', 'driver-init', { requestId });
        } else {
          // PRODUCTION FIX: Reset validation flag on failure
          hasValidatedRef.current = false;
          lastValidatedSessionIdRef.current = null;
          
          logger.warn('❌ Driver validation failed', 'driver-init', { error: validationResult.errorMessage, requestId });
          setIsAuthenticatedRef.current(false);
          setIsDriverRef.current(false);
          try {
            const { offlineStorage } = await import('../../services/offline/OfflineStorage');
            const offlineAssignment = await offlineStorage.getData('driver', `assignment_${session.user.id}`);
            if (offlineAssignment && initializationRequestIdRef.current === requestId) {
              setBusAssignmentRef.current(mergeAssignmentShift(offlineAssignment as unknown as DriverBusAssignment, busAssignmentRef.current));
              logger.info('📱 Recovered assignment from offline storage', 'driver-init', { requestId });
            }
          } catch (offlineError) {
            logger.warn('⚠️ Failed to recover offline assignment data', 'driver-init', { error: offlineError, requestId });
          }
        }
      } else {
        // PRODUCTION FIX: Reset validation flag when no session
        hasValidatedRef.current = false;
        lastValidatedSessionIdRef.current = null;
        
        logger.info('ℹ️ No active session found', 'driver-init', { requestId });
        setIsAuthenticatedRef.current(false);
        setIsDriverRef.current(false);
      }
    } catch (err) {
      if (initializationRequestIdRef.current === requestId) {
        // PRODUCTION FIX: Reset validation flag on error
        hasValidatedRef.current = false;
        lastValidatedSessionIdRef.current = null;
        
        logger.error('❌ Error initializing auth', 'driver-init', { error: err, requestId });
        setErrorRef.current('Failed to initialize authentication');
        setIsAuthenticatedRef.current(false);
        setIsDriverRef.current(false);
      }
    } finally {
      setIsLoadingRef.current(false);
    }
  }, [isAuthenticated]); // PRODUCTION FIX: Only depend on isAuthenticated to prevent loops

  const initializeAuth = useCallback(async () => {
    const requestId = `init_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (initializationInProgressRef.current && initializationRef.current) {
      logger.debug('🔄 Initialization already in progress, waiting for existing promise', 'driver-init', { requestId });
      try {
        await initializationRef.current;
        if (initializationRequestIdRef.current === requestId || !initializationInProgressRef.current) {
          return;
        }
      } catch (error) {
        logger.warn('⚠️ Previous initialization failed, starting new one', 'driver-init', { error, requestId });
      }
    }

    initializationInProgressRef.current = true;
    initializationRequestIdRef.current = requestId;
    const initPromise = performInitialization(requestId);
    initializationRef.current = initPromise;
    try {
      await initPromise;
    } catch (error) {
      logger.error('❌ Initialization error', 'driver-init', { error, requestId });
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
  }, [performInitialization]);

  // Initialize on mount
  // PRODUCTION FIX: Only initialize once on mount, not when initializeAuth changes
  useEffect(() => {
    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount

  // Listen for auth state changes
  // PRODUCTION FIX: Only initialize on SIGNED_IN or SIGNED_OUT events to prevent repeated API calls
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;
    let lastEvent: AuthChangeEvent | null = null;
    let lastSessionId: string | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      logger.debug('Auth state changed', 'driver-init', { event, hasSession: !!session, sessionId: session?.user?.id });

      // PRODUCTION FIX: Debounce rapid auth state changes to prevent repeated initialization
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      // PRODUCTION FIX: Only handle critical auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
      // Ignore other events like USER_UPDATED, PASSWORD_RECOVERY, etc. that don't require re-initialization
      const isCriticalEvent = event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED';
      
      if (!isCriticalEvent) {
        logger.debug('Non-critical auth event, skipping initialization', 'driver-init', { event });
        return;
      }

      // PRODUCTION FIX: Skip if this is the same event and session as the last one
      const currentSessionId = session?.user?.id || null;
      if (lastEvent === event && lastSessionId === currentSessionId) {
        logger.debug('Duplicate auth event detected, skipping initialization', 'driver-init', { event, sessionId: currentSessionId });
        return;
      }

      lastEvent = event;
      lastSessionId = currentSessionId;

      // PRODUCTION FIX: Debounce initialization to prevent rapid repeated calls
      debounceTimer = setTimeout(() => {
        if (event === 'SIGNED_IN' && session?.user) {
          logger.debug('SIGNED_IN event detected, syncing state', 'driver-init', { userId: session.user.id });
          
          // PRODUCTION FIX: Only initialize if not already authenticated to prevent repeated validation
          if (isAuthenticated) {
            logger.debug('Already authenticated, skipping re-initialization on SIGNED_IN', 'driver-init');
            setIsLoading(false);
          } else {
            logger.debug('Not authenticated yet, initializing on SIGNED_IN', 'driver-init');
            initializeAuth();
          }
          return;
        }

        if (event === 'SIGNED_OUT' || !session) {
          logger.debug('SIGNED_OUT event detected, initializing auth', 'driver-init');
          initializeAuth();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // PRODUCTION FIX: For token refresh, only re-validate if not already authenticated
          // This prevents unnecessary API calls on every token refresh
          if (!isAuthenticated) {
            logger.debug('TOKEN_REFRESHED event detected, initializing auth', 'driver-init');
            initializeAuth();
          } else {
            logger.debug('TOKEN_REFRESHED event detected, but already authenticated, skipping', 'driver-init');
          }
        }
      }, 500); // 500ms debounce delay
    });
    
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      subscription.unsubscribe();
    };
  }, [initializeAuth, isAuthenticated]); // PRODUCTION FIX: Removed setIsLoading from dependencies

  return {
    initializeAuth,
  };
}

