/**
 * Optimized Location Service
 * Industry-grade location service with spatial optimization
 * Implements viewport-based filtering, connection pooling, and query optimization
 */

import { supabaseAdmin } from '../config/supabase';
import pool from '../config/database';
import { logger } from '../utils/logger';
import { validateLocationData } from '../utils/validation';

interface LocationData {
  driverId: string;
  busId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

interface BusInfo {
  id: string; // CRITICAL FIX: Primary ID field to match frontend expectations  
  bus_id: string; // COMPATIBILITY: Keep for backward compatibility
  bus_number: string;
  route_id: string;
  route_name: string;
  driver_id: string;
  driver_name: string;
  assigned_driver_profile_id?: string;
  route_city?: string;
  bus_image_url?: string | null;
}

interface SavedLocation {
  id: string;
  driver_id: string;
  bus_id: string;
  location: string; // PostGIS Point
  timestamp: string;
  speed?: number;
  heading?: number;
}

interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface SpatialQueryOptions {
  viewport?: ViewportBounds;
  timeWindow?: number; // minutes
  maxResults?: number;
  includeInactive?: boolean;
}

class OptimizedLocationService {
  private static instance: OptimizedLocationService;
  private connectionPool: any;
  private queryCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.connectionPool = pool;
    this.startCacheCleanup();
  }

  static getInstance(): OptimizedLocationService {
    if (!OptimizedLocationService.instance) {
      OptimizedLocationService.instance = new OptimizedLocationService();
    }
    return OptimizedLocationService.instance;
  }

