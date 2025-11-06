/**
 * Configuration for speed validation
 */
const VALIDATION_CONFIG = {
  // Speed validation
  MIN_SPEED_KMH: 0,
  MAX_SPEED_KMH: 200,
};

/**
 * Speed validation result
 */
export interface SpeedValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates speed value
 */
export function validateSpeed(speed?: number): SpeedValidationResult {
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

