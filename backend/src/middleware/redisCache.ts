/**
 * Production-Grade Redis Cache Middleware
 * Industry-standard implementation with comprehensive caching strategies
 */

import { Request, Response, NextFunction } from 'express';
import { redisCache, CacheOptions } from '../services/RedisCacheService';
import { logger } from '../utils/logger';

export interface CacheMiddlewareOptions {
  ttl?: number;
  tags?: string[];
  skipCache?: (req: Request) => boolean;
  keyGenerator?: (req: Request) => string;
  compress?: boolean;
}

/**
 * Enhanced cache middleware with Redis
 */
export const redisCacheMiddleware = (options: CacheMiddlewareOptions = {}) => {
  const {
    ttl = 300, // 5 minutes default
    tags = [],
    skipCache = () => false,
    keyGenerator = defaultKeyGenerator,
    compress = false
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if condition is met
    if (skipCache(req)) {
      return next();
    }

    try {
      const cacheKey = keyGenerator(req);
      const cacheOptions: CacheOptions = {
        ttl,
        tags,
        compress
      };

      // Try to get from cache
      const cachedData = await redisCache.get(cacheKey);
      
      if (cachedData !== null) {
        logger.debug('Cache hit', 'redis-cache-middleware', { 
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

      // Cache miss - override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Don't cache if data contains _cached flag
          if (!data._cached) {
            redisCache.set(cacheKey, data, cacheOptions).catch(error => {
              logger.error('Failed to cache response', 'redis-cache-middleware', { 
                key: cacheKey, 
                error: String(error) 
              });
            });
            
            logger.debug('Response cached', 'redis-cache-middleware', { 
              key: cacheKey, 
              ttl,
              tags 
            });
          }
        }
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', 'redis-cache-middleware', { 
        error: String(error),
        path: req.path 
      });
      next();
    }
  };
};

/**
 * Cache invalidation middleware
 */
export const redisCacheInvalidation = (pattern: string | string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      // Only invalidate on successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const patterns = Array.isArray(pattern) ? pattern : [pattern];

        // Run invalidation asynchronously without blocking response
        setImmediate(async () => {
          try {
            let invalidatedCount = 0;
            for (const p of patterns) {
              if (p.startsWith('tag:')) {
                // Invalidate by tag
                const tag = p.replace('tag:', '');
                const count = await redisCache.invalidateByTags([tag]);
                invalidatedCount += count;
              } else {
                // Invalidate by key pattern
                const keys = await redisCache.getKeysByPattern(p);
                if (keys.length > 0) {
                  const count = await redisCache.deleteMany(keys);
                  invalidatedCount += count;
                }
              }
            }

            if (invalidatedCount > 0) {
              logger.info('Cache invalidated', 'redis-cache-middleware', { 
                patterns,
                invalidatedCount,
                path: req.path,
                method: req.method
              });
            }
          } catch (error) {
            logger.error('Cache invalidation failed', 'redis-cache-middleware', {
              error: (error as Error).message,
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

/**
 * Default cache key generator
 */
function defaultKeyGenerator(req: Request): string {
  const baseKey = `${req.method}:${req.originalUrl}`;
  const queryString = Object.keys(req.query).length > 0 ? 
    `:${JSON.stringify(req.query)}` : '';
  return `${baseKey}${queryString}`;
}

/**
 * Cache statistics endpoint
 */
export const redisCacheStats = async (req: Request, res: Response) => {
  try {
    const stats = redisCache.getStats();
    const health = await redisCache.getHealth();
    
    res.json({
      success: true,
      data: {
        stats,
        health,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Cache stats error', 'redis-cache-middleware', { error: String(error) });
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics',
      message: String(error)
    });
  }
};

/**
 * Clear cache endpoint
 */
export const redisCacheClear = async (req: Request, res: Response) => {
  try {
    const { pattern, tags } = req.body;
    
    let clearedCount = 0;
    
    if (tags && Array.isArray(tags)) {
      // Clear by tags
      clearedCount = await redisCache.invalidateByTags(tags);
    } else if (pattern) {
      // Clear by pattern
      const keys = await redisCache.getKeysByPattern(pattern);
      if (keys.length > 0) {
        clearedCount = await redisCache.deleteMany(keys);
      }
    } else {
      // Clear all
      const success = await redisCache.clear();
      clearedCount = success ? -1 : 0; // -1 indicates full clear
    }
    
    logger.info('Cache cleared', 'redis-cache-middleware', { 
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
  } catch (error) {
    logger.error('Cache clear error', 'redis-cache-middleware', { error: String(error) });
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: String(error)
    });
  }
};

/**
 * Cache health check
 */
export const redisCacheHealth = async (req: Request, res: Response) => {
  try {
    const health = await redisCache.getHealth();
    
    const statusCode = health.connected ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.connected,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Cache health check error', 'redis-cache-middleware', { error: String(error) });
    res.status(503).json({
      success: false,
      error: 'Cache health check failed',
      message: String(error)
    });
  }
};

/**
 * Cache warming middleware
 */
export const cacheWarming = (warmupFunction: (req: Request) => Promise<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await warmupFunction(req);
      const cacheKey = defaultKeyGenerator(req);
      
      await redisCache.set(cacheKey, data, { ttl: 3600 }); // 1 hour
      
      logger.info('Cache warmed', 'redis-cache-middleware', { 
        key: cacheKey,
        path: req.path 
      });
      
      next();
    } catch (error) {
      logger.error('Cache warming error', 'redis-cache-middleware', { 
        error: String(error),
        path: req.path 
      });
      next();
    }
  };
};

/**
 * Smart cache middleware with automatic TTL based on data type
 */
export const smartCacheMiddleware = (options: {
  defaultTTL?: number;
  dataTypeTTL?: Record<string, number>;
  skipCache?: (req: Request) => boolean;
} = {}) => {
  const {
    defaultTTL = 300,
    dataTypeTTL = {
      'user-profiles': 1800, // 30 minutes
      'buses': 600, // 10 minutes
      'routes': 1800, // 30 minutes
      'assignments': 300, // 5 minutes
      'locations': 60, // 1 minute
    },
    skipCache = () => false
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || skipCache(req)) {
      return next();
    }

    try {
      const cacheKey = defaultKeyGenerator(req);
      
      // Determine TTL based on path
      let ttl = defaultTTL;
      for (const [dataType, typeTTL] of Object.entries(dataTypeTTL)) {
        if (req.path.includes(dataType)) {
          ttl = typeTTL;
          break;
        }
      }

      const cachedData = await redisCache.get(cacheKey);
      
      if (cachedData !== null) {
        return res.json({
          ...cachedData,
          _cached: true,
          _cacheKey: cacheKey,
          _timestamp: new Date().toISOString()
        });
      }

      const originalJson = res.json;
      res.json = function(data: any) {
        if (res.statusCode >= 200 && res.statusCode < 300 && !data._cached) {
          redisCache.set(cacheKey, data, { ttl }).catch(error => {
            logger.error('Smart cache set error', 'redis-cache-middleware', { 
              key: cacheKey, 
              ttl,
              error: String(error) 
            });
          });
        }
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Smart cache middleware error', 'redis-cache-middleware', { 
        error: String(error),
        path: req.path 
      });
      next();
    }
  };
};
