import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import type { LineString } from 'geojson';

interface Route {
  id: string;
  name: string;
  description: string;
  stops: LineString;
  distance_km: number;
  estimated_duration_minutes: number;
  city?: string;
  is_active: boolean;
}

export interface RouteWithGeoJSON extends Omit<Route, 'stops'> {
  stops: LineString;
  created_at?: string;
  updated_at?: string;
}

interface BusLocation {
  bus_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface ETAInfo {
  bus_id: string;
  route_id: string;
  current_location: [number, number];
  next_stop: string;
  distance_remaining: number;
  estimated_arrival_minutes: number;
  is_near_stop: boolean;
}

export interface RouteData {
  id?: string;
  name: string;
  description?: string;
  distance_km?: number;
  estimated_duration_minutes?: number;
  is_active?: boolean;
  city?: string;
}

export class RouteService {
  static async calculateETA(
    busLocation: BusLocation,
    routeId: string
  ): Promise<ETAInfo | null> {
    try {
      const query = `
        SELECT 
          r.id as route_id,
          r.name as route_name,
          ST_AsGeoJSON(r.stops)::json as route_stops,
          ST_Distance(
            ST_GeomFromText('POINT($1 $2)', 4326),
            r.stops
          ) as distance_to_route
        FROM routes r 
        WHERE r.id = $3 AND r.is_active = true
      `;

      // Note: This method needs to be implemented with proper database connection
      // For now, return null as this is not critical for admin data loading
      return null;
    } catch (error) {
      console.error('❌ Error calculating ETA:', error);
      return null;
    }
  }

  static async getAllRoutes(): Promise<RouteWithGeoJSON[]> {
    try {
      const { data: routes, error } = await supabaseAdmin
        .from('route_management_view')
        .select('*')
        .order('name');

      if (error) {
        logger.error('Error fetching routes', 'route-service', { error });
        throw error;
      }

      if (!routes || routes.length === 0) {
        logger.info('No routes found in database', 'route-service');
        return [];
      }

      logger.info(`Fetched ${routes.length} routes from database`, 'route-service');
      
      // Transform the data to match the expected interface
      return routes.map((route: any) => ({
        id: route.id,
        name: route.name,
        description: route.description,
        distance_km: route.distance_km,
        estimated_duration_minutes: route.estimated_duration_minutes,
        city: route.city,
        is_active: route.is_active,
        created_at: route.created_at,
        updated_at: route.updated_at,
        stops: {
          type: 'LineString',
          coordinates: [] // Empty coordinates for now
        } as LineString
      }));
    } catch (error) {
      logger.error('Error in getAllRoutes', 'route-service', { error });
      return [];
    }
  }

  static async getRouteById(routeId: string): Promise<RouteWithGeoJSON | null> {
    try {
      const { data: route, error } = await supabaseAdmin
        .from('route_management_view')
        .select('*')
        .eq('id', routeId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        logger.error('Error fetching route by ID', 'route-service', { error, routeId });
        throw error;
      }

      if (!route) return null;

      // Transform the data to match the expected interface
      return {
        id: route.id,
        name: route.name,
        description: route.description,
        distance_km: route.distance_km,
        estimated_duration_minutes: route.estimated_duration_minutes,
        city: route.city,
        is_active: route.is_active,
        created_at: route.created_at,
        updated_at: route.updated_at,
        stops: {
          type: 'LineString',
          coordinates: [] // Empty coordinates for now
        } as LineString
      };
    } catch (error) {
      logger.error('Error in getRouteById', 'route-service', { error, routeId });
      return null;
    }
  }

