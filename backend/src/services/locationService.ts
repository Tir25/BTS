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

export const saveLocationUpdate = async (data: LocationData): Promise<SavedLocation | null> => {
  try {
    // Convert coordinates to PostGIS Point format
    const point = `POINT(${data.longitude} ${data.latitude})`;
    
    const { data: savedLocation, error } = await supabaseAdmin
      .from('live_locations')
      .insert({
        driver_id: data.driverId,
        bus_id: data.busId,
        location: point,
        timestamp: data.timestamp,
        speed: data.speed,
        heading: data.heading
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving location:', error);
      return null;
    }

    return savedLocation;
  } catch (error) {
    console.error('❌ Error in saveLocationUpdate:', error);
    return null;
  }
};

export const getDriverBusInfo = async (driverId: string): Promise<BusInfo | null> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('driver_bus_assignments')
      .select(`
        bus_id,
        buses!inner(
          bus_number,
          route_id
        ),
        routes!inner(
          route_name
        ),
        drivers!inner(
          driver_name
        )
      `)
      .eq('driver_id', driverId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('❌ Error fetching driver bus info:', error);
      return null;
    }

    // Handle the case where joined tables return arrays
    const busData = Array.isArray(data.buses) ? data.buses[0] : data.buses;
    const routeData = Array.isArray(data.routes) ? data.routes[0] : data.routes;
    const driverData = Array.isArray(data.drivers) ? data.drivers[0] : data.drivers;

    return {
      bus_id: data.bus_id,
      bus_number: busData?.bus_number || '',
      route_id: busData?.route_id || '',
      route_name: routeData?.route_name || '',
      driver_id: driverId,
      driver_name: driverData?.driver_name || ''
    };
  } catch (error) {
    console.error('❌ Error in getDriverBusInfo:', error);
    return null;
  }
};

export const getCurrentBusLocations = async (): Promise<SavedLocation[]> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('live_locations')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('❌ Error fetching current locations:', error);
      return [];
    }

    return data || [];
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
    const { data, error } = await supabaseAdmin
      .from('live_locations')
      .select('*')
      .eq('bus_id', busId)
      .gte('timestamp', startTime)
      .lte('timestamp', endTime)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('❌ Error fetching bus location history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in getBusLocationHistory:', error);
    return [];
  }
};
