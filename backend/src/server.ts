import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { corsMiddleware, handlePreflight } from './middleware/cors';
import { corsMiddleware as enhancedCorsMiddleware, websocketCors } from './middleware/corsEnhanced';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { notFoundHandler, globalErrorHandler, unhandledRejectionHandler, uncaughtExceptionHandler } from './middleware/errorHandler';
import { requestIdMiddleware, addRequestIdToError } from './middleware/requestId';
import { securityMiddleware, apiRateLimit, authRateLimit, validateRequest, corsSecurity } from './middleware/security';
import { 
  securityManager,
  requestSizeValidator,
  requestValidator,
  securityHeaders,
  fileUploadValidator
} from './middleware/securityEnhanced';
import { performanceMonitor, memoryMonitor, requestSizeLimit, compressionMonitor } from './middleware/performance';
import { requestMonitoring, errorMonitoring, memoryMonitoring, performanceMonitoring } from './middleware/monitoring';
import { 
  redisCacheMiddleware, 
  redisCacheStats, 
  redisCacheClear, 
  redisCacheHealth,
  smartCacheMiddleware 
} from './middleware/redisCache';
import { redisCache } from './services/RedisCacheService';
import { logger } from './utils/logger';
import healthRoutes from './routes/health';
import busRoutes from './routes/buses';
import routeRoutes from './routes/routes';
import adminRoutes from './routes/admin';
import productionAssignmentRoutes from './routes/productionAssignments';
import optimizedAssignmentRoutes from './routes/optimizedAssignments';
import storageRoutes from './routes/storage';
import locationRoutes from './routes/locations';
import sseRoutes from './routes/sse';
import { initializeDatabase, testDatabaseConnection } from './models/database';
import { closeDatabasePool, startDatabaseMonitoring, stopDatabaseMonitoring } from './config/database';
import config from './config/environment';
import { validateEnvironment } from './config/envValidation';
import { initializeWebSocket } from './sockets/websocket';
import { webSocketHealth } from './services/WebSocketHealthService';
import { monitoringService } from './services/MonitoringService';
import monitoringRoutes from './routes/monitoring';
import { performanceGuard } from './utils/performanceGuard';
import { systemValidator } from './utils/systemValidator';
import { memoryOptimizationMiddleware, memoryLeakDetection, getMemoryStats, forceGarbageCollection, memoryOptimizer } from './middleware/memoryOptimization';
import { logRotationMiddleware, getLogRotationStats, forceLogRotation, logRotator } from './utils/logRotation';
import { detectDeadCode, getDeadCodeReport, deadCodeDetector } from './utils/deadCodeDetector';
import { apiRateLimits, userTierRateLimits, operationRateLimits } from './middleware/advancedRateLimit';

// Initialize environment configuration - REMOVED, now imported
// const config = initializeEnvironment();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: config.websocket.cors,
});

const PORT = 3000; // Override config.port to use standard port

// PRODUCTION FIX: Enhanced process management
// Set memory limits for Node.js processes
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || '--max-old-space-size=512';

// Global error handlers (must be first)
process.on('unhandledRejection', unhandledRejectionHandler);
process.on('uncaughtException', uncaughtExceptionHandler);

// PRODUCTION FIX: Enhanced memory monitoring and cleanup
const MEMORY_WARNING_THRESHOLD = 300 * 1024 * 1024; // 300MB
const MEMORY_CRITICAL_THRESHOLD = 350 * 1024 * 1024; // 350MB
const MEMORY_EMERGENCY_THRESHOLD = 400 * 1024 * 1024; // 400MB

