"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsolidatedAdminService = void 0;
const BusDatabaseService_1 = require("./database/BusDatabaseService");
const DriverDatabaseService_1 = require("./database/DriverDatabaseService");
const RouteQueryService_1 = require("./routes/RouteQueryService");
const RouteMutationService_1 = require("./routes/RouteMutationService");
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
class ConsolidatedAdminService {
    static async getAllBuses() {
        try {
            return await BusDatabaseService_1.BusDatabaseService.getAllBuses();
        }
        catch (error) {
            logger_1.logger.error('Error in getAllBuses', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async getBusById(busId) {
        try {
            return await BusDatabaseService_1.BusDatabaseService.getBusById(busId);
        }
        catch (error) {
            logger_1.logger.error('Error in getBusById', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async createBus(busData) {
        try {
            return await BusDatabaseService_1.BusDatabaseService.createBus(busData);
        }
        catch (error) {
            logger_1.logger.error('Error in createBus', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async updateBus(busId, busData) {
        try {
            return await BusDatabaseService_1.BusDatabaseService.updateBus(busId, busData);
        }
        catch (error) {
            logger_1.logger.error('Error in updateBus', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async deleteBus(busId) {
        try {
            return await BusDatabaseService_1.BusDatabaseService.deleteBus(busId);
        }
        catch (error) {
            logger_1.logger.error('Error in deleteBus', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async getAllDrivers() {
        try {
            return await DriverDatabaseService_1.DriverDatabaseService.getAllDrivers();
        }
        catch (error) {
            logger_1.logger.error('Error in getAllDrivers', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async getDriverById(driverId) {
        try {
            return await DriverDatabaseService_1.DriverDatabaseService.getDriverById(driverId);
        }
        catch (error) {
            logger_1.logger.error('Error in getDriverById', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async createDriver(driverData) {
        try {
            return await DriverDatabaseService_1.DriverDatabaseService.createDriver(driverData);
        }
        catch (error) {
            logger_1.logger.error('Error in createDriver', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async updateDriver(driverId, driverData) {
        try {
            return await DriverDatabaseService_1.DriverDatabaseService.updateDriver(driverId, driverData);
        }
        catch (error) {
            logger_1.logger.error('Error in updateDriver', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async deleteDriver(driverId) {
        try {
            return await DriverDatabaseService_1.DriverDatabaseService.deleteDriver(driverId);
        }
        catch (error) {
            logger_1.logger.error('Error in deleteDriver', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async cleanupInactiveDrivers() {
        try {
            return await DriverDatabaseService_1.DriverDatabaseService.cleanupInactiveDrivers();
        }
        catch (error) {
            logger_1.logger.error('Error in cleanupInactiveDrivers', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async getAllRoutes() {
        try {
            return await RouteQueryService_1.RouteQueryService.getAllRoutes();
        }
        catch (error) {
            logger_1.logger.error('Error in getAllRoutes', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async getRouteById(routeId) {
        try {
            return await RouteQueryService_1.RouteQueryService.getRouteById(routeId);
        }
        catch (error) {
            logger_1.logger.error('Error in getRouteById', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async createRoute(routeData) {
        try {
            return await RouteMutationService_1.RouteMutationService.createRoute(routeData);
        }
        catch (error) {
            logger_1.logger.error('Error in createRoute', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async updateRoute(routeId, routeData) {
        try {
            return await RouteMutationService_1.RouteMutationService.updateRoute(routeId, routeData);
        }
        catch (error) {
            logger_1.logger.error('Error in updateRoute', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async deleteRoute(routeId) {
        try {
            return await RouteMutationService_1.RouteMutationService.deleteRoute(routeId);
        }
        catch (error) {
            logger_1.logger.error('Error in deleteRoute', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async getAnalytics() {
        try {
            const [buses, drivers, routes] = await Promise.all([
                BusDatabaseService_1.BusDatabaseService.getAllBuses(),
                DriverDatabaseService_1.DriverDatabaseService.getAllDrivers(),
                RouteQueryService_1.RouteQueryService.getAllRoutes()
            ]);
            return {
                totalBuses: buses.length,
                activeBuses: buses.filter(bus => bus.is_active).length,
                totalRoutes: routes.length,
                activeRoutes: routes.filter((route) => route.is_active).length,
                totalDrivers: drivers.length,
                activeDrivers: drivers.filter(driver => driver.is_active).length,
                averageDelay: 0,
                busUsageStats: []
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getAnalytics', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async getSystemHealth() {
        try {
            const [buses, routes, drivers, recentLocationsResult] = await Promise.all([
                BusDatabaseService_1.BusDatabaseService.getAllBuses(),
                RouteQueryService_1.RouteQueryService.getAllRoutes(),
                DriverDatabaseService_1.DriverDatabaseService.getAllDrivers(),
                supabase_1.supabaseAdmin
                    .from('live_locations')
                    .select('id', { count: 'exact', head: true })
                    .gte('recorded_at', new Date(Date.now() - 3600000).toISOString())
            ]);
            return {
                buses: buses.length,
                routes: routes.length,
                drivers: drivers.length,
                recentLocations: recentLocationsResult.count || 0,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getSystemHealth', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async clearAllData() {
        try {
            logger_1.logger.warn('Clearing all data - this is a destructive operation', 'consolidated-admin');
            await supabase_1.supabaseAdmin.from('buses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase_1.supabaseAdmin.from('routes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase_1.supabaseAdmin.from('user_profiles').delete().neq('role', 'admin');
            logger_1.logger.info('All data cleared successfully', 'consolidated-admin');
            return { success: true, message: 'All data cleared successfully' };
        }
        catch (error) {
            logger_1.logger.error('Error in clearAllData', 'consolidated-admin', { error });
            throw error;
        }
    }
}
exports.ConsolidatedAdminService = ConsolidatedAdminService;
//# sourceMappingURL=ConsolidatedAdminService.js.map