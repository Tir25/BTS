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
import { validateCoordinateRanges } from './gpsValidation/coordinateValidator';
import { validateTimestamp } from './gpsValidation/timestampValidator';
import { detectTeleport } from './gpsValidation/teleportDetector';
import { validateSpeed } from './gpsValidation/speedValidator';
import { locationHistory } from './gpsValidation/locationHistory';

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

// NOTE: Validation helper functions have been moved to separate modules:
// - coordinateValidator.ts - validateCoordinateRanges()
// - timestampValidator.ts - validateTimestamp()
// - teleportDetector.ts - detectTeleport()
// - speedValidator.ts - validateSpeed()
// - locationHistory.ts - locationHistory (singleton)

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
  const lastLocation = locationHistory.getLastLocation(locationKey);

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
  locationHistory.updateLastLocation(locationKey, latitude, longitude, timestampMs, speed);
  
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
    locationHistory.clear(key);
  } else {
    locationHistory.clear();
  }
}

/**
 * Get validation statistics
 */
export function getValidationStats(): {
  trackedLocations: number;
  lastValidLocations: Array<{ key: string; timestamp: number }>;
} {
  return locationHistory.getStats();
}

