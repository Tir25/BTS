/**
 * Hook for syncing location updates to WebSocket
 */
import { useEffect, useRef } from 'react';
import { logger } from '../../utils/logger';
import { LocationData } from '../../services/LocationService';
import { unifiedWebSocketService } from '../../services/UnifiedWebSocketService';

export interface UseWebSocketLocationSyncProps {
  isTracking: boolean;
  isWebSocketConnected: boolean;
  isWebSocketAuthenticated: boolean;
  driverId?: string;
  busId?: string;
  lastLocation: LocationData | null;
  onLocationUpdate?: (location: LocationData) => void;
}

/**
 * Syncs location updates to WebSocket when connected and authenticated
 */
export function useWebSocketLocationSync({
  isTracking,
  isWebSocketConnected,
  isWebSocketAuthenticated,
  driverId,
  busId,
  lastLocation,
  onLocationUpdate,
}: UseWebSocketLocationSyncProps) {
  const lastSuccessfulSendRef = useRef<number>(0);
  const webSocketHealthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Send location to WebSocket when location updates
  useEffect(() => {
    if (!lastLocation) return;

    // Send location to WebSocket if connected and authenticated
    if (isWebSocketConnected && isWebSocketAuthenticated && isTracking && driverId && busId) {
      try {
        logger.info('📍 Sending location update to WebSocket', 'useWebSocketLocationSync', { 
          driverId, 
          busId,
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
          accuracy: lastLocation.accuracy,
        });
        
        unifiedWebSocketService.sendLocationUpdate({
          driverId,
          busId,
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
          timestamp: new Date(lastLocation.timestamp).toISOString(),
          speed: lastLocation.speed,
          heading: lastLocation.heading,
        });
        
        // Track successful WebSocket send
        lastSuccessfulSendRef.current = Date.now();
        
        logger.info('✅ Location sent to WebSocket successfully', 'useWebSocketLocationSync', {
          driverId,
          busId,
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
        });

        // Notify parent of location update
        if (onLocationUpdate) {
          onLocationUpdate(lastLocation);
        }
      } catch (error) {
        logger.error('❌ Failed to send location to WebSocket', 'useWebSocketLocationSync', { 
          error: error instanceof Error ? error.message : String(error),
          driverId,
          busId,
        });
        // Error will be handled by error listener
      }
    } else if (isTracking) {
      // Only warn if we're tracking but can't send
      logger.warn('⚠️ Cannot send location update - waiting for requirements', 'useWebSocketLocationSync', {
        isWebSocketConnected,
        isWebSocketAuthenticated,
        isTracking,
        driverId: driverId || 'MISSING',
        busId: busId || 'MISSING',
      });
    }
  }, [lastLocation, isTracking, isWebSocketConnected, isWebSocketAuthenticated, driverId, busId, onLocationUpdate]);

  // WebSocket health check for long-running connections
  useEffect(() => {
    if (isTracking && isWebSocketConnected && isWebSocketAuthenticated) {
      webSocketHealthCheckIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const timeSinceLastSend = now - lastSuccessfulSendRef.current;
        
        // Alert if no successful sends for 3 minutes (indicates WebSocket issue)
        if (timeSinceLastSend > 3 * 60 * 1000 && lastSuccessfulSendRef.current > 0) {
          logger.warn('⚠️ WebSocket health check: No successful location sends for extended period', 'useWebSocketLocationSync', {
            timeSinceLastSend: `${Math.round(timeSinceLastSend / 1000)  }s`,
            isWebSocketConnected,
            isWebSocketAuthenticated,
            action: 'Checking WebSocket connection health...',
          });
          
          // Verify WebSocket is still connected
          const connectionStatus = unifiedWebSocketService.getConnectionStatus();
          if (!connectionStatus) {
            logger.error('🚨 WebSocket appears disconnected - reconnection may be needed', 'useWebSocketLocationSync');
          }
        }
      }, 5 * 60 * 1000); // Check every 5 minutes
    }

    // Cleanup
    return () => {
      if (webSocketHealthCheckIntervalRef.current) {
        clearInterval(webSocketHealthCheckIntervalRef.current);
        webSocketHealthCheckIntervalRef.current = null;
      }
    };
  }, [isTracking, isWebSocketConnected, isWebSocketAuthenticated]);
}

