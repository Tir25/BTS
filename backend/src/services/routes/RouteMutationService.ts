/**
 * Route Mutation Service
 * Handles write operations for routes
 */

import { supabaseAdmin } from '../../config/supabase';
import type { Database } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type { LineString } from 'geojson';
import pool from '../../config/database';
import { RouteQueryService, RouteWithGeoJSON } from './RouteQueryService';

export interface RouteData {
  id?: string;
  name: string;
  description?: string;
  distance_km?: number;
  estimated_duration_minutes?: number;
  is_active?: boolean;
  city?: string | null;
  coordinates?: [number, number][]; // Optional: Array of [lng, lat] coordinates for route path
}

/**
 * Service for route mutation operations
 */
export class RouteMutationService {
  /**
   * Create a new route
   * If coordinates are provided, they will be persisted as PostGIS LineString geometry
   */
  static async createRoute(routeData: RouteData): Promise<RouteWithGeoJSON> {
    try {
      type RoutesInsert = Database['public']['Tables']['routes']['Insert'];

      const insertPayload: RoutesInsert = {
        name: routeData.name,
        description: routeData.description || '',
        distance_km: routeData.distance_km ?? 0,
        estimated_duration_minutes: routeData.estimated_duration_minutes ?? 0,
        city: routeData.city ?? null,
        is_active: routeData.is_active !== false,
      };

      // If coordinates are provided, use raw SQL to insert with PostGIS geometry
      if (routeData.coordinates && routeData.coordinates.length >= 2) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Convert coordinates array to PostGIS LineString format
          const coordinatesStr = routeData.coordinates
            .map(coord => `${coord[0]} ${coord[1]}`)
            .join(', ');
          const linestring = `LINESTRING(${coordinatesStr})`;

          // Insert route with geometry
          const insertQuery = `
            INSERT INTO routes (name, description, distance_km, estimated_duration_minutes, city, is_active, stops)
            VALUES ($1, $2, $3, $4, $5, $6, ST_GeomFromText($7, 4326))
            RETURNING 
              id, name, description, distance_km, estimated_duration_minutes, city, is_active, 
              created_at, updated_at,
              ST_AsGeoJSON(stops)::json as stops_geojson
          `;

          const result = await client.query(insertQuery, [
            routeData.name,
            routeData.description || '',
            routeData.distance_km ?? 0,
            routeData.estimated_duration_minutes ?? 0,
            routeData.city ?? null,
            routeData.is_active !== false,
            linestring,
          ]);

          await client.query('COMMIT');

          if (result.rows.length === 0) {
            throw new Error('No route returned after insert');
          }

          const route = result.rows[0];
          const stopsGeoJSON = route.stops_geojson || { type: 'LineString', coordinates: [] };

          logger.info('Route created successfully with coordinates', 'route-mutation-service', { 
            routeId: route.id,
            coordinateCount: routeData.coordinates.length
          });

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
            stops: stopsGeoJSON as LineString,
          };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }

