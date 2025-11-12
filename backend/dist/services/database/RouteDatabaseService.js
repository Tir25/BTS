"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteDatabaseService = void 0;
const supabase_1 = require("../../config/supabase");
const logger_1 = require("../../utils/logger");
class RouteDatabaseService {
    static async getAllRoutes() {
        try {
            const { data: routes, error } = await supabase_1.supabaseAdmin
                .from('route_management_view')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) {
                logger_1.logger.error('Error fetching all routes', 'route-db-service', { error });
                throw error;
            }
            if (!routes || routes.length === 0) {
                logger_1.logger.info('No routes found in database', 'route-db-service');
                return [];
            }
            logger_1.logger.info(`Fetched ${routes.length} routes from database`, 'route-db-service');
            return routes.map((route) => ({
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
        }
        catch (error) {
            logger_1.logger.error('Error in getAllRoutes', 'route-db-service', { error });
            throw error;
        }
    }
}
exports.RouteDatabaseService = RouteDatabaseService;
//# sourceMappingURL=RouteDatabaseService.js.map