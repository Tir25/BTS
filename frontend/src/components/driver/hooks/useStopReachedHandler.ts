/**
 * Hook for handling stop reached operations
 */
import { useCallback } from 'react';
import { logger } from '../../../utils/logger';
import { notifySuccess, notifyError, notifyWarning } from '../../../utils/notifications';

export interface UseStopReachedHandlerProps {
  busAssignment: {
    driver_id: string;
    route_id?: string;
    shift_id?: string | null;
  } | null;
  stopsState: {
    completed: any[];
    next: any | null;
    remaining: any[];
  } | null;
  onRefreshStops: () => Promise<void>;
}

/**
 * Handles stop reached operations with error handling and retry logic
 */
export function useStopReachedHandler({
  busAssignment,
  stopsState,
  onRefreshStops,
}: UseStopReachedHandlerProps) {
  const handleStopReached = useCallback(async (stopId: string) => {
    if (!busAssignment) {
      logger.warn('Cannot mark stop as reached: no bus assignment', 'useStopReachedHandler');
      return;
    }

    const { apiService } = await import('../../../api');
    const { notifyRouteStatusUpdated } = await import('../../../services/RouteStatusEvents');
    
    // Capture stop info before API call for better user feedback
    const tappedStop = stopsState?.next || stopsState?.remaining.find(s => s.id === stopId);
    const stopName = tappedStop?.name || `Stop #${tappedStop?.sequence || 'N/A'}`;
    
    logger.info('🛑 Stop reached handler called', 'useStopReachedHandler', {
      stopId,
      stopName,
      driverId: busAssignment.driver_id,
      routeId: busAssignment.route_id
    });
    
    try {
      // Ensure tracking session exists first (idempotent on backend)
      logger.info('Starting tracking session...', 'useStopReachedHandler', {
        driverId: busAssignment.driver_id
      });
      const startResult = await apiService.startTracking(busAssignment.driver_id, busAssignment.shift_id || null);
      
      if (!startResult.success) {
        logger.warn('Failed to start tracking session', 'useStopReachedHandler', {
          error: startResult.error,
          driverId: busAssignment.driver_id
        });
        notifyError('Tracking Failed', `Failed to start tracking: ${startResult.error || 'Unknown error'}. Please try again.`);
        return;
      }
      
      // Wait a moment for session to be fully created in database
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Mark stop as reached
      logger.info('Marking stop as reached...', 'useStopReachedHandler', {
        stopId,
        driverId: busAssignment.driver_id
      });
      const result = await apiService.markStopReached(busAssignment.driver_id, stopId);
      
      logger.info('Stop reached API response', 'useStopReachedHandler', {
        success: result.success,
        error: result.error,
        stopId
      });
      
      if (!result.success) {
        logger.warn('⚠️ Failed to mark stop as reached', 'useStopReachedHandler', {
          error: result.error,
          stopId,
          driverId: busAssignment.driver_id
        });
        notifyError('Stop Update Failed', `Failed to mark stop: ${result.error || 'Unknown error'}`);
        return;
      }
      
      logger.info('✅ Stop marked successfully, waiting before refresh...', 'useStopReachedHandler', {
        stopId,
        stopName
      });
      
      // Show success feedback to user
      notifySuccess(
        'Stop Reached',
        `Successfully marked "${stopName}" as reached`
      );
      
      // Wait a brief moment for backend to update, then refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Notify students to refresh route status
      if (busAssignment.route_id) {
        logger.info('Notifying route status update', 'useStopReachedHandler', {
          routeId: busAssignment.route_id
        });
        notifyRouteStatusUpdated(busAssignment.route_id);
      }
      
      // Refresh stops after successful update
      logger.info('Refreshing stops...', 'useStopReachedHandler');
      await onRefreshStops();
      logger.info('✅ Stops refreshed successfully', 'useStopReachedHandler');
    } catch (e) {
      logger.error('❌ Error marking stop as reached', 'useStopReachedHandler', {
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
        stopId,
        driverId: busAssignment.driver_id
      });
      notifyError('Stop Update Error', `Error marking stop: ${e instanceof Error ? e.message : String(e)}`);
      
      // Attempt to auto-start tracking, then retry once
      try {
        logger.info('Retrying stop reached...', 'useStopReachedHandler');
        notifyWarning('Retrying', 'Attempting to retry marking stop as reached...');
        await apiService.startTracking(busAssignment.driver_id, busAssignment.shift_id || null);
        const retryResult = await apiService.markStopReached(busAssignment.driver_id, stopId);
        if (retryResult.success) {
          await new Promise(resolve => setTimeout(resolve, 500));
          if (busAssignment.route_id) notifyRouteStatusUpdated(busAssignment.route_id);
          await onRefreshStops();
          logger.info('✅ Retry successful', 'useStopReachedHandler');
          notifySuccess('Stop Reached', `Successfully marked "${stopName}" as reached (retry successful)`);
        } else {
          logger.error('❌ Retry failed', 'useStopReachedHandler', {
            error: retryResult.error
          });
          notifyError('Retry Failed', `Retry failed: ${retryResult.error || 'Unknown error'}`);
        }
      } catch (retryError) {
        logger.error('❌ Retry exception', 'useStopReachedHandler', {
          error: retryError instanceof Error ? retryError.message : String(retryError),
          stack: retryError instanceof Error ? retryError.stack : undefined
        });
        notifyError('Retry Failed', `Retry failed: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
      }
    }
  }, [busAssignment, stopsState, onRefreshStops]);

  return {
    handleStopReached,
  };
}

