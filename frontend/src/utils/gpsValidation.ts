/**
 * Production-Grade GPS Coordinate Validation
 * 
 * This module provides comprehensive validation for GPS coordinates including:
 * - Range validation (latitude/longitude bounds)
 * - Stale data detection (timestamp validation)
 * - Invalid coordinate detection (e.g., 999, 999)
 * - Anomaly detection (impossible jumps/teleporting)
 * - Speed validation
 */

import { logger } from './logger';
import { calculateDistance } from './locationUtils';

export interface GPSValidationResult {
  isValid: boolean;
  shouldReject: boolean; // True if location should be completely rejected
  shouldWarn: boolean; // True if location should be accepted but with warning
  error?: string;
  warning?: string;
  rejectionReason?: 'INVALID_COORDINATES' | 'STALE_DATA' | 'TELEPORT_DETECTED' | 'INVALID_SPEED' | 'ZERO_COORDINATES';
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: number | string;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

interface LastValidLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number;
}

// Track last valid location per driver/bus for anomaly detection
const lastValidLocations = new Map<string, LastValidLocation>();

// Configuration constants
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
  
  // Stale data thresholds
  MAX_STALE_AGE_MS: 5 * 60 * 1000, // 5 minutes
  MAX_FUTURE_OFFSET_MS: 60 * 1000, // 1 minute
  
  // Anomaly detection
  MAX_REASONABLE_SPEED_KMH: 120, // Maximum reasonable speed for a bus
  MAX_REASONABLE_DISTANCE_METERS: 1000, // Maximum reasonable distance per update (1km)
  MAX_TELEPORT_DISTANCE_METERS: 5000, // Absolute maximum before rejecting as teleport
  
  // Speed validation
  MIN_SPEED_KMH: 0,
  MAX_SPEED_KMH: 200,
  
  // Update interval for anomaly detection
  MIN_UPDATE_INTERVAL_MS: 1000, // 1 second
};

/**
 * Validates GPS coordinates for range, invalid values, and common errors
 */
