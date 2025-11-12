/**
 * Hook for managing routes on the map
 */
import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { logger } from '../../../utils/logger';
import { Route } from '../../../types';
import { getRouteColor } from '../../../utils/routeColors';

export interface UseRouteManagementProps {
  map: React.MutableRefObject<maplibregl.Map | null>;
  routes: Route[];
  selectedRoute: string;
  isMapInitialized: React.MutableRefObject<boolean>;
}

export interface UseRouteManagementReturn {
  addedRoutes: React.MutableRefObject<Set<string>>;
  routeColorsMap: React.MutableRefObject<Map<string, string>>;
  addRouteToMap: (route: Route, index: number) => void;
  removeRouteFromMap: (routeId: string) => void;
  updateRouteVisibility: (routeId: string, visible: boolean) => void;
}

/**
 * Manages route rendering on the map
 */
export function useRouteManagement({
  map,
  routes,
  selectedRoute,
  isMapInitialized,
}: UseRouteManagementProps): UseRouteManagementReturn {
  const addedRoutes = useRef<Set<string>>(new Set());
  const routeColorsMap = useRef<Map<string, string>>(new Map());
  const routesProcessed = useRef<Set<string>>(new Set());
  const previousRoutesRef = useRef<Route[]>([]);

  // Add route to map
  const addRouteToMap = useCallback((route: Route, index: number) => {
    if (!map.current || !isMapInitialized.current || !map.current.isStyleLoaded()) {
      return;
    }

    if (addedRoutes.current.has(route.id) || routesProcessed.current.has(route.id)) {
      return;
    }

    try {
      const coords = (route as any).coordinates || 
                     (route as any).geom?.coordinates || 
                     (route as any).stops?.coordinates ||
                     null;
      
      if (!coords || coords.length === 0) {
        logger.warn('Route has no coordinates', 'useRouteManagement', { routeId: route.id });
        return;
      }

      // Generate distinct color for each route
      const routeColor = getRouteColor(route.id, index);
      routeColorsMap.current.set(route.id, routeColor);
      
      // Add route source
      map.current.addSource(`route-${route.id}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: route.name, id: route.id },
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        },
      });

      // Add route layer
      map.current.addLayer({
        id: `route-${route.id}`,
        type: 'line',
        source: `route-${route.id}`,
        layout: { 
          'line-join': 'round', 
          'line-cap': 'round',
          'visibility': 'visible'
        },
        paint: {
          'line-color': routeColor,
          'line-width': 4,
          'line-opacity': selectedRoute === 'all' || selectedRoute === route.id ? 0.9 : 0.3,
        },
      });

      // Add click handler
      map.current.on('click', `route-${route.id}`, (e: any) => {
        const routeName = e.features[0]?.properties?.name || route.name;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="p-3">
              <h3 class="font-bold text-slate-900 text-lg mb-2">${routeName}</h3>
              <div class="space-y-1 text-sm text-slate-600">
                ${route.description ? `<p>${route.description}</p>` : ''}
                ${(route as any).distance_km ? `<p>📏 Distance: ${(route as any).distance_km} km</p>` : ''}
                ${(route as any).estimated_duration_minutes ? `<p>⏱️ Duration: ${(route as any).estimated_duration_minutes} min</p>` : ''}
              </div>
            </div>
          `)
          .addTo(map.current!);
      });

      // Change cursor on hover
      map.current.on('mouseenter', `route-${route.id}`, () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', `route-${route.id}`, () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });

      addedRoutes.current.add(route.id);
      routesProcessed.current.add(route.id);
      
      logger.info('✅ Route added to map', 'useRouteManagement', {
        routeId: route.id,
        routeName: route.name,
      });
    } catch (error) {
      logger.error('Error adding route to map', 'useRouteManagement', {
        routeId: route.id,
        error,
      });
    }
  }, [map, selectedRoute, isMapInitialized]);

  // Remove route from map
  const removeRouteFromMap = useCallback((routeId: string) => {
    if (!map.current) return;

    try {
      // Remove layer
      if (map.current.getLayer(`route-${routeId}`)) {
        map.current.removeLayer(`route-${routeId}`);
      }

      // Remove source
      if (map.current.getSource(`route-${routeId}`)) {
        map.current.removeSource(`route-${routeId}`);
      }

      addedRoutes.current.delete(routeId);
      routesProcessed.current.delete(routeId);
      routeColorsMap.current.delete(routeId);
      
      logger.info('✅ Route removed from map', 'useRouteManagement', { routeId });
    } catch (error) {
      logger.error('Error removing route from map', 'useRouteManagement', {
        routeId,
        error,
      });
    }
  }, [map]);

  // Update route visibility
  const updateRouteVisibility = useCallback((routeId: string, visible: boolean) => {
    if (!map.current) return;

    try {
      const layer = map.current.getLayer(`route-${routeId}`);
      if (layer) {
        map.current.setLayoutProperty(`route-${routeId}`, 'visibility', visible ? 'visible' : 'none');
      }
    } catch (error) {
      logger.error('Error updating route visibility', 'useRouteManagement', {
        routeId,
        error,
      });
    }
  }, [map]);

  // Add routes when they're loaded
  useEffect(() => {
    // Clear routesProcessed if routes have changed significantly
    const currentRouteIds = new Set(routes.map(r => r.id));
    const previousRouteIds = new Set(previousRoutesRef.current.map(r => r.id));
    
    const routesChanged = routes.length !== previousRoutesRef.current.length ||
      !Array.from(currentRouteIds).every(id => previousRouteIds.has(id));
    
    if (routesChanged && routes.length > 0) {
      routesProcessed.current = new Set(
        Array.from(routesProcessed.current).filter(id => currentRouteIds.has(id))
      );
    }
    
    previousRoutesRef.current = routes;
    
    if (routes.length > 0 && map.current && map.current.isStyleLoaded()) {
      routes.forEach((route, index) => {
        if (!routesProcessed.current.has(route.id) && !addedRoutes.current.has(route.id)) {
          addRouteToMap(route, index);
        }
      });
    }
  }, [routes, map, addRouteToMap]);

  // Update route visibility based on selected route
  useEffect(() => {
    if (!map.current || !isMapInitialized.current) return;

    addedRoutes.current.forEach(routeId => {
      const shouldBeVisible = selectedRoute === 'all' || selectedRoute === routeId;
      const layer = map.current?.getLayer(`route-${routeId}`);
      
      if (layer) {
        const currentOpacity = selectedRoute === 'all' || selectedRoute === routeId ? 0.9 : 0.3;
        map.current?.setPaintProperty(`route-${routeId}`, 'line-opacity', currentOpacity);
      }
    });
  }, [selectedRoute, map, isMapInitialized]);

  return {
    addedRoutes,
    routeColorsMap,
    addRouteToMap,
    removeRouteFromMap,
    updateRouteVisibility,
  };
}

