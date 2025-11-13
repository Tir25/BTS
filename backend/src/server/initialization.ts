/**
 * Server Initialization
 * Handles initialization of all services (database, Redis, monitoring, etc.)
 */

import { redisCache } from '../services/RedisCacheService';
import { initializeDatabase, testDatabaseConnection } from '../models/database';
import { startDatabaseMonitoring } from '../config/database';
import { validateEnvironment } from '../config/envValidation';
import { monitoringService } from '../services/MonitoringService';
import { performanceGuard } from '../utils/performanceGuard';
import { systemValidator } from '../utils/systemValidator';
import { locationArchiveService } from '../services/LocationArchiveService';
import { logger } from '../utils/logger';

/**
 * Initializes all services required for the server to run
 */
export async function initializeServices(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';

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
  let redisReady = false;
  try {
    await redisCache.connect();
    logger.info('✅ Redis cache initialized successfully', 'server');
    redisReady = true;
  } catch (redisError) {
    logger.error('❌ Redis cache initialization failed:', 'server', { error: (redisError as Error).message });
    if (!isProduction) {
      logger.warn('💡 Continuing without Redis cache for development...', 'server');
    } else {
      throw redisError;
    }
  }

  // Initialize database with retry logic
  logger.info('🗄️ Initializing database connection...', 'server');
  let dbReady = false;
  try {
    await initializeDatabase();
    logger.info('✅ Database initialized successfully', 'server');
    dbReady = true;
  } catch (dbError) {
    logger.error('❌ Database initialization failed:', 'server', { error: (dbError as Error).message });
    if (!isProduction) {
      logger.warn('💡 Continuing without database connection for development...', 'server');
    } else {
      throw dbError;
    }
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
    if (!isProduction) {
      logger.warn('⚠️ Database connection test failed:', 'server', { error: (dbTestError as Error).message });
      logger.warn('💡 Continuing without database for development...', 'server');
    } else {
      throw dbTestError as Error;
    }
  }

  // Start comprehensive monitoring service
  monitoringService.start();
  logger.info('📈 Comprehensive monitoring service started', 'server');
  
  // Start performance guard
  performanceGuard.startMonitoring();
  logger.info('🛡️ Performance guard started', 'server');
  
  // Start system validator
  systemValidator.startValidation();
  logger.info('🔍 System validator started', 'server');
  
  // Start location archive service
  locationArchiveService.startAutoArchive(60); // Archive every hour
  locationArchiveService.startAutoCleanup(24); // Cleanup daily
  logger.info('📦 Location archive service started', 'server');
}

