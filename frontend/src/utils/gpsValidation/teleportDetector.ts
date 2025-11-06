import { calculateDistance } from '../locationUtils';

/**
 * Configuration for teleport detection
 */
const VALIDATION_CONFIG = {
  // Anomaly detection
  MAX_REASONABLE_SPEED_KMH: 120, // Maximum reasonable speed for a bus
  MAX_REASONABLE_DISTANCE_METERS: 1000, // Maximum reasonable distance per update (1km)
  MAX_TELEPORT_DISTANCE_METERS: 5000, // Absolute maximum before rejecting as teleport
  
  // Update interval for anomaly detection
  MIN_UPDATE_INTERVAL_MS: 1000, // 1 second
};

/**
 * Teleport detection result
 */
export interface TeleportDetectionResult {
  isTeleport: boolean;
  reason?: string;
  calculatedSpeed?: number;
}

/**
 * Detects impossible location jumps (teleporting)
 */
export function detectTeleport(
  currentLat: number,
  currentLng: number,
  lastLat: number,
  lastLng: number,
  timeDiffMs: number,
  reportedSpeed?: number
): TeleportDetectionResult {
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

