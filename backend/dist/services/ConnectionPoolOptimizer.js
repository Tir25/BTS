"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectionPoolOptimizer = void 0;
const database_1 = require("../config/database");
class ConnectionPoolOptimizer {
    constructor(poolInstance = database_1.pool) {
        this.queryStats = new Map();
        this.monitoringInterval = null;
        this.isMonitoring = false;
        this.pool = poolInstance;
        this.metrics = {
            totalConnections: 0,
            idleConnections: 0,
            waitingClients: 0,
            activeConnections: 0,
            averageWaitTime: 0,
            averageQueryTime: 0,
            connectionUtilization: 0,
            errorRate: 0,
        };
    }
    startMonitoring(intervalMs = 30000) {
        if (this.isMonitoring) {
            return;
        }
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.updateMetrics();
            this.optimizePool();
        }, intervalMs);
        console.log('📊 Connection pool monitoring started');
    }
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        console.log('📊 Connection pool monitoring stopped');
    }
    updateMetrics() {
        this.metrics = {
            totalConnections: this.pool.totalCount,
            idleConnections: this.pool.idleCount,
            waitingClients: this.pool.waitingCount,
            activeConnections: this.pool.totalCount - this.pool.idleCount,
            averageWaitTime: this.calculateAverageWaitTime(),
            averageQueryTime: this.calculateAverageQueryTime(),
            connectionUtilization: this.calculateConnectionUtilization(),
            errorRate: this.calculateErrorRate(),
        };
    }
    calculateAverageWaitTime() {
        return 0;
    }
    calculateAverageQueryTime() {
        const stats = Array.from(this.queryStats.values());
        if (stats.length === 0)
            return 0;
        const totalTime = stats.reduce((sum, stat) => sum + stat.totalTime, 0);
        const totalCount = stats.reduce((sum, stat) => sum + stat.count, 0);
        return totalCount > 0 ? totalTime / totalCount : 0;
    }
    calculateConnectionUtilization() {
        if (this.pool.totalCount === 0)
            return 0;
        return (this.pool.totalCount - this.pool.idleCount) / this.pool.totalCount;
    }
    calculateErrorRate() {
        const stats = Array.from(this.queryStats.values());
        if (stats.length === 0)
            return 0;
        const totalErrors = stats.reduce((sum, stat) => sum + stat.errorCount, 0);
        const totalQueries = stats.reduce((sum, stat) => sum + stat.count, 0);
        return totalQueries > 0 ? totalErrors / totalQueries : 0;
    }
    optimizePool() {
        const config = this.pool.options;
        const utilization = this.metrics.connectionUtilization;
        const waitTime = this.metrics.averageWaitTime;
        const errorRate = this.metrics.errorRate;
        if (utilization > 0.8 && waitTime > 1000) {
            this.suggestPoolSizeIncrease();
        }
        else if (utilization < 0.3 && this.pool.totalCount > 5) {
            this.suggestPoolSizeDecrease();
        }
        if (errorRate > 0.05) {
            this.suggestTimeoutIncrease();
        }
        this.logOptimizationSuggestions();
    }
    suggestPoolSizeIncrease() {
        const currentMax = this.pool.options.max || 20;
        const suggestedMax = Math.min(currentMax + 5, 50);
        console.log(`💡 Pool optimization: Consider increasing max connections from ${currentMax} to ${suggestedMax}`);
    }
    suggestPoolSizeDecrease() {
        const currentMax = this.pool.options.max || 20;
        const suggestedMax = Math.max(currentMax - 2, 5);
        console.log(`💡 Pool optimization: Consider decreasing max connections from ${currentMax} to ${suggestedMax}`);
    }
    suggestTimeoutIncrease() {
        console.log('💡 Pool optimization: Consider increasing connection timeouts due to high error rate');
    }
    logOptimizationSuggestions() {
        const suggestions = [];
        if (this.metrics.connectionUtilization > 0.9) {
            suggestions.push('High connection utilization - consider scaling');
        }
        if (this.metrics.averageWaitTime > 2000) {
            suggestions.push('Long wait times - consider increasing pool size');
        }
        if (this.metrics.errorRate > 0.1) {
            suggestions.push('High error rate - check connection stability');
        }
        if (suggestions.length > 0) {
            console.log('🔧 Pool optimization suggestions:', suggestions);
        }
    }
    trackQuery(query, startTime, endTime, error) {
        const duration = endTime - startTime;
        const normalizedQuery = this.normalizeQuery(query);
        const existing = this.queryStats.get(normalizedQuery);
        if (existing) {
            existing.count++;
            existing.totalTime += duration;
            existing.averageTime = existing.totalTime / existing.count;
            existing.minTime = Math.min(existing.minTime, duration);
            existing.maxTime = Math.max(existing.maxTime, duration);
            if (error) {
                existing.errorCount++;
            }
        }
        else {
            this.queryStats.set(normalizedQuery, {
                query: normalizedQuery,
                count: 1,
                totalTime: duration,
                averageTime: duration,
                minTime: duration,
                maxTime: duration,
                errorCount: error ? 1 : 0,
            });
        }
    }
    normalizeQuery(query) {
        return query
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/\$\d+/g, '$?')
            .toLowerCase();
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getQueryStats() {
        return Array.from(this.queryStats.values()).sort((a, b) => b.count - a.count);
    }
    getSlowQueries(threshold = 1000) {
        return Array.from(this.queryStats.values())
            .filter(stat => stat.averageTime > threshold)
            .sort((a, b) => b.averageTime - a.averageTime);
    }
    getMostFrequentQueries(limit = 10) {
        return Array.from(this.queryStats.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
    getQueriesWithErrors() {
        return Array.from(this.queryStats.values())
            .filter(stat => stat.errorCount > 0)
            .sort((a, b) => b.errorCount - a.errorCount);
    }
    async executeQuery(query, params = [], client) {
        const startTime = Date.now();
        try {
            const result = client
                ? await client.query(query, params)
                : await this.pool.query(query, params);
            const endTime = Date.now();
            this.trackQuery(query, startTime, endTime);
            return result.rows;
        }
        catch (error) {
            const endTime = Date.now();
            this.trackQuery(query, startTime, endTime, error);
            throw error;
        }
    }
    async getConnection(timeoutMs = 10000) {
        const startTime = Date.now();
        try {
            const client = await Promise.race([
                this.pool.connect(),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Connection timeout')), timeoutMs);
                })
            ]);
            const endTime = Date.now();
            console.log(`🔗 Connection acquired in ${endTime - startTime}ms`);
            return client;
        }
        catch (error) {
            const endTime = Date.now();
            console.error(`❌ Failed to acquire connection after ${endTime - startTime}ms:`, error);
            throw error;
        }
    }
    async healthCheck() {
        const issues = [];
        let healthy = true;
        if (this.metrics.connectionUtilization > 0.95) {
            issues.push('Very high connection utilization');
            healthy = false;
        }
        if (this.metrics.averageWaitTime > 5000) {
            issues.push('Long connection wait times');
            healthy = false;
        }
        if (this.metrics.errorRate > 0.1) {
            issues.push('High error rate');
            healthy = false;
        }
        try {
            const client = await this.getConnection(5000);
            await client.query('SELECT 1');
            client.release();
        }
        catch (error) {
            issues.push('Connection test failed');
            healthy = false;
        }
        return {
            healthy,
            metrics: this.metrics,
            issues,
        };
    }
    resetStats() {
        this.queryStats.clear();
        this.metrics = {
            totalConnections: 0,
            idleConnections: 0,
            waitingClients: 0,
            activeConnections: 0,
            averageWaitTime: 0,
            averageQueryTime: 0,
            connectionUtilization: 0,
            errorRate: 0,
        };
    }
    destroy() {
        this.stopMonitoring();
        this.queryStats.clear();
    }
}
exports.connectionPoolOptimizer = new ConnectionPoolOptimizer();
//# sourceMappingURL=ConnectionPoolOptimizer.js.map