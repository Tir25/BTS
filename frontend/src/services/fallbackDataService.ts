/**
 * Fallback Data Service
 * Phase 2: Provides fallback data sources when primary data is invalid or unavailable
 */

import { errorHandler, ErrorContext } from '../utils/errorHandler';
import { BusLocation } from '../types';

export interface FallbackLocationData {
  busId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  source: 'cache' | 'last_known' | 'route_estimate' | 'default';
  confidence: number; // 0-1 scale
}

interface CachedLocationData {
  data: FallbackLocationData;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Fallback Data Service Class
 */
export class FallbackDataService {
  private static instance: FallbackDataService;
  private locationCache = new Map<string, CachedLocationData>();
  private lastKnownLocations = new Map<string, FallbackLocationData>();
  private routeEstimates = new Map<string, FallbackLocationData>();
  private defaultLocations = new Map<string, FallbackLocationData>();
  
  // Cache configuration
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly LAST_KNOWN_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly ROUTE_ESTIMATE_TTL = 10 * 60 * 1000; // 10 minutes

  // Default locations for Gujarat (fallback when no data available)
  private readonly DEFAULT_LOCATIONS = {
    'ahmedabad': { latitude: 23.0225, longitude: 72.5714 },
    'vadodara': { latitude: 22.3072, longitude: 73.1812 },
    'surat': { latitude: 21.1702, longitude: 72.8311 },
    'rajkot': { latitude: 22.3039, longitude: 70.8022 },
    'gandhinagar': { latitude: 23.2156, longitude: 72.6369 }
  };

  public static getInstance(): FallbackDataService {
    if (!FallbackDataService.instance) {
      FallbackDataService.instance = new FallbackDataService();
    }
    return FallbackDataService.instance;
  }

  /**
   * Get fallback location data for a bus
   */
  public getFallbackLocation(busId: string, _driverId?: string): FallbackLocationData | null {
    try {
      // 1. Try cached data first (highest confidence)
      const cachedData = this.getCachedLocation(busId);
      if (cachedData) {
        console.log(`🔄 Using cached location for bus ${busId}`);
        return cachedData;
      }

      // 2. Try last known location
      const lastKnownData = this.getLastKnownLocation(busId);
      if (lastKnownData) {
        console.log(`🔄 Using last known location for bus ${busId}`);
        return lastKnownData;
      }

      // 3. Try route estimate
      const routeEstimateData = this.getRouteEstimate(busId);
      if (routeEstimateData) {
        console.log(`🔄 Using route estimate for bus ${busId}`);
        return routeEstimateData;
      }

      // 4. Use default location as last resort
      const defaultData = this.getDefaultLocation(busId);
      if (defaultData) {
        console.log(`🔄 Using default location for bus ${busId}`);
        return defaultData;
      }

      console.warn(`⚠️ No fallback data available for bus ${busId}`);
      return null;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown fallback error';
      console.error(`❌ Error getting fallback location for bus ${busId}:`, errorMessage);
      
      errorHandler.logError(
        new Error(`Fallback data service error: ${errorMessage}`),
        { service: 'map', operation: 'fallback_data_retrieval' } as ErrorContext,
        'medium'
      );
      
      return null;
    }
  }

