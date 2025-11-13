/**
 * MapCanvas Component
 * Renders the MapLibre map container
 */

import React, { RefObject } from 'react';
import maplibregl from 'maplibre-gl';

interface MapCanvasProps {
  mapContainerRef: RefObject<HTMLDivElement>;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * MapCanvas - Renders the map container div
 * The actual map instance is managed by useMapInstance hook
 */
export const MapCanvas: React.FC<MapCanvasProps> = React.memo(({ 
  mapContainerRef, 
  className = '',
  style 
}) => {
  return (
    <div
      ref={mapContainerRef}
      className={`w-full h-full rounded-lg overflow-hidden ${className}`}
      style={{ minHeight: '400px', ...style }}
    />
  );
});

MapCanvas.displayName = 'MapCanvas';

