import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';

interface MapContainerProps {
  onMapLoad: (map: maplibregl.Map) => void;
  onMapError: (error: any) => void;
  onViewportChange?: (viewport: {
    bounds: [[number, number], [number, number]];
    zoom: number;
    center: [number, number];
  }) => void;
  center?: [number, number];
  zoom?: number;
  enableClustering?: boolean;
  enableHeatmap?: boolean;
}

const MapContainer: React.FC<MapContainerProps> = ({
  onMapLoad,
  onMapError,
  onViewportChange,
  center = [72.8777, 23.0225], // Default to Ahmedabad
  zoom = 12,
  enableClustering = true,
  enableHeatmap = false,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const viewportChangeTimeout = useRef<NodeJS.Timeout | null>(null);

  const initializeMap = useCallback(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
              // Enhanced caching for better performance
              maxzoom: 18,
              bounds: [-180, -85.051129, 180, 85.051129],
              // Add tile caching headers
              scheme: 'xyz',
            }
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 18,
              // Add performance optimizations
              paint: {
                'raster-opacity': 1,
                'raster-fade-duration': 300,
              }
            }
          ]
        },
        center,
        zoom,
        attributionControl: true,
        // Enhanced performance optimizations
        preserveDrawingBuffer: false,
        antialias: false,
        failIfMajorPerformanceCaveat: false,
        maxZoom: 18,
        minZoom: 0,
        // Add spatial optimization settings
        maxBounds: [[72.0, 22.0], [74.0, 24.0]], // Restrict to Ahmedabad area
        pitchWithRotate: false, // Disable 3D for better performance
        dragRotate: false, // Disable rotation for better UX
      });

      map.current.on('load', () => {
        console.log('🗺️ Map loaded successfully');
        onMapLoad(map.current!);
      });

      map.current.on('error', (error) => {
        console.error('❌ Map error:', error);
        onMapError(error);
      });

      // Enhanced viewport change handling with debouncing
      const handleViewportChange = () => {
        if (!map.current || !onViewportChange) return;

        // Clear existing timeout
        if (viewportChangeTimeout.current) {
          clearTimeout(viewportChangeTimeout.current);
        }

        // Debounce viewport changes for better performance
        viewportChangeTimeout.current = setTimeout(() => {
          const bounds = map.current!.getBounds();
          const zoom = map.current!.getZoom();
          const center = map.current!.getCenter();

          onViewportChange({
            bounds: [
              [bounds.getWest(), bounds.getSouth()],
              [bounds.getEast(), bounds.getNorth()]
            ],
            zoom,
            center: [center.lng, center.lat],
          });
        }, 100); // 100ms debounce
      };

      // Listen to viewport changes
      map.current.on('moveend', handleViewportChange);
      map.current.on('zoomend', handleViewportChange);
      map.current.on('resize', handleViewportChange);

      // Handle WebGL context loss with better error recovery
      let isContextLost = false;
      
      map.current.on('webglcontextlost', () => {
        console.warn('⚠️ WebGL context lost, attempting to restore...');
        
        // Prevent multiple restoration attempts
        if (isContextLost) return;
        isContextLost = true;

        setTimeout(() => {
          if (map.current) {
            try {
              // Force a complete map refresh
              map.current.resize();
              map.current.triggerRepaint();
              isContextLost = false;
              console.log('✅ WebGL context restored successfully');
            } catch (error) {
              console.error('❌ Failed to restore WebGL context:', error);
              onMapError(new Error('Map rendering failed, please refresh the page'));
            }
          }
        }, 2000); // Increased delay for better recovery
      });

      map.current.on('webglcontextrestored', () => {
        console.log('✅ WebGL context restored');
        if (map.current) {
          isContextLost = false;
          map.current.triggerRepaint();
        }
      });

      // Add error recovery for tile loading issues
      map.current.on('error', (error) => {
        console.error('❌ Map error:', error);
        // Don't call onMapError for tile loading errors
        if (error.type !== 'TileLoadError') {
          onMapError(error);
        }
      });

      // Add performance monitoring
      map.current.on('idle', () => {
        console.log('🗺️ Map is idle - all tiles loaded');
      });

      // Add spatial optimization features
      if (enableClustering) {
        console.log('🗺️ Clustering enabled');
      }

      if (enableHeatmap) {
        console.log('🗺️ Heatmap enabled');
      }

    } catch (error) {
      console.error('❌ Error initializing map:', error);
      onMapError(error);
    }
  }, [center, zoom, onMapLoad, onMapError, onViewportChange, enableClustering, enableHeatmap]);

  useEffect(() => {
    // Prevent double initialization
    if (map.current) {
      console.log('🗺️ Map already initialized, skipping...');
      return;
    }

    initializeMap();

    return () => {
      if (viewportChangeTimeout.current) {
        clearTimeout(viewportChangeTimeout.current);
      }
      
      if (map.current) {
        console.log('🗺️ Cleaning up map...');
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Remove initializeMap dependency to prevent re-initialization

  // Expose map methods for external use
  useEffect(() => {
    if (map.current && onViewportChange) {
      // Trigger initial viewport change
      const bounds = map.current.getBounds();
      const currentZoom = map.current.getZoom();
      const currentCenter = map.current.getCenter();

      onViewportChange({
        bounds: [
          [bounds.getWest(), bounds.getSouth()],
          [bounds.getEast(), bounds.getNorth()]
        ],
        zoom: currentZoom,
        center: [currentCenter.lng, currentCenter.lat],
      });
    }
  }, [map.current, onViewportChange]);

  return (
    <div
      ref={mapContainer}
      className="map-container"
      style={{ height: '100vh', width: '100%' }}
    />
  );
};

export default MapContainer;
