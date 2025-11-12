/**
 * Hook for debounced location updates
 */
import { useCallback } from 'react';
import { logger } from '../../../utils/logger';
import { unifiedWebSocketService, BusLocation as WSBusLocation } from '../../../services/UnifiedWebSocketService';
import { BusLocation } from '../../../types';

/**
 * Creates a debounced location update function
 */
export function useDebouncedLocationUpdates(
  setLastBusLocations: React.Dispatch<React.SetStateAction<{ [busId: string]: BusLocation }>>
): (location: WSBusLocation) => void {
  return useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      let rafId: number | null = null;
      const pendingUpdates = new Map<string, WSBusLocation>();
      
      return (location: WSBusLocation) => {
        // Store pending update
        pendingUpdates.set(location.busId, location);
        
        clearTimeout(timeoutId);
        
        // Cancel any pending RAF
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        
        timeoutId = setTimeout(() => {
          // Use RAF to batch updates with browser repaint cycle
          rafId = requestAnimationFrame(() => {
            if (pendingUpdates.size > 0) {
              logger.info('🔍 DEBUG: Updating lastBusLocations state', 'useDebouncedLocationUpdates', { 
                pendingUpdatesCount: pendingUpdates.size,
                busIds: Array.from(pendingUpdates.keys())
              });
              
              setLastBusLocations(prev => {
                const updates = { ...prev };
                pendingUpdates.forEach((loc, busId) => {
                  // Convert WSBusLocation to BusLocation with required driverId
                  const busLocation: BusLocation = {
                    busId: loc.busId,
                    driverId: (loc as any).driverId || '',
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    timestamp: loc.timestamp,
                    speed: loc.speed,
                    heading: loc.heading,
                  };
                  updates[busId] = busLocation;
                  logger.info('🔍 DEBUG: Adding location to state', 'useDebouncedLocationUpdates', { 
                    busId,
                    timestamp: loc.timestamp 
                  });
                });
                pendingUpdates.clear();
                
                // CRITICAL DEBUG: Log final state
                logger.info('🔍 DEBUG: Final lastBusLocations state', 'useDebouncedLocationUpdates', { 
                  totalLocations: Object.keys(updates).length,
                  busIds: Object.keys(updates)
                });
                
                return updates;
              });
            }
            rafId = null;
          });
        }, 200); // 200ms debounce to reduce CPU usage
      };
    })(),
    [setLastBusLocations]
  );
}

