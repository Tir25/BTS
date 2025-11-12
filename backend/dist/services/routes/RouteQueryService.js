"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteQueryService = void 0;
const supabase_1 = require("../../config/supabase");
const logger_1 = require("../../utils/logger");
class RouteQueryService {
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
            logger_1.logger.error('Error calculating ETA', 'route-query-service', { error });
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
                logger_1.logger.error('Error fetching routes', 'route-query-service', { error });
                throw error;
            }
            if (!routes || routes.length === 0) {
                logger_1.logger.info('No routes found in database', 'route-query-service');
                return [];
            }
            logger_1.logger.info(`Fetched ${routes.length} routes from database`, 'route-query-service');
            return routes.map((route) => ({
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
            }));
        }
        catch (error) {
            logger_1.logger.error('Error in getAllRoutes', 'route-query-service', { error });
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
                logger_1.logger.error('Error fetching route by ID', 'route-query-service', { error, routeId });
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
            logger_1.logger.error('Error in getRouteById', 'route-query-service', { error, routeId });
            return null;
        }
    }
    static async getRoutesInViewport(viewport) {
        logger_1.logger.warn('getRoutesInViewport is not yet implemented', 'route-query-service');
        return [];
    }
    static async checkBusNearStop(busLocation, routeId) {
        logger_1.logger.warn('checkBusNearStop is not yet implemented', 'route-query-service');
        return null;
    }
}
exports.RouteQueryService = RouteQueryService;
//# sourceMappingURL=RouteQueryService.js.map