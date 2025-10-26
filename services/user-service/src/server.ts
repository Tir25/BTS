/**
 * User Management Microservice
 * Handles authentication, user profiles, and admin operations
 * Port: 3001
 */

import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestIdMiddleware } from './middleware/requestId';
import { securityMiddleware } from './middleware/security';
import { performanceMonitor } from './middleware/performance';
import { circuitBreaker } from './middleware/circuitBreaker';
import { healthRoutes } from './routes/health';
import { userRoutes } from './routes/users';
import { adminRoutes } from './routes/admin';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { initializeMetrics } from './config/metrics';
import { serviceRegistry } from './config/serviceRegistry';
import config from './config/environment';

const app = express();
const server = createServer(app);
const PORT = config.port || 3001;

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', 'server', { reason: String(reason), promise: String(promise) });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', 'server', { error: String(error) });
  process.exit(1);
});

// Request correlation ID middleware (should be first)
app.use(requestIdMiddleware);

// Security middleware
app.use(helmet());
app.use(securityMiddleware);

// CORS configuration
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance monitoring
app.use(performanceMonitor);

// Circuit breaker middleware
app.use(circuitBreaker);

// Routes
app.use('/health', healthRoutes);
app.use('/users', userRoutes);
app.use('/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'User Management Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    port: PORT,
    endpoints: {
      health: '/health',
      users: '/users',
      admin: '/admin'
    }
  });
});

// Error handling middleware
app.use(errorHandler);
app.use(notFoundHandler);

// Initialize server
const startServer = async () => {
  try {
    logger.info('🚀 Starting User Management Service...', 'server');

    // Initialize database
    logger.info('🗄️ Initializing database connection...', 'server');
    await initializeDatabase();
    logger.info('✅ Database initialized successfully', 'server');

    // Initialize Redis
    logger.info('🔴 Initializing Redis cache...', 'server');
    await initializeRedis();
    logger.info('✅ Redis cache initialized successfully', 'server');

    // Initialize metrics
    logger.info('📊 Initializing metrics collection...', 'server');
    await initializeMetrics();
    logger.info('✅ Metrics collection initialized successfully', 'server');

    // Register service
    logger.info('🔍 Registering service with service discovery...', 'server');
    await serviceRegistry.register({
      name: 'user-service',
      port: PORT,
      healthCheck: `http://localhost:${PORT}/health`,
      version: '1.0.0'
    });
    logger.info('✅ Service registered successfully', 'server');

    // Start server
    logger.info(`🌐 Starting server on port ${PORT}...`, 'server');
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`✅ User Management Service running on port ${PORT}`, 'server');
      logger.info(`📊 Health check: http://localhost:${PORT}/health`, 'server');
      logger.info(`🔗 API base: http://localhost:${PORT}`, 'server');
    });

  } catch (error) {
    logger.error('❌ Failed to start User Management Service:', 'server', { 
      error: (error as Error).message, 
      stack: (error as Error).stack 
    });
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`, 'server');

  try {
    // Unregister service
    await serviceRegistry.unregister('user-service');
    logger.info('Service unregistered', 'server');

    // Close server
    server.close(() => {
      logger.info('Server closed', 'server');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout', 'server');
      process.exit(1);
    }, 10000);

  } catch (error) {
    logger.error('Error during shutdown', 'server', { error: String(error) });
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();
