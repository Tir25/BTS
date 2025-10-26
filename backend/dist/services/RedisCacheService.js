"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisCache = exports.RedisCacheService = void 0;
const redis_1 = require("redis");
const net = __importStar(require("net"));
const logger_1 = require("../utils/logger");
const InMemoryCacheService_1 = require("./InMemoryCacheService");
class RedisCacheService {
    constructor() {
        this.isConnected = false;
        this.useFallback = false;
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
            hitRate: 0,
            totalOperations: 0
        };
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.fallbackCache = InMemoryCacheService_1.inMemoryCache;
        this.initializeClient();
    }
    initializeClient() {
        const redisConfig = {
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            socket: {
                connectTimeout: 5000,
                reconnectStrategy: (retries) => {
                    if (retries >= 2) {
                        logger_1.logger.warn('Redis connection failed, switching to in-memory cache', 'redis-cache');
                        this.useFallback = true;
                        return new Error('Max reconnection attempts reached');
                    }
                    this.reconnectAttempts = retries;
                    return Math.min(retries * 1000, 2000);
                }
            },
            retryDelayOnFailover: 500,
            enableReadyCheck: true,
            maxRetriesPerRequest: 1,
        };
        this.client = (0, redis_1.createClient)(redisConfig);
        this.client.on('connect', () => {
            logger_1.logger.info('Redis client connecting...', 'redis-cache');
        });
        this.client.on('ready', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            logger_1.logger.info('Redis client connected and ready', 'redis-cache');
        });
        this.client.on('error', (error) => {
            this.isConnected = false;
            this.stats.errors++;
            logger_1.logger.error('Redis client error', 'redis-cache', { error: error.message });
            if (!this.useFallback) {
                this.useFallback = true;
                logger_1.logger.info('Switching to in-memory cache due to Redis error', 'redis-cache');
            }
        });
        this.client.on('end', () => {
            this.isConnected = false;
            logger_1.logger.warn('Redis client connection ended', 'redis-cache');
        });
        this.client.on('reconnecting', () => {
            logger_1.logger.info(`Redis client reconnecting (attempt ${this.reconnectAttempts + 1})`, 'redis-cache');
        });
    }
    async connect() {
        try {
            const testConnection = await this.testRedisConnection();
            if (!testConnection) {
                throw new Error('Redis server not available');
            }
            if (!this.client.isOpen) {
                await this.client.connect();
            }
            this.isConnected = true;
            this.useFallback = false;
            logger_1.logger.info('Redis cache service connected successfully', 'redis-cache');
        }
        catch (error) {
            this.isConnected = false;
            this.useFallback = true;
            this.stats.errors++;
            logger_1.logger.warn('Redis not available, using in-memory cache fallback', 'redis-cache', { error: String(error) });
            await this.fallbackCache.connect();
            logger_1.logger.info('In-memory cache fallback initialized successfully', 'redis-cache');
        }
    }
    async testRedisConnection() {
        try {
            return new Promise((resolve) => {
                const socket = net.createConnection(6379, 'localhost');
                socket.on('connect', () => {
                    socket.destroy();
                    resolve(true);
                });
                socket.on('error', () => {
                    resolve(false);
                });
                socket.setTimeout(2000, () => {
                    socket.destroy();
                    resolve(false);
                });
            });
        }
        catch (error) {
            return false;
        }
    }
    async disconnect() {
        try {
            if (this.client.isOpen) {
                await this.client.quit();
            }
            this.isConnected = false;
            this.useFallback = false;
            await this.fallbackCache.disconnect();
            logger_1.logger.info('Redis cache service disconnected', 'redis-cache');
        }
        catch (error) {
            logger_1.logger.error('Error disconnecting from Redis', 'redis-cache', { error: String(error) });
        }
    }
    async get(key) {
        try {
            if (this.useFallback) {
                return await this.fallbackCache.get(key);
            }
            if (!this.isConnected) {
                this.stats.misses++;
                return null;
            }
            const value = await this.client.get(key);
            if (value === null) {
                this.stats.misses++;
                this.updateHitRate();
                return null;
            }
            this.stats.hits++;
            this.updateHitRate();
            return JSON.parse(value);
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('Redis GET error, falling back to in-memory cache', 'redis-cache', { key, error: String(error) });
            this.useFallback = true;
            return await this.fallbackCache.get(key);
        }
    }
    async set(key, value, options = {}) {
        try {
            if (this.useFallback) {
                return await this.fallbackCache.set(key, value, options);
            }
            if (!this.isConnected) {
                return false;
            }
            const { ttl = 3600, tags = [], compress = false } = options;
            const serializedValue = JSON.stringify(value);
            await this.client.setEx(key, ttl, serializedValue);
            if (tags.length > 0) {
                await this.client.sAdd(`tags:${key}`, tags);
                for (const tag of tags) {
                    await this.client.sAdd(`tag:${tag}`, key);
                }
            }
            this.stats.sets++;
            this.updateHitRate();
            logger_1.logger.debug('Cache SET successful', 'redis-cache', { key, ttl, tags });
            return true;
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('Redis SET error, falling back to in-memory cache', 'redis-cache', { key, error: String(error) });
            this.useFallback = true;
            return await this.fallbackCache.set(key, value, options);
        }
    }
    async delete(key) {
        try {
            if (this.useFallback) {
                return await this.fallbackCache.delete(key);
            }
            if (!this.isConnected) {
                return false;
            }
            const result = await this.client.del(key);
            const tags = await this.client.sMembers(`tags:${key}`);
            if (tags.length > 0) {
                for (const tag of tags) {
                    await this.client.sRem(`tag:${tag}`, key);
                }
                await this.client.del(`tags:${key}`);
            }
            this.stats.deletes++;
            this.updateHitRate();
            return result > 0;
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('Redis DELETE error, falling back to in-memory cache', 'redis-cache', { key, error: String(error) });
            this.useFallback = true;
            return await this.fallbackCache.delete(key);
        }
    }
    async deleteMany(keys) {
        try {
            if (!this.isConnected || keys.length === 0) {
                return 0;
            }
            const result = await this.client.del(keys);
            this.stats.deletes += result;
            this.updateHitRate();
            return result;
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('Redis DELETE MANY error', 'redis-cache', { keys, error: String(error) });
            return 0;
        }
    }
    async invalidateByTags(tags) {
        try {
            if (!this.isConnected || tags.length === 0) {
                return 0;
            }
            let deletedCount = 0;
            for (const tag of tags) {
                const keys = await this.client.sMembers(`tag:${tag}`);
                if (keys.length > 0) {
                    const result = await this.deleteMany(keys);
                    deletedCount += result;
                    await this.client.del(`tag:${tag}`);
                }
            }
            logger_1.logger.info('Cache invalidated by tags', 'redis-cache', { tags, deletedCount });
            return deletedCount;
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('Redis INVALIDATE BY TAGS error', 'redis-cache', { tags, error: String(error) });
            return 0;
        }
    }
    async clear() {
        try {
            if (!this.isConnected) {
                return false;
            }
            await this.client.flushDb();
            this.stats = {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                errors: 0,
                hitRate: 0,
                totalOperations: 0
            };
            logger_1.logger.info('Cache cleared successfully', 'redis-cache');
            return true;
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('Redis CLEAR error', 'redis-cache', { error: String(error) });
            return false;
        }
    }
    getStats() {
        return { ...this.stats };
    }
    async getHealth() {
        const startTime = Date.now();
        try {
            if (this.useFallback) {
                const fallbackHealth = await this.fallbackCache.getHealth();
                return {
                    ...fallbackHealth,
                    connected: true,
                    error: 'Using in-memory cache fallback'
                };
            }
            if (!this.isConnected) {
                return {
                    connected: false,
                    latency: 0,
                    error: 'Not connected to Redis',
                    stats: this.getStats()
                };
            }
            await this.client.ping();
            const latency = Date.now() - startTime;
            let memoryUsage;
            try {
                const info = await this.client.info('memory');
                const usedMatch = info.match(/used_memory:(\d+)/);
                const peakMatch = info.match(/used_memory_peak:(\d+)/);
                if (usedMatch && peakMatch) {
                    memoryUsage = {
                        used: parseInt(usedMatch[1]),
                        peak: parseInt(peakMatch[1])
                    };
                }
            }
            catch (error) {
            }
            return {
                connected: true,
                latency,
                stats: {
                    ...this.getStats(),
                    memoryUsage
                }
            };
        }
        catch (error) {
            this.useFallback = true;
            const fallbackHealth = await this.fallbackCache.getHealth();
            return {
                ...fallbackHealth,
                connected: true,
                error: `Redis error: ${String(error)}. Using in-memory fallback.`
            };
        }
    }
    isCacheConnected() {
        if (this.useFallback) {
            return this.fallbackCache.isCacheConnected();
        }
        return this.isConnected && this.client.isOpen;
    }
    updateHitRate() {
        this.stats.totalOperations = this.stats.hits + this.stats.misses + this.stats.sets + this.stats.deletes;
        this.stats.hitRate = this.stats.totalOperations > 0 ?
            Math.round((this.stats.hits / this.stats.totalOperations) * 100) : 0;
    }
    async getKeysByPattern(pattern) {
        try {
            if (!this.isConnected) {
                return [];
            }
            return await this.client.keys(pattern);
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('Redis KEYS error', 'redis-cache', { pattern, error: String(error) });
            return [];
        }
    }
    async getTTL(key) {
        try {
            if (!this.isConnected) {
                return -1;
            }
            return await this.client.ttl(key);
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('Redis TTL error', 'redis-cache', { key, error: String(error) });
            return -1;
        }
    }
    async setTTL(key, ttl) {
        try {
            if (!this.isConnected) {
                return false;
            }
            const result = await this.client.expire(key, ttl);
            return result;
        }
        catch (error) {
            this.stats.errors++;
            logger_1.logger.error('Redis EXPIRE error', 'redis-cache', { key, ttl, error: String(error) });
            return false;
        }
    }
}
exports.RedisCacheService = RedisCacheService;
exports.redisCache = new RedisCacheService();
//# sourceMappingURL=RedisCacheService.js.map