import { useEffect, useRef, useCallback } from 'react';
import { useLocationStore } from '../stores/useLocationStore';
import { unifiedWebSocketService } from '../services/UnifiedWebSocketService';
import { useDriverInterface } from '../stores/useDriverInterfaceStore';
import { logger } from '../utils/logger';

/**
 * @deprecated This hook is deprecated. Use useDriverTracking hook instead.
 * This hook created duplicate location updates. Location sending is now handled
 * exclusively by useDriverTracking hook with built-in deduplication in UnifiedWebSocketService.
 * 
 * Hook that automatically syncs location updates to WebSocket when tracking is active
 */
export const useLocationWebSocketSync = () => {
  // DEPRECATED: Do not use this hook
  logger.warn('⚠️ useLocationWebSocketSync is deprecated. Use useDriverTracking instead.', 'deprecated-hook');
  return;
  const { isTracking, currentLocation, updateCount } = useLocationStore();
  const { isWebSocketConnected, isWebSocketAuthenticated, driverId, busAssignment } = useDriverInterface();
  
  const lastSentUpdateCount = useRef(0);

  // Memoized function to send location update - prevents infinite loops
  const sendLocationUpdate = useCallback(() => {
    // Only send updates if:
    // 1. Tracking is active
    // 2. WebSocket is connected and authenticated
    // 3. We have a current location
    // 4. We have driver and bus information
    // 5. This is a new location update
    if (
      isTracking &&
      isWebSocketConnected &&
      isWebSocketAuthenticated &&
      currentLocation &&
      driverId &&
      busAssignment &&
      updateCount > lastSentUpdateCount.current
    ) {
      const locationData = {
        driverId: driverId,
        busId: busAssignment.bus_id, // Include busId for backend compatibility
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        timestamp: new Date(currentLocation.timestamp).toISOString(),
        speed: currentLocation.coords.speed || undefined,
        heading: currentLocation.coords.heading || undefined,
      };

      try {
        unifiedWebSocketService.sendLocationUpdate(locationData);
        lastSentUpdateCount.current = updateCount;
        
        logger.debug('Location sent to WebSocket', 'location-websocket-sync', {
          driverId,
          busId: busAssignment.bus_id,
          lat: locationData.latitude,
          lng: locationData.longitude,
          updateCount,
        });
      } catch (error) {
        logger.error('Failed to send location to WebSocket', 'location-websocket-sync', { error });
      }
    }
  }, [
    isTracking,
    isWebSocketConnected,
    isWebSocketAuthenticated,
    currentLocation,
    driverId,
    busAssignment,
    updateCount,
  ]);

  useEffect(() => {
    sendLocationUpdate();
  }, [sendLocationUpdate]);

  // Reset the counter when tracking stops
  useEffect(() => {
    if (!isTracking) {
      lastSentUpdateCount.current = 0;
    }
  }, [isTracking]);
};