      // If no coordinates provided, use Supabase insert (simpler, no geometry)
      const { data: route, error } = await supabaseAdmin
        .from('routes')
        .insert(insertPayload as any)
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
        logger.error('Error creating route', 'route-mutation-service', { error, routeData });
        throw error;
      }

      logger.info('Route created successfully (without coordinates)', 'route-mutation-service', { routeId: route.id });
      
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
          coordinates: [] // Empty coordinates - can be added later via route stops or update
        } as LineString
      };
    } catch (error) {
      logger.error('Error in createRoute', 'route-mutation-service', { error, routeData });
      throw error;
    }
  }

  /**
   * Update a route
   */
  static async updateRoute(routeId: string, routeData: Partial<RouteData>): Promise<RouteWithGeoJSON | null> {
    try {
      type RoutesUpdate = Database['public']['Tables']['routes']['Update'];

      const updateData: RoutesUpdate = {};
      
      if (routeData.name !== undefined) updateData.name = routeData.name;
      if (routeData.description !== undefined) updateData.description = routeData.description;
      if (routeData.distance_km !== undefined) updateData.distance_km = routeData.distance_km;
      if (routeData.estimated_duration_minutes !== undefined) updateData.estimated_duration_minutes = routeData.estimated_duration_minutes;
      if (routeData.city !== undefined) updateData.city = routeData.city ?? null;
      if (routeData.is_active !== undefined) updateData.is_active = routeData.is_active;

      if (Object.keys(updateData).length === 0) {
        return null;
      }

      const { data: route, error } = await (supabaseAdmin as any)
        .from('routes')
        .update(updateData as any)
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
        logger.error('Error updating route', 'route-mutation-service', { error, routeId, routeData });
        throw error;
      }

      logger.info('Route updated successfully', 'route-mutation-service', { routeId });
      
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
      logger.error('Error in updateRoute', 'route-mutation-service', { error, routeId, routeData });
      throw error;
    }
  }

  /**
   * Delete a route
   */
  static async deleteRoute(routeId: string): Promise<RouteWithGeoJSON | null> {
    try {
      type BusesUpdate = Database['public']['Tables']['buses']['Update'];

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
        logger.error('Error fetching route for deletion', 'route-mutation-service', { error: fetchError, routeId });
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

      const now = new Date().toISOString();

      // 3. Deactivate driver-bus assignments tied to this route
      const { error: driverAssignmentError } = await supabaseAdmin
        .from('driver_bus_assignments')
        .update({
          is_active: false,
          updated_at: now
        })
        .eq('route_id', routeId)
        .eq('is_active', true);

      if (driverAssignmentError) {
        logger.warn('Failed to deactivate driver-bus assignments during route delete', 'route-mutation-service', {
          routeId,
          error: driverAssignmentError
        });
      }

      // 4. Deactivate bus-route assignments
      const { error: busRouteAssignmentError } = await supabaseAdmin
        .from('bus_route_assignments')
        .update({
          is_active: false,
          unassigned_at: now,
          updated_at: now,
          assigned_driver_id: null,
          assigned_driver_profile_id: null
        })
        .eq('route_id', routeId)
        .eq('is_active', true);

      if (busRouteAssignmentError) {
        logger.warn('Failed to deactivate bus-route assignments during route delete', 'route-mutation-service', {
          routeId,
          error: busRouteAssignmentError
        });
      }

      // 5. Update buses table to remove route assignments
      // Note: Some fields may not be in TypeScript type but exist in database
      const busUnassignUpdate: BusesUpdate & { assigned_shift_id?: null; shift_id?: null } = {
        route_id: null,
        assigned_driver_profile_id: null,
        assignment_status: 'unassigned',
        assignment_notes: 'Route deleted',
        updated_at: now
      };
      await (supabaseAdmin as any)
        .from('buses')
        .update(busUnassignUpdate as any)
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
        logger.error('Error deleting route', 'route-mutation-service', { error: deleteError, routeId });
        throw deleteError;
      }

      logger.info('Route and all related data deleted successfully', 'route-mutation-service', { 
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
        city: route.city ?? undefined,
        is_active: route.is_active,
        created_at: route.created_at,
        updated_at: route.updated_at,
        stops: {
          type: 'LineString',
          coordinates: [] // Empty coordinates as the route is deleted
        } as LineString
      };
    } catch (error) {
      logger.error('Error in deleteRoute', 'route-mutation-service', { error, routeId });
      throw error;
    }
  }

  /**
   * Assign bus to route
   */
  static async assignBusToRoute(busId: string, routeId: string): Promise<boolean> {
    try {
      // Update bus with route assignment
      const { error } = await supabaseAdmin
        .from('buses')
        .update({
          route_id: routeId,
          updated_at: new Date().toISOString()
        })
        .eq('id', busId);

      if (error) {
        logger.error('Error assigning bus to route', 'route-mutation-service', { error, busId, routeId });
        throw error;
      }

      logger.info('Bus assigned to route successfully', 'route-mutation-service', { busId, routeId });
      return true;
    } catch (error) {
      logger.error('Error in assignBusToRoute', 'route-mutation-service', { error, busId, routeId });
      throw error;
    }
  }
}

