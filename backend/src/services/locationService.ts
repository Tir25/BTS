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

    const query = `
      INSERT INTO live_locations (bus_id, location, speed_kmh, heading_degrees, recorded_at)
      VALUES ($1, ST_GeomFromText($2, 4326), $3, $4, $5)
      RETURNING id, bus_id, ST_AsText(location) as location, speed_kmh, heading_degrees, recorded_at;
    `;

    const result = await pool.query(query, [
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
  } catch (error) {
    console.error('❌ Error in saveLocationUpdate:', error);
    return null;
  }
};

export const getDriverBusInfo = async (
  driverId: string
): Promise<BusInfo | null> => {
  try {
    console.log('🔍 Fetching bus info for driver:', driverId);

    // First, get the bus information without route join
    const { data: busData, error: busError } = await supabaseAdmin
      .from('buses')
      .select('id, number_plate, route_id')
      .eq('assigned_driver_id', driverId)
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
    
    // First try profiles table
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', driverId)
      .maybeSingle();

    if (profileData?.full_name) {
      driverName = profileData.full_name;
    } else {
      // Fallback to users table
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('first_name, last_name')
        .eq('id', driverId)
        .maybeSingle();

      if (userData) {
        driverName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Unknown Driver';
      }
    }

    console.log('👤 Driver name resolved:', driverName);

    // Get route information only if route_id exists
    let routeName = '';
    if (busData.route_id) {
      const { data: routeData, error: routeError } = await supabaseAdmin
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
      bus_number: busData.number_plate || '',
      route_id: busData.route_id || '',
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

export const getCurrentBusLocations = async (): Promise<SavedLocation[]> => {
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

    const result = await pool.query(query, [busId, startTime, endTime]);
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
    console.error('❌ Error in getBusLocationHistory:', error);
    return [];
  }
};

export const getBusInfo = async (busId: string): Promise<BusInfo | null> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('buses')
      .select(
        `
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
  } catch (error) {
    console.error('❌ Error in getBusInfo:', error);
    return null;
  }
};

export const getAllBuses = async (): Promise<BusInfo[]> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('buses')
      .select(
        `
        id,
        number_plate,
        route_id,
        assigned_driver_id,
        bus_image_url,
        routes!inner(
          name,
          city
        ),
        profiles!inner(
          full_name
        )
      `
      )
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching all buses:', error);
      return [];
    }

    return (data || []).map((item) => {
      const routeData = Array.isArray(item.routes)
        ? item.routes[0]
        : item.routes;
      const profileData = Array.isArray(item.profiles)
        ? item.profiles[0]
        : item.profiles;

      return {
        bus_id: item.id,
        bus_number: item.number_plate || '',
        route_id: item.route_id || '',
        route_name: routeData?.name || '',
        route_city: routeData?.city || '',
        driver_id: item.assigned_driver_id || '',
        driver_name: profileData?.full_name || 'Unknown Driver',
        bus_image_url: item.bus_image_url || null,
      };
    });
  } catch (error) {
    console.error('❌ Error in getAllBuses:', error);
    return [];
  }
};
