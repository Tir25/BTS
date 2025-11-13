/**
 * Express App Configuration
 * Sets up all middleware for the Express application
 */

import express from 'express';
import { handlePreflight } from '../middleware/cors';
import { corsMiddleware as enhancedCorsMiddleware } from '../middleware/corsEnhanced';
import { unhandledRejectionHandler, uncaughtExceptionHandler } from '../middleware/errorHandler';
import { requestIdMiddleware, addRequestIdToError } from '../middleware/requestId';
import { securityMiddleware, validateRequest, corsSecurity } from '../middleware/security';
import { 
  securityManager,
  requestSizeValidator,
  requestValidator,
  securityHeaders,
  fileUploadValidator
} from '../middleware/securityEnhanced';
import { performanceMonitor, memoryMonitor, requestSizeLimit, compressionMonitor } from '../middleware/performance';
import { requestMonitoring, memoryMonitoring, performanceMonitoring } from '../middleware/monitoring';
import { 
  redisCacheMiddleware, 
  redisCacheStats, 
  redisCacheClear, 
  redisCacheHealth,
  smartCacheMiddleware 
} from '../middleware/redisCache';
import { memoryOptimizationMiddleware, memoryLeakDetection, getMemoryStats, forceGarbageCollection } from '../middleware/memoryOptimization';
import { getLogRotationStats, forceLogRotation } from '../utils/logRotation';
import { detectDeadCode, getDeadCodeReport } from '../utils/deadCodeDetector';
import { rateLimitMiddleware, authRateLimit } from '../middleware/rateLimit';
import config from '../config/environment';
import { logger } from '../utils/logger';
import { SERVER_CONFIG } from './config/serverConfig';

/**
 * Creates and configures the Express application with all middleware
 */
export function createApp(): express.Application {
  const app = express();
  
  // Ensure Express trusts proxy headers (Render/Cloudflare) so rate-limit and IP detection work properly
  app.set('trust proxy', 1);

  // Global error handlers (must be first)
  process.on('unhandledRejection', unhandledRejectionHandler);
  process.on('uncaughtException', uncaughtExceptionHandler);

  // Request correlation ID middleware (should be first)
  app.use(requestIdMiddleware);

  // Enhanced memory optimization middleware
  app.use(memoryOptimizationMiddleware);
  app.use(memoryLeakDetection);

  // Enhanced security middleware with production-grade configuration
  app.use(securityManager.getHelmetConfig());
  app.use(securityHeaders);
  app.use(securityMiddleware);
  app.use(validateRequest);
  app.use(corsSecurity);

  // Request validation and size limits
  app.use(requestValidator);
  app.use(requestSizeValidator);

  // Performance monitoring
  app.use(performanceMonitor);
  app.use(memoryMonitor);
  app.use(compressionMonitor);
  app.use(requestSizeLimit(SERVER_CONFIG.MAX_BODY_SIZE));

  // Comprehensive monitoring
  app.use(requestMonitoring);
  app.use(memoryMonitoring);
  app.use(performanceMonitoring);

  // Enhanced CORS middleware
  app.use(enhancedCorsMiddleware);
  app.use(handlePreflight);

  const rateLimitingEnabled =
    process.env.DISABLE_RATE_LIMIT?.toLowerCase() !== 'true' &&
    config.security.enableRateLimit;

  // Rate limiting (enabled in production unless explicitly disabled)
  if (process.env.NODE_ENV === 'production' && rateLimitingEnabled) {
    app.use(rateLimitMiddleware);
  } else if (!rateLimitingEnabled) {
    logger.info('🚫 Rate limiting disabled via configuration', 'server');
  }

  // Body parsing middleware with enhanced limits
  app.use(express.json({ 
    limit: SERVER_CONFIG.MAX_REQUEST_SIZE,
    verify: (req: express.Request, res: express.Response, buf: Buffer): void => {
      // Only validate JSON if content-type is application/json
      if (req.headers['content-type']?.includes('application/json')) {
        try {
          JSON.parse(buf.toString());
        } catch (e) {
          logger.warn('Invalid JSON received', 'server', { 
            error: (e as Error).message,
            contentLength: buf.length,
            contentType: req.headers['content-type']
          });
        }
      }
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: SERVER_CONFIG.MAX_REQUEST_SIZE }));

  // Add request ID to error responses
  app.use(addRequestIdToError);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'University Bus Tracking System API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        health: '/health',
        healthDetailed: '/health/detailed',
        admin: '/admin',
        assignments: '/assignments',
        productionAssignments: '/production-assignments',
        buses: '/buses',
        routes: '/routes',
        storage: '/storage',
        locations: '/locations',
        sse: '/sse',
      },
    });
  });

  // Redis cache management endpoints
  app.get('/cache/stats', redisCacheStats);
  app.get('/cache/health', redisCacheHealth);
  app.post('/cache/clear', redisCacheClear);

  // Memory optimization endpoints
  app.get('/memory/stats', getMemoryStats);
  app.post('/memory/gc', forceGarbageCollection);

  // Log rotation endpoints
  app.get('/logs/rotation/stats', getLogRotationStats);
  app.post('/logs/rotation/force', forceLogRotation);

  // Dead code detection endpoints
  app.get('/dead-code/detect', detectDeadCode);
  app.get('/dead-code/report', getDeadCodeReport);

  // Note: Error handling middleware is registered AFTER routes in index.ts
  // This ensures routes are registered before the 404 handler catches everything

  return app;
}

