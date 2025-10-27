/**
 * Map Helper Functions
 * 
 * Normalized helpers for accessing bus and route data across the Student Map feature.
 * These functions handle various data shape inconsistencies and provide type-safe access.
 */

import { Bus, Route } from '../types';

/**
 * Normalized bus ID access helper
 * Handles various bus ID property names: id, bus_id, busId, meta.id
 * 
 * @param bus - Bus object or primitive ID value
 * @returns Normalized bus ID (string | number) or null if not found
 */
export function getBusId(bus: unknown): string | number | null {
  if (!bus) return null;
  
  // Handle primitive ID values
  if (typeof bus === 'string' || typeof bus === 'number') {
    return bus;
  }
  
  // Handle objects
  if (typeof bus !== 'object') return null;
  
  const busObj = bus as Record<string, unknown>;
  
  // Check common ID property variations
  if (busObj.id !== undefined && busObj.id !== null) {
    return busObj.id as string | number;
  }
  
  if (busObj.bus_id !== undefined && busObj.bus_id !== null) {
    return busObj.bus_id as string | number;
  }
  
  if (busObj.busId !== undefined && busObj.busId !== null) {
    return busObj.busId as string | number;
  }
  
  // Check nested meta object
  if (busObj.meta && typeof busObj.meta === 'object') {
    const meta = busObj.meta as Record<string, unknown>;
    if (meta.id !== undefined && meta.id !== null) {
      return meta.id as string | number;
    }
  }
  
  return null;
}

/**
 * Extract route coordinates from various route data shapes
 * Handles GeoJSON LineString, custom coordinates array, and stops array
 * 
 * @param route - Route object with various possible coordinate formats
 * @returns Array of [lng, lat] coordinate pairs or null if not found
 */
export function getRouteCoordinates(route: unknown): [number, number][] | null {
  if (!route || typeof route !== 'object') return null;
  
  const routeObj = route as Record<string, unknown>;
  
  // Check direct coordinates array
  if (Array.isArray(routeObj.coordinates)) {
    // Validate coordinates format
    const coords = routeObj.coordinates as unknown[];
    if (coords.length > 0 && Array.isArray(coords[0]) && coords[0].length >= 2) {
      return coords as [number, number][];
    }
  }
  
  // Check GeoJSON geometry.coordinates
  if (routeObj.geom && typeof routeObj.geom === 'object') {
    const geom = routeObj.geom as Record<string, unknown>;
    if (Array.isArray(geom.coordinates)) {
      const coords = geom.coordinates as unknown[];
      if (coords.length > 0 && Array.isArray(coords[0]) && coords[0].length >= 2) {
        return coords as [number, number][];
      }
    }
  }
  
  // Check stops array (convert to coordinates)
  if (Array.isArray(routeObj.stops)) {
    const stops = routeObj.stops as unknown[];
    const coordinates: [number, number][] = [];
    
    for (const stop of stops) {
      if (stop && typeof stop === 'object') {
        const stopObj = stop as Record<string, unknown>;
        
        // Check for location property with lat/lng
        if (stopObj.location && typeof stopObj.location === 'object') {
          const location = stopObj.location as Record<string, unknown>;
          if (
            typeof location.lat === 'number' &&
            typeof location.lng === 'number'
          ) {
            coordinates.push([location.lng, location.lat]);
            continue;
          }
        }
        
        // Check for direct lat/lng properties
        if (
          typeof stopObj.lat === 'number' &&
          typeof stopObj.lng === 'number'
        ) {
          coordinates.push([stopObj.lng, stopObj.lat]);
          continue;
        }
        
        // Check for stops.coordinates (nested)
        if (stopObj.coordinates && Array.isArray(stopObj.coordinates)) {
          const coords = stopObj.coordinates as unknown[];
          if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            coordinates.push([coords[0] as number, coords[1] as number]);
            continue;
          }
        }
      }
    }
    
    if (coordinates.length > 0) {
      return coordinates;
    }
  }
  
  return null;
}

/**
 * Get route color from route object
 * 
 * @param route - Route object
 * @returns Color string or default blue color
 */
export function getRouteColor(route: unknown): string {
  if (!route || typeof route !== 'object') return '#3b82f6';
  
  const routeObj = route as Record<string, unknown>;
  
  if (typeof routeObj.color === 'string' && routeObj.color.length > 0) {
    return routeObj.color;
  }
  
  return '#3b82f6'; // Default blue color
}

/**
 * Get route ID from route object
 * Handles various route ID property names
 * 
 * @param route - Route object
 * @returns Route ID string or null
 */
export function getRouteId(route: unknown): string | null {
  if (!route || typeof route !== 'object') return null;
  
  const routeObj = route as Record<string, unknown>;
  
  if (typeof routeObj.id === 'string') {
    return routeObj.id;
  }
  
  if (typeof routeObj.route_id === 'string') {
    return routeObj.route_id;
  }
  
  return null;
}

