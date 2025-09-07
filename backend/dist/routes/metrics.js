"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PerformanceMonitor_1 = require("../services/PerformanceMonitor");
const database_1 = require("../config/database");
const optimizeDatabase_1 = require("../scripts/optimizeDatabase");
const router = (0, express_1.Router)();
router.get('/performance', async (req, res) => {
    try {
        const stats = PerformanceMonitor_1.performanceMonitor.getPerformanceStats();
        const health = PerformanceMonitor_1.performanceMonitor.getSystemHealth();
        res.json({
            success: true,
            data: {
                performance: stats,
                health,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        console.error('❌ Error getting performance metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get performance metrics',
        });
    }
});
router.get('/system', async (req, res) => {
    try {
        const systemMetrics = PerformanceMonitor_1.performanceMonitor.getSystemMetricsHistory(10);
        const health = PerformanceMonitor_1.performanceMonitor.getSystemHealth();
        res.json({
            success: true,
            data: {
                systemMetrics,
                health,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        console.error('❌ Error getting system metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get system metrics',
        });
    }
});
router.get('/operations', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const recentMetrics = PerformanceMonitor_1.performanceMonitor.getRecentMetrics(limit);
        res.json({
            success: true,
            data: {
                operations: recentMetrics,
                count: recentMetrics.length,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        console.error('❌ Error getting recent operations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get recent operations',
        });
    }
});
router.get('/database', async (req, res) => {
    try {
        const dbStats = {
            totalCount: database_1.pool.totalCount,
            idleCount: database_1.pool.idleCount,
            waitingCount: database_1.pool.waitingCount,
        };
        res.json({
            success: true,
            data: {
                connections: dbStats,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        console.error('❌ Error getting database stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get database stats',
        });
    }
});
router.get('/health', async (req, res) => {
    try {
        const health = PerformanceMonitor_1.performanceMonitor.getSystemHealth();
        const performance = PerformanceMonitor_1.performanceMonitor.getPerformanceStats();
        const overallHealth = {
            healthy: health.healthy && performance.errorRate < 0.1,
            issues: [...health.issues],
            performance: {
                averageResponseTime: performance.averageResponseTime,
                errorRate: performance.errorRate,
                uptime: performance.uptime,
            },
            timestamp: new Date().toISOString(),
        };
        if (performance.errorRate >= 0.1) {
            overallHealth.issues.push(`High error rate: ${(performance.errorRate * 100).toFixed(1)}%`);
        }
        res.json({
            success: true,
            data: overallHealth,
        });
    }
    catch (error) {
        console.error('❌ Error getting health status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get health status',
        });
    }
});
router.post('/optimize-database', async (req, res) => {
    try {
        console.log('🔄 Starting database optimization...');
        const result = await optimizeDatabase_1.databaseOptimizer.optimizeDatabase();
        res.json({
            success: result.success,
            data: result,
            message: result.success
                ? 'Database optimization completed successfully'
                : 'Database optimization completed with some failures',
        });
    }
    catch (error) {
        console.error('❌ Error optimizing database:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to optimize database',
        });
    }
});
router.get('/database-indexes', async (req, res) => {
    try {
        const indexStatus = await optimizeDatabase_1.databaseOptimizer.getIndexStatus();
        res.json({
            success: true,
            data: indexStatus,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error getting database index status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get database index status',
        });
    }
});
router.get('/database-optimization', async (req, res) => {
    try {
        const optimizationStats = (0, database_1.getOptimizationStats)();
        res.json({
            success: true,
            data: optimizationStats,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error getting database optimization metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get database optimization metrics',
        });
    }
});
exports.default = router;
//# sourceMappingURL=metrics.js.map