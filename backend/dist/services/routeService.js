"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteService = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
class RouteService {
    static async calculateETA(busLocation, routeId) {
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
            return null;
        }
        catch (error) {
            console.error('❌ Error calculating ETA:', error);
            return null;
        }
    }
    static async getAllRoutes() {
        try {
            const { data: routes, error } = await supabase_1.supabaseAdmin
                .from('route_management_view')
                .select('*')
                .order('name');
            if (error) {
                logger_1.logger.error('Error fetching routes', 'route-service', { error });
                throw error;
            }
            if (!routes || routes.length === 0) {
                logger_1.logger.info('No routes found in database', 'route-service');
                return [];
            }
            logger_1.logger.info(`Fetched ${routes.length} routes from database`, 'route-service');
            return routes.map((route) => ({
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
                    coordinates: []
                }
            }));
        }
        catch (error) {
            logger_1.logger.error('Error in getAllRoutes', 'route-service', { error });
            return [];
        }
    }
    static async getRouteById(routeId) {
        try {
            const { data: route, error } = await supabase_1.supabaseAdmin
                .from('route_management_view')
                .select('*')
                .eq('id', routeId)
                .eq('is_active', true)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                logger_1.logger.error('Error fetching route by ID', 'route-service', { error, routeId });
                throw error;
            }
            if (!route)
                return null;
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
                    coordinates: []
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getRouteById', 'route-service', { error, routeId });
            return null;
        }
    }
    static async createRoute(routeData) {
        try {
            const { data: route, error } = await supabase_1.supabaseAdmin
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
                logger_1.logger.error('Error creating route', 'route-service', { error, routeData });
                throw error;
            }
            logger_1.logger.info('Route created successfully', 'route-service', { routeId: route.id });
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
                    coordinates: []
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error in createRoute', 'route-service', { error, routeData });
            throw error;
        }
    }
    static async updateRoute(routeId, routeData) {
        try {
            const updateData = {};
            if (routeData.name !== undefined)
                updateData.name = routeData.name;
            if (routeData.description !== undefined)
                updateData.description = routeData.description;
            if (routeData.distance_km !== undefined)
                updateData.distance_km = routeData.distance_km;
            if (routeData.estimated_duration_minutes !== undefined)
                updateData.estimated_duration_minutes = routeData.estimated_duration_minutes;
            if (routeData.city !== undefined)
                updateData.city = routeData.city;
            if (routeData.is_active !== undefined)
                updateData.is_active = routeData.is_active;
            if (Object.keys(updateData).length === 0) {
                return null;
            }
            const { data: route, error } = await supabase_1.supabaseAdmin
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
                    return null;
                }
                logger_1.logger.error('Error updating route', 'route-service', { error, routeId, routeData });
                throw error;
            }
            logger_1.logger.info('Route updated successfully', 'route-service', { routeId });
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
                    coordinates: []
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error in updateRoute', 'route-service', { error, routeId, routeData });
            throw error;
        }
    }
    static async deleteRoute(routeId) {
        try {
            const { data: route, error: fetchError } = await supabase_1.supabaseAdmin
                .from('routes')
                .select('id, name, description, distance_km, estimated_duration_minutes, city, is_active, created_at, updated_at')
                .eq('id', routeId)
                .single();
            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    return null;
                }
                logger_1.logger.error('Error fetching route for deletion', 'route-service', { error: fetchError, routeId });
                throw fetchError;
            }
            await supabase_1.supabaseAdmin
                .from('route_stops')
                .delete()
                .eq('route_id', routeId);
            await supabase_1.supabaseAdmin
                .from('route_details')
                .delete()
                .eq('route_id', routeId);
            await supabase_1.supabaseAdmin
                .from('buses')
                .update({ route_id: null })
                .eq('route_id', routeId);
            await supabase_1.supabaseAdmin
                .from('bus_route_assignments')
                .delete()
                .eq('route_id', routeId);
            await supabase_1.supabaseAdmin
                .from('driver_bus_assignments')
                .delete()
                .eq('route_id', routeId);
            await supabase_1.supabaseAdmin
                .from('bus_route_shifts')
                .delete()
                .eq('route_id', routeId);
            await supabase_1.supabaseAdmin
                .from('assignment_history')
                .delete()
                .eq('route_id', routeId);
            const { error: deleteError } = await supabase_1.supabaseAdmin
                .from('routes')
                .delete()
                .eq('id', routeId);
            if (deleteError) {
                logger_1.logger.error('Error deleting route', 'route-service', { error: deleteError, routeId });
                throw deleteError;
            }
            logger_1.logger.info('Route and all related data deleted successfully', 'route-service', {
                routeId,
                routeName: route.name
            });
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
                    coordinates: []
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error in deleteRoute', 'route-service', { error, routeId });
            throw error;
        }
    }
    static async getRoutesInViewport(viewport) {
        return [];
    }
    static async assignBusToRoute(busId, routeId) {
        return false;
    }
    static async checkBusNearStop(busLocation, routeId) {
        return null;
    }
}
exports.RouteService = RouteService;
//# sourceMappingURL=routeService.js.map