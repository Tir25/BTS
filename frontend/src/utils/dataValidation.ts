/**
 * Data Validation Layer for WebSocket and Map Components
 * Phase 2: Comprehensive data validation and sanitization
 */

import { errorHandler, ErrorContext } from './errorHandler';

// Validation result interface
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: string[];
  sanitized?: boolean;
  timestamp?: number;
}

// Location data interfaces
export interface RawLocationData {
  busId?: string;
  driverId?: string;
  latitude?: number | string;
  longitude?: number | string;
  timestamp?: string | number;
  speed?: number | string;
  heading?: number | string;
  eta?: any;
  nearStop?: any;
}

export interface SanitizedLocationData {
  busId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  eta?: any;
  nearStop?: any;
}

// Coordinate validation constants
const COORDINATE_BOUNDS = {
  LATITUDE: { min: -90, max: 90 },
  LONGITUDE: { min: -180, max: 180 },
  GUJARAT_BOUNDS: {
    lat: { min: 20, max: 25 },
    lng: { min: 68, max: 75 }
  }
};

const SPEED_LIMITS = {
  MIN: 0,
  MAX: 200 // km/h
};

// Removed unused HEADING_LIMITS constant

/**
 * Main Data Validation Class
 */
export class DataValidator {
  private static instance: DataValidator;
  private validationCache = new Map<string, ValidationResult>();
  private cacheTimeout = 5000; // 5 seconds cache

  public static getInstance(): DataValidator {
    if (!DataValidator.instance) {
      DataValidator.instance = new DataValidator();
    }
    return DataValidator.instance;
  }

