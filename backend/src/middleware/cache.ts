/**
 * @deprecated This file contains the old in-memory cache implementation.
 * It has been replaced by the Redis-based cache system in middleware/redisCache.ts
 * 
 * This file is kept for backward compatibility but should not be used in new code.
 * Use the Redis cache middleware instead for better performance and persistence.
 */

import { logger } from '../utils/logger';

// Legacy cache implementation - DEPRECATED
// Use Redis cache middleware instead

export const cacheMiddleware = () => {
  logger.warn('Using deprecated in-memory cache middleware. Please use Redis cache middleware instead.', 'cache');
  return (req: any, res: any, next: any) => {
    logger.warn('Deprecated cache middleware called', 'cache');
    next();
  };
};

export const invalidateCache = () => {
  logger.warn('Using deprecated cache invalidation. Please use Redis cache invalidation instead.', 'cache');
  return (req: any, res: any, next: any) => {
    logger.warn('Deprecated cache invalidation called', 'cache');
    next();
  };
};

export const cacheStats = (req: any, res: any) => {
  logger.warn('Using deprecated cache stats. Please use Redis cache stats instead.', 'cache');
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

export const clearCache = (req: any, res: any) => {
  logger.warn('Using deprecated cache clear. Please use Redis cache clear instead.', 'cache');
  res.json({
    deprecated: true,
    message: 'This cache implementation is deprecated. Use Redis cache clear instead.',
    redis_endpoint: 'POST /cache/clear'
  });
};

export const cache = {
  size: () => 0,
  clear: () => {
    logger.warn('Deprecated cache.clear() called', 'cache');
  }
};
