"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryCache = void 0;
class QueryCache {
    constructor(config = {}) {
        this.cache = new Map();
        this.preparedStatements = new Map();
        this.cleanupTimer = null;
        this.accessTimes = [];
        this.config = {
            maxSize: 1000,
            ttl: 300000,
            cleanupInterval: 60000,
            enableMetrics: true,
            ...config,
        };
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0,
            size: 0,
            hitRate: 0,
            averageAccessTime: 0,
        };
        this.startCleanupTimer();
    }
    generateKey(query, params = []) {
        const normalizedQuery = query.trim().replace(/\s+/g, ' ');
        const paramsString = JSON.stringify(params);
        return `${normalizedQuery}:${paramsString}`;
    }
    get(query, params = []) {
        const startTime = Date.now();
        const key = this.generateKey(query, params);
        const entry = this.cache.get(key);
        if (!entry) {
            this.metrics.misses++;
            this.updateMetrics();
            return null;
        }
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.metrics.misses++;
            this.updateMetrics();
            return null;
        }
        entry.hits++;
        entry.lastAccessed = Date.now();
        this.metrics.hits++;
        this.accessTimes.push(Date.now() - startTime);
        if (this.accessTimes.length > 100) {
            this.accessTimes.shift();
        }
        this.updateMetrics();
        return entry.data;
    }
    set(query, params = [], data, customTtl) {
        const key = this.generateKey(query, params);
        const ttl = customTtl || this.config.ttl;
        if (this.cache.size >= this.config.maxSize) {
            this.evictLeastRecentlyUsed();
        }
        const entry = {
            key,
            data,
            timestamp: Date.now(),
            ttl,
            hits: 0,
            lastAccessed: Date.now(),
        };
        this.cache.set(key, entry);
        this.updateMetrics();
    }
    evictLeastRecentlyUsed() {
        let oldestKey = '';
        let oldestTime = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.metrics.evictions++;
        }
    }
    invalidate(pattern) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => {
            this.cache.delete(key);
            this.metrics.evictions++;
        });
        this.updateMetrics();
    }
    clear() {
        this.cache.clear();
        this.metrics.evictions += this.metrics.size;
        this.updateMetrics();
    }
    updateMetrics() {
        this.metrics.size = this.cache.size;
        this.metrics.hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0;
        this.metrics.averageAccessTime = this.accessTimes.length > 0
            ? this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length
            : 0;
    }
    getMetrics() {
        return { ...this.metrics };
    }
    startCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }
    cleanup() {
        const now = Date.now();
        const keysToDelete = [];
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => {
            this.cache.delete(key);
            this.metrics.evictions++;
        });
        if (keysToDelete.length > 0) {
            console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
            this.updateMetrics();
        }
    }
    prepareStatement(id, query, params = []) {
        const statement = {
            id,
            query,
            params,
            compiled: false,
            lastUsed: Date.now(),
            useCount: 0,
        };
        this.preparedStatements.set(id, statement);
        return statement;
    }
    getPreparedStatement(id) {
        const statement = this.preparedStatements.get(id);
        if (statement) {
            statement.lastUsed = Date.now();
            statement.useCount++;
        }
        return statement || null;
    }
    async executePreparedStatement(id, params = [], executor, cacheKey) {
        const statement = this.getPreparedStatement(id);
        if (!statement) {
            throw new Error(`Prepared statement '${id}' not found`);
        }
        const cacheKeyToUse = cacheKey || this.generateKey(statement.query, params);
        const cached = this.get(statement.query, params);
        if (cached !== null) {
            return cached;
        }
        const result = await executor(statement.query, params);
        this.set(statement.query, params, result);
        return result;
    }
    getPreparedStatementStats() {
        return Array.from(this.preparedStatements.values()).map(stmt => ({
            id: stmt.id,
            useCount: stmt.useCount,
            lastUsed: stmt.lastUsed,
        }));
    }
    clearPreparedStatements() {
        this.preparedStatements.clear();
    }
    getCacheStats() {
        const entries = Array.from(this.cache.values());
        const topQueries = entries
            .sort((a, b) => b.hits - a.hits)
            .slice(0, 10)
            .map(entry => ({ key: entry.key, hits: entry.hits }));
        return {
            totalEntries: this.cache.size,
            totalHits: this.metrics.hits,
            totalMisses: this.metrics.misses,
            hitRate: this.metrics.hitRate,
            averageAccessTime: this.metrics.averageAccessTime,
            topQueries,
        };
    }
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.cache.clear();
        this.preparedStatements.clear();
        this.accessTimes = [];
    }
}
exports.queryCache = new QueryCache();
//# sourceMappingURL=QueryCache.js.map