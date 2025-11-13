"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const HealthService_1 = require("../services/HealthService");
const logger_1 = require("../utils/logger");
class HealthController {
    static async getHealth(req, res) {
        try {
            const health = await HealthService_1.HealthService.getBasicHealth();
            const statusCode = health.status === 'healthy' ? 200 : 503;
            res.status(statusCode).json(health);
        }
        catch (error) {
            logger_1.logger.error('Health check failed', 'health-controller', { error: String(error) });
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: 'Health check failed'
            });
        }
    }
    static async getDetailedHealth(req, res) {
        try {
            const health = await HealthService_1.HealthService.getDetailedHealth();
            const statusCode = health.status === 'healthy' ? 200 : 503;
            res.status(statusCode).json(health);
        }
        catch (error) {
            logger_1.logger.error('Detailed health check failed', 'health-controller', { error: String(error) });
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: 'Detailed health check failed'
            });
        }
    }
    static async getReadiness(req, res) {
        try {
            const readiness = await HealthService_1.HealthService.getReadiness();
            const statusCode = readiness.status === 'ready' ? 200 : 503;
            res.status(statusCode).json(readiness);
        }
        catch (error) {
            logger_1.logger.error('Readiness check failed', 'health-controller', { error: String(error) });
            res.status(503).json({
                status: 'not ready',
                timestamp: new Date().toISOString(),
                error: 'Readiness check failed'
            });
        }
    }
    static async getLiveness(req, res) {
        try {
            const liveness = HealthService_1.HealthService.getLiveness();
            res.status(200).json(liveness);
        }
        catch (error) {
            logger_1.logger.error('Liveness check failed', 'health-controller', { error: String(error) });
            res.status(503).json({
                status: 'dead',
                timestamp: new Date().toISOString(),
                error: 'Liveness check failed'
            });
        }
    }
    static async getWebSocketHealth(req, res) {
        try {
            const health = HealthService_1.HealthService.getWebSocketHealth();
            const statusCode = health.connected ? 200 : 503;
            res.status(statusCode).json({
                success: health.connected,
                data: {
                    health,
                    stats: HealthService_1.HealthService.getWebSocketStats(),
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (error) {
            logger_1.logger.error('WebSocket health check failed', 'health-controller', { error: String(error) });
            res.status(503).json({
                success: false,
                error: 'WebSocket health check failed',
                message: String(error)
            });
        }
    }
    static async getConnectionPoolHealth(req, res) {
        try {
            const poolHealth = HealthService_1.HealthService.getConnectionPoolHealth();
            const statusCode = poolHealth.healthy ? 200 : 503;
            res.status(statusCode).json({
                success: poolHealth.healthy,
                data: {
                    metrics: HealthService_1.HealthService.getConnectionPoolMetrics(),
                    optimization: HealthService_1.HealthService.getConnectionPoolOptimization(),
                    alerts: HealthService_1.HealthService.getConnectionPoolAlerts(),
                    health: poolHealth,
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Connection pool health check failed', 'health-controller', { error: String(error) });
            res.status(503).json({
                success: false,
                error: 'Connection pool health check failed',
                message: String(error)
            });
        }
    }
    static async getMetrics(req, res) {
        try {
            const metrics = HealthService_1.HealthService.getMetrics();
            res.status(200).json(metrics);
        }
        catch (error) {
            logger_1.logger.error('Metrics retrieval failed', 'health-controller', { error: String(error) });
            res.status(500).json({
                error: 'Failed to retrieve metrics',
                message: String(error)
            });
        }
    }
}
exports.HealthController = HealthController;
//# sourceMappingURL=healthController.js.map