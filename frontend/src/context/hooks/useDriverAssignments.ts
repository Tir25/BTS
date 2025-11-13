/**
 * useDriverAssignments Hook
 * Handles driver assignment fetching, updates, and refresh
 */

import { useCallback, useEffect } from 'react';
import { DriverBusAssignment, authService } from '../../services/authService';
import { unifiedWebSocketService } from '../../services/UnifiedWebSocketService';
import { logger } from '../../utils/logger';
import { mergeAssignmentShift, storeAssignmentOffline } from '../utils/driverAuthUtils';

interface UseDriverAssignmentsParams {
  isAuthenticated: boolean;
  isWebSocketAuthenticated: boolean;
  driverId: string | null;
  busAssignment: DriverBusAssignment | null;
  setBusAssignment: (assignment: DriverBusAssignment | null) => void;
  setDriverName: (name: string | null) => void;
  setError: (error: string | null) => void;
}

interface UseDriverAssignmentsReturn {
  refreshAssignment: () => Promise<void>;
}

/**
 * Hook for managing driver assignment operations
 */
export function useDriverAssignments({
  isAuthenticated,
  isWebSocketAuthenticated,
  driverId,
  busAssignment,
  setBusAssignment,
  setDriverName,
  setError,
}: UseDriverAssignmentsParams): UseDriverAssignmentsReturn {
  const refreshAssignment = useCallback(async () => {
    if (!isAuthenticated || !driverId) {
      logger.warn('Cannot refresh assignment: Not authenticated or no driver ID', 'driver-assignments');
      return;
    }
    
    try {
      logger.info('🔄 Refreshing driver assignment...', 'driver-assignments', { driverId });
      
      // Try both WebSocket and direct API fetch
      if (isWebSocketAuthenticated) {
        unifiedWebSocketService.requestAssignmentUpdate();
      }
      
      // Also try direct API fetch as fallback
      const assignment = await authService.getDriverBusAssignment(driverId);
      if (assignment) {
        setBusAssignment(mergeAssignmentShift(assignment, busAssignment));
        setDriverName(assignment.driver_name);
        storeAssignmentOffline(driverId, assignment);
        logger.info('✅ Assignment refreshed successfully', 'driver-assignments', {
          busNumber: assignment.bus_number,
          routeName: assignment.route_name
        });
        setError(null);
      } else {
        logger.warn('⚠️ No assignment found during refresh', 'driver-assignments');
        setError('No active bus assignment found. Please contact your administrator.');
      }
    } catch (error) {
      logger.error('❌ Failed to refresh assignment', 'driver-assignments', { error });
      setError('Failed to refresh assignment. Please try again or contact support.');
    }
  }, [isAuthenticated, isWebSocketAuthenticated, driverId, busAssignment, setBusAssignment, setDriverName, setError]);

  // Listen for assignment updates from WebSocket
  useEffect(() => {
    if (!isWebSocketAuthenticated) return;
    
    let isMounted = true;
    const handleAssignmentUpdate = (data: any) => {
      if (!isMounted) return;
      logger.info('📋 Received assignment update:', 'driver-assignments', { 
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
        setBusAssignment(mergeAssignmentShift(updatedAssignment, busAssignment));
        storeAssignmentOffline(updatedAssignment.driver_id, updatedAssignment);
        logger.info('✅ Bus assignment updated from admin changes', 'driver-assignments', {
          busNumber: updatedAssignment.bus_number,
          routeName: updatedAssignment.route_name
        });
      } else if (data.type === 'removed') {
        setBusAssignment(null);
        setError(data.message || 'Your bus assignment has been removed by an administrator');
        logger.warn('⚠️ Bus assignment removed by admin', 'driver-assignments');
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
        setBusAssignment(mergeAssignmentShift(refreshedAssignment, busAssignment));
        storeAssignmentOffline(refreshedAssignment.driver_id, refreshedAssignment);
        logger.info('🔄 Bus assignment refreshed', 'driver-assignments');
      }
    };
    
    const unsubscribe = unifiedWebSocketService.onDriverAssignmentUpdate(handleAssignmentUpdate);
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isWebSocketAuthenticated, busAssignment, setBusAssignment, setError]);

  // Retry assignment loading if authenticated but no assignment
  useEffect(() => {
    if (!isAuthenticated || !driverId || busAssignment) return;
    
    let isMounted = true;
    const retryAssignmentIfNeeded = async () => {
      if (!isMounted) return;
      logger.info('🔄 Retrying assignment fetch in background', 'driver-assignments', { driverId });
      try {
        const assignment = await authService.getDriverBusAssignment(driverId);
        if (assignment && isMounted) {
          setBusAssignment(mergeAssignmentShift(assignment, busAssignment));
          setDriverName(assignment.driver_name);
          storeAssignmentOffline(driverId, assignment);
          logger.info('✅ Assignment loaded in background', 'driver-assignments', {
            busNumber: assignment.bus_number
          });
        }
      } catch (assignmentError) {
        logger.warn('⚠️ Background assignment fetch failed', 'driver-assignments', { error: assignmentError });
      }
    };
    
    // Retry after a short delay
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        retryAssignmentIfNeeded();
      }
    }, 2000);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, driverId, busAssignment, setBusAssignment, setDriverName]);

  return {
    refreshAssignment,
  };
}

