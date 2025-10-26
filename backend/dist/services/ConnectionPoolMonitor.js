"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectionPoolMonitor = exports.ConnectionPoolMonitor = void 0;
const logger_1 = require("../utils/logger");
const database_1 = require("../config/database");
class ConnectionPoolMonitor {
    constructor(pool) {
        this.alerts = [];
        this.monitoringInterval = null;
        this.startTime = Date.now();
        this.connectionErrors = 0;
        this.connectionTimeouts = 0;
        this.totalWaitTime = 0;
        this.waitCount = 0;
        this.THRESHOLDS = {
            UTILIZATION_WARNING: 80,
            UTILIZATION_CRITICAL: 95,
            WAIT_TIME_WARNING: 1000,
            WAIT_TIME_CRITICAL: 5000,
            ERROR_RATE_WARNING: 5,
            ERROR_RATE_CRITICAL: 15,
            IDLE_CONNECTIONS_WARNING: 10,
            IDLE_CONNECTIONS_CRITICAL: 20
        };
        this.pool = pool;
        this.metrics = this.initializeMetrics();
        this.setupEventListeners();
    }
    startMonitoring(intervalMs = 30000) {
        if (this.monitoringInterval) {
            logger_1.logger.warn('Connection pool monitoring already started', 'pool-monitor');
            return;
        }
        logger_1.logger.info('Starting connection pool monitoring', 'pool-monitor', { intervalMs });
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
            this.checkAlerts();
            this.optimizePool();
        }, intervalMs);
    }
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            logger_1.logger.info('Connection pool monitoring stopped', 'pool-monitor');
        }
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getOptimization() {
        const utilization = this.metrics.utilization;
        const avgWaitTime = this.metrics.averageWaitTime;
        const errorRate = this.calculateErrorRate();
        const bottlenecks = [];
        const recommendations = [];
        if (utilization > 90) {
            bottlenecks.push('High connection utilization');
            recommendations.push('Consider increasing max connections');
        }
        if (avgWaitTime > 2000) {
            bottlenecks.push('High connection wait time');
            recommendations.push('Optimize connection timeout settings');
        }
        if (errorRate > 10) {
            bottlenecks.push('High connection error rate');
            recommendations.push('Check database connectivity and configuration');
        }
        if (this.metrics.idleConnections > 15) {
            bottlenecks.push('Too many idle connections');
            recommendations.push('Reduce idle timeout or max connections');
        }
        const performanceScore = Math.max(0, 100 -
            (utilization * 0.3) -
            (Math.min(avgWaitTime / 100, 30)) -
            (errorRate * 2));
        return {
            recommendedMaxConnections: this.calculateOptimalMaxConnections(),
            recommendedIdleTimeout: this.calculateOptimalIdleTimeout(),
            recommendedConnectionTimeout: this.calculateOptimalConnectionTimeout(),
            performanceScore: Math.round(performanceScore),
            bottlenecks,
            recommendations
        };
    }
    getAlerts() {
        return [...this.alerts];
    }
    clearAlerts() {
        this.alerts = [];
    }
    getHealth() {
        const optimization = this.getOptimization();
        const issues = [];
        if (optimization.performanceScore < 70) {
            issues.push('Poor performance score');
        }
        if (this.metrics.utilization > this.THRESHOLDS.UTILIZATION_CRITICAL) {
            issues.push('Critical connection utilization');
        }
        if (this.metrics.averageWaitTime > this.THRESHOLDS.WAIT_TIME_CRITICAL) {
            issues.push('Critical connection wait time');
        }
        if (this.calculateErrorRate() > this.THRESHOLDS.ERROR_RATE_CRITICAL) {
            issues.push('Critical error rate');
        }
        return {
            healthy: issues.length === 0,
            score: optimization.performanceScore,
            issues
        };
    }
    initializeMetrics() {
        return {
            totalConnections: 0,
            idleConnections: 0,
            activeConnections: 0,
            waitingClients: 0,
            utilization: 0,
            averageWaitTime: 0,
            connectionErrors: 0,
            connectionTimeouts: 0,
            lastActivity: new Date(),
            healthScore: 100
        };
    }
    setupEventListeners() {
        this.pool.on('error', (err) => {
            this.connectionErrors++;
            logger_1.logger.error('Pool connection error', 'pool-monitor', { error: err.message });
        });
        this.pool.on('connect', (client) => {
            this.metrics.lastActivity = new Date();
            logger_1.logger.debug('New connection established', 'pool-monitor');
        });
        this.pool.on('acquire', (client) => {
            const startTime = Date.now();
            this.metrics.lastActivity = new Date();
            const waitTime = Date.now() - startTime;
            this.totalWaitTime += waitTime;
            this.waitCount++;
            logger_1.logger.debug('Connection acquired from pool', 'pool-monitor', { waitTime });
        });
        this.pool.on('remove', (client) => {
            this.metrics.lastActivity = new Date();
            logger_1.logger.debug('Connection removed from pool', 'pool-monitor');
        });
    }
    collectMetrics() {
        this.metrics.totalConnections = this.pool.totalCount;
        this.metrics.idleConnections = this.pool.idleCount;
        this.metrics.activeConnections = this.pool.totalCount - this.pool.idleCount;
        this.metrics.waitingClients = this.pool.waitingCount;
        this.metrics.utilization = this.pool.totalCount > 0 ?
            Math.round((this.metrics.activeConnections / this.pool.totalCount) * 100) : 0;
        this.metrics.averageWaitTime = this.waitCount > 0 ?
            Math.round(this.totalWaitTime / this.waitCount) : 0;
        this.metrics.connectionErrors = this.connectionErrors;
        this.metrics.connectionTimeouts = this.connectionTimeouts;
        this.metrics.healthScore = this.calculateHealthScore();
    }
    checkAlerts() {
        if (this.metrics.utilization >= this.THRESHOLDS.UTILIZATION_CRITICAL) {
            this.addAlert('critical', `Critical connection utilization: ${this.metrics.utilization}%`, 'utilization', this.metrics.utilization, this.THRESHOLDS.UTILIZATION_CRITICAL);
        }
        else if (this.metrics.utilization >= this.THRESHOLDS.UTILIZATION_WARNING) {
            this.addAlert('warning', `High connection utilization: ${this.metrics.utilization}%`, 'utilization', this.metrics.utilization, this.THRESHOLDS.UTILIZATION_WARNING);
        }
        if (this.metrics.averageWaitTime >= this.THRESHOLDS.WAIT_TIME_CRITICAL) {
            this.addAlert('critical', `Critical connection wait time: ${this.metrics.averageWaitTime}ms`, 'waitTime', this.metrics.averageWaitTime, this.THRESHOLDS.WAIT_TIME_CRITICAL);
        }
        else if (this.metrics.averageWaitTime >= this.THRESHOLDS.WAIT_TIME_WARNING) {
            this.addAlert('warning', `High connection wait time: ${this.metrics.averageWaitTime}ms`, 'waitTime', this.metrics.averageWaitTime, this.THRESHOLDS.WAIT_TIME_WARNING);
        }
        const errorRate = this.calculateErrorRate();
        if (errorRate >= this.THRESHOLDS.ERROR_RATE_CRITICAL) {
            this.addAlert('critical', `Critical error rate: ${errorRate}%`, 'errorRate', errorRate, this.THRESHOLDS.ERROR_RATE_CRITICAL);
        }
        else if (errorRate >= this.THRESHOLDS.ERROR_RATE_WARNING) {
            this.addAlert('warning', `High error rate: ${errorRate}%`, 'errorRate', errorRate, this.THRESHOLDS.ERROR_RATE_WARNING);
        }
        if (this.metrics.idleConnections >= this.THRESHOLDS.IDLE_CONNECTIONS_CRITICAL) {
            this.addAlert('critical', `Too many idle connections: ${this.metrics.idleConnections}`, 'idleConnections', this.metrics.idleConnections, this.THRESHOLDS.IDLE_CONNECTIONS_CRITICAL);
        }
        else if (this.metrics.idleConnections >= this.THRESHOLDS.IDLE_CONNECTIONS_WARNING) {
            this.addAlert('warning', `High idle connections: ${this.metrics.idleConnections}`, 'idleConnections', this.metrics.idleConnections, this.THRESHOLDS.IDLE_CONNECTIONS_WARNING);
        }
    }
    addAlert(type, message, metric, value, threshold) {
        const alert = {
            type,
            message,
            metric,
            value,
            threshold,
            timestamp: new Date()
        };
        const existingAlert = this.alerts.find(a => a.metric === metric &&
            a.type === type &&
            (Date.now() - a.timestamp.getTime()) < 60000);
        if (!existingAlert) {
            this.alerts.push(alert);
            logger_1.logger.warn(`Pool ${type}: ${message}`, 'pool-monitor', { metric, value, threshold });
        }
    }
    optimizePool() {
        const optimization = this.getOptimization();
        if (optimization.performanceScore < 70) {
            logger_1.logger.info('Pool optimization recommendations', 'pool-monitor', {
                performanceScore: optimization.performanceScore,
                bottlenecks: optimization.bottlenecks,
                recommendations: optimization.recommendations
            });
        }
    }
    calculateErrorRate() {
        const totalConnections = this.pool.totalCount;
        if (totalConnections === 0)
            return 0;
        return Math.round((this.connectionErrors / totalConnections) * 100);
    }
    calculateHealthScore() {
        const utilizationPenalty = Math.min(this.metrics.utilization * 0.5, 30);
        const waitTimePenalty = Math.min(this.metrics.averageWaitTime / 100, 20);
        const errorPenalty = Math.min(this.calculateErrorRate() * 2, 30);
        return Math.max(0, 100 - utilizationPenalty - waitTimePenalty - errorPenalty);
    }
    calculateOptimalMaxConnections() {
        const currentMax = this.pool.options.max || 20;
        const utilization = this.metrics.utilization;
        if (utilization > 90) {
            return Math.min(currentMax * 1.5, 50);
        }
        else if (utilization < 30) {
            return Math.max(currentMax * 0.8, 10);
        }
        return currentMax;
    }
    calculateOptimalIdleTimeout() {
        const currentTimeout = this.pool.options.idleTimeoutMillis || 30000;
        const idleConnections = this.metrics.idleConnections;
        if (idleConnections > 15) {
            return Math.max(currentTimeout * 0.5, 10000);
        }
        else if (idleConnections < 5) {
            return Math.min(currentTimeout * 1.5, 60000);
        }
        return currentTimeout;
    }
    calculateOptimalConnectionTimeout() {
        const currentTimeout = this.pool.options.connectionTimeoutMillis || 10000;
        const avgWaitTime = this.metrics.averageWaitTime;
        if (avgWaitTime > 5000) {
            return Math.min(currentTimeout * 2, 30000);
        }
        else if (avgWaitTime < 1000) {
            return Math.max(currentTimeout * 0.5, 5000);
        }
        return currentTimeout;
    }
}
exports.ConnectionPoolMonitor = ConnectionPoolMonitor;
exports.connectionPoolMonitor = new ConnectionPoolMonitor(database_1.pool);
//# sourceMappingURL=ConnectionPoolMonitor.js.map