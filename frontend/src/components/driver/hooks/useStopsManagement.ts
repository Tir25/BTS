/**
 * Hook for managing driver stops state and operations
 */
import { useState, useCallback, useEffect } from 'react';
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
    if (!isAuthenticated || !busAssignment) {
      logger.debug('Cannot refresh stops: not authenticated or no assignment', 'useStopsManagement', {
        isAuthenticated,
        hasAssignment: !!busAssignment
      });
      return;
    }
    
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
      
      // Handle specific error cases - reduce error spam
      if (statusCode === 401 || errorCode === 'MISSING_TOKEN' || errorCode === 'INVALID_TOKEN') {
        // Authentication error - log at debug level (expected during initialization)
        logger.debug('Authentication error while fetching stops (may be expected)', 'useStopsManagement', {
          driverId: busAssignment?.driver_id,
          error: errorMessage,
          status: statusCode,
          code: errorCode
        });
      } else if (statusCode === 404 || errorMessage.includes('No assignment found')) {
        // No assignment found - this is expected for drivers without assignment
        logger.debug('Driver has no assignment (expected)', 'useStopsManagement', {
          driverId: busAssignment?.driver_id,
          message: 'Driver needs to be assigned to a bus and route by admin'
        });
        setStopsState({ completed: [], next: null, remaining: [] });
      } else if (errorMessage.includes('fetch') || 
                 errorMessage.includes('network') || 
                 errorMessage.includes('Failed to fetch')) {
        // Network error - log at warn level (not error, as it may be temporary)
        logger.warn('⚠️ Network error while fetching stops', 'useStopsManagement', {
          error: errorMessage,
          driverId: busAssignment?.driver_id,
          routeId: busAssignment?.route_id
        });
        setStopsState({ completed: [], next: null, remaining: [] });
      } else {
        // Unexpected error - log at error level
        logger.error('❌ Error refreshing stops', 'useStopsManagement', {
          error: errorMessage,
          status: statusCode,
          code: errorCode,
          driverId: busAssignment?.driver_id,
          routeId: busAssignment?.route_id,
          stack: error instanceof Error ? error.stack : undefined
        });
        setStopsState({ completed: [], next: null, remaining: [] });
      }
    }
  }, [isAuthenticated, busAssignment, onAssignmentUpdate]);

  // Auto-refresh stops when dependencies change
  useEffect(() => {
    refreshStops();
  }, [refreshStops]);

  return {
    stopsState,
    currentShiftName,
    refreshStops,
  };
}

