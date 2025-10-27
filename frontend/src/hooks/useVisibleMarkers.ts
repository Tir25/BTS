import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Bus, BusInfo } from '../types';

/**
 * Hook to filter visible bus markers based on map viewport bounds
 * Implements marker virtualization for performance optimization
 * 
 * @param mapRef - React ref to the MapLibre map instance
 * @param buses - Array of all buses to filter (Bus or BusInfo)
 * @param paddingMeters - Padding in meters to extend bounds (default: 100m)
 * @returns Array of buses that are visible in the current viewport
 */
export function useVisibleMarkers<T extends Bus | BusInfo>(
  mapRef: React.RefObject<maplibregl.Map | null>,
  buses: T[],
  paddingMeters: number = 100
): T[] {
  const [visibleBuses, setVisibleBuses] = useState<T[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBoundsRef = useRef<string>('');

  useEffect(() => {
    const updateVisibleBuses = () => {
      const map = mapRef.current;
      if (!map) {
        setVisibleBuses([]);
        return;
      }

      try {
        // Get current map bounds
        const bounds = map.getBounds();
        if (!bounds) {
          setVisibleBuses([]);
          return;
        }

        // Create bounds string for comparison (simple hash to avoid unnecessary updates)
        const boundsString = `${bounds.getNorth()}-${bounds.getSouth()}-${bounds.getEast()}-${bounds.getWest()}`;
        
        // Skip update if bounds haven't changed significantly
        if (boundsString === lastBoundsRef.current) {
          return;
        }
        
        lastBoundsRef.current = boundsString;

        // Extend bounds by padding (convert meters to degrees approximation)
        // ~111,000 meters per degree at equator
        const paddingDegrees = paddingMeters / 111000;
        
        const extendedBounds = new maplibregl.LngLatBounds(
          [bounds.getWest() - paddingDegrees, bounds.getSouth() - paddingDegrees],
          [bounds.getEast() + paddingDegrees, bounds.getNorth() + paddingDegrees]
        );

        // Filter buses that are within the extended bounds
        const filteredBuses = buses.filter(bus => {
          // Handle both Bus and BusInfo types
          const location = 'location' in bus ? bus.location : 
                          'currentLocation' in bus ? bus.currentLocation : 
                          null;
          
          if (!location) return false;
          
          // Handle different location formats
          const lat = 'lat' in location ? location.lat : 
                      'latitude' in location ? location.latitude : 
                      null;
          const lng = 'lng' in location ? location.lng : 
                      'longitude' in location ? location.longitude : 
                      null;
          
          if (typeof lat !== 'number' || typeof lng !== 'number') {
            return false;
          }

          // Check if bus location is within bounds
          // Note: MapLibre uses [lng, lat] format for coordinates
          return extendedBounds.contains([lng, lat]);
        });

        setVisibleBuses(filteredBuses as T[]);
      } catch (error) {
        console.error('Error updating visible markers:', error);
        // Fallback: show all buses if there's an error
        setVisibleBuses(buses);
      }
    };

    // Initial update
    updateVisibleBuses();

    // Subscribe to map move events (throttled to 250ms)
    const map = mapRef.current;
    if (!map) {
      return;
    }

    // Throttled update function
    const throttledUpdate = () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        updateVisibleBuses();
        updateTimeoutRef.current = null;
      }, 250);
    };

    // Listen to map events
    map.on('moveend', throttledUpdate);
    map.on('zoomend', throttledUpdate);

    // Cleanup
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      
      map.off('moveend', throttledUpdate);
      map.off('zoomend', throttledUpdate);
    };
  }, [mapRef, buses, paddingMeters]);

  return visibleBuses;
}

