"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusInfo = exports.getBusLocationHistory = exports.getCurrentBusLocations = exports.getDriverBusInfo = exports.saveLocationUpdate = void 0;
const supabase_1 = require("../config/supabase");
const database_1 = __importDefault(require("../config/database"));
const saveLocationUpdate = async (data) => {
    try {
        const point = `POINT(${data.longitude} ${data.latitude})`;
        const query = `
      INSERT INTO live_locations (bus_id, location, speed_kmh, heading_degrees, recorded_at)
      VALUES ($1, ST_GeomFromText($2, 4326), $3, $4, $5)
      RETURNING id, bus_id, ST_AsText(location) as location, speed_kmh, heading_degrees, recorded_at;
    `;
        const result = await database_1.default.query(query, [
            data.busId,
            point,
            data.speed,
            data.heading,
            data.timestamp,
        ]);
        if (result.rows.length === 0) {
            console.error('❌ Error saving location: No rows returned');
            return null;
        }
        const savedLocation = result.rows[0];
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
        console.error('❌ Error in saveLocationUpdate:', error);
        return null;
    }
};
exports.saveLocationUpdate = saveLocationUpdate;
const getDriverBusInfo = async (driverId) => {
    try {
        console.log('🔍 Fetching bus info for driver:', driverId);
        const { data: busData, error: busError } = await supabase_1.supabaseAdmin
            .from('buses')
            .select('id, bus_number, vehicle_no, route_id')
            .eq('assigned_driver_profile_id', driverId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
        console.log('🚌 Bus data found:', busData);
        console.log('❌ Bus error:', busError);
        if (busError || !busData) {
            console.error('❌ Error fetching driver bus info:', busError);
            return null;
        }
        let driverName = 'Unknown Driver';
        const { data: profileData } = await supabase_1.supabaseAdmin
            .from('user_profiles')
            .select('full_name')
            .eq('id', driverId)
            .maybeSingle();
        if (profileData?.full_name) {
            driverName = profileData.full_name;
        }
        else {
            const { data: userData } = await supabase_1.supabaseAdmin
                .from('users')
                .select('first_name, last_name')
                .eq('id', driverId)
                .maybeSingle();
            if (userData) {
                driverName =
                    `${userData.first_name || ''} ${userData.last_name || ''}`.trim() ||
                        'Unknown Driver';
            }
        }
        console.log('👤 Driver name resolved:', driverName);
        let routeName = '';
        if (busData.route_id) {
            const { data: routeData, error: routeError } = await supabase_1.supabaseAdmin
                .from('routes')
                .select('name')
                .eq('id', busData.route_id)
                .maybeSingle();
            console.log('🛣️ Route data found:', routeData);
            console.log('❌ Route error:', routeError);
            if (!routeError && routeData) {
                routeName = routeData.name || '';
            }
        }
        const busInfo = {
            bus_id: busData.id,
            bus_number: busData.bus_number || busData.vehicle_no || '',
            route_id: busData.route_id || '',
            route_name: routeName,
            driver_id: driverId,
            driver_name: driverName,
        };
        console.log('✅ Final bus info:', busInfo);
        return busInfo;
    }
    catch (error) {
        console.error('❌ Error in getDriverBusInfo:', error);
        return null;
    }
};
exports.getDriverBusInfo = getDriverBusInfo;
const getCurrentBusLocations = async () => {
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
      WHERE recorded_at >= NOW() - INTERVAL '5 minutes'
      ORDER BY recorded_at DESC;
    `;
        const result = await database_1.default.query(query);
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
        console.error('❌ Error in getCurrentBusLocations:', error);
        return [];
    }
};
exports.getCurrentBusLocations = getCurrentBusLocations;
const getBusLocationHistory = async (busId, startTime, endTime) => {
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
        AND recorded_at >= $2 
        AND recorded_at <= $3
      ORDER BY recorded_at ASC;
    `;
        const result = await database_1.default.query(query, [busId, startTime, endTime]);
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
        console.error('❌ Error in getBusLocationHistory:', error);
        return [];
    }
};
exports.getBusLocationHistory = getBusLocationHistory;
const getBusInfo = async (busId) => {
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('buses')
            .select(`
        id,
        number_plate,
        route_id,
        assigned_driver_id,
        routes!inner(
          name
        ),
        profiles!inner(
          full_name
        )
      `)
            .eq('id', busId)
            .eq('is_active', true)
            .single();
        if (error || !data) {
            console.error('❌ Error fetching bus info:', error);
            return null;
        }
        const routeData = Array.isArray(data.routes) ? data.routes[0] : data.routes;
        const profileData = Array.isArray(data.profiles)
            ? data.profiles[0]
            : data.profiles;
        return {
            bus_id: data.id,
            bus_number: data.number_plate || '',
            route_id: data.route_id || '',
            route_name: routeData?.name || '',
            driver_id: data.assigned_driver_id || '',
            driver_name: profileData?.full_name || 'Unknown Driver',
        };
    }
    catch (error) {
        console.error('❌ Error in getBusInfo:', error);
        return null;
    }
};
exports.getBusInfo = getBusInfo;
//# sourceMappingURL=locationService.js.map