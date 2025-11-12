/**
 * Route Query Service
 * Handles read operations for routes
 */

import { supabaseAdmin } from '../../config/supabase';
import type { Database } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type { LineString } from 'geojson';

export interface RouteWithGeoJSON {
  id: string;
  name: string;
  description: string;
  stops: LineString;
  distance_km: number;
  estimated_duration_minutes: number;
  city?: string;
  is_active: boolean;
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

/**
 * Service for route query operations
 */
export class RouteQueryService {
  /**
   * Calculate ETA for a bus on a route
   */
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
      logger.error('Error calculating ETA', 'route-query-service', { error });
      return null;
    }
  }

  /**
   * Get all routes
   */
  static async getAllRoutes(): Promise<RouteWithGeoJSON[]> {
    try {
      type RouteManagementViewRow = Database['public']['Views']['route_management_view']['Row'];

      const { data: routes, error } = await supabaseAdmin
        .from('route_management_view')
        .select('*')
        .order('name');

      if (error) {
        logger.error('Error fetching routes', 'route-query-service', { error });
        throw error;
      }

      if (!routes || routes.length === 0) {
        logger.info('No routes found in database', 'route-query-service');
        return [];
      }

      logger.info(`Fetched ${routes.length} routes from database`, 'route-query-service');
      
      // Transform the data to match the expected interface
      return routes.map((route: any) => ({
        id: route.id,
        name: route.name,
        description: route.description,
        distance_km: route.distance_km,
        estimated_duration_minutes: route.estimated_duration_minutes,
        city: route.city ?? undefined,
        is_active: route.is_active,
        created_at: route.created_at,
        updated_at: route.updated_at,
        stops: {
          type: 'LineString',
          coordinates: [] // Empty coordinates for now
        } as LineString
      }));
    } catch (error) {
      logger.error('Error in getAllRoutes', 'route-query-service', { error });
      return [];
    }
  }

  /**
   * Get route by ID
   */
  static async getRouteById(routeId: string): Promise<RouteWithGeoJSON | null> {
    try {
      type RouteManagementViewRow = Database['public']['Views']['route_management_view']['Row'];

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
        logger.error('Error fetching route by ID', 'route-query-service', { error, routeId });
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
        city: route.city ?? undefined,
        is_active: route.is_active,
        created_at: route.created_at,
        updated_at: route.updated_at,
        stops: {
          type: 'LineString',
          coordinates: [] // Empty coordinates for now
        } as LineString
      };
    } catch (error) {
      logger.error('Error in getRouteById', 'route-query-service', { error, routeId });
      return null;
    }
  }

  /**
   * Get routes within viewport (spatial query)
   */
  static async getRoutesInViewport(viewport: any): Promise<RouteWithGeoJSON[]> {
    // Placeholder implementation
    logger.warn('getRoutesInViewport is not yet implemented', 'route-query-service');
    return [];
  }

  /**
   * Check if bus is near a stop
   */
  static async checkBusNearStop(busLocation: any, routeId: string): Promise<any> {
    // Placeholder implementation
    logger.warn('checkBusNearStop is not yet implemented', 'route-query-service');
    return null;
  }
}

