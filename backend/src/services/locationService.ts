import { supabaseAdmin } from '../config/supabase';

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
  assigned_driver_profile_id?: string; // Added for compatibility with filter
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

import pool from '../config/database';

export const saveLocationUpdate = async (
  data: LocationData
): Promise<SavedLocation | null> => {
  try {
    // Convert coordinates to PostGIS Point format
    const point = `POINT(${data.longitude} ${data.latitude})`;

    // Use transaction to ensure both tables are updated atomically
    const client = await pool.connect();
    
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
        console.error('❌ Error saving location: No rows returned from live_locations');
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
        // CRITICAL FIX: Use logger instead of console.warn for consistency
        const { logger } = await import('../utils/logger');
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
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    // CRITICAL FIX: Use logger instead of console.error for consistency
    const { logger } = await import('../utils/logger');
    logger.error('Error in saveLocationUpdate', 'location-service', { error });
    return null;
  }
};

// =============================================================================
// DEPRECATED FUNCTIONS - MIGRATION GUIDE
// =============================================================================
// This file contains legacy location service functions that are being phased out.
// New code should use OptimizedLocationService instead.
//
// Migration Guide:
// - getDriverBusInfo: Use optimizedLocationService.getDriverBusInfo() instead
// - getCurrentBusLocations: Use optimizedLocationService.getCurrentBusLocations() instead
// - getBusInfo: Use optimizedLocationService.getBusInfo() instead (NEW)
// - getBusLocationHistory: Use optimizedLocationService.getBusLocationHistory() instead
// - saveLocationUpdate: Use optimizedLocationService.saveLocationUpdate() instead
//
// DEPRECATED: The functions below are kept for backward compatibility only.
// They will be removed in a future version. Please migrate to OptimizedLocationService.
// =============================================================================

export const getBusLocationHistory = async (
  busId: string,
  startTime: string,
  endTime: string
): Promise<SavedLocation[]> => {
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
      FROM get_location_history($1, $2, $3, 1000)
      ORDER BY recorded_at ASC;
    `;

    const result = await pool.query(query, [busId, startTime, endTime]);
    return result.rows.map((row) => ({
      id: row.id,
      driver_id: row.driver_id || '',
      bus_id: row.bus_id,
      location: row.location,
      timestamp: row.recorded_at,
      speed: row.speed_kmh,
      heading: row.heading_degrees,
    }));
  } catch (error) {
    // CRITICAL FIX: Use logger instead of console.error
    const { logger } = await import('../utils/logger');
    logger.error('Error in getBusLocationHistory', 'location-service', { error });
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
          AND recorded_at >= $2 
          AND recorded_at <= $3
        ORDER BY recorded_at ASC;
      `;
      const fallbackResult = await pool.query(fallbackQuery, [busId, startTime, endTime]);
      return fallbackResult.rows.map((row) => ({
        id: row.id,
        driver_id: row.driver_id || '',
        bus_id: row.bus_id,
        location: row.location,
        timestamp: row.recorded_at,
        speed: row.speed_kmh,
        heading: row.heading_degrees,
      }));
    } catch (fallbackError) {
      const { logger } = await import('../utils/logger');
      logger.error('Error in fallback query', 'location-service', { error: fallbackError });
      return [];
    }
  }
};

export const getBusInfo = async (busId: string): Promise<BusInfo | null> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('buses')
      .select(
        `
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
      `
      )
      .eq('id', busId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      const { logger } = await import('../utils/logger');
      logger.error('Error fetching bus info', 'location-service', { error });
      return null;
    }

    // Handle the case where joined tables return arrays
    const routeData = Array.isArray((data as any).routes) ? (data as any).routes[0] : (data as any).routes;
    const profileData = Array.isArray((data as any).profiles)
      ? (data as any).profiles[0]
      : (data as any).profiles;

    return {
      bus_id: data.id,
      bus_number: data.bus_number || '',
      route_id: data.route_id || '',
      route_name: routeData?.name || '',
      driver_id: data.assigned_driver_profile_id || '',
      driver_name: profileData?.full_name || 'Unknown Driver',
    };
  } catch (error) {
    const { logger } = await import('../utils/logger');
    logger.error('Error in getBusInfo', 'location-service', { error });
    return null;
  }
};

