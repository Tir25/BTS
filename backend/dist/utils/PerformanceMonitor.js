"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMiddleware = exports.performanceMonitor = void 0;
const logger_1 = require("./logger");
class PerformanceMonitor {
    constructor() {
        this.startTime = Date.now();
        this.metrics = {
            requestCount: 0,
            averageResponseTime: 0,
            slowRequests: 0,
            errorRate: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            uptime: 0,
        };
        this.requestMetrics = [];
    }
    static getInstance() {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }
    recordRequest(method, path, responseTime, statusCode) {
        const requestMetric = {
            method,
            path,
            responseTime,
            statusCode,
            timestamp: Date.now(),
        };
        this.requestMetrics.push(requestMetric);
        this.metrics.requestCount++;
        if (this.requestMetrics.length > 1000) {
            this.requestMetrics.shift();
        }
        this.updateMetrics();
        if (responseTime > 1000) {
            logger_1.logger.warn('Slow request detected', 'performance-monitor', {
                method,
                path,
                responseTime,
                statusCode,
            });
        }
    }
    updateMetrics() {
        if (this.requestMetrics.length === 0)
            return;
        const totalResponseTime = this.requestMetrics.reduce((sum, req) => sum + req.responseTime, 0);
        this.metrics.averageResponseTime = totalResponseTime / this.requestMetrics.length;
        this.metrics.slowRequests = this.requestMetrics.filter(req => req.responseTime > 1000).length;
        const errorCount = this.requestMetrics.filter(req => req.statusCode >= 400).length;
        this.metrics.errorRate = (errorCount / this.requestMetrics.length) * 100;
        this.metrics.uptime = Date.now() - this.startTime;
        const memUsage = process.memoryUsage();
        this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024;
    }
    getMetrics() {
        this.updateMetrics();
        return { ...this.metrics };
    }
    getRequestMetrics(startTime, endTime) {
        const start = startTime || 0;
        const end = endTime || Date.now();
        return this.requestMetrics.filter(req => req.timestamp >= start && req.timestamp <= end);
    }
    getPerformanceReport() {
        this.updateMetrics();
        const recommendations = [];
        let healthScore = 100;
        if (this.metrics.averageResponseTime > 500) {
            recommendations.push('Consider optimizing database queries or adding caching');
            healthScore -= 20;
        }
        if (this.metrics.slowRequests > this.metrics.requestCount * 0.1) {
            recommendations.push('High number of slow requests detected - investigate bottlenecks');
            healthScore -= 15;
        }
        if (this.metrics.errorRate > 5) {
            recommendations.push('High error rate detected - review error handling');
            healthScore -= 25;
        }
        if (this.metrics.memoryUsage > 500) {
            recommendations.push('High memory usage - consider memory optimization');
            healthScore -= 10;
        }
        return {
            metrics: this.metrics,
            recommendations,
            healthScore: Math.max(0, healthScore),
        };
    }
    reset() {
        this.metrics = {
            requestCount: 0,
            averageResponseTime: 0,
            slowRequests: 0,
            errorRate: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            uptime: 0,
        };
        this.requestMetrics = [];
        this.startTime = Date.now();
    }
    getTopSlowEndpoints(limit = 10) {
        const endpointMetrics = new Map();
        this.requestMetrics.forEach(req => {
            const key = `${req.method} ${req.path}`;
            const existing = endpointMetrics.get(key);
            if (existing) {
                existing.totalTime += req.responseTime;
                existing.count++;
            }
            else {
                endpointMetrics.set(key, { totalTime: req.responseTime, count: 1 });
            }
        });
        return Array.from(endpointMetrics.entries())
            .map(([key, metrics]) => {
            const [method, path] = key.split(' ', 2);
            return {
                method,
                path,
                averageResponseTime: metrics.totalTime / metrics.count,
                requestCount: metrics.count,
            };
        })
            .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
            .slice(0, limit);
    }
}
exports.performanceMonitor = PerformanceMonitor.getInstance();
const performanceMiddleware = (req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        exports.performanceMonitor.recordRequest(req.method, req.path, responseTime, res.statusCode);
    });
    next();
};
exports.performanceMiddleware = performanceMiddleware;
//# sourceMappingURL=PerformanceMonitor.js.map