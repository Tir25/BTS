"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const database_1 = __importDefault(require("../../config/database"));
const logger_1 = require("../../utils/logger");
class AnalyticsService {
    static async getAnalytics() {
        try {
            const countsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM buses) as total_buses,
          (SELECT COUNT(*) FROM buses WHERE is_active = true) as active_buses,
          (SELECT COUNT(*) FROM routes) as total_routes,
          (SELECT COUNT(*) FROM routes WHERE is_active = true) as active_routes,
          (SELECT COUNT(*) FROM user_profiles WHERE role = 'driver') as total_drivers,
          (SELECT COUNT(*) FROM user_profiles WHERE role = 'driver' AND is_active = true) as active_drivers
      `;
            const countsResult = await database_1.default.query(countsQuery);
            const counts = countsResult.rows[0];
            const averageDelay = 0;
            const busUsageStats = [];
            const analytics = {
                totalBuses: parseInt(counts.total_buses),
                activeBuses: parseInt(counts.active_buses),
                totalRoutes: parseInt(counts.total_routes),
                activeRoutes: parseInt(counts.active_routes),
                totalDrivers: parseInt(counts.total_drivers),
                activeDrivers: parseInt(counts.active_drivers),
                averageDelay,
                busUsageStats
            };
            logger_1.logger.info('Analytics data fetched successfully', 'analytics-service');
            return analytics;
        }
        catch (error) {
            logger_1.logger.error('Error fetching analytics', 'analytics-service', { error });
            throw error;
        }
    }
    static async getSystemHealth() {
        try {
            const startTime = Date.now();
            await database_1.default.query('SELECT 1');
            const dbResponseTime = Date.now() - startTime;
            const connectionQuery = `
        SELECT count(*) as connection_count 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `;
            const connectionResult = await database_1.default.query(connectionQuery);
            const connectionCount = parseInt(connectionResult.rows[0].connection_count);
            const countsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM buses) as total_buses,
          (SELECT COUNT(*) FROM routes) as total_routes,
          (SELECT COUNT(*) FROM user_profiles WHERE role = 'driver') as total_drivers,
          (SELECT COUNT(*) FROM live_locations WHERE recorded_at >= NOW() - INTERVAL '1 hour') as recent_locations
      `;
            const countsResult = await database_1.default.query(countsQuery);
            const counts = countsResult.rows[0];
            let dbStatus;
            if (dbResponseTime < 100) {
                dbStatus = 'healthy';
            }
            else if (dbResponseTime < 500) {
                dbStatus = 'degraded';
            }
            else {
                dbStatus = 'unhealthy';
            }
            const systemMetrics = {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
                cpuUsage: 0
            };
            const health = {
                database: {
                    status: dbStatus,
                    responseTime: dbResponseTime,
                    connectionCount
                },
                services: {
                    websocket: 'healthy',
                    api: 'healthy'
                },
                uptime: systemMetrics.uptime,
                memoryUsage: systemMetrics.memoryUsage,
                cpuUsage: systemMetrics.cpuUsage,
                buses: parseInt(counts.total_buses),
                routes: parseInt(counts.total_routes),
                drivers: parseInt(counts.total_drivers),
                recentLocations: parseInt(counts.recent_locations)
            };
            logger_1.logger.info('System health data fetched successfully', 'analytics-service');
            return health;
        }
        catch (error) {
            logger_1.logger.error('Error fetching system health', 'analytics-service', { error });
            throw error;
        }
    }
    static async getBusPerformanceMetrics(busId) {
        try {
            return {
                totalTrips: 0,
                onTimeTrips: 0,
                delayedTrips: 0,
                averageDelay: 0,
                reliability: 0
            };
        }
        catch (error) {
            logger_1.logger.error('Error fetching bus performance metrics', 'analytics-service', { error, busId });
            throw error;
        }
    }
    static async getRoutePerformanceMetrics(routeId) {
        try {
            return {
                totalTrips: 0,
                averageDuration: 0,
                averageDelay: 0,
                popularity: 0
            };
        }
        catch (error) {
            logger_1.logger.error('Error fetching route performance metrics', 'analytics-service', { error, routeId });
            throw error;
        }
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=AnalyticsService.js.map