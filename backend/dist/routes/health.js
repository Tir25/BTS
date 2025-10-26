"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const RedisCacheService_1 = require("../services/RedisCacheService");
const WebSocketHealthService_1 = require("../services/WebSocketHealthService");
const ConnectionPoolMonitor_1 = require("../services/ConnectionPoolMonitor");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const [databaseHealth, redisHealth, websocketHealth] = await Promise.allSettled([
            (0, database_1.checkDatabaseHealth)(),
            RedisCacheService_1.redisCache.getHealth(),
            Promise.resolve(WebSocketHealthService_1.webSocketHealth.getHealth())
        ]);
        const dbHealthy = databaseHealth.status === 'fulfilled' && databaseHealth.value.healthy;
        const redisHealthy = redisHealth.status === 'fulfilled' && redisHealth.value.connected;
        const websocketHealthy = websocketHealth.status === 'fulfilled' && websocketHealth.value.connected;
        const overallHealthy = dbHealthy && redisHealthy && websocketHealthy;
        const status = {
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
        res.status(overallHealthy ? 200 : 503).json(status);
    }
    catch (error) {
        logger_1.logger.error('Health check failed', 'health', { error: String(error) });
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed'
        });
    }
});
router.get('/detailed', async (req, res) => {
    try {
        const startTime = Date.now();
        const memoryUsage = process.memoryUsage();
        const [databaseHealth, redisHealth, websocketHealth] = await Promise.allSettled([
            (0, database_1.checkDatabaseHealth)(),
            RedisCacheService_1.redisCache.getHealth(),
            Promise.resolve(WebSocketHealthService_1.webSocketHealth.getHealth())
        ]);
        const dbHealthy = databaseHealth.status === 'fulfilled' && databaseHealth.value.healthy;
        const redisHealthy = redisHealth.status === 'fulfilled' && redisHealth.value.connected;
        const websocketHealthy = websocketHealth.status === 'fulfilled' && websocketHealth.value.connected;
        const overallHealthy = dbHealthy && redisHealthy && websocketHealthy;
        const detailedStatus = {
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
                        (databaseHealth.status === 'fulfilled' ? databaseHealth.value.error : null),
                    metrics: databaseHealth.status === 'fulfilled' ? databaseHealth.value.metrics : null
                },
                redis: {
                    status: redisHealthy ? 'connected' : 'disconnected',
                    error: redisHealth.status === 'rejected' ? String(redisHealth.reason) :
                        (redisHealth.status === 'fulfilled' ? redisHealth.value.error : null),
                    latency: redisHealth.status === 'fulfilled' ? `${redisHealth.value.latency}ms` : null,
                    stats: redisHealth.status === 'fulfilled' ? redisHealth.value.stats : null
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
        res.status(overallHealthy ? 200 : 503).json(detailedStatus);
    }
    catch (error) {
        logger_1.logger.error('Detailed health check failed', 'health', { error: String(error) });
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Detailed health check failed'
        });
    }
});
router.get('/ready', async (req, res) => {
    try {
        const [databaseHealth, redisHealth, websocketHealth] = await Promise.allSettled([
            (0, database_1.checkDatabaseHealth)(),
            RedisCacheService_1.redisCache.getHealth(),
            Promise.resolve(WebSocketHealthService_1.webSocketHealth.getHealth())
        ]);
        const dbHealthy = databaseHealth.status === 'fulfilled' && databaseHealth.value.healthy;
        const redisHealthy = redisHealth.status === 'fulfilled' && redisHealth.value.connected;
        const websocketHealthy = websocketHealth.status === 'fulfilled' && websocketHealth.value.connected;
        if (dbHealthy && redisHealthy && websocketHealthy) {
            res.status(200).json({
                status: 'ready',
                timestamp: new Date().toISOString(),
                services: {
                    database: 'ready',
                    redis: 'ready',
                    websocket: 'ready'
                }
            });
        }
        else {
            const reasons = [];
            if (!dbHealthy)
                reasons.push('Database not available');
            if (!redisHealthy)
                reasons.push('Redis not available');
            if (!websocketHealthy)
                reasons.push('WebSocket not available');
            res.status(503).json({
                status: 'not ready',
                timestamp: new Date().toISOString(),
                reason: reasons.join(', '),
                services: {
                    database: dbHealthy ? 'ready' : 'not ready',
                    redis: redisHealthy ? 'ready' : 'not ready',
                    websocket: websocketHealthy ? 'ready' : 'not ready'
                }
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Readiness check failed', 'health', { error: String(error) });
        res.status(503).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            error: 'Readiness check failed'
        });
    }
});
router.get('/live', (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
router.get('/websocket', (req, res) => {
    try {
        const health = WebSocketHealthService_1.webSocketHealth.getHealth();
        const stats = WebSocketHealthService_1.webSocketHealth.getStats();
        res.status(health.connected ? 200 : 503).json({
            success: health.connected,
            data: {
                health,
                stats,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('WebSocket health check failed', 'health', { error: String(error) });
        res.status(503).json({
            success: false,
            error: 'WebSocket health check failed',
            message: String(error)
        });
    }
});
router.get('/pool', (req, res) => {
    try {
        const metrics = ConnectionPoolMonitor_1.connectionPoolMonitor.getMetrics();
        const optimization = ConnectionPoolMonitor_1.connectionPoolMonitor.getOptimization();
        const alerts = ConnectionPoolMonitor_1.connectionPoolMonitor.getAlerts();
        const health = ConnectionPoolMonitor_1.connectionPoolMonitor.getHealth();
        res.status(health.healthy ? 200 : 503).json({
            success: health.healthy,
            data: {
                metrics,
                optimization,
                alerts,
                health,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Connection pool health check failed', 'health', { error: String(error) });
        res.status(503).json({
            success: false,
            error: 'Connection pool health check failed',
            message: String(error)
        });
    }
});
router.get('/metrics', (req, res) => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const websocketStats = WebSocketHealthService_1.webSocketHealth.getStats();
    const metrics = {
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
    res.status(200).json(metrics);
});
exports.default = router;
//# sourceMappingURL=health.js.map