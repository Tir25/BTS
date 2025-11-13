"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusInfo = exports.getBusLocationHistory = exports.saveLocationUpdate = void 0;
const supabase_1 = require("../config/supabase");
const database_1 = __importDefault(require("../config/database"));
const saveLocationUpdate = async (data) => {
    try {
        const point = `POINT(${data.longitude} ${data.latitude})`;
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
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
                console.error('❌ Error saving location: No rows returned from live_locations');
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
                const { logger } = await Promise.resolve().then(() => __importStar(require('../utils/logger')));
                logger.warn('Warning: Failed to save to historical locations table', 'location-service', { error: historicalError });
            }
            await client.query('COMMIT');
            const savedLocation = liveResult.rows[0];
            return {
                id: savedLocation.id,
                driver_id: data.driverId,
                bus_id: savedLocation.bus_id,
                location: savedLocation.location,
                timestamp: savedLocation.recorded_at,
                speed: savedLocation.speed_kmh,
                heading: savedLocation.heading_degrees,
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        const { logger } = await Promise.resolve().then(() => __importStar(require('../utils/logger')));
        logger.error('Error in saveLocationUpdate', 'location-service', { error });
        return null;
    }
};
exports.saveLocationUpdate = saveLocationUpdate;
const getBusLocationHistory = async (busId, startTime, endTime) => {
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
      FROM get_location_history($1, $2, $3, 1000)
      ORDER BY recorded_at ASC;
    `;
        const result = await database_1.default.query(query, [busId, startTime, endTime]);
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
        const { logger } = await Promise.resolve().then(() => __importStar(require('../utils/logger')));
        logger.error('Error in getBusLocationHistory', 'location-service', { error });
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
          AND recorded_at >= $2 
          AND recorded_at <= $3
        ORDER BY recorded_at ASC;
      `;
            const fallbackResult = await database_1.default.query(fallbackQuery, [busId, startTime, endTime]);
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
            const { logger } = await Promise.resolve().then(() => __importStar(require('../utils/logger')));
            logger.error('Error in fallback query', 'location-service', { error: fallbackError });
            return [];
        }
    }
};
exports.getBusLocationHistory = getBusLocationHistory;
const getBusInfo = async (busId) => {
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('buses')
            .select(`
        id,
        bus_number,
        route_id,
        assigned_driver_profile_id,
        routes!inner(
          name
        ),
        user_profiles!inner(
          full_name
        )
      `)
            .eq('id', busId)
            .eq('is_active', true)
            .single();
        if (error || !data) {
            const { logger } = await Promise.resolve().then(() => __importStar(require('../utils/logger')));
            logger.error('Error fetching bus info', 'location-service', { error });
            return null;
        }
        const routeData = Array.isArray(data.routes) ? data.routes[0] : data.routes;
        const profileData = Array.isArray(data.profiles)
            ? data.profiles[0]
            : data.profiles;
        return {
            bus_id: data.id,
            bus_number: data.bus_number || '',
            route_id: data.route_id || '',
            route_name: routeData?.name || '',
            driver_id: data.assigned_driver_profile_id || '',
            driver_name: profileData?.full_name || 'Unknown Driver',
        };
    }
    catch (error) {
        const { logger } = await Promise.resolve().then(() => __importStar(require('../utils/logger')));
        logger.error('Error in getBusInfo', 'location-service', { error });
        return null;
    }
};
exports.getBusInfo = getBusInfo;
//# sourceMappingURL=locationService.js.map