setInterval(() => {
  const memoryUsage = process.memoryUsage();
  const heapUsed = memoryUsage.heapUsed;
  const memoryMB = Math.round(heapUsed / 1024 / 1024);
  
  // Proactive memory monitoring with multiple thresholds
  if (heapUsed > MEMORY_WARNING_THRESHOLD) {
    logger.warn('Memory usage warning', 'server', { 
      memoryMB, 
      heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      threshold: 'WARNING'
    });
  }
  
  // Trigger garbage collection at critical threshold
  if (heapUsed > MEMORY_CRITICAL_THRESHOLD && global.gc) {
    logger.warn('Memory usage critical - triggering garbage collection', 'server', { 
      memoryMB,
      threshold: 'CRITICAL'
    });
    global.gc();
    
    // Check memory after GC
    const postGcMemory = process.memoryUsage();
    const postGcMB = Math.round(postGcMemory.heapUsed / 1024 / 1024);
    logger.info('Garbage collection completed', 'server', { 
      beforeMB: memoryMB,
      afterMB: postGcMB,
      reduction: memoryMB - postGcMB
    });
  }
  
  // Emergency shutdown if memory is still too high
  if (heapUsed > MEMORY_EMERGENCY_THRESHOLD) {
    logger.error('Memory usage emergency - considering restart', 'server', { 
      memoryMB,
      threshold: 'EMERGENCY'
    });
    
    // In production, consider graceful restart
    if (process.env.NODE_ENV === 'production') {
      logger.error('Emergency memory threshold exceeded - graceful shutdown initiated', 'server');
      gracefulShutdown('MEMORY_EMERGENCY');
    }
  }
}, 2 * 60 * 1000); // Check every 2 minutes for more responsive monitoring

// Request correlation ID middleware (should be first)
app.use(requestIdMiddleware);

// Enhanced memory optimization middleware
app.use(memoryOptimizationMiddleware);
app.use(memoryLeakDetection);

// Enhanced security middleware with production-grade configuration
app.use(securityManager.getHelmetConfig());

// Enhanced security headers
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
app.use(requestSizeLimit(50 * 1024 * 1024)); // 50MB limit

// Comprehensive monitoring
app.use(requestMonitoring);
app.use(memoryMonitoring);
app.use(performanceMonitoring);

// Enhanced CORS middleware
app.use(enhancedCorsMiddleware);
app.use(handlePreflight);

// Enhanced rate limiting with advanced patterns
app.use(securityManager.getRateLimitConfig());
app.use(apiRateLimits.general);