  /**
   * Cache a valid location for future fallback use
   */
  public cacheLocation(location: BusLocation): void {
    try {
      const fallbackData: FallbackLocationData = {
        busId: location.busId,
        driverId: location.driverId,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        speed: location.speed,
        heading: location.heading,
        source: 'cache',
        confidence: 1.0
      };

      const cachedData: CachedLocationData = {
        data: fallbackData,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL
      };

      this.locationCache.set(location.busId, cachedData);
      
      // Also update last known location
      this.lastKnownLocations.set(location.busId, {
        ...fallbackData,
        source: 'last_known',
        confidence: 0.9
      });

      console.log(`✅ Cached location for bus ${location.busId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown caching error';
      console.error(`❌ Error caching location for bus ${location.busId}:`, errorMessage);
    }
  }

  /**
   * Get cached location data
   */
  private getCachedLocation(busId: string): FallbackLocationData | null {
    const cached = this.locationCache.get(busId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.locationCache.delete(busId);
      return null;
    }

    return cached.data;
  }

  /**
   * Get last known location
   */
  private getLastKnownLocation(busId: string): FallbackLocationData | null {
    const lastKnown = this.lastKnownLocations.get(busId);
    if (!lastKnown) return null;

    const now = Date.now();
    const dataAge = now - new Date(lastKnown.timestamp).getTime();
    
    if (dataAge > this.LAST_KNOWN_TTL) {
      this.lastKnownLocations.delete(busId);
      return null;
    }

    // Reduce confidence based on age
    const ageFactor = Math.max(0, 1 - (dataAge / this.LAST_KNOWN_TTL));
    return {
      ...lastKnown,
      confidence: lastKnown.confidence * ageFactor
    };
  }

  /**
   * Get route-based estimate
   */
  private getRouteEstimate(busId: string): FallbackLocationData | null {
    const estimate = this.routeEstimates.get(busId);
    if (!estimate) return null;

    const now = Date.now();
    const dataAge = now - new Date(estimate.timestamp).getTime();
    
    if (dataAge > this.ROUTE_ESTIMATE_TTL) {
      this.routeEstimates.delete(busId);
      return null;
    }

    // Reduce confidence based on age
    const ageFactor = Math.max(0, 1 - (dataAge / this.ROUTE_ESTIMATE_TTL));
    return {
      ...estimate,
      confidence: estimate.confidence * ageFactor
    };
  }

  /**
   * Get default location
   */
  private getDefaultLocation(busId: string): FallbackLocationData | null {
    // Try to get from stored defaults first
    const stored = this.defaultLocations.get(busId);
    if (stored) {
      return stored;
    }

    // Use a default location based on bus ID hash
    const defaultKeys = Object.keys(this.DEFAULT_LOCATIONS);
    const hash = this.hashString(busId);
    const defaultKey = defaultKeys[hash % defaultKeys.length];
    const defaultLocation = this.DEFAULT_LOCATIONS[defaultKey as keyof typeof this.DEFAULT_LOCATIONS];

    const fallbackData: FallbackLocationData = {
      busId,
      driverId: 'unknown',
      latitude: defaultLocation.latitude,
      longitude: defaultLocation.longitude,
      timestamp: new Date().toISOString(),
      source: 'default',
      confidence: 0.1 // Very low confidence
    };

    // Cache this default for future use
    this.defaultLocations.set(busId, fallbackData);
    
    return fallbackData;
  }

  /**
   * Set route estimate for a bus
   */
  public setRouteEstimate(busId: string, location: Partial<FallbackLocationData>): void {
    try {
      const estimate: FallbackLocationData = {
        busId,
        driverId: location.driverId || 'unknown',
        latitude: location.latitude || 0,
        longitude: location.longitude || 0,
        timestamp: location.timestamp || new Date().toISOString(),
        speed: location.speed,
        heading: location.heading,
        source: 'route_estimate',
        confidence: 0.7
      };

      this.routeEstimates.set(busId, estimate);
      console.log(`✅ Set route estimate for bus ${busId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error setting route estimate for bus ${busId}:`, errorMessage);
    }
  }

  /**
   * Clear all fallback data for a bus
   */
  public clearBusData(busId: string): void {
    this.locationCache.delete(busId);
    this.lastKnownLocations.delete(busId);
    this.routeEstimates.delete(busId);
    this.defaultLocations.delete(busId);
    console.log(`🗑️ Cleared all fallback data for bus ${busId}`);
  }

  /**
   * Clear expired data from all caches
   */
  public cleanupExpiredData(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean location cache
    for (const [busId, cached] of this.locationCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.locationCache.delete(busId);
        cleanedCount++;
      }
    }

    // Clean last known locations
    for (const [busId, lastKnown] of this.lastKnownLocations.entries()) {
      const dataAge = now - new Date(lastKnown.timestamp).getTime();
      if (dataAge > this.LAST_KNOWN_TTL) {
        this.lastKnownLocations.delete(busId);
        cleanedCount++;
      }
    }

    // Clean route estimates
    for (const [busId, estimate] of this.routeEstimates.entries()) {
      const dataAge = now - new Date(estimate.timestamp).getTime();
      if (dataAge > this.ROUTE_ESTIMATE_TTL) {
        this.routeEstimates.delete(busId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired fallback data entries`);
    }
  }

  /**
   * Get statistics about fallback data
   */
  public getStats(): {
    cacheSize: number;
    lastKnownSize: number;
    routeEstimatesSize: number;
    defaultLocationsSize: number;
  } {
    return {
      cacheSize: this.locationCache.size,
      lastKnownSize: this.lastKnownLocations.size,
      routeEstimatesSize: this.routeEstimates.size,
      defaultLocationsSize: this.defaultLocations.size
    };
  }

  /**
   * Simple hash function for string to number conversion
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Convert fallback data to BusLocation format
   */
  public toBusLocation(fallbackData: FallbackLocationData): BusLocation {
    return {
      busId: fallbackData.busId,
      driverId: fallbackData.driverId,
      latitude: fallbackData.latitude,
      longitude: fallbackData.longitude,
      timestamp: fallbackData.timestamp,
      speed: fallbackData.speed,
      heading: fallbackData.heading,
      eta: undefined // ETA not available in fallback data
    };
  }
}

// Export singleton instance
export const fallbackDataService = FallbackDataService.getInstance();

// Auto-cleanup every 5 minutes
setInterval(() => {
  fallbackDataService.cleanupExpiredData();
}, 5 * 60 * 1000);