function validateCoordinateRanges(latitude: number, longitude: number): { isValid: boolean; error?: string } {
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

/**
 * Validates timestamp to detect stale or future-dated data
 */
function validateTimestamp(timestamp: number | string): { isValid: boolean; error?: string; age?: number } {
  const now = Date.now();
  let timestampMs: number;
  
  // Convert string timestamp to number
  if (typeof timestamp === 'string') {
    timestampMs = new Date(timestamp).getTime();
    if (isNaN(timestampMs)) {
      return { isValid: false, error: 'Invalid timestamp format' };
    }
  } else {
    timestampMs = timestamp;
  }
  
  const age = now - timestampMs;
  
  // Check if timestamp is too old (stale data)
  if (age > VALIDATION_CONFIG.MAX_STALE_AGE_MS) {
    return { 
      isValid: false, 
      error: `Location data is stale (${Math.round(age / 1000)}s old, max ${VALIDATION_CONFIG.MAX_STALE_AGE_MS / 1000}s allowed)`,
      age 
    };
  }
  
  // Check if timestamp is too far in the future
  if (age < -VALIDATION_CONFIG.MAX_FUTURE_OFFSET_MS) {
    return { 
      isValid: false, 
      error: `Location timestamp is in the future (${Math.round(-age / 1000)}s ahead)`,
      age 
    };
  }
  
  return { isValid: true, age };
}

/**
 * Detects impossible location jumps (teleporting)
 */
function detectTeleport(
  currentLat: number,
  currentLng: number,
  lastLat: number,
  lastLng: number,
  timeDiffMs: number,
  reportedSpeed?: number
): { isTeleport: boolean; reason?: string; calculatedSpeed?: number } {
  const distanceMeters = calculateDistance(lastLat, lastLng, currentLat, currentLng) * 1000;
  
  // If time difference is too small, use minimum interval
  const effectiveTimeDiff = Math.max(timeDiffMs, VALIDATION_CONFIG.MIN_UPDATE_INTERVAL_MS);
  const timeDiffHours = effectiveTimeDiff / (1000 * 60 * 60);
  
  // Calculate speed from distance and time
  const calculatedSpeedKmh = distanceMeters / 1000 / timeDiffHours;
  
  // Check for impossible jump
  if (distanceMeters > VALIDATION_CONFIG.MAX_TELEPORT_DISTANCE_METERS) {
    return { 
      isTeleport: true, 
      reason: `Impossible location jump detected: ${distanceMeters.toFixed(0)}m in ${(effectiveTimeDiff / 1000).toFixed(1)}s`,
      calculatedSpeed: calculatedSpeedKmh 
    };
  }
  
  // Check if calculated speed exceeds reasonable limits
  if (calculatedSpeedKmh > VALIDATION_CONFIG.MAX_REASONABLE_SPEED_KMH) {
    // Only flag as teleport if distance is significant
    if (distanceMeters > VALIDATION_CONFIG.MAX_REASONABLE_DISTANCE_METERS) {
      return { 
        isTeleport: true, 
        reason: `Unrealistic speed detected: ${calculatedSpeedKmh.toFixed(1)} km/h for ${distanceMeters.toFixed(0)}m jump`,
        calculatedSpeed: calculatedSpeedKmh 
      };
    }
  }
  
  // Cross-check with reported speed if available
  if (reportedSpeed !== undefined) {
    const speedDiff = Math.abs(calculatedSpeedKmh - reportedSpeed);
    if (speedDiff > 50 && distanceMeters > 100) {
      // Significant discrepancy between calculated and reported speed
      return { 
        isTeleport: true, 
        reason: `Speed mismatch: calculated ${calculatedSpeedKmh.toFixed(1)} km/h vs reported ${reportedSpeed.toFixed(1)} km/h`,
        calculatedSpeed: calculatedSpeedKmh 
      };
    }
  }
  
  return { isTeleport: false, calculatedSpeed: calculatedSpeedKmh };
}

/**
 * Validates speed value
 */
function validateSpeed(speed?: number): { isValid: boolean; error?: string } {
  if (speed === undefined) {
    return { isValid: true }; // Speed is optional
  }
  
  if (typeof speed !== 'number' || isNaN(speed) || !isFinite(speed)) {
    return { isValid: false, error: 'Speed must be a valid number' };
  }
  
  if (speed < VALIDATION_CONFIG.MIN_SPEED_KMH) {
    return { isValid: false, error: `Speed cannot be negative (got ${speed})` };
  }
  
  if (speed > VALIDATION_CONFIG.MAX_SPEED_KMH) {
    return { isValid: false, error: `Speed exceeds maximum (${speed} > ${VALIDATION_CONFIG.MAX_SPEED_KMH} km/h)` };
  }
  
  return { isValid: true };
}

/**
 * Main GPS validation function
 * Validates location data comprehensively and detects anomalies
 */
export function validateGPSLocation(
  location: LocationUpdate,
  driverId?: string,
  busId?: string
): GPSValidationResult {
  const { latitude, longitude, timestamp, speed, heading, accuracy } = location;
  
  // Step 1: Validate coordinate ranges and invalid patterns
  const coordinateCheck = validateCoordinateRanges(latitude, longitude);
  if (!coordinateCheck.isValid) {
    logger.warn('GPS validation failed: Invalid coordinates', 'gps-validation', {
      latitude,
      longitude,
      error: coordinateCheck.error,
      driverId,
      busId
    });
    return {
      isValid: false,
      shouldReject: true,
      shouldWarn: false,
      error: coordinateCheck.error,
      rejectionReason: 'INVALID_COORDINATES'
    };
  }
  
  // Step 2: Validate timestamp (stale data detection)
  const timestampCheck = validateTimestamp(timestamp);
  if (!timestampCheck.isValid) {
    logger.warn('GPS validation failed: Invalid timestamp', 'gps-validation', {
      timestamp,
      error: timestampCheck.error,
      age: timestampCheck.age,
      driverId,
      busId
    });
    return {
      isValid: false,
      shouldReject: true,
      shouldWarn: false,
      error: timestampCheck.error,
      rejectionReason: 'STALE_DATA'
    };
  }
  
  // Step 3: Validate speed if provided
  const speedCheck = validateSpeed(speed);
  if (!speedCheck.isValid) {
    logger.warn('GPS validation failed: Invalid speed', 'gps-validation', {
      speed,
      error: speedCheck.error,
      driverId,
      busId
    });
    return {
      isValid: false,
      shouldReject: true,
      shouldWarn: false,
      error: speedCheck.error,
      rejectionReason: 'INVALID_SPEED'
    };
  }
  
  // Step 4: Anomaly detection (teleport detection) - requires previous location
  const locationKey = driverId || busId || 'default';
  const lastLocation = lastValidLocations.get(locationKey);
  
  if (lastLocation) {
    const timeDiffMs = (typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp) - lastLocation.timestamp;
    const teleportCheck = detectTeleport(
      latitude,
      longitude,
      lastLocation.latitude,
      lastLocation.longitude,
      timeDiffMs,
      speed
    );
    
    if (teleportCheck.isTeleport) {
      logger.warn('GPS validation failed: Teleport detected', 'gps-validation', {
        latitude,
        longitude,
        lastLat: lastLocation.latitude,
        lastLng: lastLocation.longitude,
        reason: teleportCheck.reason,
        calculatedSpeed: teleportCheck.calculatedSpeed,
        driverId,
        busId
      });
      return {
        isValid: false,
        shouldReject: true,
        shouldWarn: false,
        error: teleportCheck.reason,
        rejectionReason: 'TELEPORT_DETECTED'
      };
    }
  }
  
  // Step 5: Accuracy warning (if accuracy is poor but not invalid)
  // CRITICAL FIX: Accept locations even with very poor accuracy
  // Only warn, don't reject - low accuracy is better than no location
  const warnings: string[] = [];
  if (accuracy !== undefined) {
    // PRODUCTION FIX: More granular accuracy warnings based on severity
    if (accuracy > 10000) {
      // Extremely poor accuracy (>10km) - likely IP-based positioning
      warnings.push(`Extremely poor GPS accuracy: ${Math.round(accuracy / 1000)}km - Using approximate location (IP-based)`);
    } else if (accuracy > 1000) {
      // Very poor accuracy (>1km)
      warnings.push(`Very poor GPS accuracy: ${Math.round(accuracy)}m - GPS signal may be weak or using IP-based positioning`);
    } else if (accuracy > 100) {
      // Poor accuracy (>100m)
      warnings.push(`Poor GPS accuracy: ${Math.round(accuracy)}m - Consider moving to a better location`);
    }
  }
  
  // Update last valid location
  const timestampMs = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  lastValidLocations.set(locationKey, {
    latitude,
    longitude,
    timestamp: timestampMs,
    speed
  });
  
  // Clean up old entries (keep only last 100)
  if (lastValidLocations.size > 100) {
    const entries = Array.from(lastValidLocations.entries());
    lastValidLocations.clear();
    entries.slice(-50).forEach(([key, value]) => {
      lastValidLocations.set(key, value);
    });
  }
  
  return {
    isValid: true,
    shouldReject: false,
    shouldWarn: warnings.length > 0,
    warning: warnings.length > 0 ? warnings.join('; ') : undefined
  };
}

/**
 * Clear stored location history (useful for testing or reset)
 */
export function clearLocationHistory(driverId?: string, busId?: string): void {
  if (driverId || busId) {
    const key = driverId || busId || 'default';
    lastValidLocations.delete(key);
    logger.info('Location history cleared', 'gps-validation', { driverId, busId });
  } else {
    lastValidLocations.clear();
    logger.info('All location history cleared', 'gps-validation');
  }
}

/**
 * Get validation statistics
 */
export function getValidationStats(): {
  trackedLocations: number;
  lastValidLocations: Array<{ key: string; timestamp: number }>;
} {
  const entries = Array.from(lastValidLocations.entries()).map(([key, value]) => ({
    key,
    timestamp: value.timestamp
  }));
  
  return {
    trackedLocations: lastValidLocations.size,
    lastValidLocations: entries
  };
}

