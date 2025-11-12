/**
 * Route Database Service
 * Handles all route-related database operations
 */

import { supabaseAdmin } from '../../config/supabase';
import { logger } from '../../utils/logger';

/**
 * Route data returned from database queries
 */
export interface RouteDatabaseData {
  id: string;
  name: string;
  description: string | null;
  distance_km: number;
  estimated_duration_minutes: number;
  city: string | null;
  custom_origin: string | null;
  custom_destination: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assigned_buses_count?: number;
}

/**
 * Service for route database operations
 */
export class RouteDatabaseService {
  /**
   * Get all routes
   */
  static async getAllRoutes(): Promise<RouteDatabaseData[]> {
    try {
      // Use the route_management_view for comprehensive data
      const { data: routes, error } = await supabaseAdmin
        .from('route_management_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching all routes', 'route-db-service', { error });
        throw error;
      }

      if (!routes || routes.length === 0) {
        logger.info('No routes found in database', 'route-db-service');
        return [];
      }

      logger.info(`Fetched ${routes.length} routes from database`, 'route-db-service');

      return routes.map((route: any) => ({
        id: route.id,
        name: route.name,
        description: route.description,
        distance_km: route.distance_km,
        estimated_duration_minutes: route.estimated_duration_minutes,
        city: route.city,
        custom_origin: route.custom_origin,
        custom_destination: route.custom_destination,
        is_active: route.is_active,
        created_at: route.created_at,
        updated_at: route.updated_at,
        assigned_buses_count: route.assigned_buses_count,
      }));
    } catch (error) {
      logger.error('Error in getAllRoutes', 'route-db-service', { error });
      throw error;
    }
  }
}