  static async createRoute(routeData: RouteData): Promise<RouteWithGeoJSON> {
    try {
      const { data: route, error } = await supabaseAdmin
        .from('routes')
        .insert({
          name: routeData.name,
          description: routeData.description || '',
          distance_km: routeData.distance_km || 0,
          estimated_duration_minutes: routeData.estimated_duration_minutes || 0,
          city: routeData.city || '',
          is_active: routeData.is_active !== false,
        })
        .select(`
          id,
          name,
          description,
          distance_km,
          estimated_duration_minutes,
          city,
          is_active,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        logger.error('Error creating route', 'route-service', { error, routeData });
        throw error;
      }

      logger.info('Route created successfully', 'route-service', { routeId: route.id });
      
      // Transform the data to match the expected interface
      return {
        id: route.id,
        name: route.name,
        description: route.description,
        distance_km: route.distance_km,
        estimated_duration_minutes: route.estimated_duration_minutes,
        city: route.city,
        is_active: route.is_active,
        created_at: route.created_at,
        updated_at: route.updated_at,
        stops: {
          type: 'LineString',
          coordinates: [] // Empty coordinates for now
        } as LineString
      };
    } catch (error) {
      logger.error('Error in createRoute', 'route-service', { error, routeData });
      throw error;
    }
  }

  static async updateRoute(routeId: string, routeData: Partial<RouteData>): Promise<RouteWithGeoJSON | null> {
    try {
      const updateData: any = {};
      
      if (routeData.name !== undefined) updateData.name = routeData.name;
      if (routeData.description !== undefined) updateData.description = routeData.description;
      if (routeData.distance_km !== undefined) updateData.distance_km = routeData.distance_km;
      if (routeData.estimated_duration_minutes !== undefined) updateData.estimated_duration_minutes = routeData.estimated_duration_minutes;
      if (routeData.city !== undefined) updateData.city = routeData.city;
      if (routeData.is_active !== undefined) updateData.is_active = routeData.is_active;

      if (Object.keys(updateData).length === 0) {
        return null;
      }

      const { data: route, error } = await supabaseAdmin
        .from('routes')
        .update(updateData)
        .eq('id', routeId)
        .select(`
          id,
          name,
          description,
          distance_km,
          estimated_duration_minutes,
          city,
          is_active,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        logger.error('Error updating route', 'route-service', { error, routeId, routeData });
        throw error;
      }

      logger.info('Route updated successfully', 'route-service', { routeId });
      
      // Transform the data to match the expected interface
      return {
        id: route.id,
        name: route.name,
        description: route.description,
        distance_km: route.distance_km,
        estimated_duration_minutes: route.estimated_duration_minutes,
        city: route.city,
        is_active: route.is_active,
        created_at: route.created_at,
        updated_at: route.updated_at,
        stops: {
          type: 'LineString',
          coordinates: [] // Empty coordinates for now
        } as LineString
      };
    } catch (error) {
      logger.error('Error in updateRoute', 'route-service', { error, routeId, routeData });
      throw error;
    }
  }

  static async deleteRoute(routeId: string): Promise<RouteWithGeoJSON | null> {
    try {
      // First, get the route data before deletion
      const { data: route, error: fetchError } = await supabaseAdmin
        .from('routes')
        .select('id, name, description, distance_km, estimated_duration_minutes, city, is_active, created_at, updated_at')
        .eq('id', routeId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return null; // No route found
        }
        logger.error('Error fetching route for deletion', 'route-service', { error: fetchError, routeId });
        throw fetchError;
      }

      // Delete all route-related data first
      // 1. Delete route stops
      await supabaseAdmin
        .from('route_stops')
        .delete()
        .eq('route_id', routeId);

      // 2. Delete route details
      await supabaseAdmin
        .from('route_details')
        .delete()
        .eq('route_id', routeId);

      // 3. Update buses to remove route assignment
      await supabaseAdmin
        .from('buses')
        .update({ route_id: null })
        .eq('route_id', routeId);

      // 4. Delete from bus_route_assignments
      await supabaseAdmin
        .from('bus_route_assignments')
        .delete()
        .eq('route_id', routeId);

      // 5. Delete from driver_bus_assignments
      await supabaseAdmin
        .from('driver_bus_assignments')
        .delete()
        .eq('route_id', routeId);

      // 6. Delete from bus_route_shifts
      await supabaseAdmin
        .from('bus_route_shifts')
        .delete()
        .eq('route_id', routeId);

      // 7. Delete from assignment_history
      await supabaseAdmin
        .from('assignment_history')
        .delete()
        .eq('route_id', routeId);

      // 8. Finally, delete the route
      const { error: deleteError } = await supabaseAdmin
        .from('routes')
        .delete()
        .eq('id', routeId);

      if (deleteError) {
        logger.error('Error deleting route', 'route-service', { error: deleteError, routeId });
        throw deleteError;
      }

      logger.info('Route and all related data deleted successfully', 'route-service', { 
        routeId, 
        routeName: route.name 
      });
      
      // Return the route data
      return {
        id: route.id,
        name: route.name,
        description: route.description,
        distance_km: route.distance_km,
        estimated_duration_minutes: route.estimated_duration_minutes,
        city: route.city,
        is_active: route.is_active,
        created_at: route.created_at,
        updated_at: route.updated_at,
        stops: {
          type: 'LineString',
          coordinates: [] // Empty coordinates as the route is deleted
        } as LineString
      };
    } catch (error) {
      logger.error('Error in deleteRoute', 'route-service', { error, routeId });
      throw error;
    }
  }

  /**
   * Get routes within viewport (spatial query)
   */
  static async getRoutesInViewport(viewport: any): Promise<RouteWithGeoJSON[]> {
    // Placeholder implementation
    return [];
  }

  /**
   * Assign bus to route
   */
  static async assignBusToRoute(busId: string, routeId: string): Promise<boolean> {
    // Placeholder implementation
    return false;
  }

  /**
   * Check if bus is near a stop
   */
  static async checkBusNearStop(busLocation: any, routeId: string): Promise<any> {
    // Placeholder implementation
    return null;
  }
}