// Body parsing middleware with enhanced limits
app.use(express.json({ 
  limit: '10mb',
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
        // Don't throw error, let express handle it
      }
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request ID to error responses
app.use(addRequestIdToError);

// Enhanced routes with Redis caching, security, and advanced rate limiting
app.use('/health', healthRoutes);
app.use('/admin', apiRateLimits.admin, fileUploadValidator, adminRoutes);
app.use('/assignments', apiRateLimits.assignments, securityManager.getAuthRateLimitConfig(), productionAssignmentRoutes);
app.use('/production-assignments', apiRateLimits.assignments, securityManager.getAuthRateLimitConfig(), productionAssignmentRoutes);
app.use('/assignments-optimized', apiRateLimits.assignments, securityManager.getAuthRateLimitConfig(), optimizedAssignmentRoutes);
app.use('/buses', smartCacheMiddleware({ 
  dataTypeTTL: { 'buses': 600 } // 10 min cache for buses
}), busRoutes);
app.use('/routes', smartCacheMiddleware({ 
  dataTypeTTL: { 'routes': 1800 } // 30 min cache for routes
}), routeRoutes);
app.use('/storage', apiRateLimits.upload, fileUploadValidator, storageRoutes);
app.use('/locations', apiRateLimits.locations, smartCacheMiddleware({ 
  dataTypeTTL: { 'locations': 60 } // 1 min cache for locations
}), locationRoutes);
app.use('/sse', sseRoutes);
app.use('/monitoring', monitoringRoutes);

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

// Enhanced error handling middleware
app.use(errorMonitoring);
app.use(globalErrorHandler);
app.use(notFoundHandler);

// Initialize server with enhanced error handling
const startServer = async () => {
  try {
    logger.info('🚀 Starting University Bus Tracking System Backend...', 'server');

    // Validate environment variables - strict validation for security
    logger.info('🔧 Validating environment variables...', 'server');
    try {
      validateEnvironment();
      logger.info('✅ Environment variables validated', 'server');
    } catch (envError) {
      logger.error('❌ Environment validation failed:', 'server', { error: (envError as Error).message });
      logger.error('💡 Please check your .env file and ensure all required variables are set', 'server');
      throw envError; // Don't continue without proper environment
    }

    // Initialize Redis cache
    logger.info('🔴 Initializing Redis cache...', 'server');
    try {
      await redisCache.connect();
      logger.info('✅ Redis cache initialized successfully', 'server');
    } catch (redisError) {
      logger.error('❌ Redis cache initialization failed:', 'server', { error: (redisError as Error).message });
      logger.warn('💡 Continuing without Redis cache for development...', 'server');
    }

    // Initialize database with retry logic
    logger.info('🗄️ Initializing database connection...', 'server');
    try {
      await initializeDatabase();
      logger.info('✅ Database initialized successfully', 'server');
    } catch (dbError) {
      logger.error('❌ Database initialization failed:', 'server', { error: (dbError as Error).message });
      logger.warn('💡 Continuing without database connection for development...', 'server');
    }

    // Test database connection
    logger.info('🔍 Testing database connection...', 'server');
    try {
      await testDatabaseConnection();
      logger.databaseConnected();
      logger.info('✅ Database connection test passed', 'server');
      
      // Start database monitoring
      startDatabaseMonitoring();
      logger.info('📊 Database monitoring started', 'server');
    } catch (dbTestError) {
      logger.warn('⚠️ Database connection test failed:', 'server', { error: (dbTestError as Error).message });
      logger.warn('💡 Continuing without database for development...', 'server');
    }

    // Initialize WebSocket server
    logger.info('🔌 Initializing WebSocket server...', 'server');
    initializeWebSocket(io);
    
    // Initialize WebSocket health monitoring
    webSocketHealth.initialize(io);
    logger.info('📊 WebSocket health monitoring started', 'server');
    
    // Start comprehensive monitoring service
    monitoringService.start();
    logger.info('📈 Comprehensive monitoring service started', 'server');
    
    // Start performance guard
    performanceGuard.startMonitoring();
    logger.info('🛡️ Performance guard started', 'server');
    
    // Start system validator
    systemValidator.startValidation();
    logger.info('🔍 System validator started', 'server');

    // Start server
    logger.info(`🌐 Starting server on port ${PORT}...`, 'server');
    server.listen(PORT, '0.0.0.0', () => {
      logger.serverReady(PORT);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`, 'server');
      logger.info(`📈 Detailed health: http://localhost:${PORT}/health/detailed`, 'server');
      logger.info(`🔗 API base: http://localhost:${PORT}`, 'server');
      logger.info(`🌍 Network access: http://0.0.0.0:${PORT}`, 'server');
      logger.info(`🔌 WebSocket server: ws://localhost:${PORT}`, 'server');
      logger.info(`🌐 WebSocket network: ws://0.0.0.0:${PORT}`, 'server');
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', 'server', { error: (error as Error).message, stack: (error as Error).stack });
    process.exit(1);
  }
};

// Enhanced graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`, 'server');

  try {
    // Close WebSocket connections
    io.close();
    webSocketHealth.stop();
    logger.info('WebSocket connections closed', 'server');

    // Stop database monitoring
    stopDatabaseMonitoring();
    logger.info('Database monitoring stopped', 'server');
    
    // Stop monitoring service
    monitoringService.stop();
    logger.info('Monitoring service stopped', 'server');
    
    // Stop performance guard
    performanceGuard.stopMonitoring();
    logger.info('Performance guard stopped', 'server');
    
    // Stop system validator
    systemValidator.stopValidation();
    logger.info('System validator stopped', 'server');
    
    // Stop memory optimizer
    memoryOptimizer.stop();
    logger.info('Memory optimizer stopped', 'server');
    
    // Stop log rotator
    logRotator.stop();
    logger.info('Log rotator stopped', 'server');
    
    // Close Redis cache connection
    await redisCache.disconnect();
    logger.info('Redis cache connection closed', 'server');
    
    // Close database connections
    await closeDatabasePool();
    logger.info('Database connections closed', 'server');

    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', 'server', { error: String(error) });
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', 'server', { error: String(error) });
  gracefulShutdown('Uncaught Exception');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', 'server', { reason: String(reason), promise: String(promise) });
  gracefulShutdown('Unhandled Rejection');
});

// Start the server
startServer();
