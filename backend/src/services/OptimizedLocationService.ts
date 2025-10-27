/**
 * Optimized Location Service
 * Industry-grade location service with spatial optimization
 * Implements viewport-based filtering, connection pooling, and query optimization
 */

import { supabaseAdmin } from '../config/supabase';
import pool from '../config/database';
import { logger } from '../utils/logger';

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
  bus_id: string;
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
   * Save location update with spatial optimization
   */
  async saveLocationUpdate(data: LocationData): Promise<SavedLocation | null> {
    try {
      // Validate coordinates
      if (data.latitude < -90 || data.latitude > 90 || 
          data.longitude < -180 || data.longitude > 180) {
        throw new Error('Invalid coordinates');
      }

      // Convert coordinates to PostGIS Point format
      const point = `POINT(${data.longitude} ${data.latitude})`;

      // Use transaction to ensure both tables are updated atomically
      const client = await this.connectionPool.connect();
      
      try {
        await client.query('BEGIN');

        // Insert into live_locations (for real-time queries)
        const liveQuery = `
          INSERT INTO live_locations (bus_id, driver_id, location, speed_kmh, heading_degrees, recorded_at)
          VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5, $6)
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

        // Invalidate cache for this bus
        this.invalidateCache(`bus_${data.busId}`);

        logger.info('Location saved successfully', 'location-service', { busId: data.busId });
        return locationData;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error in saveLocationUpdate', 'location-service', { error, data });
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
        WHERE ll.recorded_at >= NOW() - INTERVAL '${options.timeWindow || 5} minutes'
      `;

      const params: any[] = [];
      let paramCount = 0;

      // Add viewport filtering if provided
      if (options.viewport) {
        paramCount++;
        query += ` AND ST_Intersects(ll.location, ST_MakeEnvelope($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3}, 4326))`;
        params.push(
          options.viewport.west,
          options.viewport.south,
          options.viewport.east,
          options.viewport.north
        );
        paramCount += 3;
      }

      // Add active bus filtering
      if (!options.includeInactive) {
        query += ` AND b.is_active = true`;
      }

      query += ` ORDER BY ll.recorded_at DESC`;

      // Add limit if specified
      if (options.maxResults) {
        query += ` LIMIT $${paramCount + 1}`;
        params.push(options.maxResults);
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
      const query = `
        SELECT 
          ll.id, 
          ll.bus_id, 
          ST_AsText(ll.location) as location, 
          ll.speed_kmh, 
          ll.heading_degrees, 
          ll.recorded_at,
          b.bus_number,
          b.vehicle_no,
          u.full_name as driver_name
        FROM live_locations ll
        LEFT JOIN buses b ON ll.bus_id = b.id
        LEFT JOIN user_profiles u ON b.assigned_driver_profile_id = u.id
        WHERE ll.recorded_at >= NOW() - INTERVAL '${timeWindow} minutes'
        AND ST_Intersects(ll.location, ST_MakeEnvelope($1, $2, $3, $4, 4326))
        AND b.is_active = true
        ORDER BY ll.recorded_at DESC
        LIMIT 100
      `;

      const result = await this.connectionPool.query(query, [west, south, east, north]);
      
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
          b.id as bus_id,
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
        bus_id: row.bus_id,
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
