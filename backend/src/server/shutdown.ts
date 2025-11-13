/**
 * Graceful Shutdown Handler
 * Handles clean shutdown of all services and connections
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { webSocketHealth } from '../services/WebSocketHealthService';
import { stopDatabaseMonitoring, closeDatabasePool } from '../config/database';
import { monitoringService } from '../services/MonitoringService';
import { performanceGuard } from '../utils/performanceGuard';
import { systemValidator } from '../utils/systemValidator';
import { memoryOptimizer } from '../middleware/memoryOptimization';
import { logRotator } from '../utils/logRotation';
import { locationArchiveService } from '../services/LocationArchiveService';
import { redisCache } from '../services/RedisCacheService';
import { logger } from '../utils/logger';

/**
 * Performs graceful shutdown of all services
 */
export async function gracefulShutdown(
  io: SocketIOServer,
  server: HttpServer,
  signal: string
): Promise<void> {
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
    
    // Stop location archive service
    locationArchiveService.stop();
    logger.info('Location archive service stopped', 'server');
    
    // Close Redis cache connection
    await redisCache.disconnect();
    logger.info('Redis cache connection closed', 'server');
    
    // Close database connections
    await closeDatabasePool();
    logger.info('Database connections closed', 'server');

    // Close HTTP server
    server.close(() => {
      logger.info('HTTP server closed', 'server');
      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      logger.error('Forced shutdown after timeout', 'server');
      process.exit(1);
    }, 10000); // 10 second timeout
  } catch (error) {
    logger.error('Error during shutdown', 'server', { error: String(error) });
    process.exit(1);
  }
}

/**
 * Sets up shutdown signal handlers
 */
export function setupShutdownHandlers(io: SocketIOServer, server: HttpServer): void {
  // Handle graceful shutdown
  process.on('SIGTERM', () => gracefulShutdown(io, server, 'SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown(io, server, 'SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', 'server', { error: String(error) });
    gracefulShutdown(io, server, 'Uncaught Exception');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', 'server', { reason: String(reason), promise: String(promise) });
    gracefulShutdown(io, server, 'Unhandled Rejection');
  });
}

