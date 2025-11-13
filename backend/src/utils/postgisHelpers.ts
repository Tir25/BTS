/**
 * PostGIS Helper Utilities
 * Centralized functions for parsing and formatting PostGIS geometry types
 */

import { logger } from './logger';

/**
 * Parse PostGIS POINT format string to latitude and longitude
 * @param pointString - PostGIS POINT format: "POINT(longitude latitude)"
 * @returns Object with latitude and longitude, or null if parsing fails
 */
export function parsePostGISPoint(pointString: string | null | undefined): { latitude: number; longitude: number } | null {
  if (!pointString || typeof pointString !== 'string') {
    return null;
  }

  try {
    // Parse PostGIS Point format: "POINT(longitude latitude)"
    const pointMatch = pointString.match(/POINT\(([^)]+)\)/);
    if (!pointMatch) {
      logger.warn('Invalid PostGIS POINT format', 'postgis-helpers', { pointString });
      return null;
    }

    const coords = pointMatch[1].split(' ').map(Number);
    if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
      logger.warn('Invalid coordinates in PostGIS POINT', 'postgis-helpers', { pointString, coords });
      return null;
    }

    const [longitude, latitude] = coords;
    
    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      logger.warn('Coordinates out of valid range', 'postgis-helpers', { latitude, longitude });
      return null;
    }

    return { latitude, longitude };
  } catch (error) {
    logger.error('Error parsing PostGIS POINT', 'postgis-helpers', { error, pointString });
    return null;
  }
}

/**
 * Format latitude and longitude to PostGIS POINT format
 * @param latitude - Latitude (-90 to 90)
 * @param longitude - Longitude (-180 to 180)
 * @returns PostGIS POINT format string: "POINT(longitude latitude)"
 */
export function formatPostGISPoint(latitude: number, longitude: number): string {
  // Validate coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error(`Invalid coordinates: latitude=${latitude}, longitude=${longitude}`);
  }

  return `POINT(${longitude} ${latitude})`;
}

/**
 * Convert PostGIS POINT to GeoJSON Point format
 * @param pointString - PostGIS POINT format: "POINT(longitude latitude)"
 * @returns GeoJSON Point object or null if parsing fails
 */
export function postGISPointToGeoJSON(pointString: string | null | undefined): { type: 'Point'; coordinates: [number, number] } | null {
  const parsed = parsePostGISPoint(pointString);
  if (!parsed) {
    return null;
  }

  return {
    type: 'Point',
    coordinates: [parsed.longitude, parsed.latitude], // GeoJSON uses [longitude, latitude]
  };
}

