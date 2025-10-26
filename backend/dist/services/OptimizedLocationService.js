"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizedLocationService = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
class OptimizedLocationService {
    constructor() {
        this.queryCache = new Map();
        this.cacheTTL = 5 * 60 * 1000;
        this.connectionPool = database_1.default;
        this.startCacheCleanup();
    }
    static getInstance() {
        if (!OptimizedLocationService.instance) {
            OptimizedLocationService.instance = new OptimizedLocationService();
        }
        return OptimizedLocationService.instance;
    }
    async saveLocationUpdate(data) {
        try {
            if (data.latitude < -90 || data.latitude > 90 ||
                data.longitude < -180 || data.longitude > 180) {
                throw new Error('Invalid coordinates');
            }
            const point = `POINT(${data.longitude} ${data.latitude})`;
            const query = `
        INSERT INTO live_locations (bus_id, location, speed_kmh, heading_degrees, recorded_at)
        VALUES ($1, ST_GeomFromText($2, 4326), $3, $4, $5)
        RETURNING id, bus_id, ST_AsText(location) as location, speed_kmh, heading_degrees, recorded_at;
      `;
            const result = await this.connectionPool.query(query, [
                data.busId,
                point,
                data.speed,
                data.heading,
                data.timestamp,
            ]);
            if (result.rows.length === 0) {
                logger_1.logger.error('Error saving location: No rows returned', 'location-service');
                return null;
            }
            const savedLocation = result.rows[0];
            const locationData = {
                id: savedLocation.id,
                driver_id: data.driverId,
                bus_id: savedLocation.bus_id,
                location: savedLocation.location,
                timestamp: savedLocation.recorded_at,
                speed: savedLocation.speed_kmh,
                heading: savedLocation.heading_degrees,
            };
            this.invalidateCache(`bus_${data.busId}`);
            logger_1.logger.info('Location saved successfully', 'location-service', { busId: data.busId });
            return locationData;
        }
        catch (error) {
            logger_1.logger.error('Error in saveLocationUpdate', 'location-service', { error, data });
            return null;
        }
    }
    async getCurrentBusLocations(options = {}) {
        const cacheKey = `current_locations_${JSON.stringify(options)}`;
        const cached = this.queryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            logger_1.logger.debug('Returning cached location data', 'location-service');
            return cached.data;
        }
        try {
            let query = `
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
        WHERE ll.recorded_at >= NOW() - INTERVAL '${options.timeWindow || 5} minutes'
      `;
            const params = [];
            let paramCount = 0;
            if (options.viewport) {
                paramCount++;
                query += ` AND ST_Intersects(ll.location, ST_MakeEnvelope($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3}, 4326))`;
                params.push(options.viewport.west, options.viewport.south, options.viewport.east, options.viewport.north);
                paramCount += 3;
            }
            if (!options.includeInactive) {
                query += ` AND b.is_active = true`;
            }
            query += ` ORDER BY ll.recorded_at DESC`;
            if (options.maxResults) {
                query += ` LIMIT $${paramCount + 1}`;
                params.push(options.maxResults);
            }
            const result = await this.connectionPool.query(query, params);
            const locations = result.rows.map((row) => ({
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
            this.queryCache.set(cacheKey, {
                data: locations,
                timestamp: Date.now(),
            });
            logger_1.logger.info('Retrieved current bus locations', 'location-service', {
                count: locations.length,
                viewport: !!options.viewport,
                timeWindow: options.timeWindow || 5
            });
            return locations;
        }
        catch (error) {
            logger_1.logger.error('Error in getCurrentBusLocations', 'location-service', { error, options });
            return [];
        }
    }
    async getLocationsInViewport(north, south, east, west, timeWindow = 5) {
        const cacheKey = `viewport_${north}_${south}_${east}_${west}_${timeWindow}`;
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
            const locations = result.rows.map((row) => ({
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
            this.queryCache.set(cacheKey, {
                data: locations,
                timestamp: Date.now(),
            });
            logger_1.logger.info('Retrieved viewport locations', 'location-service', {
                count: locations.length,
                bounds: { north, south, east, west }
            });
            return locations;
        }
        catch (error) {
            logger_1.logger.error('Error in getLocationsInViewport', 'location-service', { error });
            return [];
        }
    }
    async getBusLocationHistory(busId, startTime, endTime, limit = 100) {
        try {
            const query = `
        SELECT 
          id, 
          bus_id, 
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
            const result = await this.connectionPool.query(query, [busId, startTime, endTime, limit]);
            return result.rows.map((row) => ({
                id: row.id,
                driver_id: '',
                bus_id: row.bus_id,
                location: row.location,
                timestamp: row.recorded_at,
                speed: row.speed_kmh,
                heading: row.heading_degrees,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error in getBusLocationHistory', 'location-service', { error, busId });
            return [];
        }
    }
    async getDriverBusInfo(driverId) {
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
                assigned_driver_id: row.driver_id,
                route_city: row.route_city,
                bus_image_url: row.bus_image_url,
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getDriverBusInfo', 'location-service', { error, driverId });
            return null;
        }
    }
    async getSpatialStats() {
        try {
            const locationsResult = await this.connectionPool.query('SELECT COUNT(*) as count FROM live_locations WHERE recorded_at >= NOW() - INTERVAL \'1 hour\'');
            const busesResult = await this.connectionPool.query('SELECT COUNT(DISTINCT bus_id) as count FROM live_locations WHERE recorded_at >= NOW() - INTERVAL \'5 minutes\'');
            const cacheSize = this.queryCache.size;
            const cacheHitRate = cacheSize > 0 ? (cacheSize / (cacheSize + 1)) * 100 : 0;
            return {
                totalLocations: parseInt(locationsResult.rows[0].count),
                activeBuses: parseInt(busesResult.rows[0].count),
                averageResponseTime: 0,
                cacheHitRate,
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getSpatialStats', 'location-service', { error });
            return {
                totalLocations: 0,
                activeBuses: 0,
                averageResponseTime: 0,
                cacheHitRate: 0,
            };
        }
    }
    invalidateCache(key) {
        this.queryCache.delete(key);
        logger_1.logger.debug('Cache invalidated', 'location-service', { key });
    }
    startCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, value] of this.queryCache.entries()) {
                if (now - value.timestamp > this.cacheTTL) {
                    this.queryCache.delete(key);
                }
            }
            logger_1.logger.debug('Cache cleanup completed', 'location-service', {
                remainingEntries: this.queryCache.size
            });
        }, this.cacheTTL);
    }
    clearCache() {
        this.queryCache.clear();
        logger_1.logger.info('All cache cleared', 'location-service');
    }
    getCacheStats() {
        return {
            size: this.queryCache.size,
            ttl: this.cacheTTL,
            entries: Array.from(this.queryCache.keys()),
        };
    }
}
exports.optimizedLocationService = OptimizedLocationService.getInstance();
exports.default = exports.optimizedLocationService;
//# sourceMappingURL=OptimizedLocationService.js.map