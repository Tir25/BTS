/**
 * Validation Middleware Layer
 * Phase 2: Middleware between WebSocket data and map components
 */

import { dataValidator, ValidationResult, SanitizedLocationData } from '../utils/dataValidation';
import { fallbackDataService } from '../services/fallbackDataService';
import { errorHandler, ErrorContext } from '../utils/errorHandler';
import { BusLocation } from '../types';

interface ValidationMiddlewareConfig {
  enableFallback: boolean;
  enableSanitization: boolean;
  enableAnomalyDetection: boolean;
  maxRetries: number;
  retryDelay: number;
}

interface ProcessedLocationData {
  success: boolean;
  data?: BusLocation;
  fallback?: BusLocation;
  errors?: string[];
  warnings?: string[];
  metadata: {
    sanitized: boolean;
    usedFallback: boolean;
    confidence: number;
    source: 'primary' | 'fallback' | 'mixed';
  };
}

/**
 * Validation Middleware Class
 */
export class ValidationMiddleware {
  private static instance: ValidationMiddleware;
  private config: ValidationMiddlewareConfig;
  private processingStats = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    sanitized: 0,
    fallbackUsed: 0,
    anomaliesDetected: 0
  };

  constructor(config?: Partial<ValidationMiddlewareConfig>) {
    this.config = {
      enableFallback: true,
      enableSanitization: true,
      enableAnomalyDetection: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  public static getInstance(config?: Partial<ValidationMiddlewareConfig>): ValidationMiddleware {
    if (!ValidationMiddleware.instance) {
      ValidationMiddleware.instance = new ValidationMiddleware(config);
    }
    return ValidationMiddleware.instance;
  }

  /**
   * Process incoming WebSocket location data
   */
  public async processLocationData(rawData: any): Promise<ProcessedLocationData> {
    this.processingStats.totalProcessed++;

    try {
      console.log('🔄 Validation Middleware: Processing location data:', rawData);

      // Step 1: Validate and sanitize the data
      const validationResult = this.config.enableSanitization 
        ? dataValidator.validateLocationData(rawData)
        : this.basicValidation(rawData);

      if (validationResult.success && validationResult.data) {
        // Data is valid, process it
        const processedData = await this.processValidData(validationResult.data, validationResult.sanitized || false);
        
        if (processedData.success) {
          this.processingStats.successful++;
          if (validationResult.sanitized) {
            this.processingStats.sanitized++;
          }
          
          return processedData;
        }
      }

      // Step 2: Data validation failed, try fallback if enabled
      if (this.config.enableFallback) {
        console.log('⚠️ Primary data validation failed, attempting fallback...');
        const fallbackResult = await this.processFallbackData(rawData, validationResult.errors || []);
        
        if (fallbackResult.success) {
          this.processingStats.fallbackUsed++;
          return fallbackResult;
        }
      }

      // Step 3: All processing failed
      this.processingStats.failed++;
      return this.createFailureResult(validationResult.errors || ['Unknown validation error']);

    } catch (error) {
      this.processingStats.failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      
      console.error('❌ Validation Middleware: Processing error:', errorMessage);
      
      errorHandler.logError(
        new Error(`Validation middleware error: ${errorMessage}`),
        { service: 'map', operation: 'validation_middleware' } as ErrorContext,
        'high'
      );

      return this.createFailureResult([`Processing error: ${errorMessage}`]);
    }
  }

  /**
   * Process valid data with additional checks
   */
  private async processValidData(
    sanitizedData: SanitizedLocationData, 
    wasSanitized: boolean
  ): Promise<ProcessedLocationData> {
    const warnings: string[] = [];
    let confidence = 1.0;

    // Check for anomalies if enabled
    if (this.config.enableAnomalyDetection) {
      const anomalyCheck = await this.checkForAnomalies(sanitizedData);
      if (!anomalyCheck.success) {
        warnings.push(...(anomalyCheck.warnings || []));
        confidence *= 0.8; // Reduce confidence for anomalies
        this.processingStats.anomaliesDetected++;
      }
    }

    // Cache the valid data for future fallback use
    if (this.config.enableFallback) {
      const busLocation: BusLocation = {
        busId: sanitizedData.busId,
        driverId: sanitizedData.driverId,
        latitude: sanitizedData.latitude,
        longitude: sanitizedData.longitude,
        timestamp: sanitizedData.timestamp,
        speed: sanitizedData.speed,
        heading: sanitizedData.heading,
        eta: sanitizedData.eta
      };
      
      fallbackDataService.cacheLocation(busLocation);
    }

    // Add warning if data was sanitized
    if (wasSanitized) {
      warnings.push('Data was sanitized during validation');
      confidence *= 0.9;
    }

    return {
      success: true,
      data: {
        busId: sanitizedData.busId,
        driverId: sanitizedData.driverId,
        latitude: sanitizedData.latitude,
        longitude: sanitizedData.longitude,
        timestamp: sanitizedData.timestamp,
        speed: sanitizedData.speed,
        heading: sanitizedData.heading,
        eta: sanitizedData.eta
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        sanitized: wasSanitized,
        usedFallback: false,
        confidence,
        source: 'primary'
      }
    };
  }

  /**
   * Process fallback data when primary validation fails
   */
  private async processFallbackData(
    rawData: any, 
    primaryErrors: string[]
  ): Promise<ProcessedLocationData> {
    try {
      const busId = rawData.busId || 'unknown';
      const driverId = rawData.driverId || 'unknown';
      
      console.log(`🔄 Attempting fallback for bus ${busId}...`);
      
      const fallbackData = fallbackDataService.getFallbackLocation(busId, driverId);
      
      if (fallbackData) {
        const busLocation = fallbackDataService.toBusLocation(fallbackData);
        
        return {
          success: true,
          data: busLocation,
          fallback: busLocation,
          warnings: [
            'Using fallback data due to primary validation failure',
            `Primary errors: ${primaryErrors.join(', ')}`
          ],
          metadata: {
            sanitized: false,
            usedFallback: true,
            confidence: fallbackData.confidence,
            source: 'fallback'
          }
        };
      }

      return this.createFailureResult([
        'Primary validation failed and no fallback data available',
        ...primaryErrors
      ]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown fallback error';
      return this.createFailureResult([
        'Fallback processing failed',
        errorMessage,
        ...primaryErrors
      ]);
    }
  }

  /**
   * Basic validation without sanitization
   */
  private basicValidation(rawData: any): ValidationResult<SanitizedLocationData> {
    const errors: string[] = [];

    if (!rawData.busId) errors.push('Missing busId');
    if (!rawData.driverId) errors.push('Missing driverId');
    if (rawData.latitude === undefined || rawData.latitude === null) errors.push('Missing latitude');
    if (rawData.longitude === undefined || rawData.longitude === null) errors.push('Missing longitude');

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Basic type conversion without sanitization
    const sanitizedData: SanitizedLocationData = {
      busId: String(rawData.busId),
      driverId: String(rawData.driverId),
      latitude: Number(rawData.latitude),
      longitude: Number(rawData.longitude),
      timestamp: rawData.timestamp || new Date().toISOString(),
      speed: rawData.speed ? Number(rawData.speed) : undefined,
      heading: rawData.heading ? Number(rawData.heading) : undefined,
      eta: rawData.eta,
      nearStop: rawData.nearStop
    };

    return { success: true, data: sanitizedData };
  }

  /**
   * Check for data anomalies
   */
  private async checkForAnomalies(data: SanitizedLocationData): Promise<{ success: boolean; warnings?: string[] }> {
    const warnings: string[] = [];

    try {
      // Check for impossible coordinates
      if (data.latitude < -90 || data.latitude > 90) {
        warnings.push('Latitude out of valid range');
      }
      if (data.longitude < -180 || data.longitude > 180) {
        warnings.push('Longitude out of valid range');
      }

      // Check for impossible speeds
      if (data.speed !== undefined && (data.speed < 0 || data.speed > 200)) {
        warnings.push('Speed out of reasonable range');
      }

      // Check for impossible headings
      if (data.heading !== undefined && (data.heading < 0 || data.heading > 360)) {
        warnings.push('Heading out of valid range');
      }

      // Check timestamp reasonableness
      const dataTime = new Date(data.timestamp).getTime();
      const now = Date.now();
      const timeDiff = Math.abs(now - dataTime);
      
      if (timeDiff > 60 * 60 * 1000) { // More than 1 hour old or in future
        warnings.push('Timestamp is more than 1 hour from current time');
      }

      // Additional anomaly checks: sudden jumps and impossible acceleration
      try {
        const previous = fallbackDataService.getFallbackLocation(
          data.busId,
          data.driverId
        );

        if (previous) {
          // Haversine distance in km
          const toRad = (deg: number) => (deg * Math.PI) / 180;
          const R = 6371;
          const dLat = toRad(data.latitude - previous.latitude);
          const dLon = toRad(data.longitude - previous.longitude);
          const lat1 = toRad(previous.latitude);
          const lat2 = toRad(data.latitude);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distanceKm = R * c;

          const prevTime = new Date(previous.timestamp).getTime();
          const currTime = new Date(data.timestamp).getTime();
          const hours = Math.max((currTime - prevTime) / (1000 * 60 * 60), 0.0001);
          const impliedSpeed = distanceKm / hours; // km/h

          if (impliedSpeed > 200) {
            warnings.push('Sudden jump detected (implied speed > 200 km/h)');
          }

          if (
            typeof data.speed === 'number' &&
            typeof previous.speed === 'number'
          ) {
            // Simple acceleration check: > 50 km/h change within 5s window
            const seconds = Math.max((currTime - prevTime) / 1000, 0.001);
            if (seconds <= 5 && Math.abs(data.speed - previous.speed) > 50) {
              warnings.push('Unrealistic acceleration detected');
            }
          }
        }
      } catch (_) {
        // Do not fail anomaly detection if previous is unavailable
      }

      return {
        success: warnings.length === 0,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      console.error('❌ Anomaly detection error:', error);
      return { success: true }; // Don't fail on anomaly detection errors
    }
  }

  /**
   * Create a failure result
   */
  private createFailureResult(errors: string[]): ProcessedLocationData {
    return {
      success: false,
      errors,
      metadata: {
        sanitized: false,
        usedFallback: false,
        confidence: 0,
        source: 'primary'
      }
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ValidationMiddlewareConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('✅ Validation Middleware: Configuration updated:', this.config);
  }

  /**
   * Get processing statistics
   */
  public getStats(): typeof this.processingStats {
    return { ...this.processingStats };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.processingStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      sanitized: 0,
      fallbackUsed: 0,
      anomaliesDetected: 0
    };
    console.log('📊 Validation Middleware: Statistics reset');
  }

  /**
   * Get current configuration
   */
  public getConfig(): ValidationMiddlewareConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const validationMiddleware = ValidationMiddleware.getInstance();

// Export types for external use
export type { ProcessedLocationData, ValidationMiddlewareConfig };
