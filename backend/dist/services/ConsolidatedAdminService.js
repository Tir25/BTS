"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsolidatedAdminService = void 0;
const UnifiedDatabaseService_1 = require("./UnifiedDatabaseService");
const routeService_1 = require("./routeService");
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
class ConsolidatedAdminService {
    static async getAllBuses() {
        try {
            return await UnifiedDatabaseService_1.UnifiedDatabaseService.getAllBuses();
        }
        catch (error) {
            logger_1.logger.error('Error in getAllBuses', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async getBusById(busId) {
        try {
            return await UnifiedDatabaseService_1.UnifiedDatabaseService.getBusById(busId);
        }
        catch (error) {
            logger_1.logger.error('Error in getBusById', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async createBus(busData) {
        try {
            return await UnifiedDatabaseService_1.UnifiedDatabaseService.createBus(busData);
        }
        catch (error) {
            logger_1.logger.error('Error in createBus', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async updateBus(busId, busData) {
        try {
            return await UnifiedDatabaseService_1.UnifiedDatabaseService.updateBus(busId, busData);
        }
        catch (error) {
            logger_1.logger.error('Error in updateBus', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async deleteBus(busId) {
        try {
            return await UnifiedDatabaseService_1.UnifiedDatabaseService.deleteBus(busId);
        }
        catch (error) {
            logger_1.logger.error('Error in deleteBus', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async getAllDrivers() {
        try {
            return await UnifiedDatabaseService_1.UnifiedDatabaseService.getAllDrivers();
        }
        catch (error) {
            logger_1.logger.error('Error in getAllDrivers', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async getDriverById(driverId) {
        try {
            return await UnifiedDatabaseService_1.UnifiedDatabaseService.getDriverById(driverId);
        }
        catch (error) {
            logger_1.logger.error('Error in getDriverById', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async createDriver(driverData) {
        try {
            return await UnifiedDatabaseService_1.UnifiedDatabaseService.createDriver(driverData);
        }
        catch (error) {
            logger_1.logger.error('Error in createDriver', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async updateDriver(driverId, driverData) {
        try {
            return await UnifiedDatabaseService_1.UnifiedDatabaseService.updateDriver(driverId, driverData);
        }
        catch (error) {
            logger_1.logger.error('Error in updateDriver', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async deleteDriver(driverId) {
        try {
            return await UnifiedDatabaseService_1.UnifiedDatabaseService.deleteDriver(driverId);
        }
        catch (error) {
            logger_1.logger.error('Error in deleteDriver', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async cleanupInactiveDrivers() {
        try {
            return await UnifiedDatabaseService_1.UnifiedDatabaseService.cleanupInactiveDrivers();
        }
        catch (error) {
            logger_1.logger.error('Error in cleanupInactiveDrivers', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async getAllRoutes() {
        try {
            return await routeService_1.RouteService.getAllRoutes();
        }
        catch (error) {
            logger_1.logger.error('Error in getAllRoutes', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async getRouteById(routeId) {
        try {
            return await routeService_1.RouteService.getRouteById(routeId);
        }
        catch (error) {
            logger_1.logger.error('Error in getRouteById', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async createRoute(routeData) {
        try {
            return await routeService_1.RouteService.createRoute(routeData);
        }
        catch (error) {
            logger_1.logger.error('Error in createRoute', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async updateRoute(routeId, routeData) {
        try {
            return await routeService_1.RouteService.updateRoute(routeId, routeData);
        }
        catch (error) {
            logger_1.logger.error('Error in updateRoute', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async deleteRoute(routeId) {
        try {
            return await routeService_1.RouteService.deleteRoute(routeId);
        }
        catch (error) {
            logger_1.logger.error('Error in deleteRoute', 'consolidated-admin', { error });
            throw error;
        }
    }
    static async getAnalytics() {
        try {
            const [buses, drivers, routes] = await Promise.all([
                UnifiedDatabaseService_1.UnifiedDatabaseService.getAllBuses(),
                UnifiedDatabaseService_1.UnifiedDatabaseService.getAllDrivers(),
                UnifiedDatabaseService_1.UnifiedDatabaseService.getAllRoutes()
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
            return {
                database: 'healthy',
                services: 'healthy',
                lastCheck: new Date().toISOString(),
                uptime: process.uptime()
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getSystemHealth', 'consolidated-admin', { error });
            return {
                database: 'unhealthy',
                services: 'unhealthy',
                lastCheck: new Date().toISOString(),
                uptime: process.uptime()
            };
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