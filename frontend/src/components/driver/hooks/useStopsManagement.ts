/**
 * Hook for managing driver stops state and operations
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { logger } from '../../../utils/logger';
import { formatShiftLabel } from '../utils/formatShiftLabel';

export interface StopsState {
  completed: any[];
  next: any | null;
  remaining: any[];
}

export interface UseStopsManagementProps {
  isAuthenticated: boolean;
  busAssignment: {
    driver_id: string;
    bus_id?: string;
    route_id?: string;
    route_name?: string;
    shift_id?: string | null;
    shift_name?: string | null;
    shift_start_time?: string | null;
    shift_end_time?: string | null;
  } | null;
  onAssignmentUpdate?: (assignment: any) => void;
}

export interface UseStopsManagementReturn {
  stopsState: StopsState | null;
  currentShiftName: string | null;
  refreshStops: () => Promise<void>;
}

/**
 * Manages stops state, shift name, and stop refresh operations
 */
export function useStopsManagement({
  isAuthenticated,
  busAssignment,
  onAssignmentUpdate,
}: UseStopsManagementProps): UseStopsManagementReturn {
  const [stopsState, setStopsState] = useState<StopsState | null>(null);
  const [currentShiftName, setCurrentShiftName] = useState<string | null>(null);
  
  // PRODUCTION FIX: Track if a refresh is in progress to prevent duplicate calls
  const isRefreshingRef = useRef(false);
  // PRODUCTION FIX: Track the last driver ID we fetched for to prevent unnecessary refetches
  const lastFetchedDriverIdRef = useRef<string | null>(null);
  // PRODUCTION FIX: Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // PRODUCTION FIX: Store latest refreshStops function to avoid stale closures
  const refreshStopsRef = useRef<() => Promise<void>>();
  
  // PRODUCTION FIX: Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear refs on unmount
      isRefreshingRef.current = false;
      lastFetchedDriverIdRef.current = null;
      refreshStopsRef.current = undefined;
    };
  }, []);

  // Update shift name when assignment changes
  useEffect(() => {
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

  const refreshStops = useCallback(async () => {
    // CRITICAL FIX: Enhanced guards to prevent API calls when not authenticated
    if (!isAuthenticated) {
      logger.debug('Cannot refresh stops: not authenticated', 'useStopsManagement', {
        isAuthenticated
      });
      return;
    }
    
    if (!busAssignment || !busAssignment.driver_id) {
      logger.debug('Cannot refresh stops: no assignment or driver ID', 'useStopsManagement', {
        hasAssignment: !!busAssignment,
        hasDriverId: !!busAssignment?.driver_id
      });
      return;
    }
    
    // PRODUCTION FIX: Prevent duplicate concurrent requests
    if (isRefreshingRef.current) {
      logger.debug('Stops refresh already in progress, skipping duplicate request', 'useStopsManagement', {
        driverId: busAssignment.driver_id
      });
      return;
    }
    
    isRefreshingRef.current = true;
    
    try {
      logger.info('🔄 Refreshing stops and route information', 'useStopsManagement', {
        driverId: busAssignment.driver_id,
        routeId: busAssignment.route_id,
        routeName: busAssignment.route_name
      });
      
      const { apiService } = await import('../../../api');
      const res = await apiService.getDriverAssignmentWithStops(busAssignment.driver_id);
      
      if (res?.success && res.data) {
        // Enhanced logging and validation
        const stopsData = res.data.stops;
        logger.info('✅ Stops data received', 'useStopsManagement', {
          hasStops: !!stopsData,
          completed: stopsData?.completed?.length || 0,
          remaining: stopsData?.remaining?.length || 0,
          hasNext: !!stopsData?.next,
          nextStopName: stopsData?.next?.name,
          stopsData: JSON.stringify(stopsData)
        });
        
        // Validate stops data structure
        if (!stopsData || typeof stopsData !== 'object') {
          logger.error('❌ Invalid stops data structure', 'useStopsManagement', {
            stopsData,
            type: typeof stopsData
          });
        } else {
          // PRODUCTION FIX: Only update state if component is still mounted
          if (isMountedRef.current) {
            setStopsState(stopsData);
            setCurrentShiftName(
              formatShiftLabel(
                res.data.shift_name,
                res.data.shift_start_time,
                res.data.shift_end_time
              )
            );
            
            // Update assignment if callback provided
            if (onAssignmentUpdate) {
              onAssignmentUpdate({
                ...busAssignment,
                shift_id: res.data.shift_id ?? busAssignment.shift_id ?? null,
                shift_name: res.data.shift_name ?? busAssignment.shift_name ?? null,
                shift_start_time: res.data.shift_start_time ?? busAssignment.shift_start_time ?? null,
                shift_end_time: res.data.shift_end_time ?? busAssignment.shift_end_time ?? null,
              });
            }
            
            // Update route information if provided
            if (res.data.route_name && !busAssignment.route_name) {
              logger.info('✅ Route name updated from assignment API', 'useStopsManagement', {
                routeName: res.data.route_name
              });
            }
            
            logger.info('✅ Stops state updated successfully', 'useStopsManagement', {
              completedCount: stopsData.completed?.length || 0,
              remainingCount: stopsData.remaining?.length || 0,
              hasNext: !!stopsData.next,
              nextStopId: stopsData.next?.id,
              nextStopName: stopsData.next?.name
            });
            
            // PRODUCTION FIX: Only mark as fetched on success
            // This allows retries on error
            lastFetchedDriverIdRef.current = busAssignment.driver_id;
          } else {
            logger.debug('Component unmounted, skipping state update', 'useStopsManagement');
          }
        }
      } else {
        logger.warn('⚠️ Failed to refresh stops', 'useStopsManagement', {
          error: res?.error,
          success: res?.success,
          data: res?.data,
          driverId: busAssignment.driver_id,
          routeId: busAssignment.route_id
        });
        // Clear stops state on error to prevent stale data
        // Only clear if we have a definitive error (not just missing data)
        if (res?.error && !res.error.includes('No assignment found')) {
          setStopsState({ completed: [], next: null, remaining: [] });
        }
        
        // Show user-friendly message for drivers without assignment
        if (res?.error?.includes('No assignment found')) {
          logger.info('Driver has no assignment', 'useStopsManagement', {
            driverId: busAssignment.driver_id,
            message: 'Driver needs to be assigned to a bus and route by admin'
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = (error as any)?.status;
      const errorCode = (error as any)?.code;
      const isNetworkError = (error as any)?.isNetworkError || false;
      const isServerDown = errorCode === 'SERVER_NOT_RUNNING';
      const isCorsError = errorCode === 'CORS_ERROR';
      const isTimeoutError = errorCode === 'TIMEOUT';
      
      // PRODUCTION FIX: Enhanced error handling with better error classification
      // Don't log errors as "server down" if it's just a network error
      // Network errors can occur even when the server is running (CORS, timing, etc.)
      
      // Handle specific error cases - reduce error spam
      if (statusCode === 401 || errorCode === 'MISSING_TOKEN' || errorCode === 'INVALID_TOKEN') {
        // Authentication error - log at debug level (expected during initialization)
        logger.debug('Authentication error while fetching stops (may be expected)', 'useStopsManagement', {
          driverId: busAssignment?.driver_id,
          error: errorMessage,
          status: statusCode,
          code: errorCode
        });
      } else if (isServerDown) {
        // Server is actually down - log error but don't spam
        logger.error('❌ Error fetching driver assignment with stops', 'component', {
          error: errorMessage,
          errorCode,
          driverId: busAssignment?.driver_id,
          suggestion: 'Backend server is not running. Please ensure the server is running on http://localhost:3000'
        });
      } else if (isCorsError) {
        // CORS error - server might be running but CORS is blocking
        logger.warn('⚠️ CORS error while fetching stops (server might still be running)', 'useStopsManagement', {
          error: errorMessage,
          errorCode,
          driverId: busAssignment?.driver_id,
          suggestion: 'Check backend CORS configuration. Server might be running but CORS is blocking the request.'
        });
      } else if (isTimeoutError) {
        // Timeout error - request took too long
        logger.warn('⚠️ Request timeout while fetching stops', 'useStopsManagement', {
          error: errorMessage,
          errorCode,
          driverId: busAssignment?.driver_id,
          suggestion: 'Request took too long. Server might be slow or overloaded.'
        });
      } else if (isNetworkError) {
        // Generic network error - don't assume server is down
        logger.warn('⚠️ Network error while fetching stops (server might still be running)', 'useStopsManagement', {
          error: errorMessage,
          errorCode,
          driverId: busAssignment?.driver_id,
          originalError: (error as any)?.originalError,
          suggestion: 'This might be a temporary network issue. Server might still be running. Check browser console for details.'
        });
      } else if (statusCode === 404 || errorMessage.includes('No assignment found')) {
        // No assignment found - this is expected for drivers without assignment
        logger.debug('Driver has no assignment (expected)', 'useStopsManagement', {
          driverId: busAssignment?.driver_id,
          message: 'Driver needs to be assigned to a bus and route by admin'
        });
        if (isMountedRef.current) {
          setStopsState({ completed: [], next: null, remaining: [] });
        }
      } else {
        // Other errors - log normally
        logger.error('❌ Error fetching driver assignment with stops', 'component', {
          error: errorMessage,
          errorCode,
          statusCode,
          isNetworkError,
          isServerDown,
          isCorsError,
          isTimeoutError,
          driverId: busAssignment?.driver_id,
          stack: error instanceof Error ? error.stack : undefined
        });
        // Only clear state if it's a definitive error (not a network error that might be temporary)
        if (!isNetworkError && isMountedRef.current) {
          setStopsState({ completed: [], next: null, remaining: [] });
        }
      }
    } finally {
      // PRODUCTION FIX: Always clear the refreshing flag, even on error
      isRefreshingRef.current = false;
    }
  }, [isAuthenticated, busAssignment, onAssignmentUpdate]);
  
  // PRODUCTION FIX: Keep refreshStopsRef up to date with latest refreshStops function
  useEffect(() => {
    refreshStopsRef.current = refreshStops;
  }, [refreshStops]);

  // Auto-refresh stops when dependencies change
  // PRODUCTION FIX: Prevent infinite loops by using actual dependencies instead of callback
  // PRODUCTION FIX: Add guards to prevent unnecessary API calls when not authenticated
  useEffect(() => {
    // CRITICAL FIX: Don't run if not authenticated or no assignment
    // This prevents API calls after logout and during initialization
    if (!isAuthenticated) {
      logger.debug('Skipping stops refresh: not authenticated', 'useStopsManagement', {
        isAuthenticated
      });
      // Clear stops state when not authenticated
      if (isMountedRef.current) {
        setStopsState(null);
        setCurrentShiftName(null);
      }
      // PRODUCTION FIX: Reset refs when not authenticated
      lastFetchedDriverIdRef.current = null;
      isRefreshingRef.current = false;
      return;
    }
    
    if (!busAssignment || !busAssignment.driver_id) {
      logger.debug('Skipping stops refresh: no assignment or driver ID', 'useStopsManagement', {
        hasAssignment: !!busAssignment,
        hasDriverId: !!busAssignment?.driver_id
      });
      return;
    }
    
    // PRODUCTION FIX: Don't refresh if already refreshing
    // This prevents duplicate concurrent requests
    if (isRefreshingRef.current) {
      logger.debug('Stops refresh already in progress, skipping auto-refresh', 'useStopsManagement', {
        driverId: busAssignment.driver_id
      });
      return;
    }
    
    // PRODUCTION FIX: Skip if we've already successfully fetched for this driver
    // But allow retries if there was an error (lastFetchedDriverIdRef will be null on error)
    // CRITICAL FIX: Don't check stopsState here (stale closure) - only check lastFetchedDriverIdRef
    if (lastFetchedDriverIdRef.current === busAssignment.driver_id) {
      logger.debug('Stops already fetched for this driver, skipping auto-refresh', 'useStopsManagement', {
        driverId: busAssignment.driver_id
      });
      return;
    }
    
    // PRODUCTION FIX: Add delay to avoid race conditions with backend startup
    // This prevents false "server down" errors during initial load
    let isCancelled = false;
    const timeoutId = setTimeout(() => {
      // CRITICAL FIX: Double-check conditions before calling refreshStops
      // This prevents calls after logout or when component unmounts
      if (isCancelled || !isMountedRef.current) {
        logger.debug('Component cancelled or unmounted, skipping stops refresh', 'useStopsManagement');
        return;
      }
      
      // Double-check authentication and assignment before calling
      // Use the latest values from the closure
      if (!isAuthenticated || !busAssignment || !busAssignment.driver_id) {
        logger.debug('Conditions changed during delay, skipping stops refresh', 'useStopsManagement', {
          isAuthenticated,
          hasAssignment: !!busAssignment,
          hasDriverId: !!busAssignment?.driver_id
        });
        return;
      }
      
      // PRODUCTION FIX: Double-check if already refreshing to prevent race conditions
      if (isRefreshingRef.current) {
        logger.debug('Refresh already started by another effect, skipping', 'useStopsManagement', {
          driverId: busAssignment.driver_id
        });
        return;
      }
      
      // PRODUCTION FIX: Use ref to get latest refreshStops function (avoid stale closure)
      if (refreshStopsRef.current) {
        refreshStopsRef.current();
      } else {
        logger.warn('refreshStopsRef.current is undefined, skipping stops refresh', 'useStopsManagement');
      }
    }, 500); // 500ms delay to allow backend to be ready
    
    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
    // CRITICAL FIX: Use actual dependencies instead of refreshStops callback
    // This prevents infinite loops when refreshStops is recreated
    // We check isAuthenticated and busAssignment.driver_id, which are the actual dependencies
    // Note: refreshStops is intentionally omitted to prevent loops, but we call it inside the effect
     
  }, [isAuthenticated, busAssignment?.driver_id]);

  return {
    stopsState,
    currentShiftName,
    refreshStops,
  };
}

