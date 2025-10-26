"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inMemoryCache = exports.InMemoryCacheService = void 0;
const logger_1 = require("../utils/logger");
class InMemoryCacheService {
    constructor() {
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
            hitRate: 0,
            totalOperations: 0
        };
        this.isConnected = true;
        this.cleanupInterval = null;
        this.memoryUsage = { used: 0, peak: 0 };
        this.startCleanupInterval();
        logger_1.logger.info('In-memory cache service initialized', 'in-memory-cache');
    }
    async connect() {
        this.isConnected = true;
        logger_1.logger.info('In-memory cache service connected', 'in-memory-cache');
    }
    async disconnect() {
        this.isConnected = false;
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.cache.clear();
        logger_1.logger.info('In-memory cache service disconnected', 'in-memory-cache');
    }
    async get(key) {
        try {
            if (!this.isConnected) {
                this.stats.misses++;
                return null;
            }
            const item = this.cache.get(key);
            if (!item) {
                this.stats.misses++;
                this.updateHitRate();
                return null;
            }
            if (Date.now() > item.expiresAt) {
                this.cache.delete(key);
                this.stats.misses++;
                this.updateHitRate();
                return null;
            }
            this.stats.hits++;
            this.updateHitRate();
            return item.value;
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('In-memory cache GET error', 'in-memory-cache', { key, error: String(error) });
            return null;
        }
    }
    async set(key, value, options = {}) {
        try {
            if (!this.isConnected) {
                return false;
            }
            const { ttl = 3600, tags = [] } = options;
            const expiresAt = Date.now() + (ttl * 1000);
            this.cache.set(key, {
                value,
                expiresAt,
                tags
            });
            this.stats.sets++;
            this.updateHitRate();
            this.updateMemoryUsage();
            logger_1.logger.debug('In-memory cache SET successful', 'in-memory-cache', { key, ttl, tags });
            return true;
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('In-memory cache SET error', 'in-memory-cache', { key, error: String(error) });
            return false;
        }
    }
    async delete(key) {
        try {
            if (!this.isConnected) {
                return false;
            }
            const result = this.cache.delete(key);
            this.stats.deletes++;
            this.updateHitRate();
            this.updateMemoryUsage();
            return result;
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('In-memory cache DELETE error', 'in-memory-cache', { key, error: String(error) });
            return false;
        }
    }
    async deleteMany(keys) {
        try {
            if (!this.isConnected || keys.length === 0) {
                return 0;
            }
            let deletedCount = 0;
            for (const key of keys) {
                if (this.cache.delete(key)) {
                    deletedCount++;
                }
            }
            this.stats.deletes += deletedCount;
            this.updateHitRate();
            this.updateMemoryUsage();
            return deletedCount;
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('In-memory cache DELETE MANY error', 'in-memory-cache', { keys, error: String(error) });
            return 0;
        }
    }
    async invalidateByTags(tags) {
        try {
            if (!this.isConnected || tags.length === 0) {
                return 0;
            }
            let deletedCount = 0;
            const keysToDelete = [];
            for (const [key, item] of this.cache.entries()) {
                if (item.tags.some(tag => tags.includes(tag))) {
                    keysToDelete.push(key);
                }
            }
            deletedCount = await this.deleteMany(keysToDelete);
            logger_1.logger.info('Cache invalidated by tags', 'in-memory-cache', { tags, deletedCount });
            return deletedCount;
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('In-memory cache INVALIDATE BY TAGS error', 'in-memory-cache', { tags, error: String(error) });
            return 0;
        }
    }
    async clear() {
        try {
            if (!this.isConnected) {
                return false;
            }
            this.cache.clear();
            this.stats = {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                errors: 0,
                hitRate: 0,
                totalOperations: 0
            };
            this.memoryUsage = { used: 0, peak: 0 };
            logger_1.logger.info('Cache cleared successfully', 'in-memory-cache');
            return true;
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('In-memory cache CLEAR error', 'in-memory-cache', { error: String(error) });
            return false;
        }
    }
    getStats() {
        return { ...this.stats, memoryUsage: this.memoryUsage };
    }
    async getHealth() {
        const startTime = Date.now();
        try {
            if (!this.isConnected) {
                return {
                    connected: false,
                    latency: 0,
                    error: 'Not connected to cache',
                    stats: this.getStats()
                };
            }
            await this.set('health-check', 'ok', { ttl: 1 });
            await this.get('health-check');
            await this.delete('health-check');
            const latency = Date.now() - startTime;
            return {
                connected: true,
                latency,
                stats: this.getStats()
            };
        }
        catch (error) {
            return {
                connected: false,
                latency: Date.now() - startTime,
                error: String(error),
                stats: this.getStats()
            };
        }
    }
    isCacheConnected() {
        return this.isConnected;
    }
    async getKeysByPattern(pattern) {
        try {
            if (!this.isConnected) {
                return [];
            }
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return Array.from(this.cache.keys()).filter(key => regex.test(key));
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('In-memory cache KEYS error', 'in-memory-cache', { pattern, error: String(error) });
            return [];
        }
    }
    async getTTL(key) {
        try {
            if (!this.isConnected) {
                return -1;
            }
            const item = this.cache.get(key);
            if (!item) {
                return -1;
            }
            const remaining = Math.max(0, Math.floor((item.expiresAt - Date.now()) / 1000));
            return remaining;
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('In-memory cache TTL error', 'in-memory-cache', { key, error: String(error) });
            return -1;
        }
    }
    async setTTL(key, ttl) {
        try {
            if (!this.isConnected) {
                return false;
            }
            const item = this.cache.get(key);
            if (!item) {
                return false;
            }
            item.expiresAt = Date.now() + (ttl * 1000);
            return true;
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('In-memory cache EXPIRE error', 'in-memory-cache', { key, ttl, error: String(error) });
            return false;
        }
    }
    updateHitRate() {
        this.stats.totalOperations = this.stats.hits + this.stats.misses + this.stats.sets + this.stats.deletes;
        this.stats.hitRate = this.stats.totalOperations > 0 ?
            Math.round((this.stats.hits / this.stats.totalOperations) * 100) : 0;
    }
    updateMemoryUsage() {
        const used = this.cache.size;
        this.memoryUsage.used = used;
        this.memoryUsage.peak = Math.max(this.memoryUsage.peak, used);
    }
    startCleanupInterval() {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            let cleanedCount = 0;
            for (const [key, item] of this.cache.entries()) {
                if (now > item.expiresAt) {
                    this.cache.delete(key);
                    cleanedCount++;
                }
            }
            if (cleanedCount > 0) {
                logger_1.logger.debug('Cleaned expired cache items', 'in-memory-cache', { count: cleanedCount });
                this.updateMemoryUsage();
            }
        }, 60000);
    }
}
exports.InMemoryCacheService = InMemoryCacheService;
exports.inMemoryCache = new InMemoryCacheService();
//# sourceMappingURL=InMemoryCacheService.js.map