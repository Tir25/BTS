/**
 * Hook for initializing and managing map instance
 */
import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { logger } from '../../../utils/logger';
import { MAP_TILE_URLS, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from '../../../config/map';

export interface UseMapInitializationProps {
  mapContainer: React.RefObject<HTMLDivElement>;
  config: {
    enableRealTime: boolean;
    enableClustering: boolean;
    enableOfflineMode: boolean;
  };
}

export interface UseMapInitializationReturn {
  map: React.MutableRefObject<maplibregl.Map | null>;
  isMapInitialized: React.MutableRefObject<boolean>;
  cleanupFunctions: React.MutableRefObject<(() => void)[]>;
}

/**
 * Initializes and manages the map instance
 */
export function useMapInitialization({
  mapContainer,
  config,
}: UseMapInitializationProps): UseMapInitializationReturn {
  const map = useRef<maplibregl.Map | null>(null);
  const isMapInitialized = useRef(false);
  const cleanupFunctions = useRef<(() => void)[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || isMapInitialized.current) return;

    try {
      logger.info('Initializing map', 'useMapInitialization');
      
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'raster-tiles': {
              type: 'raster',
              tiles: MAP_TILE_URLS,
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [
            {
              id: 'simple-tiles',
              type: 'raster',
              source: 'raster-tiles',
              minzoom: 0,
              maxzoom: 22,
            },
          ],
        },
        center: MAP_DEFAULT_CENTER,
        zoom: MAP_DEFAULT_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        minZoom: MAP_MIN_ZOOM,
        attributionControl: true,
      });

      // Add navigation controls
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Handle map load
      map.current.on('load', () => {
        logger.info('Map loaded successfully', 'useMapInitialization');
        isMapInitialized.current = true;
      });

      // Handle map errors
      map.current.on('error', (e) => {
        logger.error('Map error', 'useMapInitialization', { error: e });
      });

      // Cleanup function
      cleanupFunctions.current.push(() => {
        if (map.current) {
          logger.info('Cleaning up map', 'useMapInitialization');
          map.current.remove();
          map.current = null;
          isMapInitialized.current = false;
        }
      });
    } catch (error) {
      logger.error('Error initializing map', 'useMapInitialization', { error });
    }

    return () => {
      // Execute all cleanup functions
      cleanupFunctions.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          logger.warn('Error during map cleanup', 'useMapInitialization', { error });
        }
      });
      cleanupFunctions.current = [];
    };
  }, [mapContainer, config]);

  return {
    map,
    isMapInitialized,
    cleanupFunctions,
  };
}

