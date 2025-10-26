"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = exports.clearCache = exports.cacheStats = exports.invalidateCache = exports.cacheMiddleware = void 0;
const logger_1 = require("../utils/logger");
const cacheMiddleware = () => {
    logger_1.logger.warn('Using deprecated in-memory cache middleware. Please use Redis cache middleware instead.', 'cache');
    return (req, res, next) => {
        logger_1.logger.warn('Deprecated cache middleware called', 'cache');
        next();
    };
};
exports.cacheMiddleware = cacheMiddleware;
const invalidateCache = () => {
    logger_1.logger.warn('Using deprecated cache invalidation. Please use Redis cache invalidation instead.', 'cache');
    return (req, res, next) => {
        logger_1.logger.warn('Deprecated cache invalidation called', 'cache');
        next();
    };
};
exports.invalidateCache = invalidateCache;
const cacheStats = (req, res) => {
    logger_1.logger.warn('Using deprecated cache stats. Please use Redis cache stats instead.', 'cache');
    res.json({
        deprecated: true,
        message: 'This cache implementation is deprecated. Use Redis cache instead.',
        redis_endpoints: {
            stats: '/cache/stats',
            health: '/cache/health',
            clear: 'POST /cache/clear'
        }
    });
};
exports.cacheStats = cacheStats;
const clearCache = (req, res) => {
    logger_1.logger.warn('Using deprecated cache clear. Please use Redis cache clear instead.', 'cache');
    res.json({
        deprecated: true,
        message: 'This cache implementation is deprecated. Use Redis cache clear instead.',
        redis_endpoint: 'POST /cache/clear'
    });
};
exports.clearCache = clearCache;
exports.cache = {
    size: () => 0,
    clear: () => {
        logger_1.logger.warn('Deprecated cache.clear() called', 'cache');
    }
};
//# sourceMappingURL=cache.js.map