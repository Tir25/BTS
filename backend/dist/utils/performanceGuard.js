"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceGuard = exports.PerformanceGuard = void 0;
const logger_1 = require("./logger");
const MonitoringService_1 = require("../services/MonitoringService");
const RedisCacheService_1 = require("../services/RedisCacheService");
class PerformanceGuard {
    constructor() {
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.lastGcTime = 0;
        this.gcCooldown = 60000;
        this.thresholds = {
            memoryUsage: 400,
            responseTime: 2000,
            errorRate: 5,
            cacheHitRate: 80,
            databaseConnections: 40
        };
    }
    startMonitoring() {
        if (this.isMonitoring) {
            logger_1.logger.warn('Performance guard already monitoring', 'performance-guard');
            return;
        }
        this.isMonitoring = true;
        logger_1.logger.info('Starting performance guard monitoring', 'performance-guard');
        this.monitoringInterval = setInterval(() => {
            this.checkPerformance();
        }, 30000);
    }
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        logger_1.logger.info('Performance guard monitoring stopped', 'performance-guard');
    }
    async checkPerformance() {
        try {
            const metrics = MonitoringService_1.monitoringService.getMetrics();
            if (!metrics)
                return;
            const actions = [];
            const memoryMB = Math.round(metrics.memory.heapUsed / 1024 / 1024);
            if (memoryMB > this.thresholds.memoryUsage) {
                actions.push({
                    type: 'gc_trigger',
                    description: `High memory usage: ${memoryMB}MB (threshold: ${this.thresholds.memoryUsage}MB)`,
                    severity: memoryMB > 500 ? 'critical' : 'high',
                    autoExecute: true
                });
            }
            if (metrics.performance.responseTime > this.thresholds.responseTime) {
                actions.push({
                    type: 'cache_clear',
                    description: `High response time: ${metrics.performance.responseTime}ms (threshold: ${this.thresholds.responseTime}ms)`,
                    severity: 'medium',
                    autoExecute: true
                });
            }
            if (metrics.performance.errorRate > this.thresholds.errorRate) {
                actions.push({
                    type: 'alert_threshold',
                    description: `High error rate: ${metrics.performance.errorRate}% (threshold: ${this.thresholds.errorRate}%)`,
                    severity: 'high',
                    autoExecute: false
                });
            }
            if (metrics.database.poolMetrics &&
                metrics.database.poolMetrics.totalCount > this.thresholds.databaseConnections) {
                actions.push({
                    type: 'connection_reset',
                    description: `High database connections: ${metrics.database.poolMetrics.totalCount} (threshold: ${this.thresholds.databaseConnections})`,
                    severity: 'medium',
                    autoExecute: false
                });
            }
            for (const action of actions) {
                await this.executePreventiveAction(action);
            }
        }
        catch (error) {
            logger_1.logger.error('Error in performance guard check', 'performance-guard', { error: String(error) });
        }
    }
    async executePreventiveAction(action) {
        try {
            logger_1.logger.warn(`Performance guard action: ${action.description}`, 'performance-guard', {
                type: action.type,
                severity: action.severity,
                autoExecute: action.autoExecute
            });
            switch (action.type) {
                case 'gc_trigger':
                    await this.triggerGarbageCollection();
                    break;
                case 'cache_clear':
                    await this.clearCache();
                    break;
                case 'connection_reset':
                    await this.resetConnections();
                    break;
                case 'alert_threshold':
                    await this.sendAlert(action);
                    break;
            }
        }
        catch (error) {
            logger_1.logger.error('Error executing preventive action', 'performance-guard', {
                action: action.type,
                error: String(error)
            });
        }
    }
    async triggerGarbageCollection() {
        const now = Date.now();
        if (now - this.lastGcTime < this.gcCooldown) {
            logger_1.logger.debug('Garbage collection on cooldown', 'performance-guard');
            return;
        }
        if (global.gc) {
            logger_1.logger.info('Triggering garbage collection', 'performance-guard');
            global.gc();
            this.lastGcTime = now;
            const memoryUsage = process.memoryUsage();
            const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
            logger_1.logger.info('Garbage collection completed', 'performance-guard', { memoryMB });
        }
        else {
            logger_1.logger.warn('Garbage collection not available (run with --expose-gc)', 'performance-guard');
        }
    }
    async clearCache() {
        try {
            logger_1.logger.info('Clearing cache to improve performance', 'performance-guard');
            await RedisCacheService_1.redisCache.clear();
            logger_1.logger.info('Cache cleared successfully', 'performance-guard');
        }
        catch (error) {
            logger_1.logger.error('Error clearing cache', 'performance-guard', { error: String(error) });
        }
    }
    async resetConnections() {
        try {
            logger_1.logger.info('Resetting database connections', 'performance-guard');
            logger_1.logger.info('Database connection reset requested', 'performance-guard');
        }
        catch (error) {
            logger_1.logger.error('Error resetting connections', 'performance-guard', { error: String(error) });
        }
    }
    async sendAlert(action) {
        try {
            logger_1.logger.error('Performance threshold breached', 'performance-guard', {
                action: action.description,
                severity: action.severity,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.logger.error('Error sending alert', 'performance-guard', { error: String(error) });
        }
    }
    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        logger_1.logger.info('Performance thresholds updated', 'performance-guard', { thresholds: this.thresholds });
    }
    getThresholds() {
        return { ...this.thresholds };
    }
    getStatus() {
        return {
            monitoring: this.isMonitoring,
            thresholds: this.thresholds,
            lastGcTime: this.lastGcTime,
            gcCooldown: this.gcCooldown
        };
    }
}
exports.PerformanceGuard = PerformanceGuard;
exports.performanceGuard = new PerformanceGuard();
//# sourceMappingURL=performanceGuard.js.map