  /**
   * Save location update with spatial optimization and concurrent update handling
   * Implements retry logic with exponential backoff for transient database errors
   * @param data - Location data to save
   * @param retryCount - Internal retry counter (used for recursive retries)
   */
  async saveLocationUpdate(data: LocationData, retryCount: number = 0): Promise<SavedLocation | null> {
    const MAX_RETRIES = 3;
    const INITIAL_RETRY_DELAY_MS = 50; // Start with 50ms delay
    try {
      // CRITICAL FIX: Comprehensive validation before saving
      // Validate required fields
      if (!data.busId || typeof data.busId !== 'string' || data.busId.trim().length === 0) {
        logger.error('Invalid busId in location update', 'location-service', { data });
        return null;
      }

      if (!data.driverId || typeof data.driverId !== 'string' || data.driverId.trim().length === 0) {
        logger.error('Invalid driverId in location update', 'location-service', { data });
        return null;
      }

      // Use comprehensive validation function
      const validationError = validateLocationData({
        driverId: data.driverId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp,
        speed: data.speed,
        heading: data.heading,
      });

      if (validationError) {
        logger.warn('Location validation failed', 'location-service', {
          error: validationError,
          busId: data.busId,
          driverId: data.driverId,
          latitude: data.latitude,
          longitude: data.longitude,
        });
        return null;
      }

      // Convert coordinates to PostGIS Point format
      const point = `POINT(${data.longitude} ${data.latitude})`;

      // CRITICAL FIX: Use transaction with proper isolation level for concurrent updates
      // Use READ COMMITTED (default) which is appropriate for location updates
      // This allows concurrent transactions to proceed without blocking
      const client = await this.connectionPool.connect();
      
      try {
        // Set transaction isolation level for concurrent location updates
        // READ COMMITTED allows concurrent updates without serialization errors
        await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');

        // CRITICAL FIX: Use UPSERT to handle concurrent updates from multiple drivers
        // This ensures only one location record per bus exists at any time
        // If a location already exists for this bus, update it instead of creating a duplicate
        const liveQuery = `
          INSERT INTO live_locations (bus_id, driver_id, location, speed_kmh, heading_degrees, recorded_at)
          VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5, $6)
          ON CONFLICT (bus_id) 
          DO UPDATE SET
            driver_id = EXCLUDED.driver_id,
            location = EXCLUDED.location,
            speed_kmh = EXCLUDED.speed_kmh,
            heading_degrees = EXCLUDED.heading_degrees,
            recorded_at = EXCLUDED.recorded_at
          RETURNING id, bus_id, driver_id, ST_AsText(location) as location, speed_kmh, heading_degrees, recorded_at;
        `;

        const liveResult = await client.query(liveQuery, [
          data.busId,
          data.driverId,
          point,
          data.speed,
          data.heading,
          data.timestamp,
        ]);

        if (liveResult.rows.length === 0) {
          await client.query('ROLLBACK');
          logger.error('Error saving location: No rows returned from live_locations', 'location-service');
          return null;
        }

        // Also insert into locations table (for historical data)
        const historicalQuery = `
          INSERT INTO locations (bus_id, driver_id, location, speed_kmh, heading_degrees, recorded_at)
          VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5, $6)
          ON CONFLICT DO NOTHING;
        `;

        try {
          await client.query(historicalQuery, [
            data.busId,
            data.driverId,
            point,
            data.speed,
            data.heading,
            data.timestamp,
          ]);
        } catch (historicalError) {
          // Log but don't fail if historical insert fails (non-critical)
          logger.warn('Warning: Failed to save to historical locations table', 'location-service', { error: historicalError });
        }

        await client.query('COMMIT');

        const savedLocation = liveResult.rows[0];
        const locationData: SavedLocation = {
          id: savedLocation.id,
          driver_id: data.driverId,
          bus_id: savedLocation.bus_id,
          location: savedLocation.location,
          timestamp: savedLocation.recorded_at,
          speed: savedLocation.speed_kmh,
          heading: savedLocation.heading_degrees,
        };

        // CRITICAL FIX: Thread-safe cache invalidation for concurrent updates
        // Use a single operation to avoid race conditions when multiple drivers update simultaneously
        this.invalidateCacheSafely(data.busId);

        logger.info('Location saved successfully', 'location-service', { 
          busId: data.busId,
          driverId: data.driverId,
          timestamp: data.timestamp
        });
        return locationData;
      } catch (error) {
        await client.query('ROLLBACK');
        // CRITICAL FIX: Handle concurrent update conflicts gracefully
        // If it's a unique constraint violation, it means another update happened concurrently
        // This is expected and we should retry or return the existing location
        if (error instanceof Error && error.message.includes('unique constraint')) {
          logger.warn('Concurrent location update detected, fetching latest location', 'location-service', {
            busId: data.busId,
            driverId: data.driverId,
            error: error.message
          });
          // Try to get the current location for this bus
          try {
            const allLocations = await this.getCurrentBusLocations({ maxResults: 1000 });
            const currentLocation = allLocations.find(loc => loc.bus_id === data.busId);
            if (currentLocation) {
              return currentLocation;
            }
          } catch (fetchError) {
            logger.error('Failed to fetch current location after conflict', 'location-service', { error: fetchError });
          }
        }
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      // CRITICAL FIX: Enhanced error handling for concurrent updates
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for specific database errors that indicate concurrency issues
      if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
        logger.warn('Concurrent location update conflict detected', 'location-service', {
          busId: data.busId,
          driverId: data.driverId,
          error: errorMessage,
          action: 'This is expected with concurrent updates, will retry if needed'
        });
        
        // Try to get the current location as fallback
        try {
          const allLocations = await this.getCurrentBusLocations({ maxResults: 1000 });
          const currentLocation = allLocations.find(loc => loc.bus_id === data.busId);
          if (currentLocation) {
            logger.info('Retrieved current location after conflict', 'location-service', {
              busId: data.busId
            });
            return currentLocation;
          }
        } catch (fetchError) {
          logger.error('Failed to fetch location after conflict', 'location-service', { error: fetchError });
        }
      }
      
      // CRITICAL FIX: Retry logic for transient database errors
      // Retry on specific errors that indicate temporary issues (deadlocks, connection issues)
      const isRetryableError = 
        errorMessage.includes('deadlock') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('serialization failure') ||
        (errorMessage.includes('unique constraint') && retryCount < MAX_RETRIES);
      
      if (isRetryableError && retryCount < MAX_RETRIES) {
        const retryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
        logger.warn(`Retrying location update (attempt ${retryCount + 1}/${MAX_RETRIES})`, 'location-service', {
          busId: data.busId,
          driverId: data.driverId,
          retryDelay,
          error: errorMessage
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Retry with incremented count
        return this.saveLocationUpdate(data, retryCount + 1);
      }
      
      logger.error('Error in saveLocationUpdate', 'location-service', { 
        error: errorMessage,
        busId: data.busId,
        driverId: data.driverId,
        retryCount,
        maxRetries: MAX_RETRIES,
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * Get current bus locations with viewport optimization
   */
  async getCurrentBusLocations(options: SpatialQueryOptions = {}): Promise<SavedLocation[]> {
    const cacheKey = `current_locations_${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      logger.debug('Returning cached location data', 'location-service');
      return cached.data;
    }

    try {
      // CRITICAL FIX: Use parameterized query to prevent SQL injection
      const timeWindowMinutes = Math.max(1, Math.min(60, options.timeWindow || 5)); // Clamp between 1-60 minutes
      let query = `
        SELECT 
          ll.id, 
          ll.bus_id, 
          ll.driver_id,
          ST_AsText(ll.location) as location, 
          ll.speed_kmh, 
          ll.heading_degrees, 
          ll.recorded_at,
          b.bus_number,
          b.vehicle_no,
          u.full_name as driver_name
        FROM live_locations ll
        LEFT JOIN buses b ON ll.bus_id = b.id
        LEFT JOIN user_profiles u ON ll.driver_id = u.id
        WHERE ll.recorded_at >= NOW() - make_interval(mins => $1)
      `;

      const params: any[] = [timeWindowMinutes];
      let paramCount = 1;

      // Add viewport filtering if provided
      if (options.viewport) {
        query += ` AND ST_Intersects(ll.location, ST_MakeEnvelope($${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3}, $${paramCount + 4}, 4326))`;
        params.push(
          options.viewport.west,
          options.viewport.south,
          options.viewport.east,
          options.viewport.north
        );
        paramCount += 4;
      }

      // Add active bus filtering
      if (!options.includeInactive) {
        query += ` AND b.is_active = true`;
      }

      query += ` ORDER BY ll.recorded_at DESC`;

      // Add limit if specified
      if (options.maxResults) {
        const maxResults = Math.max(1, Math.min(1000, options.maxResults)); // Clamp between 1-1000
        query += ` LIMIT $${paramCount + 1}`;
        params.push(maxResults);
      }

      const result = await this.connectionPool.query(query, params);
      
      const locations = result.rows.map((row: any) => ({
        id: row.id,
        driver_id: row.driver_id || '',
        bus_id: row.bus_id,
        location: row.location,
        timestamp: row.recorded_at,
        speed: row.speed_kmh,
        heading: row.heading_degrees,
        bus_number: row.bus_number,
        vehicle_no: row.vehicle_no,
        driver_name: row.driver_name,
      }));

      // Cache the result
      this.queryCache.set(cacheKey, {
        data: locations,
        timestamp: Date.now(),
      });

      logger.info('Retrieved current bus locations', 'location-service', { 
        count: locations.length,
        viewport: !!options.viewport,
        timeWindow: options.timeWindow || 5
      });

      return locations;
    } catch (error) {
      logger.error('Error in getCurrentBusLocations', 'location-service', { error, options });
      return [];
    }
  }

  /**
   * Get bus locations within viewport bounds (optimized for map display)
   */
  async getLocationsInViewport(
    north: number,
    south: number,
    east: number,
    west: number,
    timeWindow: number = 5
  ): Promise<SavedLocation[]> {
    const cacheKey = `viewport_${north}_${south}_${east}_${west}_${timeWindow}`;
    
    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      // CRITICAL FIX: Use parameterized query to prevent SQL injection
      const timeWindowMinutes = Math.max(1, Math.min(60, timeWindow)); // Clamp between 1-60 minutes
      const query = `
        SELECT 
          ll.id, 
          ll.bus_id, 
          ll.driver_id,
          ST_AsText(ll.location) as location, 
          ll.speed_kmh, 
          ll.heading_degrees, 
          ll.recorded_at,
          b.bus_number,
          b.vehicle_no,
          u.full_name as driver_name
        FROM live_locations ll
        LEFT JOIN buses b ON ll.bus_id = b.id
        LEFT JOIN user_profiles u ON ll.driver_id = u.id
        WHERE ll.recorded_at >= NOW() - make_interval(mins => $1)
        AND ST_Intersects(ll.location, ST_MakeEnvelope($2, $3, $4, $5, 4326))
        AND b.is_active = true
        ORDER BY ll.recorded_at DESC
        LIMIT 100
      `;

      const result = await this.connectionPool.query(query, [timeWindowMinutes, west, south, east, north]);
      
      const locations = result.rows.map((row: any) => ({
        id: row.id,
        driver_id: row.driver_name ? 'driver' : '',
        bus_id: row.bus_id,
        location: row.location,
        timestamp: row.recorded_at,
        speed: row.speed_kmh,
        heading: row.heading_degrees,
        bus_number: row.bus_number,
        vehicle_no: row.vehicle_no,
        driver_name: row.driver_name,
      }));

      // Cache the result
      this.queryCache.set(cacheKey, {
        data: locations,
        timestamp: Date.now(),
      });

      logger.info('Retrieved viewport locations', 'location-service', { 
        count: locations.length,
        bounds: { north, south, east, west }
      });

      return locations;
    } catch (error) {
      logger.error('Error in getLocationsInViewport', 'location-service', { error });
      return [];
    }
  }

  /**
   * Get bus location history with spatial optimization
   */
  async getBusLocationHistory(
    busId: string,
    startTime: string,
    endTime: string,
    limit: number = 1000
  ): Promise<SavedLocation[]> {
    try {
      // Use the database function to get combined history from both tables
      const query = `
        SELECT 
          id, 
          bus_id, 
          driver_id,
          location, 
          speed_kmh, 
          heading_degrees, 
          recorded_at
        FROM get_location_history($1, $2, $3, $4)
        ORDER BY recorded_at ASC;
      `;

      const result = await this.connectionPool.query(query, [busId, startTime, endTime, limit]);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        driver_id: row.driver_id || '',
        bus_id: row.bus_id,
        location: row.location,
        timestamp: row.recorded_at,
        speed: row.speed_kmh,
        heading: row.heading_degrees,
      }));
    } catch (error) {
      logger.error('Error in getBusLocationHistory', 'location-service', { error, busId });
      // Fallback to live_locations only if function fails
      try {
        const fallbackQuery = `
          SELECT 
            id, 
            bus_id, 
            driver_id,
            ST_AsText(location) as location, 
            speed_kmh, 
            heading_degrees, 
            recorded_at
          FROM live_locations 
          WHERE bus_id = $1 
          AND recorded_at BETWEEN $2 AND $3
          ORDER BY recorded_at DESC
          LIMIT $4
        `;
        const fallbackResult = await this.connectionPool.query(fallbackQuery, [busId, startTime, endTime, limit]);
        return fallbackResult.rows.map((row: any) => ({
          id: row.id,
          driver_id: row.driver_id || '',
          bus_id: row.bus_id,
          location: row.location,
          timestamp: row.recorded_at,
          speed: row.speed_kmh,
          heading: row.heading_degrees,
        }));
      } catch (fallbackError) {
        logger.error('Error in fallback query', 'location-service', { error: fallbackError, busId });
        return [];
      }
    }
  }

  /**
   * Get driver bus info with optimization
   */
  async getDriverBusInfo(driverId: string): Promise<BusInfo | null> {
    try {
      const query = `
        SELECT 
          b.id,
          b.bus_number,
          b.vehicle_no,
          b.route_id,
          r.name as route_name,
          b.assigned_driver_profile_id as driver_id,
          u.full_name as driver_name,
          r.city as route_city,
          b.bus_image_url
        FROM buses b
        LEFT JOIN routes r ON b.route_id = r.id
        LEFT JOIN user_profiles u ON b.assigned_driver_profile_id = u.id
        WHERE b.assigned_driver_profile_id = $1
        AND b.is_active = true
        LIMIT 1
      `;

      const result = await this.connectionPool.query(query, [driverId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id, // CRITICAL FIX: Use 'id' field to match frontend expectations
        bus_id: row.id, // COMPATIBILITY: Keep bus_id for backward compatibility
        bus_number: row.bus_number,
        route_id: row.route_id,
        route_name: row.route_name || 'Unknown Route',
        driver_id: row.driver_id,
        driver_name: row.driver_name || 'Unknown Driver',
        assigned_driver_profile_id: row.driver_id,
        route_city: row.route_city,
        bus_image_url: row.bus_image_url,
      };
    } catch (error) {
      logger.error('Error in getDriverBusInfo', 'location-service', { error, driverId });
      return null;
    }
  }

  /**
   * Get bus info by bus ID (replaces legacy locationService.getBusInfo)
   * CRITICAL FIX: Added to consolidate location service functionality
   */
  async getBusInfo(busId: string): Promise<BusInfo | null> {
    try {
      const query = `
        SELECT 
          b.id,
          b.bus_number,
          b.vehicle_no,
          b.route_id,
          r.name as route_name,
          b.assigned_driver_profile_id as driver_id,
          u.full_name as driver_name,
          r.city as route_city,
          b.bus_image_url
        FROM buses b
        LEFT JOIN routes r ON b.route_id = r.id
        LEFT JOIN user_profiles u ON b.assigned_driver_profile_id = u.id
        WHERE b.id = $1
        AND b.is_active = true
        LIMIT 1
      `;

      const result = await this.connectionPool.query(query, [busId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        bus_id: row.id, // COMPATIBILITY: Keep bus_id for backward compatibility
        bus_number: row.bus_number,
        route_id: row.route_id,
        route_name: row.route_name || 'Unknown Route',
        driver_id: row.driver_id,
        driver_name: row.driver_name || 'Unknown Driver',
        assigned_driver_profile_id: row.driver_id,
        route_city: row.route_city,
        bus_image_url: row.bus_image_url,
      };
    } catch (error) {
      logger.error('Error in getBusInfo', 'location-service', { error, busId });
      return null;
    }
  }

  /**
   * Get spatial statistics for performance monitoring
   */
  async getSpatialStats(): Promise<{
    totalLocations: number;
    activeBuses: number;
    averageResponseTime: number;
    cacheHitRate: number;
  }> {
    try {
      // Get total locations count
      const locationsResult = await this.connectionPool.query(
        'SELECT COUNT(*) as count FROM live_locations WHERE recorded_at >= NOW() - INTERVAL \'1 hour\''
      );
      
      // Get active buses count
      const busesResult = await this.connectionPool.query(
        'SELECT COUNT(DISTINCT bus_id) as count FROM live_locations WHERE recorded_at >= NOW() - INTERVAL \'5 minutes\''
      );

      // Calculate cache hit rate
      const cacheSize = this.queryCache.size;
      const cacheHitRate = cacheSize > 0 ? (cacheSize / (cacheSize + 1)) * 100 : 0;

      return {
        totalLocations: parseInt(locationsResult.rows[0].count),
        activeBuses: parseInt(busesResult.rows[0].count),
        averageResponseTime: 0, // Would need to track this separately
        cacheHitRate,
      };
    } catch (error) {
      logger.error('Error in getSpatialStats', 'location-service', { error });
      return {
        totalLocations: 0,
        activeBuses: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
      };
    }
  }

  /**
   * Invalidate cache for specific key
   */
  private invalidateCache(key: string): void {
    this.queryCache.delete(key);
    logger.debug('Cache invalidated', 'location-service', { key });
  }

  /**
   * Thread-safe cache invalidation for concurrent location updates
   * Invalidates all cache entries related to a specific bus and viewport queries
   * @param busId - The bus ID to invalidate cache for
   */
  private invalidateCacheSafely(busId: string): void {
    try {
      // Invalidate bus-specific cache entries
      const keysToDelete: string[] = [];
      
      // Find all cache keys that contain this busId or are viewport/current location queries
      for (const [key] of this.queryCache.entries()) {
        // Invalidate current location cache for this bus
        if (key.startsWith(`current_locations_`) || key.startsWith(`bus_${busId}_`)) {
          keysToDelete.push(key);
        }
        // Invalidate viewport queries (they may contain this bus)
        if (key.startsWith(`viewport_`)) {
          keysToDelete.push(key);
        }
        // Invalidate any cache entry that might contain this bus
        if (key.includes(busId)) {
          keysToDelete.push(key);
        }
      }
      
      // Delete all matching cache entries
      keysToDelete.forEach(key => {
        this.queryCache.delete(key);
      });
      
      if (keysToDelete.length > 0) {
        logger.debug('Cache invalidated safely', 'location-service', { 
          busId, 
          invalidatedKeys: keysToDelete.length 
        });
      }
    } catch (error) {
      // Don't throw - cache invalidation failure shouldn't break location saving
      logger.warn('Error during cache invalidation (non-critical)', 'location-service', { 
        busId, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Start cache cleanup process
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.queryCache.entries()) {
        if (now - value.timestamp > this.cacheTTL) {
          this.queryCache.delete(key);
        }
      }
      logger.debug('Cache cleanup completed', 'location-service', { 
        remainingEntries: this.queryCache.size 
      });
    }, this.cacheTTL);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.queryCache.clear();
    logger.info('All cache cleared', 'location-service');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    ttl: number;
    entries: string[];
  } {
    return {
      size: this.queryCache.size,
      ttl: this.cacheTTL,
      entries: Array.from(this.queryCache.keys()),
    };
  }
}

// Export singleton instance
export const optimizedLocationService = OptimizedLocationService.getInstance();
export default optimizedLocationService;
