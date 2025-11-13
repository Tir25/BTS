"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizedLocationService = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
const validation_1 = require("../utils/validation");
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
    async saveLocationUpdate(data, retryCount = 0) {
        const MAX_RETRIES = 3;
        const INITIAL_RETRY_DELAY_MS = 50;
        try {
            if (!data.busId || typeof data.busId !== 'string' || data.busId.trim().length === 0) {
                logger_1.logger.error('Invalid busId in location update', 'location-service', { data });
                return null;
            }
            if (!data.driverId || typeof data.driverId !== 'string' || data.driverId.trim().length === 0) {
                logger_1.logger.error('Invalid driverId in location update', 'location-service', { data });
                return null;
            }
            const validationError = (0, validation_1.validateLocationData)({
                driverId: data.driverId,
                latitude: data.latitude,
                longitude: data.longitude,
                timestamp: data.timestamp,
                speed: data.speed,
                heading: data.heading,
            });
            if (validationError) {
                logger_1.logger.warn('Location validation failed', 'location-service', {
                    error: validationError,
                    busId: data.busId,
                    driverId: data.driverId,
                    latitude: data.latitude,
                    longitude: data.longitude,
                });
                return null;
            }
            const point = `POINT(${data.longitude} ${data.latitude})`;
            const client = await this.connectionPool.connect();
            try {
                await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
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
                    logger_1.logger.error('Error saving location: No rows returned from live_locations', 'location-service');
                    return null;
                }
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
                }
                catch (historicalError) {
                    logger_1.logger.warn('Warning: Failed to save to historical locations table', 'location-service', { error: historicalError });
                }
                await client.query('COMMIT');
                const savedLocation = liveResult.rows[0];
                const locationData = {
                    id: savedLocation.id,
                    driver_id: data.driverId,
                    bus_id: savedLocation.bus_id,
                    location: savedLocation.location,
                    timestamp: savedLocation.recorded_at,
                    speed: savedLocation.speed_kmh,
                    heading: savedLocation.heading_degrees,
                };
                this.invalidateCacheSafely(data.busId);
                logger_1.logger.info('Location saved successfully', 'location-service', {
                    busId: data.busId,
                    driverId: data.driverId,
                    timestamp: data.timestamp
                });
                return locationData;
            }
            catch (error) {
                await client.query('ROLLBACK');
                if (error instanceof Error && error.message.includes('unique constraint')) {
                    logger_1.logger.warn('Concurrent location update detected, fetching latest location', 'location-service', {
                        busId: data.busId,
                        driverId: data.driverId,
                        error: error.message
                    });
                    try {
                        const allLocations = await this.getCurrentBusLocations({ maxResults: 1000 });
                        const currentLocation = allLocations.find(loc => loc.bus_id === data.busId);
                        if (currentLocation) {
                            return currentLocation;
                        }
                    }
                    catch (fetchError) {
                        logger_1.logger.error('Failed to fetch current location after conflict', 'location-service', { error: fetchError });
                    }
                }
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
                logger_1.logger.warn('Concurrent location update conflict detected', 'location-service', {
                    busId: data.busId,
                    driverId: data.driverId,
                    error: errorMessage,
                    action: 'This is expected with concurrent updates, will retry if needed'
                });
                try {
                    const allLocations = await this.getCurrentBusLocations({ maxResults: 1000 });
                    const currentLocation = allLocations.find(loc => loc.bus_id === data.busId);
                    if (currentLocation) {
                        logger_1.logger.info('Retrieved current location after conflict', 'location-service', {
                            busId: data.busId
                        });
                        return currentLocation;
                    }
                }
                catch (fetchError) {
                    logger_1.logger.error('Failed to fetch location after conflict', 'location-service', { error: fetchError });
                }
            }
            const isRetryableError = errorMessage.includes('deadlock') ||
                errorMessage.includes('connection') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('serialization failure') ||
                (errorMessage.includes('unique constraint') && retryCount < MAX_RETRIES);
            if (isRetryableError && retryCount < MAX_RETRIES) {
                const retryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
                logger_1.logger.warn(`Retrying location update (attempt ${retryCount + 1}/${MAX_RETRIES})`, 'location-service', {
                    busId: data.busId,
                    driverId: data.driverId,
                    retryDelay,
                    error: errorMessage
                });
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.saveLocationUpdate(data, retryCount + 1);
            }
            logger_1.logger.error('Error in saveLocationUpdate', 'location-service', {
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
    async getCurrentBusLocations(options = {}) {
        const cacheKey = `current_locations_${JSON.stringify(options)}`;
        const cached = this.queryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            logger_1.logger.debug('Returning cached location data', 'location-service');
            return cached.data;
        }
        try {
            const timeWindowMinutes = Math.max(1, Math.min(60, options.timeWindow || 5));
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
            const params = [timeWindowMinutes];
            let paramCount = 1;
            if (options.viewport) {
                query += ` AND ST_Intersects(ll.location, ST_MakeEnvelope($${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3}, $${paramCount + 4}, 4326))`;
                params.push(options.viewport.west, options.viewport.south, options.viewport.east, options.viewport.north);
                paramCount += 4;
            }
            if (!options.includeInactive) {
                query += ` AND b.is_active = true`;
            }
            query += ` ORDER BY ll.recorded_at DESC`;
            if (options.maxResults) {
                const maxResults = Math.max(1, Math.min(1000, options.maxResults));
                query += ` LIMIT $${paramCount + 1}`;
                params.push(maxResults);
            }
            const result = await this.connectionPool.query(query, params);
            const locations = result.rows.map((row) => ({
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
            const timeWindowMinutes = Math.max(1, Math.min(60, timeWindow));
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
    async getBusLocationHistory(busId, startTime, endTime, limit = 1000) {
        try {
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
            return result.rows.map((row) => ({
                id: row.id,
                driver_id: row.driver_id || '',
                bus_id: row.bus_id,
                location: row.location,
                timestamp: row.recorded_at,
                speed: row.speed_kmh,
                heading: row.heading_degrees,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error in getBusLocationHistory', 'location-service', { error, busId });
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
                return fallbackResult.rows.map((row) => ({
                    id: row.id,
                    driver_id: row.driver_id || '',
                    bus_id: row.bus_id,
                    location: row.location,
                    timestamp: row.recorded_at,
                    speed: row.speed_kmh,
                    heading: row.heading_degrees,
                }));
            }
            catch (fallbackError) {
                logger_1.logger.error('Error in fallback query', 'location-service', { error: fallbackError, busId });
                return [];
            }
        }
    }
    async getDriverBusInfo(driverId) {
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
                id: row.id,
                bus_id: row.id,
                bus_number: row.bus_number,
                route_id: row.route_id,
                route_name: row.route_name || 'Unknown Route',
                driver_id: row.driver_id,
                driver_name: row.driver_name || 'Unknown Driver',
                assigned_driver_profile_id: row.driver_id,
                route_city: row.route_city,
                bus_image_url: row.bus_image_url,
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getDriverBusInfo', 'location-service', { error, driverId });
            return null;
        }
    }
    async getBusInfo(busId) {
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
                bus_id: row.id,
                bus_number: row.bus_number,
                route_id: row.route_id,
                route_name: row.route_name || 'Unknown Route',
                driver_id: row.driver_id,
                driver_name: row.driver_name || 'Unknown Driver',
                assigned_driver_profile_id: row.driver_id,
                route_city: row.route_city,
                bus_image_url: row.bus_image_url,
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getBusInfo', 'location-service', { error, busId });
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
    invalidateCacheSafely(busId) {
        try {
            const keysToDelete = [];
            for (const [key] of this.queryCache.entries()) {
                if (key.startsWith(`current_locations_`) || key.startsWith(`bus_${busId}_`)) {
                    keysToDelete.push(key);
                }
                if (key.startsWith(`viewport_`)) {
                    keysToDelete.push(key);
                }
                if (key.includes(busId)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => {
                this.queryCache.delete(key);
            });
            if (keysToDelete.length > 0) {
                logger_1.logger.debug('Cache invalidated safely', 'location-service', {
                    busId,
                    invalidatedKeys: keysToDelete.length
                });
            }
        }
        catch (error) {
            logger_1.logger.warn('Error during cache invalidation (non-critical)', 'location-service', {
                busId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
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