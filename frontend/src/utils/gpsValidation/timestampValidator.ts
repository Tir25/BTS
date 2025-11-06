/**
 * Configuration for timestamp validation
 */
const VALIDATION_CONFIG = {
  // Stale data thresholds
  MAX_STALE_AGE_MS: 5 * 60 * 1000, // 5 minutes
  MAX_FUTURE_OFFSET_MS: 60 * 1000, // 1 minute
};

/**
 * Timestamp validation result
 */
export interface TimestampValidationResult {
  isValid: boolean;
  error?: string;
  age?: number;
}

/**
 * Validates timestamp to detect stale or future-dated data
 */
export function validateTimestamp(
  timestamp: number | string
): TimestampValidationResult {
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

