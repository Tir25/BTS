/**
 * Route Registration
 * Registers all API routes with the Express application
 */

import { Application } from 'express';
import { fileUploadValidator } from '../middleware/securityEnhanced';
import { smartCacheMiddleware } from '../middleware/redisCache';
import { rateLimitMiddleware, authRateLimit } from '../middleware/rateLimit';
import config from '../config/environment';
import healthRoutes from '../routes/health';
import authRoutes from '../routes/auth';
import busRoutes from '../routes/buses';
import routeRoutes from '../routes/routes';
import adminRoutes from '../routes/admin';
import productionAssignmentRoutes from '../routes/productionAssignments';
import optimizedAssignmentRoutes from '../routes/optimizedAssignments';
import storageRoutes from '../routes/storage';
import trackingRoutes from '../routes/tracking';
import studentRoutes from '../routes/student';
import locationRoutes from '../routes/locations';
import sseRoutes from '../routes/sse';
import monitoringRoutes from '../routes/monitoring';

/**
 * Registers all routes with the Express application
 */
export function registerRoutes(app: Application): void {
  const rateLimitingEnabled =
    process.env.DISABLE_RATE_LIMIT?.toLowerCase() !== 'true' &&
    config.security.enableRateLimit;

  // Enhanced routes with Redis caching and security
  app.use('/health', healthRoutes);
  
  // Apply stricter rate limit to authentication endpoints only when enabled
  app.use(
    '/auth',
    process.env.NODE_ENV === 'production' && rateLimitingEnabled
      ? authRateLimit
      : (req, _res, next) => next(),
    authRoutes
  );
  
  app.use('/admin', fileUploadValidator, adminRoutes);
  app.use('/assignments', productionAssignmentRoutes);
  app.use('/production-assignments', productionAssignmentRoutes);
  app.use('/assignments-optimized', optimizedAssignmentRoutes);
  app.use('/buses', smartCacheMiddleware({ 
    dataTypeTTL: { 'buses': 600 } // 10 min cache for buses
  }), busRoutes);
  app.use('/routes', smartCacheMiddleware({ 
    dataTypeTTL: { 'routes': 1800 } // 30 min cache for routes
  }), routeRoutes);
  app.use('/storage', fileUploadValidator, storageRoutes);
  app.use('/locations', smartCacheMiddleware({ 
    dataTypeTTL: { 'locations': 60 } // 1 min cache for locations
  }), locationRoutes);
  app.use('/tracking', trackingRoutes);
  app.use('/student', studentRoutes);
  app.use('/sse', sseRoutes);
  app.use('/monitoring', monitoringRoutes);
}

