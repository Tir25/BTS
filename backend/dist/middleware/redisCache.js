"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartCacheMiddleware = exports.cacheWarming = exports.redisCacheHealth = exports.redisCacheClear = exports.redisCacheStats = exports.redisCacheInvalidation = exports.redisCacheMiddleware = void 0;
const RedisCacheService_1 = require("../services/RedisCacheService");
const logger_1 = require("../utils/logger");
const redisCacheMiddleware = (options = {}) => {
    const { ttl = 300, tags = [], skipCache = () => false, keyGenerator = defaultKeyGenerator, compress = false } = options;
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }
        if (skipCache(req)) {
            return next();
        }
        try {
            const cacheKey = keyGenerator(req);
            const cacheOptions = {
                ttl,
                tags,
                compress
            };
            const cachedData = await RedisCacheService_1.redisCache.get(cacheKey);
            if (cachedData !== null) {
                logger_1.logger.debug('Cache hit', 'redis-cache-middleware', {
                    key: cacheKey,
                    path: req.path
                });
                return res.json({
                    ...cachedData,
                    _cached: true,
                    _cacheKey: cacheKey,
                    _timestamp: new Date().toISOString()
                });
            }
            const originalJson = res.json;
            res.json = function (data) {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    if (!data._cached) {
                        RedisCacheService_1.redisCache.set(cacheKey, data, cacheOptions).catch(error => {
                            logger_1.logger.error('Failed to cache response', 'redis-cache-middleware', {
                                key: cacheKey,
                                error: String(error)
                            });
                        });
                        logger_1.logger.debug('Response cached', 'redis-cache-middleware', {
                            key: cacheKey,
                            ttl,
                            tags
                        });
                    }
                }
                return originalJson.call(this, data);
            };
            next();
        }
        catch (error) {
            logger_1.logger.error('Cache middleware error', 'redis-cache-middleware', {
                error: String(error),
                path: req.path
            });
            next();
        }
    };
};
exports.redisCacheMiddleware = redisCacheMiddleware;
const redisCacheInvalidation = (pattern) => {
    return async (req, res, next) => {
        const originalJson = res.json;
        res.json = function (data) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const patterns = Array.isArray(pattern) ? pattern : [pattern];
                setImmediate(async () => {
                    try {
                        let invalidatedCount = 0;
                        for (const p of patterns) {
                            if (p.startsWith('tag:')) {
                                const tag = p.replace('tag:', '');
                                const count = await RedisCacheService_1.redisCache.invalidateByTags([tag]);
                                invalidatedCount += count;
                            }
                            else {
                                const keys = await RedisCacheService_1.redisCache.getKeysByPattern(p);
                                if (keys.length > 0) {
                                    const count = await RedisCacheService_1.redisCache.deleteMany(keys);
                                    invalidatedCount += count;
                                }
                            }
                        }
                        if (invalidatedCount > 0) {
                            logger_1.logger.info('Cache invalidated', 'redis-cache-middleware', {
                                patterns,
                                invalidatedCount,
                                path: req.path,
                                method: req.method
                            });
                        }
                    }
                    catch (error) {
                        logger_1.logger.error('Cache invalidation failed', 'redis-cache-middleware', {
                            error: error.message,
                            patterns,
                            path: req.path
                        });
                    }
                });
            }
            return originalJson.call(this, data);
        };
        next();
    };
};
exports.redisCacheInvalidation = redisCacheInvalidation;
function defaultKeyGenerator(req) {
    const baseKey = `${req.method}:${req.originalUrl}`;
    const queryString = Object.keys(req.query).length > 0 ?
        `:${JSON.stringify(req.query)}` : '';
    return `${baseKey}${queryString}`;
}
const redisCacheStats = async (req, res) => {
    try {
        const stats = RedisCacheService_1.redisCache.getStats();
        const health = await RedisCacheService_1.redisCache.getHealth();
        res.json({
            success: true,
            data: {
                stats,
                health,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Cache stats error', 'redis-cache-middleware', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to get cache statistics',
            message: String(error)
        });
    }
};
exports.redisCacheStats = redisCacheStats;
const redisCacheClear = async (req, res) => {
    try {
        const { pattern, tags } = req.body;
        let clearedCount = 0;
        if (tags && Array.isArray(tags)) {
            clearedCount = await RedisCacheService_1.redisCache.invalidateByTags(tags);
        }
        else if (pattern) {
            const keys = await RedisCacheService_1.redisCache.getKeysByPattern(pattern);
            if (keys.length > 0) {
                clearedCount = await RedisCacheService_1.redisCache.deleteMany(keys);
            }
        }
        else {
            const success = await RedisCacheService_1.redisCache.clear();
            clearedCount = success ? -1 : 0;
        }
        logger_1.logger.info('Cache cleared', 'redis-cache-middleware', {
            pattern,
            tags,
            clearedCount
        });
        res.json({
            success: true,
            message: 'Cache cleared successfully',
            clearedCount,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Cache clear error', 'redis-cache-middleware', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to clear cache',
            message: String(error)
        });
    }
};
exports.redisCacheClear = redisCacheClear;
const redisCacheHealth = async (req, res) => {
    try {
        const health = await RedisCacheService_1.redisCache.getHealth();
        const statusCode = health.connected ? 200 : 503;
        res.status(statusCode).json({
            success: health.connected,
            data: health,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Cache health check error', 'redis-cache-middleware', { error: String(error) });
        res.status(503).json({
            success: false,
            error: 'Cache health check failed',
            message: String(error)
        });
    }
};
exports.redisCacheHealth = redisCacheHealth;
const cacheWarming = (warmupFunction) => {
    return async (req, res, next) => {
        try {
            const data = await warmupFunction(req);
            const cacheKey = defaultKeyGenerator(req);
            await RedisCacheService_1.redisCache.set(cacheKey, data, { ttl: 3600 });
            logger_1.logger.info('Cache warmed', 'redis-cache-middleware', {
                key: cacheKey,
                path: req.path
            });
            next();
        }
        catch (error) {
            logger_1.logger.error('Cache warming error', 'redis-cache-middleware', {
                error: String(error),
                path: req.path
            });
            next();
        }
    };
};
exports.cacheWarming = cacheWarming;
const smartCacheMiddleware = (options = {}) => {
    const { defaultTTL = 300, dataTypeTTL = {
        'user-profiles': 1800,
        'buses': 600,
        'routes': 1800,
        'assignments': 300,
        'locations': 60,
    }, skipCache = () => false } = options;
    return async (req, res, next) => {
        if (req.method !== 'GET' || skipCache(req)) {
            return next();
        }
        try {
            const cacheKey = defaultKeyGenerator(req);
            let ttl = defaultTTL;
            for (const [dataType, typeTTL] of Object.entries(dataTypeTTL)) {
                if (req.path.includes(dataType)) {
                    ttl = typeTTL;
                    break;
                }
            }
            const cachedData = await RedisCacheService_1.redisCache.get(cacheKey);
            if (cachedData !== null) {
                return res.json({
                    ...cachedData,
                    _cached: true,
                    _cacheKey: cacheKey,
                    _timestamp: new Date().toISOString()
                });
            }
            const originalJson = res.json;
            res.json = function (data) {
                if (res.statusCode >= 200 && res.statusCode < 300 && !data._cached) {
                    RedisCacheService_1.redisCache.set(cacheKey, data, { ttl }).catch(error => {
                        logger_1.logger.error('Smart cache set error', 'redis-cache-middleware', {
                            key: cacheKey,
                            ttl,
                            error: String(error)
                        });
                    });
                }
                return originalJson.call(this, data);
            };
            next();
        }
        catch (error) {
            logger_1.logger.error('Smart cache middleware error', 'redis-cache-middleware', {
                error: String(error),
                path: req.path
            });
            next();
        }
    };
};
exports.smartCacheMiddleware = smartCacheMiddleware;
//# sourceMappingURL=redisCache.js.map