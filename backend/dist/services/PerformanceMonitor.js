"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMonitor = void 0;
const perf_hooks_1 = require("perf_hooks");
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.systemMetrics = [];
        this.maxMetricsHistory = 1000;
        this.startTime = Date.now();
        this.lastCpuUsage = process.cpuUsage();
    }
    async trackOperation(operation, fn, metadata) {
        const start = perf_hooks_1.performance.now();
        const startCpu = process.cpuUsage();
        try {
            const result = await fn();
            const end = perf_hooks_1.performance.now();
            const endCpu = process.cpuUsage();
            this.recordMetric({
                timestamp: Date.now(),
                operation,
                duration: end - start,
                memoryUsage: process.memoryUsage(),
                cpuUsage: {
                    user: endCpu.user - startCpu.user,
                    system: endCpu.system - startCpu.system,
                },
                metadata: {
                    ...metadata,
                    success: true,
                },
            });
            return result;
        }
        catch (error) {
            const end = perf_hooks_1.performance.now();
            const endCpu = process.cpuUsage();
            this.recordMetric({
                timestamp: Date.now(),
                operation,
                duration: end - start,
                memoryUsage: process.memoryUsage(),
                cpuUsage: {
                    user: endCpu.user - startCpu.user,
                    system: endCpu.system - startCpu.system,
                },
                metadata: {
                    ...metadata,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            });
            throw error;
        }
    }
    recordMetric(metric) {
        this.metrics.push(metric);
        if (this.metrics.length > this.maxMetricsHistory) {
            this.metrics = this.metrics.slice(-this.maxMetricsHistory);
        }
        if (metric.duration > 1000) {
            console.warn(`🐌 Slow operation detected: ${metric.operation} took ${metric.duration.toFixed(2)}ms`);
        }
    }
    recordSystemMetrics(data) {
        const systemMetric = {
            timestamp: Date.now(),
            memory: process.memoryUsage(),
            uptime: Date.now() - this.startTime,
            activeConnections: data.activeConnections,
            databaseConnections: data.databaseConnections,
            websocketConnections: data.websocketConnections,
        };
        this.systemMetrics.push(systemMetric);
        if (this.systemMetrics.length > 100) {
            this.systemMetrics = this.systemMetrics.slice(-100);
        }
    }
    getPerformanceStats() {
        const recentMetrics = this.metrics.slice(-100);
        const totalOperations = recentMetrics.length;
        if (totalOperations === 0) {
            return {
                totalOperations: 0,
                averageResponseTime: 0,
                slowOperations: [],
                errorRate: 0,
                memoryUsage: process.memoryUsage(),
                uptime: Date.now() - this.startTime,
            };
        }
        const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations;
        const slowOperations = recentMetrics.filter(m => m.duration > 500);
        const errorRate = recentMetrics.filter(m => !m.metadata?.success).length / totalOperations;
        return {
            totalOperations,
            averageResponseTime,
            slowOperations,
            errorRate,
            memoryUsage: process.memoryUsage(),
            uptime: Date.now() - this.startTime,
        };
    }
    getSystemHealth() {
        const latestSystemMetric = this.systemMetrics[this.systemMetrics.length - 1];
        const issues = [];
        if (!latestSystemMetric) {
            return { healthy: true, issues: [], metrics: null };
        }
        const memoryUsagePercent = (latestSystemMetric.memory.heapUsed / latestSystemMetric.memory.heapTotal) * 100;
        if (memoryUsagePercent > 90) {
            issues.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
        }
        if (latestSystemMetric.databaseConnections.waiting > 5) {
            issues.push(`High database connection wait: ${latestSystemMetric.databaseConnections.waiting}`);
        }
        if (latestSystemMetric.uptime > 7 * 24 * 60 * 60 * 1000) {
            issues.push('Server uptime exceeds 7 days - consider restart');
        }
        return {
            healthy: issues.length === 0,
            issues,
            metrics: latestSystemMetric,
        };
    }
    getRecentMetrics(limit = 50) {
        return this.metrics.slice(-limit);
    }
    getSystemMetricsHistory(limit = 20) {
        return this.systemMetrics.slice(-limit);
    }
    clearOldMetrics() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
        this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > oneHourAgo);
    }
}
exports.performanceMonitor = new PerformanceMonitor();
setInterval(() => {
    exports.performanceMonitor.clearOldMetrics();
}, 60 * 60 * 1000);
//# sourceMappingURL=PerformanceMonitor.js.map