import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { MAP_TILE_URLS, MAP_TILE_ATTRIBUTION, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from '../config/map';
import { logger } from '../utils/logger';
import { errorHandler } from '../utils/errorHandler';

interface UseMapInstanceParams {
  mapContainer: React.RefObject<HTMLDivElement>;
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
  markersRef: React.MutableRefObject<{ [busId: string]: maplibregl.Marker }>;
  popupsRef: React.MutableRefObject<{ [busId: string]: maplibregl.Popup }>;
  addedRoutesRef: React.MutableRefObject<Set<string>>;
  cleanupFunctionsRef: React.MutableRefObject<Array<() => void>>;
  mapEventListenersRef: React.MutableRefObject<Map<string, () => void>>;
  isMapInitializedRef: React.MutableRefObject<boolean>;
  eventListenersAddedRef: React.MutableRefObject<boolean>;
  setIsLoading: (val: boolean) => void;
  setConnectionError: (msg: string | null) => void;
}

export function useMapInstance({
  mapContainer,
  mapRef,
  markersRef,
  popupsRef,
  addedRoutesRef,
  cleanupFunctionsRef,
  mapEventListenersRef,
  isMapInitializedRef,
  eventListenersAddedRef,
  setIsLoading,
  setConnectionError,
}: UseMapInstanceParams) {
  useEffect(() => {
    if (isMapInitializedRef.current || !mapContainer.current) {
      return;
    }

    logger.info('🗺️ Initializing consolidated student map...', 'component');
    isMapInitializedRef.current = true;

    try {
      mapRef.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: MAP_TILE_URLS,
              tileSize: 256,
              attribution: MAP_TILE_ATTRIBUTION,
              maxzoom: MAP_MAX_ZOOM,
            },
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: MAP_MAX_ZOOM,
            },
          ],
        },
        center: MAP_DEFAULT_CENTER,
        zoom: MAP_DEFAULT_ZOOM,
        bearing: 0,
        pitch: 0,
        attributionControl: true,
        maxZoom: MAP_MAX_ZOOM,
        minZoom: MAP_MIN_ZOOM,
        preserveDrawingBuffer: false,
        antialias: true,
        dragRotate: false,
      });

      mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      const handleMapLoad = () => {
        logger.info('🗺️ Map loaded successfully', 'component');
        setIsLoading(false);
      };

      const handleMapError = (e: any) => {
        const mapError = errorHandler.handleError(
          new Error(`Map error: ${e?.message || 'Unknown map error'}`),
          'StudentMap-mapError'
        );
        logger.error('Map error occurred', 'component', { error: mapError.message, code: mapError.code });
        setConnectionError(mapError.userMessage || 'Map initialization failed');
        setIsLoading(false);
      };

      mapEventListenersRef.current.set('load', handleMapLoad);
      mapEventListenersRef.current.set('error', () => handleMapError({}));

      mapRef.current.once('load', handleMapLoad);
      mapRef.current.on('error', handleMapError);

      const cleanup = () => {
        if (mapRef.current) {
          mapEventListenersRef.current.forEach((handler, event) => {
            try {
              mapRef.current?.off(event, handler);
            } catch (error) {
              logger.warn('Warning', 'component', { data: `⚠️ Error removing map event listener ${event}:`, error });
            }
          });
          mapEventListenersRef.current.clear();

          Object.values(markersRef.current).forEach(marker => {
            try { marker.remove(); } catch (error) { logger.warn('Warning', 'component', { data: '⚠️ Error removing marker:', error }); }
          });
          Object.values(popupsRef.current).forEach(popup => {
            try { popup.remove(); } catch (error) { logger.warn('Warning', 'component', { data: '⚠️ Error removing popup:', error }); }
          });

          markersRef.current = {} as any;
          popupsRef.current = {} as any;
          addedRoutesRef.current.clear();

          mapRef.current.remove();
          mapRef.current = null;
          isMapInitializedRef.current = false;
        }
      };

      cleanupFunctionsRef.current.push(cleanup);
      return cleanup;
    } catch (error) {
      const mapInitError = errorHandler.handleError(error, 'StudentMap-mapInitialization');
      logger.error('❌ Failed to initialize map', 'component', { error: mapInitError.message, code: mapInitError.code });
      setConnectionError(mapInitError.userMessage || 'Failed to initialize map');
      setIsLoading(false);
    }
  }, [mapContainer.current]);
}


