"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteMutationService = void 0;
const supabase_1 = require("../../config/supabase");
const logger_1 = require("../../utils/logger");
class RouteMutationService {
    static async createRoute(routeData) {
        try {
            const insertPayload = {
                name: routeData.name,
                description: routeData.description || '',
                distance_km: routeData.distance_km ?? 0,
                estimated_duration_minutes: routeData.estimated_duration_minutes ?? 0,
                city: routeData.city ?? null,
                is_active: routeData.is_active !== false,
            };
            const { data: route, error } = await supabase_1.supabaseAdmin
                .from('routes')
                .insert(insertPayload)
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
                logger_1.logger.error('Error creating route', 'route-mutation-service', { error, routeData });
                throw error;
            }
            logger_1.logger.info('Route created successfully', 'route-mutation-service', { routeId: route.id });
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
                    coordinates: []
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error in createRoute', 'route-mutation-service', { error, routeData });
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
                updateData.city = routeData.city ?? null;
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
                logger_1.logger.error('Error updating route', 'route-mutation-service', { error, routeId, routeData });
                throw error;
            }
            logger_1.logger.info('Route updated successfully', 'route-mutation-service', { routeId });
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
                    coordinates: []
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error in updateRoute', 'route-mutation-service', { error, routeId, routeData });
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
                logger_1.logger.error('Error fetching route for deletion', 'route-mutation-service', { error: fetchError, routeId });
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
            const busClearUpdate = { route_id: null };
            await supabase_1.supabaseAdmin
                .from('buses')
                .update(busClearUpdate)
                .eq('route_id', routeId);
            await supabase_1.supabaseAdmin
                .from('bus_route_assignments')
                .delete()
                .eq('route_id', routeId);
            const busUnassignUpdate = {
                route_id: null,
                assignment_status: 'unassigned',
                assignment_notes: 'Route deleted',
                updated_at: new Date().toISOString()
            };
            await supabase_1.supabaseAdmin
                .from('buses')
                .update(busUnassignUpdate)
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
                logger_1.logger.error('Error deleting route', 'route-mutation-service', { error: deleteError, routeId });
                throw deleteError;
            }
            logger_1.logger.info('Route and all related data deleted successfully', 'route-mutation-service', {
                routeId,
                routeName: route.name
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
                stops: {
                    type: 'LineString',
                    coordinates: []
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error in deleteRoute', 'route-mutation-service', { error, routeId });
            throw error;
        }
    }
    static async assignBusToRoute(busId, routeId) {
        try {
            const { error } = await supabase_1.supabaseAdmin
                .from('buses')
                .update({
                route_id: routeId,
                updated_at: new Date().toISOString()
            })
                .eq('id', busId);
            if (error) {
                logger_1.logger.error('Error assigning bus to route', 'route-mutation-service', { error, busId, routeId });
                throw error;
            }
            logger_1.logger.info('Bus assigned to route successfully', 'route-mutation-service', { busId, routeId });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error in assignBusToRoute', 'route-mutation-service', { error, busId, routeId });
            throw error;
        }
    }
}
exports.RouteMutationService = RouteMutationService;
//# sourceMappingURL=RouteMutationService.js.map