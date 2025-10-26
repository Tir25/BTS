"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringService = exports.MonitoringService = void 0;
const logger_1 = require("../utils/logger");
const RedisCacheService_1 = require("./RedisCacheService");
const WebSocketHealthService_1 = require("./WebSocketHealthService");
const ConnectionPoolMonitor_1 = require("./ConnectionPoolMonitor");
class MonitoringService {
    constructor() {
        this.metrics = [];
        this.alerts = [];
        this.alertRules = [];
        this.monitoringInterval = null;
        this.startTime = Date.now();
        this.requestCount = 0;
        this.errorCount = 0;
        this.totalResponseTime = 0;
        this.config = {
            collectionInterval: 30000,
            retentionPeriod: 24 * 60 * 60 * 1000,
            alertCooldown: 300,
            maxAlerts: 1000,
            enableAlerts: true,
            enableMetrics: true
        };
        this.initializeAlertRules();
    }
    start() {
        if (this.monitoringInterval) {
            logger_1.logger.warn('Monitoring already started', 'monitoring');
            return;
        }
        logger_1.logger.info('Starting comprehensive monitoring service', 'monitoring');
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
            this.checkAlerts();
            this.cleanupOldData();
        }, this.config.collectionInterval);
    }
    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            logger_1.logger.info('Monitoring service stopped', 'monitoring');
        }
    }
    getMetrics() {
        return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
    }
    getMetricsHistory(limit = 100) {
        return this.metrics.slice(-limit);
    }
    getActiveAlerts() {
        return this.alerts.filter(alert => !alert.resolved);
    }
    getAllAlerts(limit = 100) {
        return this.alerts.slice(-limit);
    }
    getAlertRules() {
        return [...this.alertRules];
    }
    addAlertRule(rule) {
        const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newRule = { ...rule, id };
        this.alertRules.push(newRule);
        logger_1.logger.info('Alert rule added', 'monitoring', { rule: newRule });
        return id;
    }
    updateAlertRule(id, updates) {
        const index = this.alertRules.findIndex(rule => rule.id === id);
        if (index === -1)
            return false;
        this.alertRules[index] = { ...this.alertRules[index], ...updates };
        logger_1.logger.info('Alert rule updated', 'monitoring', { id, updates });
        return true;
    }
    deleteAlertRule(id) {
        const index = this.alertRules.findIndex(rule => rule.id === id);
        if (index === -1)
            return false;
        this.alertRules.splice(index, 1);
        logger_1.logger.info('Alert rule deleted', 'monitoring', { id });
        return true;
    }
    resolveAlert(id) {
        const alert = this.alerts.find(a => a.id === id);
        if (!alert || alert.resolved)
            return false;
        alert.resolved = true;
        alert.resolvedAt = new Date();
        logger_1.logger.info('Alert resolved', 'monitoring', { id, alert: alert.title });
        return true;
    }
    recordRequest(responseTime, isError = false) {
        this.requestCount++;
        this.totalResponseTime += responseTime;
        if (isError)
            this.errorCount++;
    }
    async getSystemHealth() {
        const activeAlerts = this.getActiveAlerts();
        const criticalAlerts = activeAlerts.filter(a => a.type === 'critical');
        const warningAlerts = activeAlerts.filter(a => a.type === 'warning');
        let overall = 'healthy';
        if (criticalAlerts.length > 0)
            overall = 'critical';
        else if (warningAlerts.length > 0)
            overall = 'degraded';
        const services = {};
        const dbHealth = ConnectionPoolMonitor_1.connectionPoolMonitor.getHealth();
        services.database = dbHealth.healthy ? 'healthy' : 'degraded';
        const redisHealth = await RedisCacheService_1.redisCache.getHealth();
        services.redis = redisHealth.connected ? 'healthy' : 'degraded';
        const wsHealth = WebSocketHealthService_1.webSocketHealth.getHealth();
        services.websocket = wsHealth.connected ? 'healthy' : 'degraded';
        const avgResponseTime = this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0;
        const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
        const throughput = this.requestCount / ((Date.now() - this.startTime) / 1000);
        return {
            overall,
            services,
            alerts: activeAlerts.length,
            uptime: Date.now() - this.startTime,
            performance: {
                responseTime: Math.round(avgResponseTime),
                throughput: Math.round(throughput),
                errorRate: Math.round(errorRate * 100) / 100
            }
        };
    }
    async collectMetrics() {
        try {
            const memoryUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            const eventLoopLag = this.measureEventLoopLag();
            const [dbHealth, redisHealth, wsHealth] = await Promise.allSettled([
                ConnectionPoolMonitor_1.connectionPoolMonitor.getMetrics(),
                RedisCacheService_1.redisCache.getHealth(),
                WebSocketHealthService_1.webSocketHealth.getHealth()
            ]);
            const metrics = {
                timestamp: new Date(),
                uptime: Date.now() - this.startTime,
                memory: {
                    rss: memoryUsage.rss,
                    heapTotal: memoryUsage.heapTotal,
                    heapUsed: memoryUsage.heapUsed,
                    external: memoryUsage.external,
                    arrayBuffers: memoryUsage.arrayBuffers
                },
                cpu: {
                    user: cpuUsage.user,
                    system: cpuUsage.system,
                    usage: this.calculateCpuUsage(cpuUsage)
                },
                eventLoop: {
                    lag: eventLoopLag,
                    utilization: this.calculateEventLoopUtilization()
                },
                database: {
                    poolMetrics: dbHealth.status === 'fulfilled' ? dbHealth.value : null,
                    health: dbHealth.status === 'fulfilled' ? ConnectionPoolMonitor_1.connectionPoolMonitor.getHealth() : null
                },
                redis: {
                    health: redisHealth.status === 'fulfilled' ? redisHealth.value : null,
                    stats: redisHealth.status === 'fulfilled' ? redisHealth.value.stats : null
                },
                websocket: {
                    health: wsHealth.status === 'fulfilled' ? wsHealth.value : null,
                    stats: wsHealth.status === 'fulfilled' ? WebSocketHealthService_1.webSocketHealth.getStats() : null
                },
                performance: {
                    responseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0,
                    throughput: this.requestCount / ((Date.now() - this.startTime) / 1000),
                    errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0
                }
            };
            this.metrics.push(metrics);
            if (this.metrics.length > 1000) {
                this.metrics = this.metrics.slice(-500);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to collect metrics', 'monitoring', { error: String(error) });
        }
    }
    checkAlerts() {
        if (!this.config.enableAlerts)
            return;
        const currentMetrics = this.getMetrics();
        if (!currentMetrics)
            return;
        for (const rule of this.alertRules) {
            if (!rule.enabled)
                continue;
            const value = this.getMetricValue(currentMetrics, rule.metric);
            if (value === null)
                continue;
            const shouldAlert = this.evaluateRule(value, rule.operator, rule.threshold);
            if (!shouldAlert)
                continue;
            const lastAlert = this.alerts.find(a => a.metric === rule.metric &&
                a.type === rule.severity &&
                !a.resolved &&
                (Date.now() - a.timestamp.getTime()) < rule.cooldown * 1000);
            if (lastAlert)
                continue;
            this.createAlert(rule, value);
        }
    }
    createAlert(rule, value) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: rule.severity,
            category: rule.category,
            title: rule.name,
            message: `${rule.metric} is ${rule.operator} ${rule.threshold} (current: ${value})`,
            metric: rule.metric,
            value,
            threshold: rule.threshold,
            timestamp: new Date(),
            resolved: false
        };
        this.alerts.push(alert);
        if (this.alerts.length > this.config.maxAlerts) {
            this.alerts = this.alerts.slice(-this.config.maxAlerts);
        }
        logger_1.logger.warn(`Alert triggered: ${alert.title}`, 'monitoring', {
            type: alert.type,
            category: alert.category,
            metric: alert.metric,
            value: alert.value,
            threshold: alert.threshold
        });
    }
    getMetricValue(metrics, metric) {
        const parts = metric.split('.');
        let value = metrics;
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            }
            else {
                return null;
            }
        }
        return typeof value === 'number' ? value : null;
    }
    evaluateRule(value, operator, threshold) {
        switch (operator) {
            case 'gt': return value > threshold;
            case 'lt': return value < threshold;
            case 'eq': return value === threshold;
            case 'gte': return value >= threshold;
            case 'lte': return value <= threshold;
            default: return false;
        }
    }
    measureEventLoopLag() {
        const start = process.hrtime.bigint();
        setImmediate(() => {
            const lag = Number(process.hrtime.bigint() - start) / 1000000;
            return lag;
        });
        return 0;
    }
    calculateCpuUsage(cpuUsage) {
        return (cpuUsage.user + cpuUsage.system) / 1000000;
    }
    calculateEventLoopUtilization() {
        return 0;
    }
    cleanupOldData() {
        const cutoff = Date.now() - this.config.retentionPeriod;
        this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff);
        this.alerts = this.alerts.filter(a => a.timestamp.getTime() > cutoff);
    }
    initializeAlertRules() {
        const defaultRules = [
            {
                name: 'High Memory Usage',
                category: 'memory',
                metric: 'memory.heapUsed',
                operator: 'gt',
                threshold: 400 * 1024 * 1024,
                severity: 'warning',
                enabled: true,
                cooldown: 300
            },
            {
                name: 'Critical Memory Usage',
                category: 'memory',
                metric: 'memory.heapUsed',
                operator: 'gt',
                threshold: 500 * 1024 * 1024,
                severity: 'critical',
                enabled: true,
                cooldown: 60
            },
            {
                name: 'High Database Pool Utilization',
                category: 'database',
                metric: 'database.poolMetrics.utilization',
                operator: 'gt',
                threshold: 80,
                severity: 'warning',
                enabled: true,
                cooldown: 300
            },
            {
                name: 'Critical Database Pool Utilization',
                category: 'database',
                metric: 'database.poolMetrics.utilization',
                operator: 'gt',
                threshold: 95,
                severity: 'critical',
                enabled: true,
                cooldown: 60
            },
            {
                name: 'High Error Rate',
                category: 'performance',
                metric: 'performance.errorRate',
                operator: 'gt',
                threshold: 5,
                severity: 'warning',
                enabled: true,
                cooldown: 300
            },
            {
                name: 'Critical Error Rate',
                category: 'performance',
                metric: 'performance.errorRate',
                operator: 'gt',
                threshold: 15,
                severity: 'critical',
                enabled: true,
                cooldown: 60
            }
        ];
        defaultRules.forEach(rule => this.addAlertRule(rule));
    }
}
exports.MonitoringService = MonitoringService;
exports.monitoringService = new MonitoringService();
//# sourceMappingURL=MonitoringService.js.map