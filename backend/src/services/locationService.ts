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
        console.warn('⚠️ Warning: Failed to save to historical locations table:', historicalError);
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
    console.error('❌ Error in saveLocationUpdate:', error);
    return null;
  }
};

/**
 * @deprecated This function has been replaced by optimizedLocationService.getDriverBusInfo()
 * which eliminates N+1 query problems and provides better performance.
 * Use optimizedLocationService.getDriverBusInfo() instead.
 */
export const getDriverBusInfo = async (
  driverId: string
): Promise<BusInfo | null> => {
  console.warn('⚠️ DEPRECATED: getDriverBusInfo is deprecated. Use optimizedLocationService.getDriverBusInfo() instead.');
  
  try {
    console.log('🔍 Fetching bus info for driver:', driverId);

    // First, get the bus information without route join
    const { data: busData, error: busError } = await supabaseAdmin
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

    // Then, get the driver profile information from both tables
    let driverName = 'Unknown Driver';

    // First try user_profiles table
    const { data: profileData } = await supabaseAdmin
      .from('user_profiles')
      .select('full_name')
      .eq('id', driverId)
      .maybeSingle();

    if ((profileData as any)?.full_name) {
      driverName = (profileData as any).full_name;
    } else {
      // Fallback to users table
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('first_name, last_name')
        .eq('id', driverId)
        .maybeSingle();

      if (userData as any) {
        driverName =
          `${(userData as any).first_name || ''} ${(userData as any).last_name || ''}`.trim() ||
          'Unknown Driver';
      }
    }

    console.log('👤 Driver name resolved:', driverName);

    // Get route information only if route_id exists
    let routeName = '';
    if ((busData as any).route_id) {
      const { data: routeData, error: routeError } = await supabaseAdmin
        .from('routes')
        .select('name')
        .eq('id', (busData as any).route_id)
        .maybeSingle();

      console.log('🛣️ Route data found:', routeData);
      console.log('❌ Route error:', routeError);

      if (!routeError && routeData) {
        routeName = (routeData as any).name || '';
      }
    }

    const busInfo = {
      bus_id: (busData as any).id,
      bus_number: (busData as any).bus_number || (busData as any).vehicle_no || '',
      route_id: (busData as any).route_id || '',
      route_name: routeName,
      driver_id: driverId,
      driver_name: driverName,
    };

    console.log('✅ Final bus info:', busInfo);
    return busInfo;
  } catch (error) {
    console.error('❌ Error in getDriverBusInfo:', error);
    return null;
  }
};

/**
 * @deprecated This function has been replaced by optimizedLocationService.getCurrentBusLocations()
 * which provides better performance with caching and spatial optimization.
 * Use optimizedLocationService.getCurrentBusLocations() instead.
 */
export const getCurrentBusLocations = async (): Promise<SavedLocation[]> => {
  console.warn('⚠️ DEPRECATED: getCurrentBusLocations is deprecated. Use optimizedLocationService.getCurrentBusLocations() instead.');
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

    const result = await pool.query(query);
    return result.rows.map((row) => ({
      id: row.id,
      driver_id: '', // Not stored in live_locations table
      bus_id: row.bus_id,
      location: row.location,
      timestamp: row.recorded_at,
      speed: row.speed_kmh,
      heading: row.heading_degrees,
    }));
  } catch (error) {
    console.error('❌ Error in getCurrentBusLocations:', error);
    return [];
  }
};

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
    console.error('❌ Error in getBusLocationHistory:', error);
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
      console.error('❌ Error in fallback query:', fallbackError);
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
      console.error('❌ Error fetching bus info:', error);
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
    console.error('❌ Error in getBusInfo:', error);
    return null;
  }
};

