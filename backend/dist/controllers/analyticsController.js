"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const BusDatabaseService_1 = require("../services/database/BusDatabaseService");
const DriverDatabaseService_1 = require("../services/database/DriverDatabaseService");
const RouteQueryService_1 = require("../services/routes/RouteQueryService");
const MonitoringService_1 = require("../services/MonitoringService");
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
class AnalyticsController {
    static async getAnalytics(req, res) {
        try {
            const [buses, drivers, routes] = await Promise.all([
                BusDatabaseService_1.BusDatabaseService.getAllBuses(),
                DriverDatabaseService_1.DriverDatabaseService.getAllDrivers(),
                RouteQueryService_1.RouteQueryService.getAllRoutes()
            ]);
            const analytics = {
                totalBuses: buses.length,
                activeBuses: buses.filter(bus => bus.is_active).length,
                totalRoutes: routes.length,
                activeRoutes: routes.filter((route) => route.is_active).length,
                totalDrivers: drivers.length,
                activeDrivers: drivers.filter(driver => driver.is_active).length,
                averageDelay: 0,
                busUsageStats: []
            };
            res.json({
                success: true,
                data: analytics,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching analytics', 'analytics-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch analytics',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    static async getSystemHealth(req, res) {
        try {
            const monitoringHealth = await MonitoringService_1.monitoringService.getSystemHealth();
            const [buses, routes, drivers, recentLocationsResult] = await Promise.all([
                BusDatabaseService_1.BusDatabaseService.getAllBuses(),
                RouteQueryService_1.RouteQueryService.getAllRoutes(),
                DriverDatabaseService_1.DriverDatabaseService.getAllDrivers(),
                supabase_1.supabaseAdmin
                    .from('live_locations')
                    .select('id', { count: 'exact', head: true })
                    .gte('recorded_at', new Date(Date.now() - 3600000).toISOString())
            ]);
            const health = {
                ...monitoringHealth,
                counts: {
                    buses: buses.length,
                    routes: routes.length,
                    drivers: drivers.length,
                    recentLocations: recentLocationsResult.count || 0,
                },
                timestamp: new Date().toISOString()
            };
            res.json({
                success: true,
                data: health,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching system health', 'analytics-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch system health',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    static async clearAllData(req, res) {
        try {
            if (process.env.NODE_ENV !== 'development') {
                res.status(403).json({
                    success: false,
                    error: 'Forbidden',
                    message: 'This endpoint is only available in development mode',
                });
                return;
            }
            logger_1.logger.warn('Clearing all data - this is a destructive operation', 'analytics-controller');
            await supabase_1.supabaseAdmin.from('buses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase_1.supabaseAdmin.from('routes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase_1.supabaseAdmin.from('user_profiles').delete().neq('role', 'admin');
            logger_1.logger.info('All data cleared successfully', 'analytics-controller');
            const result = { success: true, message: 'All data cleared successfully' };
            res.json({
                success: true,
                data: result,
                message: 'All data cleared successfully',
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.logger.error('Error clearing all data', 'analytics-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            res.status(500).json({
                success: false,
                error: 'Failed to clear all data',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
exports.AnalyticsController = AnalyticsController;
//# sourceMappingURL=analyticsController.js.map