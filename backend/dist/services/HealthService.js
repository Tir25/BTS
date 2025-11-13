"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const database_1 = require("../config/database");
const RedisCacheService_1 = require("./RedisCacheService");
const WebSocketHealthService_1 = require("./WebSocketHealthService");
const ConnectionPoolMonitor_1 = require("./ConnectionPoolMonitor");
const logger_1 = require("../utils/logger");
const withTimeout = (promise, timeoutMs, errorMessage) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs))
    ]);
};
class HealthService {
    static async getBasicHealth() {
        try {
            const [databaseHealth, redisHealth, websocketHealth] = await Promise.allSettled([
                withTimeout((0, database_1.checkDatabaseHealth)(), this.HEALTH_CHECK_TIMEOUT, 'Database health check timeout').catch(err => ({ healthy: false, error: err.message })),
                withTimeout(RedisCacheService_1.redisCache.getHealth(), this.HEALTH_CHECK_TIMEOUT, 'Redis health check timeout').catch(err => ({ connected: false, error: err.message })),
                Promise.resolve(WebSocketHealthService_1.webSocketHealth.getHealth())
            ]);
            const dbHealthy = databaseHealth.status === 'fulfilled' && databaseHealth.value.healthy;
            const redisHealthy = redisHealth.status === 'fulfilled' && redisHealth.value.connected;
            const websocketHealthy = websocketHealth.status === 'fulfilled' && websocketHealth.value.connected;
            const overallHealthy = dbHealthy && redisHealthy && websocketHealthy;
            return {
                status: overallHealthy ? 'healthy' : 'degraded',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
                version: process.env.npm_package_version || '1.0.0',
                services: {
                    database: dbHealthy ? 'connected' : 'disconnected',
                    redis: redisHealthy ? 'connected' : 'disconnected',
                    websocket: websocketHealthy ? 'connected' : 'disconnected'
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getBasicHealth', 'health-service', { error: String(error) });
            throw error;
        }
    }
    static async getDetailedHealth() {
        try {
            const startTime = Date.now();
            const memoryUsage = process.memoryUsage();
            const [databaseHealth, redisHealth, websocketHealth] = await Promise.allSettled([
                withTimeout((0, database_1.checkDatabaseHealth)(), this.HEALTH_CHECK_TIMEOUT, 'Database health check timeout').catch(err => ({ healthy: false, error: err.message })),
                withTimeout(RedisCacheService_1.redisCache.getHealth(), this.HEALTH_CHECK_TIMEOUT, 'Redis health check timeout').catch(err => ({ connected: false, error: err.message })),
                Promise.resolve(WebSocketHealthService_1.webSocketHealth.getHealth())
            ]);
            const dbHealthy = databaseHealth.status === 'fulfilled' && databaseHealth.value.healthy;
            const redisHealthy = redisHealth.status === 'fulfilled' && redisHealth.value.connected;
            const websocketHealthy = websocketHealth.status === 'fulfilled' && websocketHealth.value.connected;
            const overallHealthy = dbHealthy && redisHealthy && websocketHealthy;
            return {
                status: overallHealthy ? 'healthy' : 'degraded',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
                version: process.env.npm_package_version || '1.0.0',
                system: {
                    platform: process.platform,
                    arch: process.arch,
                    nodeVersion: process.version,
                    pid: process.pid
                },
                memory: {
                    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
                    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
                    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                    external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
                },
                services: {
                    database: {
                        status: dbHealthy ? 'connected' : 'disconnected',
                        error: databaseHealth.status === 'rejected' ? String(databaseHealth.reason) :
                            (databaseHealth.status === 'fulfilled' && 'error' in databaseHealth.value ? databaseHealth.value.error : null),
                        metrics: databaseHealth.status === 'fulfilled' && 'metrics' in databaseHealth.value ? databaseHealth.value.metrics : null
                    },
                    redis: {
                        status: redisHealthy ? 'connected' : 'disconnected',
                        error: redisHealth.status === 'rejected' ? String(redisHealth.reason) :
                            (redisHealth.status === 'fulfilled' && 'error' in redisHealth.value ? redisHealth.value.error : null),
                        latency: redisHealth.status === 'fulfilled' && 'latency' in redisHealth.value ? `${redisHealth.value.latency}ms` : null,
                        stats: redisHealth.status === 'fulfilled' && 'stats' in redisHealth.value ? redisHealth.value.stats : null
                    },
                    websocket: {
                        status: websocketHealthy ? 'connected' : 'disconnected',
                        activeConnections: websocketHealth.status === 'fulfilled' ? websocketHealth.value.activeConnections : 0,
                        driverConnections: websocketHealth.status === 'fulfilled' ? websocketHealth.value.driverConnections : 0,
                        studentConnections: websocketHealth.status === 'fulfilled' ? websocketHealth.value.studentConnections : 0,
                        adminConnections: websocketHealth.status === 'fulfilled' ? websocketHealth.value.adminConnections : 0,
                        errorRate: websocketHealth.status === 'fulfilled' ? `${websocketHealth.value.errorRate}%` : '0%',
                        uptime: websocketHealth.status === 'fulfilled' ? `${websocketHealth.value.uptime}s` : '0s',
                        performance: websocketHealth.status === 'fulfilled' ? websocketHealth.value.performance : null
                    }
                },
                responseTime: `${Date.now() - startTime}ms`
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getDetailedHealth', 'health-service', { error: String(error) });
            throw error;
        }
    }
    static async getReadiness() {
        try {
            const [databaseHealth, redisHealth, websocketHealth] = await Promise.allSettled([
                withTimeout((0, database_1.checkDatabaseHealth)(), this.HEALTH_CHECK_TIMEOUT, 'Database health check timeout').catch(err => ({ healthy: false, error: err.message })),
                withTimeout(RedisCacheService_1.redisCache.getHealth(), this.HEALTH_CHECK_TIMEOUT, 'Redis health check timeout').catch(err => ({ connected: false, error: err.message })),
                Promise.resolve(WebSocketHealthService_1.webSocketHealth.getHealth())
            ]);
            const dbHealthy = databaseHealth.status === 'fulfilled' && databaseHealth.value.healthy;
            const redisHealthy = redisHealth.status === 'fulfilled' && redisHealth.value.connected;
            const websocketHealthy = websocketHealth.status === 'fulfilled' && websocketHealth.value.connected;
            if (dbHealthy && redisHealthy && websocketHealthy) {
                return {
                    status: 'ready',
                    timestamp: new Date().toISOString(),
                    services: {
                        database: 'ready',
                        redis: 'ready',
                        websocket: 'ready'
                    }
                };
            }
            else {
                const reasons = [];
                if (!dbHealthy)
                    reasons.push('Database not available');
                if (!redisHealthy)
                    reasons.push('Redis not available');
                if (!websocketHealthy)
                    reasons.push('WebSocket not available');
                return {
                    status: 'not ready',
                    timestamp: new Date().toISOString(),
                    reason: reasons.join(', '),
                    services: {
                        database: dbHealthy ? 'ready' : 'not ready',
                        redis: redisHealthy ? 'ready' : 'not ready',
                        websocket: websocketHealthy ? 'ready' : 'not ready'
                    }
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error in getReadiness', 'health-service', { error: String(error) });
            throw error;
        }
    }
    static getLiveness() {
        return {
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
    }
    static getWebSocketHealth() {
        return WebSocketHealthService_1.webSocketHealth.getHealth();
    }
    static getWebSocketStats() {
        return WebSocketHealthService_1.webSocketHealth.getStats();
    }
    static getConnectionPoolHealth() {
        return ConnectionPoolMonitor_1.connectionPoolMonitor.getHealth();
    }
    static getConnectionPoolMetrics() {
        return ConnectionPoolMonitor_1.connectionPoolMonitor.getMetrics();
    }
    static getConnectionPoolOptimization() {
        return ConnectionPoolMonitor_1.connectionPoolMonitor.getOptimization();
    }
    static getConnectionPoolAlerts() {
        return ConnectionPoolMonitor_1.connectionPoolMonitor.getAlerts();
    }
    static getMetrics() {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        const websocketStats = WebSocketHealthService_1.webSocketHealth.getStats();
        return {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                rss: memoryUsage.rss,
                heapTotal: memoryUsage.heapTotal,
                heapUsed: memoryUsage.heapUsed,
                external: memoryUsage.external
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            eventLoop: {
                lag: process.hrtime.bigint()
            },
            websocket: websocketStats
        };
    }
}
exports.HealthService = HealthService;
HealthService.HEALTH_CHECK_TIMEOUT = 2000;
//# sourceMappingURL=HealthService.js.map