  /**
   * Validate and sanitize WebSocket location data
   */
  public validateLocationData(rawData: RawLocationData): ValidationResult<SanitizedLocationData> {
    const cacheKey = this.generateCacheKey(rawData);
    
    // Check cache first
    const cached = this.validationCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const errors: string[] = [];
    let sanitized = false;

    try {
      // Validate required fields
      if (!rawData.busId) {
        errors.push('Missing required field: busId');
      }
      if (!rawData.driverId) {
        errors.push('Missing required field: driverId');
      }
      if (rawData.latitude === undefined || rawData.latitude === null) {
        errors.push('Missing required field: latitude');
      }
      if (rawData.longitude === undefined || rawData.longitude === null) {
        errors.push('Missing required field: longitude');
      }

      if (errors.length > 0) {
        const result: ValidationResult = { success: false, errors };
        this.cacheResult(cacheKey, result);
        return result;
      }

      // Sanitize and validate coordinates
      const latResult = this.sanitizeCoordinate(rawData.latitude, 'latitude');
      const lngResult = this.sanitizeCoordinate(rawData.longitude, 'longitude');

      if (!latResult.success) {
        errors.push(...(latResult.errors || []));
      }
      if (!lngResult.success) {
        errors.push(...(lngResult.errors || []));
      }

      // Validate timestamp
      const timestampResult = this.sanitizeTimestamp(rawData.timestamp);
      if (!timestampResult.success) {
        errors.push(...(timestampResult.errors || []));
      }

      // Validate optional fields
      const speedResult = this.sanitizeSpeed(rawData.speed);
      const headingResult = this.sanitizeHeading(rawData.heading);

      if (!speedResult.success && rawData.speed !== undefined) {
        errors.push(...(speedResult.errors || []));
      }
      if (!headingResult.success && rawData.heading !== undefined) {
        errors.push(...(headingResult.errors || []));
      }

      // Check for coordinate anomalies
      if (latResult.success && lngResult.success) {
        const anomalyCheck = this.checkCoordinateAnomalies(
          latResult.data!,
          lngResult.data!,
          rawData.busId
        );
        if (!anomalyCheck.success) {
          errors.push(...(anomalyCheck.errors || []));
        }
      }

      if (errors.length > 0) {
        const result: ValidationResult = { success: false, errors };
        this.cacheResult(cacheKey, result);
        return result;
      }

      // Create sanitized data
      const sanitizedData: SanitizedLocationData = {
        busId: String(rawData.busId).trim(),
        driverId: String(rawData.driverId).trim(),
        latitude: latResult.data!,
        longitude: lngResult.data!,
        timestamp: timestampResult.data!,
        speed: speedResult.success ? speedResult.data : undefined,
        heading: headingResult.success ? headingResult.data : undefined,
        eta: rawData.eta,
        nearStop: rawData.nearStop,
      };

      sanitized = !!(latResult.sanitized || lngResult.sanitized || 
                 timestampResult.sanitized || speedResult.sanitized || 
                 headingResult.sanitized);

      const result: ValidationResult<SanitizedLocationData> = {
        success: true,
        data: sanitizedData,
        sanitized
      };

      this.cacheResult(cacheKey, result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      errors.push(`Validation error: ${errorMessage}`);
      
      const result: ValidationResult = { success: false, errors };
      this.cacheResult(cacheKey, result);
      
      // Log error
      errorHandler.logError(
        new Error(`Data validation failed: ${errorMessage}`),
        { service: 'map', operation: 'data_validation' } as ErrorContext,
        'medium'
      );
      
      return result;
    }
  }

  /**
   * Sanitize coordinate values
   */
  private sanitizeCoordinate(value: number | string | undefined, type: 'latitude' | 'longitude'): ValidationResult<number> {
    let sanitized = false;

    if (value === undefined || value === null) {
      return { success: false, errors: [`${type} is required`] };
    }

    // Convert to number
    let numValue: number;
    if (typeof value === 'string') {
      numValue = parseFloat(value);
      sanitized = true;
    } else {
      numValue = value;
    }

    // Check if valid number
    if (isNaN(numValue)) {
      return { success: false, errors: [`${type} must be a valid number`] };
    }

    // Check bounds
    const bounds = type === 'latitude' ? COORDINATE_BOUNDS.LATITUDE : COORDINATE_BOUNDS.LONGITUDE;
    if (numValue < bounds.min || numValue > bounds.max) {
      return { 
        success: false, 
        errors: [`${type} must be between ${bounds.min} and ${bounds.max}`] 
      };
    }

    // Round to reasonable precision (6 decimal places ≈ 0.1m accuracy)
    const roundedValue = Math.round(numValue * 1000000) / 1000000;
    if (roundedValue !== numValue) {
      sanitized = true;
    }

    return { 
      success: true, 
      data: roundedValue, 
      sanitized 
    };
  }

  /**
   * Sanitize timestamp
   */
  private sanitizeTimestamp(value: string | number | undefined): ValidationResult<string> {
    const errors: string[] = [];
    let sanitized = false;

    if (value === undefined || value === null) {
      return { success: false, errors: ['timestamp is required'] };
    }

    let date: Date;
    
    if (typeof value === 'number') {
      // Handle both Unix timestamp (seconds) and milliseconds
      date = new Date(value > 1000000000000 ? value : value * 1000);
      sanitized = true;
    } else if (typeof value === 'string') {
      date = new Date(value);
      sanitized = true;
    } else {
      return { success: false, errors: ['timestamp must be a string or number'] };
    }

    if (isNaN(date.getTime())) {
      return { success: false, errors: ['timestamp must be a valid date'] };
    }

    // Check if timestamp is reasonable (not too old or in the future)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    if (date < oneHourAgo) {
      errors.push('timestamp is too old (more than 1 hour ago)');
    }
    if (date > oneHourFromNow) {
      errors.push('timestamp is in the future (more than 1 hour ahead)');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { 
      success: true, 
      data: date.toISOString(), 
      sanitized 
    };
  }

  /**
   * Sanitize speed value
   */
  private sanitizeSpeed(value: number | string | undefined): ValidationResult<number> {
    if (value === undefined || value === null) {
      return { success: true }; // Speed is optional
    }

    let sanitized = false;

    let numValue: number;
    if (typeof value === 'string') {
      numValue = parseFloat(value);
      sanitized = true;
    } else {
      numValue = value;
    }

    if (isNaN(numValue)) {
      return { success: false, errors: ['speed must be a valid number'] };
    }

    if (numValue < SPEED_LIMITS.MIN || numValue > SPEED_LIMITS.MAX) {
      return { 
        success: false, 
        errors: [`speed must be between ${SPEED_LIMITS.MIN} and ${SPEED_LIMITS.MAX} km/h`] 
      };
    }

    // Round to 1 decimal place
    const roundedValue = Math.round(numValue * 10) / 10;
    if (roundedValue !== numValue) {
      sanitized = true;
    }

    return { 
      success: true, 
      data: roundedValue, 
      sanitized 
    };
  }

  /**
   * Sanitize heading value
   */
  private sanitizeHeading(value: number | string | undefined): ValidationResult<number> {
    if (value === undefined || value === null) {
      return { success: true }; // Heading is optional
    }

    let sanitized = false;

    let numValue: number;
    if (typeof value === 'string') {
      numValue = parseFloat(value);
      sanitized = true;
    } else {
      numValue = value;
    }

    if (isNaN(numValue)) {
      return { success: false, errors: ['heading must be a valid number'] };
    }

    // Normalize heading to 0-360 range
    let normalizedValue = numValue % 360;
    if (normalizedValue < 0) {
      normalizedValue += 360;
    }

    if (normalizedValue !== numValue) {
      sanitized = true;
    }

    return { 
      success: true, 
      data: normalizedValue, 
      sanitized 
    };
  }

  /**
   * Check for coordinate anomalies (sudden jumps, impossible speeds, etc.)
   */
  private checkCoordinateAnomalies(
    latitude: number, 
    longitude: number, 
    busId?: string
  ): ValidationResult {

    // Check if coordinates are within Gujarat bounds (basic sanity check)
    if (latitude < COORDINATE_BOUNDS.GUJARAT_BOUNDS.lat.min || 
        latitude > COORDINATE_BOUNDS.GUJARAT_BOUNDS.lat.max ||
        longitude < COORDINATE_BOUNDS.GUJARAT_BOUNDS.lng.min || 
        longitude > COORDINATE_BOUNDS.GUJARAT_BOUNDS.lng.max) {
      
      // This might be valid for buses outside Gujarat, so we'll log but not error
      console.warn(`⚠️ Coordinates outside Gujarat bounds for bus ${busId}:`, { latitude, longitude });
    }

    // TODO: Implement more sophisticated anomaly detection
    // - Check for sudden location jumps
    // - Validate against known route paths
    // - Check for impossible speeds between updates

    return { success: true };
  }

  /**
   * Generate cache key for validation result
   */
  private generateCacheKey(data: RawLocationData): string {
    return `${data.busId}-${data.latitude}-${data.longitude}-${data.timestamp}`;
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(result: ValidationResult): boolean {
    return result.timestamp ? (Date.now() - result.timestamp) < this.cacheTimeout : false;
  }

  /**
   * Cache validation result
   */
  private cacheResult(key: string, result: ValidationResult): void {
    result.timestamp = Date.now();
    this.validationCache.set(key, result);
    
    // Clean up old cache entries periodically
    if (this.validationCache.size > 100) {
      this.cleanupCache();
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, result] of this.validationCache.entries()) {
      if (result.timestamp && (now - result.timestamp) > this.cacheTimeout) {
        this.validationCache.delete(key);
      }
    }
  }

  /**
   * Clear all cached validation results
   */
  public clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxAge: number } {
    return {
      size: this.validationCache.size,
      maxAge: this.cacheTimeout
    };
  }
}

// Export singleton instance
export const dataValidator = DataValidator.getInstance();

// Export utility functions for backward compatibility
export const validateLocationData = (data: RawLocationData): ValidationResult<SanitizedLocationData> => {
  return dataValidator.validateLocationData(data);
};

export const sanitizeCoordinates = (lat: number | string, lng: number | string): ValidationResult<{ latitude: number; longitude: number }> => {
  const latResult = dataValidator['sanitizeCoordinate'](lat, 'latitude');
  const lngResult = dataValidator['sanitizeCoordinate'](lng, 'longitude');
  
  if (!latResult.success || !lngResult.success) {
    return {
      success: false,
      errors: [
        ...(latResult.errors || []),
        ...(lngResult.errors || [])
      ]
    };
  }
  
  return {
    success: true,
    data: {
      latitude: latResult.data!,
      longitude: lngResult.data!
    },
    sanitized: latResult.sanitized || lngResult.sanitized
  };
};
