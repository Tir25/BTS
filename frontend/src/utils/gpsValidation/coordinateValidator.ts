import { logger } from '../logger';

/**
 * Configuration for coordinate validation
 */
const VALIDATION_CONFIG = {
  // Coordinate ranges
  MIN_LATITUDE: -90,
  MAX_LATITUDE: 90,
  MIN_LONGITUDE: -180,
  MAX_LONGITUDE: 180,
  
  // Invalid coordinate patterns (common GPS errors)
  INVALID_COORDINATES: [
    [0, 0], // Null Island
    [999, 999], // Common invalid input
    [-999, -999], // Common invalid input
    [999.999, 999.999], // Common invalid input
  ],
};

/**
 * Coordinate validation result
 */
export interface CoordinateValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates GPS coordinates for range, invalid values, and common errors
 */
export function validateCoordinateRanges(
  latitude: number,
  longitude: number
): CoordinateValidationResult {
  // Check if coordinates are numbers
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { isValid: false, error: 'Coordinates must be numbers' };
  }
  
  // Check for NaN or Infinity
  if (isNaN(latitude) || isNaN(longitude) || !isFinite(latitude) || !isFinite(longitude)) {
    return { isValid: false, error: 'Coordinates must be finite numbers' };
  }
  
  // Check latitude range
  if (latitude < VALIDATION_CONFIG.MIN_LATITUDE || latitude > VALIDATION_CONFIG.MAX_LATITUDE) {
    return { isValid: false, error: `Latitude ${latitude} is out of valid range (-90 to 90)` };
  }
  
  // Check longitude range
  if (longitude < VALIDATION_CONFIG.MIN_LONGITUDE || longitude > VALIDATION_CONFIG.MAX_LONGITUDE) {
    return { isValid: false, error: `Longitude ${longitude} is out of valid range (-180 to 180)` };
  }
  
  // Check for zero coordinates (null island)
  if (latitude === 0 && longitude === 0) {
    return { isValid: false, error: 'Coordinates (0, 0) are invalid (Null Island)' };
  }
  
  // Check for common invalid coordinate patterns
  for (const [invalidLat, invalidLng] of VALIDATION_CONFIG.INVALID_COORDINATES) {
    if (Math.abs(latitude - invalidLat) < 0.001 && Math.abs(longitude - invalidLng) < 0.001) {
      return { isValid: false, error: `Invalid coordinates detected (${latitude}, ${longitude})` };
    }
  }
  
  return { isValid: true };
}

